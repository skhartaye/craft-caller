import type { Service } from "./studio.ts";
export function validateServiceContent(s: Service): string | null {
  for (const key of ["name", "company", "description", "reason"] as const)
    if (!s[key].trim())
      return "Enter a service name, business, description, and reason for calling.";
  for (const key of [
    "name",
    "company",
    "audience",
    "goal",
    "greeting",
  ] as const)
    if (s[key].length > 500)
      return "Keep names, opening messages, and short fields under 500 characters.";
  for (const key of ["description", "reason", "rules"] as const)
    if (s[key].length > 4000)
      return "Keep each description or instruction under 4,000 characters.";
  if (s.faqs.length > 30) return "Use at most 30 approved answers per service.";
  if (new Set(s.faqs.map((f) => f.id)).size !== s.faqs.length)
    return "Each answer must have a unique identifier.";
  if (
    s.faqs.some(
      (f) =>
        !f.id ||
        !f.question.trim() ||
        !f.answer.trim() ||
        f.question.length > 200 ||
        f.answer.length > 1000,
    )
  )
    return "Each answer needs a question (up to 200 characters) and answer (up to 1,000 characters).";
  return null;
}
export type Decision = {
  action: "answer" | "clarify" | "stop" | "busy";
  answerIds: string[];
};
export function resolveDecision(value: unknown, s: Service) {
  const fallback = {
    text: "I don’t have an approved answer for that. Would you like our team to clarify it?",
    source: "No approved answer selected",
    ended: false,
  };
  if (!value || typeof value !== "object") return fallback;
  const d = value as Decision;
  if (d.action === "stop")
    return {
      text: "Understood. I’ll end this practice conversation. Thank you for your time.",
      source: "Stop request · practice ended",
      ended: true,
    };
  if (d.action === "busy")
    return {
      text: "Of course. Would you prefer that our team follow up at another time?",
      source: "Busy response · no callback scheduled",
      ended: false,
    };
  if (
    d.action !== "answer" ||
    !Array.isArray(d.answerIds) ||
    !d.answerIds.length ||
    d.answerIds.length > 2
  )
    return fallback;
  const ids = [...new Set(d.answerIds)];
  const answers = ids.map((id) => s.faqs.find((f) => f.id === id));
  if (answers.some((a) => !a)) return fallback;
  return {
    text: answers.map((f) => f!.answer).join(" "),
    source: `AI matched approved answers: ${answers.map((f) => f!.question).join(" / ")}`,
    ended: false,
  };
}
