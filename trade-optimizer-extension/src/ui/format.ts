export const fmt1 = (n: number) => n.toFixed(1);
export const signed1 = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
export const money = (n: number) => `$${Math.round(n)}`;
export const ordinal = (n: number) => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return `${n}${suffix}`;
};
export const posClass = (position: string) => `pos pos-${position.toLowerCase()}`;
