"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMission } from "@/app/actions/mission-assignment";
import {
  PARENT_MISSION_LABELS,
  PARENT_MISSION_ICONS,
  type MissionType,
} from "@/lib/terminology";
import {
  STRATEGY_LABELS,
  STRATEGY_DESCRIPTIONS,
  QUESTIONS_PER_RUN_OPTIONS,
  type SelectionStrategy,
  type AdultRole,
  type MissionTargetType,
} from "@/types/mission-assignment";

interface ChildOption  { id: string; display_name_he: string }
interface ClassOption  { id: string; name_he: string }
interface SetOption    { id: string; title_he: string; subject_he: string; approved_count: number }

interface Props {
  role:        AdultRole;
  children:    ChildOption[];
  classes:     ClassOption[];
  sets:        SetOption[];
  redirectTo:  string;
}

const MISSION_TYPES: MissionType[] = ["treasure_map", "hero_training", "world_mysteries"];
const STRATEGIES:   SelectionStrategy[] = [
  "mixed", "random", "unattempted", "previously_wrong", "weakest_topics"
];

export function MissionForm({ role, children, classes, sets, redirectTo }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [practiceSetId,    setPracticeSetId]    = useState(sets[0]?.id ?? "");
  const [targetType,       setTargetType]       = useState<MissionTargetType>(role === "parent" ? "child" : "child");
  const [childId,          setChildId]          = useState(children[0]?.id ?? "");
  const [classId,          setClassId]          = useState(classes[0]?.id ?? "");
  const [titleHe,          setTitleHe]          = useState("");
  const [storyHe,          setStoryHe]          = useState("");
  const [questionsPerRun,  setQuestionsPerRun]  = useState<number>(20);
  const [customQuestions,  setCustomQuestions]  = useState("");
  const [isCustomQ,        setIsCustomQ]        = useState(false);
  const [missionType,      setMissionType]      = useState<MissionType>("hero_training");
  const [strategy,         setStrategy]         = useState<SelectionStrategy>("mixed");
  const [startsAt,         setStartsAt]         = useState("");
  const [endsAt,           setEndsAt]           = useState("");
  const [activate,         setActivate]         = useState(false);

  const effectiveQ = isCustomQ ? (parseInt(customQuestions) || 20) : questionsPerRun;
  const selectedSet = sets.find(s => s.id === practiceSetId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!practiceSetId) { setError("יש לבחור סט תרגול"); return; }
    if (!titleHe.trim()) { setError("יש לתת שם למשימה"); return; }
    if (targetType === "child" && !childId) { setError("יש לבחור ילד"); return; }
    if (targetType === "class" && !classId) { setError("יש לבחור כיתה"); return; }
    if (isCustomQ && (effectiveQ < 1 || effectiveQ > 100)) {
      setError("מספר שאלות חייב להיות בין 1 ל-100");
      return;
    }

    startTransition(async () => {
      const result = await createMission({
        practice_set_id:    practiceSetId,
        target_type:        targetType,
        child_profile_id:   targetType === "child" ? childId  : undefined,
        class_id:           targetType === "class" ? classId  : undefined,
        title_he:           titleHe,
        story_text_he:      storyHe,
        questions_per_run:  effectiveQ,
        mission_type:       missionType,
        selection_strategy: strategy,
        starts_at:          startsAt || undefined,
        ends_at:            endsAt   || undefined,
      }, role);

      if (!result.success) { setError(result.error); return; }

      // Optionally activate immediately
      if (activate) {
        const { activateMission } = await import("@/app/actions/mission-assignment");
        await activateMission(result.missionId, role);
      }

      router.push(redirectTo);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" dir="rtl">

      {/* Practice set */}
      <section className="flex flex-col gap-2">
        <label className="text-slate-300 font-semibold">סט שאלות</label>
        {sets.length === 0 ? (
          <p className="text-amber-400 text-sm bg-amber-900/20 border border-amber-500/30 rounded-xl p-3">
            אין סטי תרגול פעילים עם שאלות מאושרות. יש ליצור סט ולאשר שאלות תחילה.
          </p>
        ) : (
          <select
            value={practiceSetId}
            onChange={e => setPracticeSetId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
          >
            {sets.map(s => (
              <option key={s.id} value={s.id} className="bg-slate-800">
                {s.title_he} — {s.subject_he} ({s.approved_count} שאלות מאושרות)
              </option>
            ))}
          </select>
        )}
      </section>

      {/* Target: child or class */}
      <section className="flex flex-col gap-3">
        <label className="text-slate-300 font-semibold">שיוך משימה</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTargetType("child")}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              targetType === "child"
                ? "border-violet-500 bg-violet-900/30 text-white"
                : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            🧒 ילד ספציפי
          </button>
          {role !== "parent" && (
            <button
              type="button"
              onClick={() => setTargetType("class")}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                targetType === "class"
                  ? "border-violet-500 bg-violet-900/30 text-white"
                  : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              🏫 כיתה שלמה
            </button>
          )}
        </div>

        {targetType === "child" && (
          <select
            value={childId}
            onChange={e => setChildId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
          >
            {children.length === 0 && (
              <option value="" className="bg-slate-800">אין ילדים מקושרים</option>
            )}
            {children.map(c => (
              <option key={c.id} value={c.id} className="bg-slate-800">{c.display_name_he}</option>
            ))}
          </select>
        )}

        {targetType === "class" && (
          <select
            value={classId}
            onChange={e => setClassId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
          >
            {classes.length === 0 && (
              <option value="" className="bg-slate-800">אין כיתות מקושרות</option>
            )}
            {classes.map(c => (
              <option key={c.id} value={c.id} className="bg-slate-800">{c.name_he}</option>
            ))}
          </select>
        )}
      </section>

      {/* Mission identity */}
      <section className="flex flex-col gap-3">
        <label className="text-slate-300 font-semibold">זהות המשימה (כפי שהילד יראה)</label>
        <input
          value={titleHe}
          onChange={e => setTitleHe(e.target.value)}
          placeholder="שם המשימה — לדוג׳: 'מסע אל המערה האסורה'"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
          required
        />
        <div className="relative">
          <textarea
            value={storyHe}
            onChange={e => setStoryHe(e.target.value)}
            placeholder="סיפור המשימה — לדוג׳: 'נשק מסתורי הוסתר בעמק הדרקונים. רק גיבור חכם יצליח למצוא אותו...'"
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-violet-500"
          />
          <p className="text-violet-400/70 text-xs mt-1">
            💬 זהו ה-Lore שהגיבור יספר לילד לפני הקרב — מופיע בבועת דיבור קומיקס
          </p>
        </div>
      </section>

      {/* Mission type */}
      <section className="flex flex-col gap-2">
        <label className="text-slate-300 font-semibold">סוג המשימה</label>
        <div className="grid grid-cols-3 gap-3">
          {MISSION_TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setMissionType(t)}
              className={`flex flex-col gap-1 p-3 rounded-xl border text-right text-sm transition-all ${
                missionType === t
                  ? "border-violet-500 bg-violet-900/30 text-white"
                  : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              <span className="text-xl">{PARENT_MISSION_ICONS[t]}</span>
              <span className="font-medium">{PARENT_MISSION_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Questions per run */}
      <section className="flex flex-col gap-3">
        <label className="text-slate-300 font-semibold">
          מספר שאלות בכל סבב
        </label>
        <p className="text-violet-400/70 text-xs -mt-2">
          🔒 הילד לא יראה את המספר הזה — מבחינתו זו הרפתקה במשחק
        </p>
        <div className="flex gap-2 flex-wrap">
          {QUESTIONS_PER_RUN_OPTIONS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => { setQuestionsPerRun(n); setIsCustomQ(false); }}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                !isCustomQ && questionsPerRun === n
                  ? "border-violet-500 bg-violet-600 text-white"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsCustomQ(true)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              isCustomQ
                ? "border-violet-500 bg-violet-600 text-white"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            מותאם אישית
          </button>
        </div>
        {isCustomQ && (
          <input
            type="number"
            min={1}
            max={100}
            value={customQuestions}
            onChange={e => setCustomQuestions(e.target.value)}
            placeholder="הזן מספר (1-100)"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white w-40 focus:outline-none focus:border-violet-500"
          />
        )}
        {selectedSet && effectiveQ > selectedSet.approved_count && (
          <p className="text-amber-400 text-xs">
            ⚠️ הסט מכיל {selectedSet.approved_count} שאלות מאושרות — יבחרו עד {selectedSet.approved_count}
          </p>
        )}
      </section>

      {/* Selection strategy */}
      <section className="flex flex-col gap-2">
        <label className="text-slate-300 font-semibold">
          אסטרטגיית בחירת שאלות
          <span className="text-violet-400/70 font-normal text-xs mr-2">
            (הלוגיקה הסודית של ה-AI לקרב — הילד לא רואה זאת)
          </span>
        </label>
        <div className="flex flex-col gap-2">
          {STRATEGIES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStrategy(s)}
              className={`flex items-start gap-3 p-3 rounded-xl border text-right transition-all ${
                strategy === s
                  ? "border-violet-500 bg-violet-900/30"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 ${
                strategy === s ? "border-violet-400 bg-violet-400" : "border-slate-500"
              }`} />
              <div>
                <p className={`text-sm font-medium ${strategy === s ? "text-white" : "text-slate-300"}`}>
                  {STRATEGY_LABELS[s]}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{STRATEGY_DESCRIPTIONS[s]}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Dates */}
      <section className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-sm">תאריך התחלה (אופציונלי)</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={e => setStartsAt(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-sm">תאריך סיום (אופציונלי)</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={e => setEndsAt(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500"
          />
        </div>
      </section>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || sets.length === 0}
          onClick={() => setActivate(false)}
          className="px-5 py-2.5 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium rounded-xl transition-colors text-sm"
        >
          {isPending ? "שומר..." : "שמור כטיוטה"}
        </button>
        <button
          type="submit"
          disabled={isPending || sets.length === 0}
          onClick={() => setActivate(true)}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
        >
          {isPending ? "מפעיל..." : "⚡ הפעל משימה"}
        </button>
      </div>
    </form>
  );
}
