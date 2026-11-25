export type FAQ = { id: string; question: string; answer: string };
export type Service = {
  id: string;
  name: string;
  company: string;
  audience: string;
  description: string;
  reason: string;
  goal: string;
  greeting: string;
  rules: string;
  faqs: FAQ[];
  archived: boolean;
};
export type Message = {
  role: "caller" | "customer";
  text: string;
  source?: string;
};
export const sample: Service = {
  id: "sample-service",
  name: "Website design",
  company: "Your studio",
  audience: "Small business owners",
  description:
    "We design clear, mobile-friendly websites that help customers understand your services and get in touch.",
  reason: "To see whether improving your website is a current priority.",
  goal: "Arrange a discovery conversation",
  greeting:
    "Hi, I’m an AI assistant calling on behalf of Your studio. We help small businesses with their websites. Is now an okay time for a quick question?",
  rules:
    "Keep answers friendly and under two sentences. Answer only the question asked. Never invent pricing, availability, or results. Ask one question at a time. Respect a no immediately.",
  faqs: [
    {
      id: "faq-price",
      question: "How much does it cost?",
      answer:
        "Pricing depends on what your website needs. Our team can confirm a quote after a discovery conversation.",
    },
    {
      id: "faq-service",
      question: "What do you do?",
      answer:
        "We design mobile-friendly websites that make your services clear and help customers contact you.",
    },
    {
      id: "faq-time",
      question: "How long does it take?",
      answer:
        "The timeline depends on the project. Our team can confirm a schedule once they understand your needs.",
    },
  ],
  archived: false,
};
export function freshService(): Service {
  return {
    id: crypto.randomUUID(),
    name: "",
    company: "",
    audience: "",
    description: "",
    reason: "",
    goal: "Arrange a discovery conversation",
    greeting: "",
    rules: sample.rules,
    faqs: [],
    archived: false,
  };
}
export function opening(s: Service) {
  return (
    s.greeting ||
    `Hi, I’m an AI assistant calling on behalf of ${s.company || "the team"}. ${s.reason || "Is now an okay time to talk?"}`
  );
}
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 &&
        ![
          "the",
          "you",
          "your",
          "does",
          "what",
          "how",
          "are",
          "can",
          "and",
          "for",
        ].includes(w),
    );
export function practiceReply(
  text: string,
  s: Service,
): { text: string; source: string; ended?: boolean } {
  if (
    /\b(stop|unsubscribe)\b|do not call|don.t call|remove (me|my)|not interested/i.test(
      text,
    )
  )
    return {
      text: "Understood. I’ll end this practice conversation. Thank you for your time.",
      source: "Stop request · practice ended",
      ended: true,
    };
  if (/\b(busy|later|bad time)\b/i.test(text))
    return {
      text: "Of course. Would you prefer that our team follow up at another time?",
      source: "Busy response · no callback scheduled",
    };
  const tokens = words(text);
  const ranked = s.faqs
    .map((f) => ({
      f,
      score: words(f.question).filter((w) => tokens.includes(w)).length,
    }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (best && best.score > 0)
    return {
      text: best.f.answer,
      source: `Approved answer: ${best.f.question}`,
    };
  return {
    text: "I don’t have an approved answer for that. Would you like our team to clarify it?",
    source: "Unknown question · no answer invented",
  };
}
export function validService(s: unknown): s is Service {
  if (!s || typeof s !== "object") return false;
  const v = s as Service;
  return (
    [
      "id",
      "name",
      "company",
      "audience",
      "description",
      "reason",
      "goal",
      "greeting",
      "rules",
    ].every(
      (k) => typeof (v as unknown as Record<string, unknown>)[k] === "string",
    ) &&
    typeof v.archived === "boolean" &&
    Array.isArray(v.faqs) &&
    v.faqs.every(
      (f) =>
        f &&
        typeof f.id === "string" &&
        typeof f.question === "string" &&
        typeof f.answer === "string",
    )
  );
}
