"use client";

import { useId, useState } from "react";
import { SoftwareKeyboard } from "./SoftwareKeyboard";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

export function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  showStrength = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "new-password" | "current-password";
  showStrength?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field flex-1"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="btn-ghost btn-sm shrink-0"
          aria-pressed={visible}
        >
          {visible ? "隠す" : "表示"}
        </button>
        <button
          type="button"
          onClick={() => setKeyboardOpen((v) => !v)}
          className="btn-ghost btn-sm shrink-0"
          aria-pressed={keyboardOpen}
          title="ソフトウェアキーボード（キーロガー対策）"
        >
          ⌨
        </button>
      </div>
      {showStrength ? <PasswordStrengthMeter password={value} /> : null}
      {keyboardOpen ? (
        <SoftwareKeyboard
          onKey={(char) => onChange(value + char)}
          onBackspace={() => onChange(value.slice(0, -1))}
        />
      ) : null}
    </div>
  );
}
