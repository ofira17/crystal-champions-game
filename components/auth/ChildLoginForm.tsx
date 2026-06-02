"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { childLogin } from "@/app/actions/child-auth";

export function ChildLoginForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [step, setStep]     = useState<"family" | "pin">("family");

  const [familyCode, setFamilyCode] = useState("");
  const [pin, setPin]               = useState("");
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Focus first PIN box when entering PIN step
  useEffect(() => {
    if (step === "pin") {
      setTimeout(() => pinRefs[0].current?.focus(), 80);
    }
  }, [step]);

  function handleFamilySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (familyCode.replace(/\D/g, "").length !== 6) {
      setError("קוד משפחה חייב להיות 6 ספרות");
      return;
    }
    setError(null);
    setStep("pin");
  }

  function handlePinDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newPin = pin.split("");
    newPin[index] = digit;
    const next = newPin.join("");
    setPin(next);
    if (digit && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace") {
      if (!pin[index] && index > 0) {
        pinRefs[index - 1].current?.focus();
        const newPin = pin.split("");
        newPin[index - 1] = "";
        setPin(newPin.join(""));
      } else {
        const newPin = pin.split("");
        newPin[index] = "";
        setPin(newPin.join(""));
      }
    }
  }

  function handleLogin() {
    const cleanPin = pin.replace(/\D/g, "");
    if (cleanPin.length !== 4) {
      setError("PIN חייב להיות 4 ספרות");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await childLogin(familyCode.replace(/\D/g, ""), cleanPin);
      if (!result.success) {
        setError(result.error);
        setPin("");
        pinRefs[0].current?.focus();
        return;
      }
      // Navigate to Supabase's own verify endpoint — it sets session
      // cookies and redirects to /child automatically.
      window.location.href = result.actionLink;
    });
  }

  return (
    <div className="flex flex-col gap-6" dir="rtl">

      {step === "family" && (
        <form onSubmit={handleFamilySubmit} className="flex flex-col gap-5">
          <div className="text-center">
            <div className="text-5xl mb-3">👨‍👩‍👧</div>
            <h2 className="text-white font-black text-xl">כניסת ילד</h2>
            <p className="text-slate-400 text-sm mt-1">הכנס את קוד המשפחה שקיבלת מההורים</p>
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-2">קוד משפחה (6 ספרות)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={familyCode}
              onChange={e => setFamilyCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-4 text-white text-2xl font-mono text-center tracking-[0.3em] focus:outline-none focus:border-violet-500 placeholder:text-slate-700 placeholder:text-base placeholder:tracking-normal"
              dir="ltr"
              autoFocus
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="btn-3d btn-3d-violet py-3 text-base"
          >
            המשך ›
          </button>
        </form>
      )}

      {step === "pin" && (
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="flex flex-col gap-5">
          <div className="text-center">
            <div className="text-5xl mb-3">🔐</div>
            <h2 className="text-white font-black text-xl">הכנס קוד PIN</h2>
            <p className="text-slate-400 text-sm mt-1">קוד המשפחה: <span className="text-violet-400 font-mono">{familyCode}</span></p>
          </div>

          {/* PIN boxes */}
          <div className="flex justify-center gap-4" dir="ltr">
            {[0, 1, 2, 3].map(i => (
              <input
                key={i}
                ref={pinRefs[i]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={pin[i] ?? ""}
                onChange={e => handlePinDigit(i, e.target.value)}
                onKeyDown={e => handlePinKeyDown(i, e)}
                className="w-14 h-16 bg-slate-800 border-2 border-slate-600 rounded-xl text-white text-2xl font-bold text-center focus:outline-none focus:border-violet-500 transition-colors"
              />
            ))}
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={pending || pin.replace(/\D/g, "").length < 4}
            className="btn-3d btn-3d-violet py-3 text-base disabled:opacity-50"
          >
            {pending ? "נכנס..." : "🚀 כנס/י למשחק!"}
          </button>

          <button
            type="button"
            onClick={() => { setStep("family"); setPin(""); setError(null); }}
            className="text-slate-500 hover:text-slate-300 text-sm text-center transition-colors"
          >
            ← חזור לקוד משפחה
          </button>
        </form>
      )}
    </div>
  );
}
