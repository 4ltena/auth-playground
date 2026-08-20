import { scorePasswordStrength } from "@/lib/auth/password";

const LABELS = ["非常に弱い", "弱い", "普通", "強い", "非常に強い"];
const COLORS = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-600"];

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (password.length === 0) return null;
  const score = scorePasswordStrength(password);

  return (
    <div className="mt-1" aria-live="polite">
      <div className="flex gap-1 h-1.5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={`flex-1 rounded ${i <= score ? COLORS[score] : "bg-gray-200"}`} />
        ))}
      </div>
      <span className="text-[0.8rem] text-ink-soft">{LABELS[score]}</span>
    </div>
  );
}
