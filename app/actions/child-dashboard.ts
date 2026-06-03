"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ENERGY_MAX } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────

export interface ChildProfile {
  id:              string;
  display_name_he: string;
  grade_level:     string | null;
  total_coins:     number;
  total_stars:     number;
  total_xp:        number;
  energy:          number;
  current_hero_id: string | null;
  current_world_id: string | null;
}

export interface HeroRecord {
  id:                  string;
  name_he:             string;
  rarity:              "Common" | "Rare" | "Epic" | "Legendary";
  gender:              "M" | "F";
  color_theme:         string;
  power_name_he:       string;
  description_he:      string;
}

export interface ActiveAdventure {
  id:                 string;
  title_he:           string;
  story_text_he:      string | null;
  mission_type:       string;
  selection_strategy: string;
}

export interface WorldWithProgress {
  world_id:         string;
  name_he:          string;
  description_he:   string;
  order_index:      number;
  required_stars:   number;
  boss_name_he:     string;
  theme:            string;
  is_unlocked:      boolean;
  is_completed:     boolean;
  boss_hp_remaining: number;
  progress_percent: number;
}

export interface ChildDashboardData {
  profile:         ChildProfile | null;
  hero:            HeroRecord   | null;
  activeAdventure: ActiveAdventure | null;
  worlds:          WorldWithProgress[];
  energyMax:       number;
}

// ─── Main dashboard loader ────────────────────────────────

export async function getChildDashboardData(): Promise<ChildDashboardData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { profile: null, hero: null, activeAdventure: null, worlds: [], energyMax: ENERGY_MAX };

  // ── 1. Child profile ──────────────────────────────────
  const { data: profile } = await supabase
    .from("child_profiles")
    .select("id, display_name_he, grade_level, total_coins, total_stars, total_xp, energy, current_hero_id, current_world_id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return { profile: null, hero: null, activeAdventure: null, worlds: [], energyMax: ENERGY_MAX };

  const admin = createAdminClient();

  // ── 2. Hero ───────────────────────────────────────────
  // Ensure child has at least one hero (onboarding fallback)
  if (!profile.current_hero_id) {
    await admin.rpc("ensure_child_has_hero", { p_child_id: profile.id });
    // Re-fetch profile to pick up the newly assigned hero
    const { data: refreshed } = await supabase
      .from("child_profiles")
      .select("id, display_name_he, grade_level, total_coins, total_stars, total_xp, energy, current_hero_id, current_world_id")
      .eq("user_id", user.id)
      .single();
    if (refreshed) Object.assign(profile, refreshed);
  }

  let hero: HeroRecord | null = null;
  if (profile.current_hero_id) {
    const { data: heroData } = await supabase
      .from("heroes")
      .select("id, name_he, rarity, color_theme, power_name_he, description_he")
      .eq("id", profile.current_hero_id)
      .single();
    hero = heroData as HeroRecord | null;
  }

  // Fallback: first unlocked hero for this child
  if (!hero) {
    const { data: unlocked } = await supabase
      .from("unlocked_heroes")
      .select("heroes(id, name_he, rarity, color_theme, power_name_he, description_he)")
      .eq("child_id", profile.id)
      .limit(1)
      .single();
    if (unlocked?.heroes) {
      hero = unlocked.heroes as unknown as HeroRecord;
    }
  }

  // ── 3. Active adventure (from child_missions) ─────────
  const { data: missionData } = await admin
    .from("child_missions")
    .select("id, title_he, story_text_he, mission_type, selection_strategy")
    .eq("child_id", profile.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let activeAdventure: ActiveAdventure | null = missionData
    ? {
        id:                 missionData.id,
        title_he:           missionData.title_he,
        story_text_he:      missionData.story_text_he ?? null,
        mission_type:       missionData.mission_type,
        selection_strategy: missionData.selection_strategy,
      }
    : null;

  // Fallback: if no DB mission exists, check mission config for hero_training mode.
  // hero_training uses auto-generated questions and does not create a child_missions row.
  // Without this fallback, children in hero_training mode always see the button disabled.
  if (!activeAdventure) {
    const { data: cfg } = await admin
      .from("child_mission_config")
      .select("active_mission_type, hero_training_subjects")
      .eq("child_profile_id", profile.id)
      .maybeSingle();

    const missionType = cfg?.active_mission_type ?? "hero_training";
    if (missionType === "hero_training" || missionType === "world_mysteries") {
      activeAdventure = {
        id:                 missionType,
        title_he:           missionType === "hero_training" ? "אימון גיבורים" : "תעלומות עולם",
        story_text_he:      null,
        mission_type:       missionType,
        selection_strategy: "random",
      };
    }
  }

  // ── 4. Worlds + progress ──────────────────────────────
  await admin.rpc("init_child_world_progress", { p_child_id: profile.id });

  const [worldsRes, progressRes] = await Promise.all([
    supabase.from("worlds").select("id, name_he, description_he, order_index, required_stars, boss_name_he, theme").order("order_index"),
    supabase.from("world_progress").select("world_id, is_unlocked, is_completed, boss_hp_remaining, progress_percent").eq("child_id", profile.id),
  ]);

  const progressMap = new Map(
    (progressRes.data ?? []).map(p => [p.world_id, p])
  );

  const worlds: WorldWithProgress[] = (worldsRes.data ?? []).map(w => {
    const prog = progressMap.get(w.id);
    return {
      world_id:          w.id,
      name_he:           w.name_he,
      description_he:    w.description_he,
      order_index:       w.order_index,
      required_stars:    w.required_stars,
      boss_name_he:      w.boss_name_he,
      theme:             w.theme,
      is_unlocked:       prog?.is_unlocked  ?? (w.order_index === 1),
      is_completed:      prog?.is_completed ?? false,
      boss_hp_remaining: prog?.boss_hp_remaining ?? 100,
      progress_percent:  prog?.progress_percent  ?? 0,
    };
  });

  return {
    profile:         profile as ChildProfile,
    hero,
    activeAdventure,
    worlds,
    energyMax:       ENERGY_MAX,
  };
}
