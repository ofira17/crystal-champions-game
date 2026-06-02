"use client";

import { useState, useTransition } from "react";
import { createChild } from "@/app/actions/parent-children";

interface Props {
  parentUserId: string;
  onCreated?: (childId: string, pin: string) => void;
  onCancel?:  () => void;
}

const GRADES = ["א", "ב", "ג", "ד", "ה", "ו"];

export function AddChildForm({ parentUserId, onCreated, onCancel }: Props) {
  const [pending, startTransition] = useTransition();
  const [error,   setError]        = useState<string | null>(null);

  const [name,  setName]  = useState("");
  const [grade, setGrade] = useState("1");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("נא להזין שם ילד");
      return;
    }

    startTransition(async () => {
      const result = await createChild({ parentUserId, name, grade });
      if (result.success) {
        onCreated?.(result.childId, result.pin);
        setName(""); setGrade("1");
      } else {
        setError(result.error ?? "שגיאה לא ידועה");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6" dir="rtl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-white font-black text-lg">➕ הוסף ילד/ה חדש/ה</h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-500 text-sm hover:text-slate-300"
          >
            ביטול ×
          </button>
        )}
      </div>
      <p className="text-slate-400 text-sm mb-6">
        צור חשבון ילד/ה חדש/ה — הוא/היא יתחבר/ת עם קוד המשפחה והפין האישי
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-slate-400 text-xs mb-1.5">שם הילד/ה</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="למשל: יוסי כהן"
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 placeholder:text-slate-600"
          />
        </div>

        <div>
          <label className="block text-slate-400 text-xs mb-1.5">כיתה</label>
          <select
            value={grade}
            onChange={e => setGrade(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500"
          >
            {GRADES.map((g, i) => (
              <option key={i + 1} value={String(i + 1)}>כיתה {g}׳</option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="btn-3d btn-3d-violet py-3 text-base disabled:opacity-50 mt-2"
        >
          {pending ? "יוצר חשבון..." : "➕ צור חשבון ילד/ה"}
        </button>
      </form>
    </div>
  );
}
