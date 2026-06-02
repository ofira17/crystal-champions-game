"use client";

import { useState } from "react";
import { AddChildForm } from "@/components/parent/AddChildForm";
import { ChildPinManager } from "@/components/parent/ChildPinManager";

export interface ChildSummary {
  id: string;
  display_name_he: string;
  grade_level: string | null;
  total_coins: number;
  total_stars: number;
  total_xp: number;
  child_login_enabled: boolean;
  locked_until: string | null;
}

interface Props {
  parentUserId: string;
  items:        ChildSummary[];
}

export function ChildrenManager({ parentUserId, items }: Props) {
  const [addOpen,    setAddOpen]    = useState(false);
  const [recentPin,  setRecentPin]  = useState<{ childId: string; pin: string } | null>(null);

  function dismissPin() {
    setRecentPin(null);
  }

  const hasRecentInList = recentPin
    ? items.some(c => c.id === recentPin.childId)
    : false;

  return (
    <div dir="rtl">
      {items.length > 0 && (
        <div className="flex flex-col gap-4 mb-6">
          <h2 className="text-slate-400 text-sm font-bold uppercase tracking-wider">
            ילדים מקושרים
          </h2>
          {items.map((child) => (
            <div
              key={child.id}
              className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-700/40 flex items-center justify-center text-2xl shrink-0">
                  🧒
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold">{child.display_name_he}</p>
                  <p className="text-slate-400 text-xs">כיתה {child.grade_level ?? "—"}</p>
                </div>
                <div className="flex gap-3 text-xs text-slate-400">
                  <span>🪙 {child.total_coins}</span>
                  <span>⭐ {child.total_stars}</span>
                  <span>✨ {child.total_xp} XP</span>
                </div>
              </div>

              {recentPin && recentPin.childId === child.id && (
                <div className="mt-4 p-4 rounded-xl bg-amber-900/30 border border-amber-700/50 flex flex-col gap-2">
                  <p className="text-amber-300 text-sm font-bold">
                    ✓ &quot;{child.display_name_he}&quot; נוצר/ה בהצלחה!
                  </p>
                  <p className="text-slate-300 text-xs">
                    קוד ה-PIN של הילד/ה (מוצג פעם אחת בלבד):
                  </p>
                  <p className="text-white text-4xl font-mono font-black tracking-[0.5em]">
                    {recentPin.pin}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    שמור את הקוד עכשיו. ניתן לאפס אותו בכל עת מרשימת הילדים.
                  </p>
                  <button
                    onClick={dismissPin}
                    className="text-slate-500 text-xs hover:text-slate-300 text-right"
                  >
                    הבנתי, סגור ×
                  </button>
                </div>
              )}

              <ChildPinManager
                childProfileId={child.id}
                parentUserId={parentUserId}
                childName={child.display_name_he}
                loginEnabled={child.child_login_enabled}
                lockedUntil={child.locked_until}
              />
            </div>
          ))}
        </div>
      )}

      {/* Fallback: revalidation hasn't surfaced the new child yet — show a card with the PIN anyway */}
      {recentPin && !hasRecentInList && (
        <div className="rounded-2xl border border-amber-700/40 bg-slate-800/50 p-4 mb-6">
          <div className="p-4 rounded-xl bg-amber-900/30 border border-amber-700/50 flex flex-col gap-2">
            <p className="text-amber-300 text-sm font-bold">✓ הילד/ה נוצר/ה בהצלחה!</p>
            <p className="text-slate-300 text-xs">קוד ה-PIN (מוצג פעם אחת בלבד):</p>
            <p className="text-white text-4xl font-mono font-black tracking-[0.5em]">
              {recentPin.pin}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              שמור את הקוד עכשיו. ניתן לאפס אותו בכל עת מרשימת הילדים.
            </p>
            <button
              onClick={dismissPin}
              className="text-slate-500 text-xs hover:text-slate-300 text-right"
            >
              הבנתי, סגור ×
            </button>
          </div>
        </div>
      )}

      {/* Separate add-child section under the list */}
      {addOpen ? (
        <AddChildForm
          parentUserId={parentUserId}
          onCreated={(childId, pin) => {
            setRecentPin({ childId, pin });
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="btn-3d btn-3d-violet w-full py-4 text-base"
        >
          ➕ הוסף ילד/ה חדש/ה
        </button>
      )}
    </div>
  );
}
