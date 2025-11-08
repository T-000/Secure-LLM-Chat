export type RiskHit = { type: string; snippet: string };

const RULES: { type: string; re: RegExp }[] = [
  { type: "override_instruction", re: /\b(ignore|bypass)\b.*\b(instructions|rules|guardrails)\b/i },
  { type: "jailbreak_marker",     re: /\b(do anything now|dan|dev mode)\b/i },
  { type: "data_exfiltration",    re: /\b(leak|export|share|exfiltrate)\b.*\b(passwords?|keys?|tokens?|secrets?)\b/i },
  { type: "prompt_injection",     re: /\b(system|developer)\s+prompt\b.*\b(reveal|print|show)\b/i },
  { type: "pii_request",          re: /\b(ssn|social security|身份证号|银行卡号|cvv|住址)\b/i },
];

export function analyzePrompt(text: string) {
  const hits: RiskHit[] = [];
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) hits.push({ type: r.type, snippet: m[0] });
  }
  return { score: Math.min(1, hits.length * 0.25), hits };
}
