// Every tunable of the optimizer in one place. Values are chosen so that the
// priority hierarchy (user lineup gain >> weakness fix > mutual benefit >
// fairness > depth) cannot invert; see tradeScorer.ts for how the caps
// enforce that.

export interface TradeShape {
  /** Players the user sends. */
  send: number;
  /** Players the user receives. */
  receive: number;
}

export interface OptimizerConfig {
  /** Package shapes to search, e.g. 1-for-1, 2-for-1, 1-for-2, 2-for-2. */
  shapes: TradeShape[];
  /** Most valuable N user players considered as outgoing assets. */
  maxOutgoingCandidates: number;
  /** Most valuable N opponent players considered as incoming targets. */
  maxIncomingCandidates: number;
  /** Trade partners to search (all opponents if larger than the league). */
  maxPartners: number;

  /** Trade value fairness: |sent - received| must be within this share of the larger side... */
  maxTradeValueDifferencePercent: number;
  /** ...or within this absolute dollar slack, whichever is larger. */
  tradeValueAbsoluteSlack: number;

  /** Minimum user starting-lineup gain for a trade to be worth showing. */
  minUserGain: number;
  /** Opponent lineup gain that counts as a clear benefit on its own. */
  clearOpponentGain: number;
  /** Largest opponent lineup loss ever tolerated (only with another rational benefit). */
  maxOpponentLoss: number;
  /** Trade value gain (dollars) that counts as a rational benefit for a projection-neutral opponent... */
  opponentValueGainThreshold: number;
  /** ...and it must also be at least this percent of what the opponent sends. */
  opponentValueGainPercent: number;
  /** Largest opponent lineup loss a non-lineup reason (value, hole, depth) can justify. */
  maxOpponentLossForSecondaryReasons: number;

  /** A starter within this many points of replacement level is a roster hole. */
  holeMarginPoints: number;
  /** Players with marginal lineup value at or below this are "expendable". */
  expendableMarginalValue: number;

  /** Secondary-score caps. Their sum is the band of user gain within which
   *  secondary factors may reorder trades. Keep the sum below 1.0. */
  weights: {
    weaknessCap: number;
    mutualCap: number;
    fairnessCap: number;
    depthCap: number;
  };
  /** Opponent gain that earns the full mutual-benefit bonus. */
  mutualScalePoints: number;
  /** Hole points recovered that earn the full weakness bonus. */
  weaknessScalePoints: number;
  /** Depth change (bench points above replacement) that earns the full depth bonus. */
  depthScalePoints: number;

  /** Number of trades to return. */
  topN: number;
  /** Cap on results with the same partner so the top 5 are not five variants of one deal. */
  maxTradesPerPartner: number;
  /** Trade value used for unlisted players: estimated from projection, or zero. */
  unlistedTradeValue: "estimate" | "zero";
  /** Free waiver upgrades applied to every roster before analysis (0 disables). */
  baselineWaiverMoves: number;
}

export const DEFAULT_CONFIG: OptimizerConfig = {
  shapes: [
    { send: 1, receive: 1 },
    { send: 2, receive: 1 },
    { send: 1, receive: 2 },
    { send: 2, receive: 2 },
  ],
  maxOutgoingCandidates: 12,
  maxIncomingCandidates: 12,
  maxPartners: 20,

  maxTradeValueDifferencePercent: 15,
  tradeValueAbsoluteSlack: 4,

  minUserGain: 0.5,
  clearOpponentGain: 0.25,
  maxOpponentLoss: 1.0,
  opponentValueGainThreshold: 5,
  opponentValueGainPercent: 10,
  maxOpponentLossForSecondaryReasons: 0.5,

  holeMarginPoints: 1.5,
  expendableMarginalValue: 1.0,

  weights: { weaknessCap: 0.4, mutualCap: 0.3, fairnessCap: 0.15, depthCap: 0.1 },
  mutualScalePoints: 4,
  weaknessScalePoints: 8,
  depthScalePoints: 6,

  topN: 5,
  maxTradesPerPartner: 2,
  unlistedTradeValue: "estimate",
  baselineWaiverMoves: 2,
};

export function mergeConfig(overrides?: Partial<OptimizerConfig>): OptimizerConfig {
  if (!overrides) return DEFAULT_CONFIG;
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    weights: { ...DEFAULT_CONFIG.weights, ...(overrides.weights ?? {}) },
  };
}

/** Sum of the secondary caps: the band of user gain inside which they matter. */
export function secondaryBand(config: OptimizerConfig): number {
  const w = config.weights;
  return w.weaknessCap + w.mutualCap + w.fairnessCap + w.depthCap;
}
