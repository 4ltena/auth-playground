export const SECURITY_QUESTIONS = [
  { key: "first_pet", label: "初めて飼ったペットの名前は？" },
  { key: "elementary_school", label: "出身小学校の名前は？" },
  { key: "mother_maiden_name", label: "母親の旧姓は？" },
  { key: "childhood_friend", label: "幼なじみの名前は？" },
] as const;

export type SecurityQuestionKey = (typeof SECURITY_QUESTIONS)[number]["key"];

export function isSecurityQuestionKey(value: unknown): value is SecurityQuestionKey {
  return typeof value === "string" && SECURITY_QUESTIONS.some((q) => q.key === value);
}

export function securityQuestionLabel(key: string): string | null {
  return SECURITY_QUESTIONS.find((q) => q.key === key)?.label ?? null;
}
