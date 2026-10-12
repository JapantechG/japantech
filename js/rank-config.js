// Ranked settings: single source of truth. Matchmaking comes later.
export const RANK_SEASON = "S01";
export const RANK_INITIAL_ELO = 1000;
export const RANK_RULES = Object.freeze({ questions: 20, secondsPerQuestion: 10, eloK: 32, initialSearchRange: 200 });
export const RANK_TIERS = Object.freeze([
  { name: "BRONZE", min: 0, icon: "🥉" },
  { name: "SILVER", min: 1000, icon: "🥈" },
  { name: "GOLD", min: 1200, icon: "🥇" },
  { name: "PLATINUM", min: 1400, icon: "💠" },
  { name: "DIAMOND", min: 1600, icon: "💎" },
  { name: "MASTER", min: 1800, icon: "👑" },
  { name: "GRANDMASTER", min: 2000, icon: "🏆" }
]);
export function getRankTier(elo) {
  const score = Math.max(0, Number(elo) || 0);
  return [...RANK_TIERS].reverse().find(t => score >= t.min) || RANK_TIERS[0];
}
export function getRankProgress(elo) {
  const tier = getRankTier(elo);
  const next = RANK_TIERS[RANK_TIERS.indexOf(tier) + 1] || null;
  const percent = next ? Math.min(100, Math.max(0, 100 * (elo - tier.min) / (next.min - tier.min))) : 100;
  return { tier, next, percent };
}
