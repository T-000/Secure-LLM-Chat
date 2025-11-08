export type AuditHit = { type: string; snippet: string };

const OUT_RULES: { type: string; re: RegExp }[] = [
  // 粗粒度 PII/敏感检查（示例规则，可后续扩展/替换为更严谨方案）
  { type: "pii", re: /\b(\d{16}|\d{3}-\d{2}-\d{4}|身份证号|银行卡号|cvv|地址|phone|手机号)\b/i },
  { type: "toxic", re: /\b(dumb|stupid|idiot|垃圾|蠢)\b/i },
];

export function auditOutput(text: string) {
  const hits: AuditHit[] = [];
  for (const r of OUT_RULES) {
    const m = text.match(r.re);
    if (m) hits.push({ type: r.type, snippet: m[0] });
  }
  const score = Math.min(1, hits.length * 0.2);
  const note = hits.length ? "Potential sensitive content detected." : "OK";
  return { score, hits, note };
}
