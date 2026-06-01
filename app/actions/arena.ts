"use server";

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit }        from "@/lib/audit";
import {
  mapStrategyToArenaThreat,
  ANSWER_CORRECT_FRAMES,
  ANSWER_WRONG_FRAMES,
  randomFrom,
} from "@/lib/terminology";
import { ENERGY_MAX, REGULAR_BOX_XP, BOSS_BOX_XP } from "@/lib/constants";
import {
  generateAutoArenaQuestions,
  isAutoQuestionId,
  type AutoQuestion,
} from "@/lib/auto-questions";

// ── Types exposed to client ────────────────────────────────
// CRITICAL: correct_answer is NEVER included here

export interface ArenaQuestion {
  id:          string;
  text_he:     string;
  option_a_he: string;
  option_b_he: string;
  option_c_he: string;
  option_d_he: string;
  difficulty:  string;
}

export interface ArenaStartData {
  sessionId:            string;
  questions:            ArenaQuestion[];
  questionsCount:       number;
  bossDamagePerCorrect: number;
  currentBossHp:        number;
  currentEnergy:        number;
  arenaThreat:          string;   // child-facing, no strategy name
  worldId:              string | null;
  adventureTitle:       string;
  storyText:            string | null;
  // Hero display data
  heroName:             string;
  heroGender:           "M" | "F";
  heroColorTheme:       string;
}

export interface AnswerResult {
  isCorrect:        boolean;
  feedback:         string;         // child-facing battle text
  correctAnswer:    "A" | "B" | "C" | "D";
  correctText:      string;         // the text of the correct option
  bossDamageDealt:  number;
  newBossHp:        number;
  newEnergy:        number;
  megaHitAvailable: boolean;
  bossDefeated:     boolean;
  allAnswered:      boolean;
}

export interface MegaHitResult {
  newBossHp:    number;
  newEnergy:    number;
  bossDefeated: boolean;
}

export interface LootItem {
  type:        "coins" | "stars" | "hero" | "skin";
  rarity:      "Common" | "Rare" | "Epic" | "Legendary";
  label:       string;
  icon:        string;
  amount:      number;
  heroGender?: "M" | "F";
  heroTheme?:  string;
}

export type ClaimResult =
  | { success: true; loot: LootItem; boxType: "arena_completion" | "boss_defeat" }
  | { success: false; error: string };

type ActionResult<T> = { success: true } & T | { success: false; error: string };

// ══════════════════════════════════════════════════════════
// Auth helper
// ══════════════════════════════════════════════════════════

async function getChildProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "לא מחובר", child: null, supabase };

  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, energy, current_world_id, total_coins, total_stars")
    .eq("user_id", user.id)
    .single();

  if (!child) return { error: "פרופיל לא נמצא", child: null, supabase };
  return { child, supabase, error: null };
}

// ══════════════════════════════════════════════════════════
// Question selection — runs server-side, never exposes correct_answer
// ══════════════════════════════════════════════════════════

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function selectQuestionsForArena(
  supabase:      Awaited<ReturnType<typeof createClient>>,
  childId:       string,
  missionId:     string,
  practiceSetId: string,
  strategy:      string,
  count:         number
): Promise<string[]> {

  const admin = createAdminClient();

  // ── Carry-forward: wrong answers + unseen questions from the last session ─────
  // 1. Wrong answers from the last completed session come first (repeat practice).
  // 2. Unseen questions from the last early-victory session come next.
  // Both are prepended before strategy fills remaining slots — invisible to the child.
  const { data: lastSession } = await admin
    .from("game_sessions")
    .select("id, question_ids, boss_defeated")
    .eq("child_id", childId)
    .eq("mission_id", missionId)
    .not("ended_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let carriedIds: string[] = [];

  if (lastSession?.question_ids?.length) {
    const sessionQIds: string[] = lastSession.question_ids;

    const { data: sessionAttempts } = await admin
      .from("question_attempts")
      .select("question_id, is_correct")
      .eq("session_id", lastSession.id)
      .in("question_id", sessionQIds);

    const wrongInSession = new Set(
      (sessionAttempts ?? [])
        .filter((a: { question_id: string; is_correct: boolean }) => !a.is_correct)
        .map((a: { question_id: string; is_correct: boolean }) => a.question_id)
    );
    const answeredInSession = new Set(
      (sessionAttempts ?? []).map((a: { question_id: string; is_correct: boolean }) => a.question_id)
    );

    // Wrong answers from last session → repeat first
    const wrongIds = sessionQIds.filter(id => wrongInSession.has(id));

    // If boss was defeated early, unseen questions from that session come next
    const unseenIds = lastSession.boss_defeated
      ? sessionQIds.filter(id => !answeredInSession.has(id))
      : [];

    // Merge: wrong first, then unseen (no duplicates)
    const unseenSet = new Set(unseenIds);
    const merged = [...wrongIds, ...unseenIds.filter(id => !wrongInSession.has(id))];

    if (merged.length > 0) {
      // Exclude any wrong that the child later answered correctly in a different session
      const { data: laterCorrect } = await supabase
        .from("question_attempts")
        .select("question_id")
        .eq("child_id", childId)
        .eq("is_correct", true)
        .in("question_id", wrongIds);

      const laterCorrectSet = new Set(
        (laterCorrect ?? []).map((a: { question_id: string }) => a.question_id)
      );

      // Exclude unseen that were answered in any later session
      const { data: laterAnswered } = unseenIds.length > 0
        ? await supabase
            .from("question_attempts")
            .select("question_id")
            .eq("child_id", childId)
            .in("question_id", unseenIds)
        : { data: [] };

      const laterAnsweredSet = new Set(
        (laterAnswered ?? []).map((a: { question_id: string }) => a.question_id)
      );

      carriedIds = merged.filter(id =>
        wrongInSession.has(id)
          ? !laterCorrectSet.has(id)          // wrong: drop only if later answered correctly
          : !laterAnsweredSet.has(id)          // unseen: drop if answered in any later session
      );
    }
  }

  // ── Load all questions for this practice set ───────────────────────────────────
  const { data: allQ } = await admin
    .from("questions")
    .select("id, topic_he, difficulty")
    .eq("practice_set_id", practiceSetId)
    .in("status", ["approved", "draft", "active"]);

  if (!allQ?.length) return carriedIds.slice(0, count);

  const allQIdSet = new Set(allQ.map(q => q.id));
  // Carried questions must still exist in this practice set
  carriedIds = carriedIds.filter(id => allQIdSet.has(id));

  // Remaining slots after carried questions fill their spots
  const slotsForStrategy = Math.max(0, count - carriedIds.length);
  const carriedSet       = new Set(carriedIds);

  if (slotsForStrategy === 0) return carriedIds.slice(0, count);

  // ── Strategy selection — fills only the remaining slots ────────────────────────
  const qIds = allQ.map(q => q.id);
  const { data: attempts } = await supabase
    .from("question_attempts")
    .select("question_id, is_correct")
    .eq("child_id", childId)
    .in("question_id", qIds);

  const wrongSet     = new Set<string>();
  const attemptedSet = new Set<string>();
  const topicWrong:  Record<string, number> = {};
  const topicTotal:  Record<string, number> = {};

  for (const a of (attempts ?? [])) {
    attemptedSet.add(a.question_id);
    if (!a.is_correct) wrongSet.add(a.question_id);
  }
  for (const q of allQ) {
    topicTotal[q.topic_he] = (topicTotal[q.topic_he] ?? 0) + 1;
    if (wrongSet.has(q.id)) topicWrong[q.topic_he] = (topicWrong[q.topic_he] ?? 0) + 1;
  }

  // Available pool excludes already-carried questions (no duplicates in one run)
  const available = allQ.filter(q => !carriedSet.has(q.id));

  const fill = (pool: string[], existing: string[], need: number): string[] => {
    const existSet = new Set(existing);
    const extra    = shuffle(pool.filter(id => !existSet.has(id)));
    return [...existing, ...extra.slice(0, Math.max(0, need - existing.length))];
  };

  let strategyPicked: string[] = [];

  switch (strategy) {
    case "previously_wrong": {
      const wrong = shuffle(available.filter(q => wrongSet.has(q.id)).map(q => q.id))
        .slice(0, slotsForStrategy);
      strategyPicked = fill(available.map(q => q.id), wrong, slotsForStrategy)
        .slice(0, slotsForStrategy);
      break;
    }

    case "unattempted": {
      const unatt = shuffle(available.filter(q => !attemptedSet.has(q.id)).map(q => q.id))
        .slice(0, slotsForStrategy);
      strategyPicked = fill(available.map(q => q.id), unatt, slotsForStrategy)
        .slice(0, slotsForStrategy);
      break;
    }

    case "weakest_topics": {
      const sortedTopics = Object.entries(topicWrong)
        .map(([t, w]) => ({ topic: t, ratio: w / (topicTotal[t] ?? 1) }))
        .sort((a, b) => b.ratio - a.ratio)
        .map(x => x.topic);

      const picked: string[] = [];
      for (const topic of sortedTopics) {
        if (picked.length >= slotsForStrategy) break;
        const topicQs = shuffle(
          available.filter(q => q.topic_he === topic && !picked.includes(q.id))
        );
        picked.push(...topicQs.slice(0, slotsForStrategy - picked.length).map(q => q.id));
      }
      strategyPicked = fill(available.map(q => q.id), picked, slotsForStrategy)
        .slice(0, slotsForStrategy);
      break;
    }

    case "mixed": {
      const wrongN = Math.ceil(slotsForStrategy * 0.4);
      const unattN = Math.ceil(slotsForStrategy * 0.4);
      const randN  = slotsForStrategy - wrongN - unattN;

      const wrongPart = shuffle(available.filter(q => wrongSet.has(q.id)))
        .slice(0, wrongN).map(q => q.id);
      const usedSet = new Set(wrongPart);

      const unattPart = shuffle(
        available.filter(q => !attemptedSet.has(q.id) && !usedSet.has(q.id))
      ).slice(0, unattN).map(q => q.id);
      unattPart.forEach(id => usedSet.add(id));

      const randPart = shuffle(available.filter(q => !usedSet.has(q.id)))
        .slice(0, randN).map(q => q.id);

      strategyPicked = fill(
        available.map(q => q.id),
        [...wrongPart, ...unattPart, ...randPart],
        slotsForStrategy
      ).slice(0, slotsForStrategy);
      break;
    }

    case "random":
    default:
      strategyPicked = shuffle(available.map(q => q.id)).slice(0, slotsForStrategy);
      break;
  }

  // Carried questions first, then strategy-selected — no duplicates, total capped at count
  return [...carriedIds, ...strategyPicked].slice(0, count);
}

// ══════════════════════════════════════════════════════════
// START ARENA SESSION
// ══════════════════════════════════════════════════════════

export async function startArenaSession(
  missionId: string
): Promise<ActionResult<ArenaStartData>> {
  const { child, supabase, error } = await getChildProfile();
  if (error || !child) return { success: false, error: error ?? "שגיאה" };

  // Validate mission belongs to this child and is active (admin bypasses RLS)
  const admin = createAdminClient();
  const { data: mission } = await admin
    .from("child_missions")
    .select("id, title_he, story_text_he, practice_set_id, selection_strategy, questions_per_run")
    .eq("id", missionId)
    .eq("child_id", child.id)
    .eq("status", "active")
    .single();

  if (!mission) return { success: false, error: "הרפתקה לא נמצאה או אינה פעילה" };

  // Determine world
  let worldId: string | null = child.current_world_id ?? null;
  if (!worldId) {
    const { data: wp } = await supabase
      .from("world_progress")
      .select("world_id")
      .eq("child_id", child.id)
      .eq("is_unlocked", true)
      .order("world_id")
      .limit(1)
      .maybeSingle();
    worldId = wp?.world_id ?? null;
  }

  // Get boss HP — if boss is already defeated (hp=0), reset for new cycle
  let currentBossHp = 100;
  if (worldId) {
    const { data: wp } = await supabase
      .from("world_progress")
      .select("boss_hp_remaining, is_unlocked, is_completed")
      .eq("child_id", child.id)
      .eq("world_id", worldId)
      .single();

    if (wp?.is_unlocked) {
      if (wp.is_completed && wp.boss_hp_remaining === 0) {
        // Boss already defeated — reset for replay
        await admin.rpc("reset_boss", { p_child_id: child.id, p_world_id: worldId });
        currentBossHp = 100;
      } else {
        currentBossHp = wp.boss_hp_remaining;
      }
    }
  }

  // Select questions (server-side, strategy applied here)
  const questionIds = await selectQuestionsForArena(
    supabase, child.id, mission.id, mission.practice_set_id,
    mission.selection_strategy, mission.questions_per_run
  );

  let questions:     ArenaQuestion[] = [];
  let autoQuestions: AutoQuestion[]  = [];
  let questionIdsForSession: string[] = [];

  if (questionIds.length > 0) {
    // ── Normal path: parent-uploaded DB-backed questions ─────────────────────────
    const { data: questionsRaw } = await admin
      .from("questions")
      .select("id, text_he, option_a_he, option_b_he, option_c_he, option_d_he, difficulty")
      .in("id", questionIds);

    // Preserve selected order
    questions = questionIds
      .map(id => questionsRaw?.find(q => q.id === id))
      .filter((q): q is ArenaQuestion => !!q);

    questionIdsForSession = questionIds;
  } else {
    // ── Fallback path: no parent questions exist → generate age/grade-based pool ──
    // Reads child grade from child_mission_config (falls back to child_profiles).
    let grade = 3;
    const { data: cfg } = await admin
      .from("child_mission_config")
      .select("grade_level")
      .eq("child_profile_id", child.id)
      .maybeSingle();
    if (typeof cfg?.grade_level === "number") {
      grade = cfg.grade_level;
    } else {
      const { data: cp } = await admin
        .from("child_profiles")
        .select("grade_level")
        .eq("id", child.id)
        .maybeSingle();
      const parsed = Number.parseInt(String(cp?.grade_level ?? ""), 10);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 6) grade = parsed;
    }

    autoQuestions = await generateAutoArenaQuestions(grade, mission.questions_per_run);
    if (autoQuestions.length === 0) {
      return { success: false, error: "אין שאלות זמינות להרפתקה" };
    }

    // Strip correct_answer + explanation before exposing to client
    questions = autoQuestions.map(q => ({
      id:          q.id,
      text_he:     q.text_he,
      option_a_he: q.option_a_he,
      option_b_he: q.option_b_he,
      option_c_he: q.option_c_he,
      option_d_he: q.option_d_he,
      difficulty:  q.difficulty,
    }));
  }

  if (questions.length === 0) {
    return { success: false, error: "אין שאלות זמינות להרפתקה" };
  }

  // Create game session — auto_questions holds the full server-side payload
  // (with correct_answer) for the fallback path; question_ids stays [] for it.
  const { data: session } = await admin
    .from("game_sessions")
    .insert({
      child_id:          child.id,
      mission_id:        mission.id,
      world_id:          worldId,
      questions_per_run: questions.length,
      question_ids:      questionIdsForSession,
      auto_questions:    autoQuestions,
    })
    .select("id")
    .single();

  if (!session) return { success: false, error: "שגיאה ביצירת ריצת הזירה" };

  const bossDamagePerCorrect = Math.floor(100 / mission.questions_per_run);

  // Fetch selected hero for arena display
  let heroName       = "הגיבור שלי";
  let heroGender: "M" | "F" = "M";
  let heroColorTheme = "default";

  const { data: childProfile } = await admin
    .from("child_profiles")
    .select("current_hero_id")
    .eq("id", child.id)
    .single();

  if (childProfile?.current_hero_id) {
    const { data: hero } = await admin
      .from("heroes")
      .select("name_he, gender, color_theme")
      .eq("id", childProfile.current_hero_id)
      .single();

    if (hero) {
      heroName       = hero.name_he       ?? "הגיבור שלי";
      heroGender     = (hero.gender as "M" | "F") ?? "M";
      heroColorTheme = hero.color_theme   ?? "default";
    }
  }

  return {
    success:            true,
    sessionId:          session.id,
    questions,
    questionsCount:     questions.length,
    bossDamagePerCorrect,
    currentBossHp,
    currentEnergy:      child.energy,
    arenaThreat:        mapStrategyToArenaThreat(mission.selection_strategy),
    worldId,
    adventureTitle:     mission.title_he,
    storyText:          mission.story_text_he ?? null,
    heroName,
    heroGender,
    heroColorTheme,
  };
}

// ══════════════════════════════════════════════════════════
// SUBMIT ANSWER
// ══════════════════════════════════════════════════════════

export async function submitAnswer(
  sessionId:  string,
  questionId: string,
  selected:   "A" | "B" | "C" | "D"
): Promise<ActionResult<AnswerResult>> {
  const { child, supabase, error } = await getChildProfile();
  if (error || !child) return { success: false, error: error ?? "שגיאה" };

  const admin = createAdminClient();

  // Load session — verify ownership
  const { data: session } = await supabase
    .from("game_sessions")
    .select("id, child_id, world_id, question_ids, auto_questions, auto_attempts, questions_per_run, correct_count, incorrect_count, ended_at")
    .eq("id", sessionId)
    .eq("child_id", child.id)
    .single();

  if (!session) return { success: false, error: "סשן לא נמצא" };
  if (session.ended_at) return { success: false, error: "סשן כבר הסתיים" };

  const qIds:        string[]        = Array.isArray(session.question_ids)  ? session.question_ids  : [];
  const autoPool:    AutoQuestion[]  = Array.isArray(session.auto_questions) ? session.auto_questions : [];
  const autoAttempts: Array<{ question_id: string; selected_answer: "A"|"B"|"C"|"D"; is_correct: boolean; answered_at: string }> =
    Array.isArray(session.auto_attempts) ? session.auto_attempts : [];

  // Decide path: auto-question id starts with "auto-" AND is present in the
  // session's auto_questions pool. Otherwise it must be a DB-backed id present
  // in question_ids. Rejecting mixed/unknown ids defends against tampering.
  const isAuto = isAutoQuestionId(questionId);

  if (isAuto) {
    // ── Auto-question path: validate against session JSONB, never touch DB questions ──
    const autoQ = autoPool.find(q => q.id === questionId);
    if (!autoQ) return { success: false, error: "שאלה לא שייכת לסשן זה" };
    if (autoAttempts.some(a => a.question_id === questionId)) {
      return { success: false, error: "שאלה כבר נענתה בסשן זה" };
    }

    const isCorrect      = selected === autoQ.correct_answer;
    const correctCount   = session.correct_count   + (isCorrect ? 1 : 0);
    const incorrectCount = session.incorrect_count + (isCorrect ? 0 : 1);
    const totalAnswered  = correctCount + incorrectCount;
    const allAnswered    = totalAnswered >= autoPool.length;
    const bossDamage     = isCorrect ? Math.floor(100 / (session.questions_per_run ?? 10)) : 0;

    let newBossHp    = 100;
    let newEnergy    = child.energy;
    let bossDefeated = false;

    if (isCorrect && session.world_id) {
      newBossHp = await admin
        .rpc("damage_boss", { p_child_id: child.id, p_world_id: session.world_id, p_damage: bossDamage })
        .then(r => r.data ?? 100);
      bossDefeated = newBossHp === 0;

      if (!bossDefeated && allAnswered) {
        await admin.rpc("defeat_boss", { p_child_id: child.id, p_world_id: session.world_id });
        newBossHp    = 0;
        bossDefeated = true;
      }

      newEnergy = await admin
        .rpc("add_child_energy", { p_child_id: child.id, p_delta: 1 })
        .then(r => r.data ?? child.energy);
    }

    // Persist attempt on the session row (cannot use question_attempts —
    // its question_id FK requires a real questions.id, which auto Qs lack).
    const nextAttempts = [...autoAttempts, {
      question_id:     questionId,
      selected_answer: selected,
      is_correct:      isCorrect,
      answered_at:     new Date().toISOString(),
    }];

    await admin
      .from("game_sessions")
      .update({
        correct_count:   correctCount,
        incorrect_count: incorrectCount,
        auto_attempts:   nextAttempts,
      })
      .eq("id", sessionId);

    if (isCorrect) {
      await admin.rpc("add_child_xp", { p_child_id: child.id, p_amount: 5 });
    }

    if (allAnswered || bossDefeated) {
      await admin
        .from("game_sessions")
        .update({ ended_at: new Date().toISOString(), boss_defeated: bossDefeated })
        .eq("id", sessionId);
      if (bossDefeated) {
        await writeAudit(child.id, "boss_defeated", "world_progress", session.world_id ?? "unknown");
      }
    }

    const feedback = isCorrect
      ? randomFrom(ANSWER_CORRECT_FRAMES)
      : randomFrom(ANSWER_WRONG_FRAMES);

    const optionMap: Record<string, string> = {
      A: autoQ.option_a_he, B: autoQ.option_b_he,
      C: autoQ.option_c_he, D: autoQ.option_d_he,
    };

    return {
      success:          true,
      isCorrect,
      feedback,
      correctAnswer:    autoQ.correct_answer,
      correctText:      optionMap[autoQ.correct_answer] ?? "",
      bossDamageDealt:  bossDamage,
      newBossHp,
      newEnergy,
      megaHitAvailable: newEnergy >= ENERGY_MAX,
      bossDefeated,
      allAnswered,
    };
  }

  // ── Normal (DB-backed) path — unchanged behavior ─────────────────────────────
  if (!qIds.includes(questionId)) return { success: false, error: "שאלה לא שייכת לסשן זה" };

  // Verify not already answered in this session
  const { data: existing } = await supabase
    .from("question_attempts")
    .select("id")
    .eq("session_id", sessionId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (existing) return { success: false, error: "שאלה כבר נענתה בסשן זה" };

  // Fetch correct answer SERVER-SIDE ONLY
  const { data: qData } = await admin
    .from("questions")
    .select("correct_answer, difficulty, option_a_he, option_b_he, option_c_he, option_d_he")
    .eq("id", questionId)
    .single();

  if (!qData) return { success: false, error: "שאלה לא נמצאה" };

  const isCorrect      = selected === qData.correct_answer;
  const correctCount   = session.correct_count   + (isCorrect ? 1 : 0);
  const incorrectCount = session.incorrect_count + (isCorrect ? 0 : 1);
  const totalAnswered  = correctCount + incorrectCount;
  const allAnswered    = totalAnswered >= qIds.length;
  const bossDamage     = isCorrect ? Math.floor(100 / (session.questions_per_run ?? 10)) : 0;

  // Atomic DB updates via admin RPC
  let newBossHp    = 100;
  let newEnergy    = child.energy;
  let bossDefeated = false;

  if (isCorrect && session.world_id) {
    newBossHp = await admin
      .rpc("damage_boss", { p_child_id: child.id, p_world_id: session.world_id, p_damage: bossDamage })
      .then(r => r.data ?? 100);
    bossDefeated = newBossHp === 0;

    // Last question in session: if rounding left 1–2 HP, kill the boss to guarantee victory
    if (!bossDefeated && allAnswered) {
      await admin.rpc("defeat_boss", { p_child_id: child.id, p_world_id: session.world_id });
      newBossHp    = 0;
      bossDefeated = true;
    }

    newEnergy = await admin
      .rpc("add_child_energy", { p_child_id: child.id, p_delta: 1 })
      .then(r => r.data ?? child.energy);
  }

  // Record attempt (via admin to bypass RLS)
  await admin.from("question_attempts").insert({
    child_id:        child.id,
    session_id:      sessionId,
    question_id:     questionId,
    selected_answer: selected,
    is_correct:      isCorrect,
    xp_earned:       isCorrect ? 5 : 0,
  });

  // Update session counts
  await admin
    .from("game_sessions")
    .update({ correct_count: correctCount, incorrect_count: incorrectCount })
    .eq("id", sessionId);

  // XP for correct answers
  if (isCorrect) {
    await admin.rpc("add_child_xp", { p_child_id: child.id, p_amount: 5 });
  }

  // End session when all questions answered OR boss defeated (whichever comes first)
  if (allAnswered || bossDefeated) {
    await admin
      .from("game_sessions")
      .update({
        ended_at:      new Date().toISOString(),
        boss_defeated: bossDefeated,
      })
      .eq("id", sessionId);

    if (bossDefeated) {
      await writeAudit(child.id, "boss_defeated", "world_progress", session.world_id ?? "unknown");
    }
  }

  const feedback = isCorrect
    ? randomFrom(ANSWER_CORRECT_FRAMES)
    : randomFrom(ANSWER_WRONG_FRAMES);

  const correctAnswer = qData.correct_answer as "A" | "B" | "C" | "D";
  const optionMap: Record<string, string> = {
    A: qData.option_a_he,
    B: qData.option_b_he,
    C: qData.option_c_he,
    D: qData.option_d_he,
  };

  return {
    success:          true,
    isCorrect,
    feedback,
    correctAnswer,
    correctText:      optionMap[correctAnswer] ?? "",
    bossDamageDealt:  bossDamage,
    newBossHp,
    newEnergy,
    megaHitAvailable: newEnergy >= ENERGY_MAX,
    bossDefeated,
    allAnswered,
  };
}

// ══════════════════════════════════════════════════════════
// MEGA HIT
// ══════════════════════════════════════════════════════════

export async function useMegaHit(
  sessionId: string
): Promise<ActionResult<MegaHitResult>> {
  const { child, supabase, error } = await getChildProfile();
  if (error || !child) return { success: false, error: error ?? "שגיאה" };

  // Verify energy >= 5 from DB (never trust client)
  if (child.energy < ENERGY_MAX)
    return { success: false, error: "אין מספיק כוח קריסטל להתקפת מגה" };

  const admin = createAdminClient();

  const { data: session } = await supabase
    .from("game_sessions")
    .select("id, child_id, world_id, ended_at, questions_per_run")
    .eq("id", sessionId)
    .eq("child_id", child.id)
    .single();

  if (!session)         return { success: false, error: "סשן לא נמצא" };
  if (session.ended_at) return { success: false, error: "סשן הסתיים" };
  if (!session.world_id) return { success: false, error: "עולם לא מוגדר לסשן זה" };

  // Dynamic damage: Mega Hit = 2 × normal answer damage for this session
  const bossDamagePerCorrect = Math.floor(100 / (session.questions_per_run ?? 10));
  const megaHitDamage        = 2 * bossDamagePerCorrect;

  // Apply damage + deduct energy atomically
  const [newBossHp, newEnergy] = await Promise.all([
    admin.rpc("damage_boss", {
      p_child_id: child.id,
      p_world_id: session.world_id,
      p_damage:   megaHitDamage,
    }).then(r => r.data ?? 100),
    admin.rpc("add_child_energy", {
      p_child_id: child.id,
      p_delta:    -ENERGY_MAX,
    }).then(r => r.data ?? 0),
  ]);

  const bossDefeated = newBossHp === 0;
  if (bossDefeated) {
    await admin
      .from("game_sessions")
      .update({ boss_defeated: true, ended_at: new Date().toISOString() })
      .eq("id", sessionId);
    await writeAudit(child.id, "boss_defeated", "world_progress", session.world_id);
  }

  return { success: true, newBossHp, newEnergy, bossDefeated };
}

// ══════════════════════════════════════════════════════════
// CLAIM REWARD — server-side loot roll
// ══════════════════════════════════════════════════════════

export async function claimReward(
  sessionId:    string,
  rewardSource: "arena_completion" | "boss_defeat"
): Promise<ClaimResult> {
  const { child, supabase, error } = await getChildProfile();
  if (error || !child) return { success: false, error: error ?? "שגיאה" };

  const admin = createAdminClient();

  // ── Security check 1: session ownership + ended ─────────
  const { data: session } = await supabase
    .from("game_sessions")
    .select("id, child_id, mission_id, boss_defeated, reward_claimed, ended_at")
    .eq("id", sessionId)
    .eq("child_id", child.id)
    .single();

  if (!session) return { success: false, error: "סשן לא נמצא" };
  if (!session.ended_at) return { success: false, error: "ההרפתקה עדיין לא הסתיימה" };
  if (session.reward_claimed) return { success: false, error: "הפרס כבר נלקח" };
  if (rewardSource === "boss_defeat" && !session.boss_defeated)
    return { success: false, error: "הבוס לא הובס בסשן זה" };

  // ── Security check 2: reward_history dedup ───────────────
  const { data: existing } = await admin
    .from("reward_history")
    .select("id")
    .eq("session_id", sessionId)
    .eq("reward_source", rewardSource)
    .maybeSingle();

  if (existing) return { success: false, error: "הפרס כבר נלקח" };

  // ── Roll loot (server-side only) ─────────────────────────
  const isBoss = rewardSource === "boss_defeat";
  const loot   = await rollLoot(admin, child.id, isBoss);

  // ── Grant reward atomically ──────────────────────────────
  if (loot.type === "coins") {
    await admin.rpc("add_child_coins", { p_child_id: child.id, p_amount: loot.amount });
  } else if (loot.type === "stars") {
    await admin.rpc("add_child_stars", { p_child_id: child.id, p_amount: loot.amount });
    await admin.rpc("add_child_xp",    { p_child_id: child.id, p_amount: isBoss ? BOSS_BOX_XP : REGULAR_BOX_XP });
  } else if (loot.type === "hero") {
    await admin.from("unlocked_heroes").insert({ child_id: child.id, hero_id: loot._heroId });
    await admin.rpc("add_child_xp", { p_child_id: child.id, p_amount: isBoss ? BOSS_BOX_XP : REGULAR_BOX_XP });
  } else if (loot.type === "skin") {
    await admin.from("unlocked_skins").insert({ child_id: child.id, skin_id: loot._skinId });
    await admin.rpc("add_child_xp", { p_child_id: child.id, p_amount: isBoss ? BOSS_BOX_XP : REGULAR_BOX_XP });
  }

  // ── Write reward_history ─────────────────────────────────
  await admin.from("reward_history").insert({
    child_id:     child.id,
    session_id:   sessionId,
    mission_id:   session.mission_id,
    reward_type:  loot.type,
    reward_value: String(loot.amount || loot.label),
    reward_source: rewardSource,
    source:       rewardSource,
    metadata: {
      rarity: loot.rarity,
      label:  loot.label,
      isBoss,
    },
  });

  // ── Mark session reward as claimed ───────────────────────
  await admin.from("game_sessions").update({ reward_claimed: true }).eq("id", sessionId);

  if (loot.rarity === "Legendary" || loot.rarity === "Epic") {
    await admin.from("audit_logs").insert({
      actor_user_id: child.id,
      action_type:   "rare_reward_granted",
      target_type:   "reward_history",
      target_id:     sessionId,
      details: { rarity: loot.rarity, type: loot.type, source: rewardSource },
    });
  }

  // Strip internal fields before returning to client
  const { _heroId: _, _skinId: __, _heroGender, _heroTheme, ...publicLoot } =
    loot as LootItem & { _heroId?: string; _skinId?: string; _heroGender?: string; _heroTheme?: string };

  return {
    success: true,
    loot: { ...publicLoot, heroGender: _heroGender as "M" | "F" | undefined, heroTheme: _heroTheme } as LootItem,
    boxType: rewardSource,
  };
}

// ── Internal loot roller ──────────────────────────────────

interface InternalLoot extends LootItem {
  _heroId?:     string;
  _skinId?:     string;
  _heroGender?: "M" | "F";
  _heroTheme?:  string;
}

async function rollLoot(
  admin:   ReturnType<typeof createAdminClient>,
  childId: string,
  isBoss:  boolean
): Promise<InternalLoot> {
  const roll = Math.random();
  const heroSkinChance = isBoss ? 0.10 : 0.05;
  const starsChance    = isBoss ? 0.25 : 0.25;

  if (roll < heroSkinChance) {
    return rollHeroOrSkin(admin, childId);
  } else if (roll < heroSkinChance + starsChance) {
    const min    = isBoss ? 3  : 1;
    const max    = isBoss ? 8  : 3;
    const amount = Math.floor(Math.random() * (max - min + 1)) + min;
    return { type: "stars", rarity: "Common", label: `${amount} כוכבים`, icon: "⭐", amount };
  } else {
    const min    = isBoss ? 80  : 20;
    const max    = isBoss ? 200 : 80;
    const amount = Math.floor(Math.random() * (max - min + 1)) + min;
    return { type: "coins", rarity: "Common", label: `${amount} מטבעות`, icon: "🪙", amount };
  }
}

async function rollHeroOrSkin(
  admin:   ReturnType<typeof createAdminClient>,
  childId: string
): Promise<InternalLoot> {
  const DUPE_COINS: Record<string, number> = {
    Common: 50, Rare: 100, Epic: 200, Legendary: 500,
  };

  const [{ data: allHeroes }, { data: allSkins },
         { data: ownedHeroes }, { data: ownedSkins }] = await Promise.all([
    admin.from("heroes").select("id, name_he, rarity, gender, color_theme"),
    admin.from("hero_skins").select("id, name_he, rarity").eq("is_default", false),
    admin.from("unlocked_heroes").select("hero_id").eq("child_id", childId),
    admin.from("unlocked_skins").select("skin_id").eq("child_id", childId),
  ]);

  const ownedHeroIds = new Set((ownedHeroes ?? []).map(u => u.hero_id));
  const ownedSkinIds = new Set((ownedSkins  ?? []).map(u => u.skin_id));

  const pool = [
    ...(allHeroes ?? []).map(h => ({ ...h, itemType: "hero" as const })),
    ...(allSkins  ?? []).filter(s => s).map(s => ({ ...s, itemType: "skin" as const })),
  ];

  if (!pool.length) {
    return { type: "coins", rarity: "Common", label: "50 מטבעות", icon: "🪙", amount: 50 };
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];
  const isOwned = pick.itemType === "hero" ? ownedHeroIds.has(pick.id) : ownedSkinIds.has(pick.id);

  if (isOwned) {
    const coins = DUPE_COINS[pick.rarity] ?? 50;
    return { type: "coins", rarity: pick.rarity as LootItem["rarity"], label: `${coins} מטבעות`, icon: "🪙", amount: coins };
  }

  if (pick.itemType === "hero") {
    const gender     = (pick as { gender?: string }).gender      ?? "M";
    const colorTheme = (pick as { color_theme?: string }).color_theme ?? "default";
    return {
      type: "hero", rarity: pick.rarity as LootItem["rarity"],
      label: pick.name_he, icon: "🦸", amount: 0, _heroId: pick.id,
      _heroGender: gender as "M" | "F", _heroTheme: colorTheme,
    };
  }
  return {
    type: "skin", rarity: pick.rarity as LootItem["rarity"],
    label: pick.name_he, icon: "✨", amount: 0, _skinId: pick.id,
  };
}
