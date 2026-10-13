export const STRENGTH_LABELS = ["Weak", "Fair", "Good", "Strong"];

export function passwordStrength(password) {
  const value = typeof password === "string" ? password : "";
  if (value.length === 0) return { score: 0, label: STRENGTH_LABELS[0] };

  let score = 0;
  if (value.length >= 10) score += 1;
  if (value.length >= 14) score += 1;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(value)).length;
  if (classes >= 3) score += 1;
  if (classes >= 4 && value.length >= 12) score += 1;

  const clamped = Math.max(0, Math.min(STRENGTH_LABELS.length - 1, score));
  return { score: clamped, label: STRENGTH_LABELS[clamped] };
}
