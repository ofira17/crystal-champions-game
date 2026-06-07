"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { PARENT_SUBJECTS, type MissionType, type ParentSubject } from "@/lib/terminology";
import type { ChildMissionConfig, ChildWithConfig, SaveMissionConfigPayload } from "@/types/mission";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Auth helper (parent only) ────────────────────────────

async function getParent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "לא מחובר למערכת", user: null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_blocked")
    .eq("id", user.id)
    .single();

  if (!profile || profile.is_blocked) return { error: "חשבון חסום", user: null, supabase };
  if (profile.role !== "parent" && profile.role !== "admin")
    return { error: "אין הרשאה", user: null, supabase };

  return { user, supabase, error: null };
}

// ─── Fetch all children with their configs ────────────────

export async function fetchChildrenWithConfigs(): Promise<ChildWithConfig[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();

  // Get all linked children
  const { data: links } = await admin
    .from("parent_child_links")
    .select("child_id")
    .eq("parent_id", user.id);

  if (!links?.length) return [];

  const childIds = links.map(l => l.child_id);

  const { data: childProfiles, error: cpError } = await admin
    .from("child_profiles")
    .select("id, display_name_he")
    .in("id", childIds);

  if (cpError) console.error("child_profiles fetch error:", cpError);

  // Fetch existing configs
  const { data: configs } = await admin
    .from("child_mission_config")
    .select("*")
    .in("child_profile_id", childIds);

  // Fetch active treasure map sets for each child
  const { data: treasureSets } = await admin
    .from("practice_sets")
    .select("id, title_he, assigned_child_id")
    .in("assigned_child_id", childIds)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const configMap = new Map<string, ChildMissionConfig>(
    (configs ?? []).map(c => [c.child_profile_id, c as ChildMissionConfig])
  );

  const treasureMapForChild = new Map<string, { id: string; title_he: string }>();
  for (const set of treasureSets ?? []) {
    if (set.assigned_child_id && !treasureMapForChild.has(set.assigned_child_id)) {
      treasureMapForChild.set(set.assigned_child_id, { id: set.id, title_he: set.title_he });
    }
  }

  const profileMap = new Map((childProfiles ?? []).map(p => [p.id, p]));

  return childIds.map(childId => {
    const cp = profileMap.get(childId);
    return {
      child_profile_id:    childId,
      display_name:        cp?.display_name_he ?? "",
      avatar_url:          null,
      config:              configMap.get(childId) ?? null,
      active_treasure_map: treasureMapForChild.get(childId) ?? null,
    };
  });
}

// ─── Save / upsert mission config ────────────────────────

export async function saveMissionConfig(
  payload: SaveMissionConfigPayload
): Promise<ActionResult<ChildMissionConfig>> {
  const { user, supabase, error: authError } = await getParent();
  if (authError || !user) return { success: false, error: authError! };

  // Validate ownership — parent must be linked to this child
  const admin2 = createAdminClient();
  const { data: link } = await admin2
    .from("parent_child_links")
    .select("child_id")
    .eq("parent_id", user.id)
    .eq("child_id", payload.child_profile_id)
    .single();

  if (!link) return { success: false, error: "אין גישה לילד זה" };

  // Validate subjects
  const validSubjects = payload.hero_training_subjects.filter(s =>
    PARENT_SUBJECTS.includes(s as ParentSubject)
  );

  const { data, error } = await supabase
    .from("child_mission_config")
    .upsert({
      child_profile_id:       payload.child_profile_id,
      parent_user_id:         user.id,
      grade_level:            payload.grade_level,
      active_mission_type:    payload.active_mission_type,
      hero_training_subjects: validSubjects,
    }, { onConflict: "child_profile_id" })
    .select()
    .single();

  if (error || !data) return { success: false, error: "שגיאה בשמירת ההגדרות" };

  // When treasure_map is selected, auto-create/activate a child_mission for the
  // child's active practice set so the child sees it immediately on their dashboard.
  if (payload.active_mission_type === "treasure_map") {
    const admin = createAdminClient();

    // First try: set assigned to this child
    // Second try: most recent active treasure_map by this parent (unassigned)
    // Third try: any non-archived set by this parent
    let { data: sets } = await admin
      .from("practice_sets")
      .select("id, title_he")
      .eq("assigned_child_id", payload.child_profile_id)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!sets?.length) {
      const res = await admin
        .from("practice_sets")
        .select("id, title_he")
        .eq("created_by", user.id)
        .eq("mission_type", "treasure_map")
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(1);
      sets = res.data;
    }

    if (!sets?.length) {
      const res = await admin
        .from("practice_sets")
        .select("id, title_he")
        .eq("created_by", user.id)
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(1);
      sets = res.data;
    }

    const activeSet = sets?.[0];
    if (activeSet) {
      // Assign this set to the child and mark active
      await admin
        .from("practice_sets")
        .update({ assigned_child_id: payload.child_profile_id, status: "active", mission_type: "treasure_map" })
        .eq("id", activeSet.id);

      // Archive any existing active child_missions for this child
      await admin
        .from("child_missions")
        .update({ status: "archived" })
        .eq("child_id", payload.child_profile_id)
        .eq("status", "active");

      await admin.from("child_missions").insert({
        child_id:           payload.child_profile_id,
        practice_set_id:    activeSet.id,
        title_he:           activeSet.title_he,
        mission_type:       "boss",
        status:             "active",
        selection_strategy: "random",
        questions_per_run:  20,
        created_by:         user.id,
      });
    }
  }

  await writeAudit(user.id, "mission_config_saved", "child_mission_config", data.id, {
    mission_type: payload.active_mission_type,
    grade_level:  payload.grade_level,
  });

  revalidatePath("/parent/mission-architect");
  return { success: true, data: data as ChildMissionConfig };
}

// ─── Fetch config for a specific child (used by child page) ──

export async function fetchChildMissionConfig(
  childProfileId: string
): Promise<ChildMissionConfig | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("child_mission_config")
    .select("*")
    .eq("child_profile_id", childProfileId)
    .single();
  return (data as ChildMissionConfig) ?? null;
}

// ─── Age-based auto question generator ───────────────────
// Used as the fallback question pool when a parent hasn't uploaded any.
// Covers the full Crystal Champions auto-question subject list:
// math, language (Hebrew), science, animals, space, geography,
// history, logic, memory, reading comprehension, general knowledge.

const AUTO_SUBJECTS_BY_GRADE: Record<number, string> = {
  1: "ספירה ומספרים עד 20, צבעים, חיות, אותיות וצלילים, דמיון פשוט, חיי יום-יום",
  2: "חיבור וחיסור עד 100, אוצר מילים בסיסי, חיות וצמחים, מזג אוויר, גוף האדם, סיפורים קצרים",
  3: "כפל וחילוק פשוטים, הבנת הנקרא, חלל ראשוני, יבשות ואוקיינוסים, היסטוריה ישראלית בסיסית, חידות לוגיות פשוטות",
  4: "שברים בסיסיים, דקדוק, מדעי הטבע, מערכת השמש, מפות ומדינות, אירועים היסטוריים, זיכרון ולוגיקה",
  5: "אחוזים ומשוואות פשוטות, ספרות וניתוח טקסט, ביולוגיה ופיזיקה ברמה ראשונית, גיאוגרפיה עולמית, היסטוריה כללית, חידות מתקדמות",
  6: "אלגברה ראשונית, ניתוח ספרותי, כימיה ופיזיקה, גיאוגרפיה מתקדמת, היסטוריה עולמית, לוגיקה ותכנות חשיבתי",
};

export async function generateWorldMysteriesTrivia(
  gradeLevel: number,
  count = 5
): Promise<ActionResult<Array<{
  question: string;
  options: [string, string, string, string];
  correct: "A" | "B" | "C" | "D";
  fun_fact: string;
}>>> {
  const grade  = Math.max(1, Math.min(6, Math.floor(gradeLevel)));
  const ageMin = grade + 5;
  const ageMax = grade + 6;
  const topics = AUTO_SUBJECTS_BY_GRADE[grade];

  const prompt = `צור ${count} שאלות חינוכיות מגוונות לילד בגיל ${ageMin}-${ageMax} (כיתה ${grade}).

הנחיות תוכן:
- שפה: עברית בלבד, ברורה ומתאימה לגיל
- גוונו בין הנושאים: מתמטיקה, שפה והבנת הנקרא, מדע, חיות, חלל, גיאוגרפיה, היסטוריה, לוגיקה, זיכרון, ידע כללי
- התאמת תוכן לכיתה ${grade}: ${topics}
- כל ${count} השאלות יחד צריכות לכסות לפחות 4 נושאים שונים — אל תרכז הכל בנושא אחד
- ניסוח קצר, מדויק, וחיובי. בלי שאלות שמבלבלות בכוונה
- אורך מקסימלי לשאלה: 25 מילים; אורך מקסימלי לתשובה: 12 מילים

הנחיות פורמט:
- 4 תשובות אפשריות (A/B/C/D), מהן אחת בלבד נכונה
- ההסחות חייבות להיות סבירות אך שגויות בבירור — לא דומות מדי לתשובה הנכונה
- עובדה מהנה (fun_fact) קצרה (עד 20 מילים) שמסבירה את התשובה הנכונה ומוסיפה ידע

החזר JSON בפורמט מדויק:
{
  "trivia": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct": "A",
      "fun_fact": "..."
    }
  ]
}`;

  try {
    const openai = await import("openai");
    const client = new openai.default({ apiKey: process.env.OPENAI_API_KEY });

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.9,
    });

    const raw = JSON.parse(resp.choices[0].message.content ?? "{}");
    const trivia = raw.trivia ?? [];

    return { success: true, data: trivia };
  } catch {
    return { success: false, error: "שגיאה ביצירת שאלות" };
  }
}
