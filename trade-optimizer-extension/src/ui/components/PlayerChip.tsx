import React from "react";
import type { Player } from "../../domain/types";
import { fmt1, money, posClass } from "../format";

export function PlayerChip({ player, marginal, showValue = true }: { player: Player; marginal?: number; showValue?: boolean }) {
  const est = player.tradeValueSource === "estimated";
  return (
    <span className="player">
      <span className={posClass(player.position)}>{player.position}</span>
      <span className="player-name" title={player.nflTeam ? `${player.name} · ${player.nflTeam}` : player.name}>
        {player.name}
      </span>
      {showValue ? (
        <span className="player-meta">
          <span className="num" title={est ? "Estimated: not in the trade value dataset" : "Trade value"}>
            {est ? "~" : ""}
            {money(player.tradeValue)}
          </span>
          <span className="sep">·</span>
          <span className="num" title="Median projection this week">
            {player.projectionSource === "dataset" ? fmt1(player.projection) : "—"}
          </span>
          {marginal !== undefined ? (
            <>
              <span className="sep">·</span>
              <span className="num muted" title="Marginal starting-lineup value">
                mv {fmt1(marginal)}
              </span>
            </>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
