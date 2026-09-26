// Deterministic natural-language explanation of a simulated trade, built
// entirely from the simulation facts (no LLM).

import type { Player } from "../domain/types";
import type { TradeSimulation, TeamSimulation } from "./tradeSimulator";
import type { LeagueAnalysis, TeamAnalysis } from "./teamAnalyzer";
import type { Acceptance } from "./tradeScorer";

export interface TradeExplanation {
  headline: string;
  userSide: string[];
  opponentSide: string[];
  overall: string[];
}

const fmt = (n: number) => n.toFixed(1);
const SLOT_ORDER = ["QB", "RB", "WR", "TE", "FLEX", "RB/WR", "WR/TE", "SFLEX", "K", "D/ST"];
function slotOrder(key: string): number {
  const base = key.replace(/\d+$/, "");
  const idx = SLOT_ORDER.indexOf(base);
  return (idx === -1 ? 99 : idx) * 10 + (Number(key.match(/\d+$/)?.[0]) || 0);
}
const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
const money = (n: number) => `$${Math.round(n)}`;

function names(players: Player[]): string {
  if (players.length === 0) return "nobody";
  if (players.length === 1) return players[0].name;
  return `${players.slice(0, -1).map((p) => p.name).join(", ")} and ${players[players.length - 1].name}`;
}

function slotOf(sim: TeamSimulation, player: Player): string | null {
  const a = sim.after.assignments.find((x) => x.player?.id === player.id);
  return a ? a.slot.key : null;
}

function describeSide(sim: TeamSimulation, team: TeamAnalysis, sends: Player[], receives: Player[], who: "You" | "They"): string[] {
  const lines: string[] = [];
  const possessive = who === "You" ? "your" : "their";
  const surplus = team.positionalSurplus.filter((s) => s.level === "high" || s.level === "very high").map((s) => s.position);
  const bySlotOrder = (a: string, b: string) => slotOrder(a) - slotOrder(b);
  const holes = team.holes.map((h) => h.key).sort(bySlotOrder);
  const weak = team.weaknesses.filter((w) => w.severity > 2 && !w.isHole).slice(0, 2).map((w) => w.key).sort(bySlotOrder);
  const construction: string[] = [];
  if (surplus.length) construction.push(`excess ${surplus.join("/")} depth`);
  if (holes.length) construction.push(`${holes.length > 1 ? "near-replacement starters at" : "a near-replacement starter at"} ${holes.join(", ")}`);
  else if (weak.length) construction.push(`a weak ${weak.join(" and ")}`);
  if (construction.length) lines.push(`${who} have ${construction.join(" and ")}.`);

  for (const p of sends) {
    const marginal = team.playerMarginalValues[p.id] ?? 0;
    if (marginal <= 0.05) lines.push(`${p.name} is currently outside ${possessive} optimal lineup (marginal value 0.0).`);
    else if (marginal <= 3) lines.push(`${p.name} starts for ${who === "You" ? "you" : "them"} but is worth only ${fmt(marginal)} marginal lineup points.`);
    else lines.push(`${p.name} starts for ${who === "You" ? "you" : "them"} (${fmt(marginal)} marginal lineup points), so the incoming players must cover that.`);
  }
  for (const p of receives) {
    const slot = slotOf(sim, p);
    if (slot) lines.push(`${p.name} becomes ${possessive} ${slot} (${fmt(p.projection)} projected).`);
    else lines.push(`${p.name} (${fmt(p.projection)} projected) adds depth but does not start.`);
  }
  for (const add of sim.waiverAdds) lines.push(`The open roster spot is filled from waivers by ${add.name} (${fmt(add.projection)} projected).`);
  for (const drop of sim.drops) lines.push(`${drop.name} (${fmt(drop.projection)} projected) is dropped to make room.`);

  const improved = sim.slotChanges.filter((c) => c.delta > 0.05);
  const worsened = sim.slotChanges.filter((c) => c.delta < -0.05);
  if (improved.length) lines.push(`Improves: ${improved.map((c) => `${c.key} ${fmt(c.beforeProjection)} → ${fmt(c.afterProjection)}`).join(", ")}.`);
  if (worsened.length) lines.push(`Gives up: ${worsened.map((c) => `${c.key} ${fmt(c.beforeProjection)} → ${fmt(c.afterProjection)}`).join(", ")}.`);
  if (sim.holesBefore > sim.holesAfter) lines.push(`Eliminates ${sim.holesBefore - sim.holesAfter} near-replacement starting slot${sim.holesBefore - sim.holesAfter > 1 ? "s" : ""}.`);
  lines.push(`Net: ${signed(sim.projectionGain)} projected starting points (${fmt(sim.projectionBefore)} → ${fmt(sim.projectionAfter)}).`);
  return lines;
}

export function explainTrade(sim: TradeSimulation, analysis: LeagueAnalysis, acceptance: Acceptance): TradeExplanation {
  const user = analysis.user!;
  const opp = analysis.teams.find((t) => t.teamId === sim.candidate.partnerTeamId)!;
  const sends = sim.candidate.userSends;
  const receives = sim.candidate.userReceives;

  const headline = `Send ${names(sends)} to ${opp.teamName} for ${names(receives)}: your lineup ${signed(sim.user.projectionGain)}, theirs ${signed(sim.opponent.projectionGain)}.`;
  const overall: string[] = [
    `You gain ${signed(sim.user.projectionGain)} projected starting points (${fmt(sim.user.projectionBefore)} → ${fmt(sim.user.projectionAfter)}).`,
    `${opp.teamName} ${sim.opponent.projectionGain >= 0 ? "gains" : "loses"} ${signed(sim.opponent.projectionGain)} (${fmt(sim.opponent.projectionBefore)} → ${fmt(sim.opponent.projectionAfter)}).`,
    `Trade value: you send ${money(sim.user.tradeValueSent)} and receive ${money(sim.user.tradeValueReceived)} (${acceptance.tradeValueDifference < 0.5 ? "even" : `differ by ${money(acceptance.tradeValueDifference)}`}).`,
  ];
  if (acceptance.opponentReasons.length) overall.push(`Why they say yes: ${acceptance.opponentReasons.join("; ")}.`);

  return {
    headline,
    userSide: describeSide(sim.user, user, sends, receives, "You"),
    opponentSide: describeSide(sim.opponent, opp, receives, sends, "They"),
    overall,
  };
}
