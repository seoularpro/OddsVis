// Weekly median projections from BettingPros consensus props.
//
// Extracted from TotalContainer so other views (e.g. the ESPN lineup import)
// can compute the exact same numbers. The logic is unchanged; it just takes
// the season as a parameter and returns results instead of setting state.

import { UNIVERSAL_VIG } from "./constants";
import {
  americanToDecimal,
  calculateLatestChange,
  getLastElementMap,
  impliedYards,
  isFetchable,
} from "./util";

// Base URL for the BettingPros data files. Defaults to the committed files on
// GitHub; override with REACT_APP_BP_BASE (e.g. "/BettingProsFiles/" served
// from public/) to test locally-generated files before committing them.
export const BP_BASE =
  process.env.REACT_APP_BP_BASE ||
  "https://raw.githubusercontent.com/seoularpro/OddsVis/main/BettingProsFiles/";
// Same name cleanup the projection parsers apply to BettingPros names; use it
// on names from other sources (ESPN) before looking up a projection.
export function normalizePlayerName(name) {
  return (name || "")
    .replace(/\./g, "")
    .replace(/ jr/i, "")
    .replace(/ sr/i, "")
    .replace(/ Jr/i, "");
}

/**
 * @param {{ pos: number, mode: number, week: number, year: number }} opts
 *   pos: 0 QB, 1 RB, 2 WR, 3 TE, 98 FLEX, 99 SUPERFLEX (all positions)
 *   mode: 0 Half PPR, 1 Standard, 2 Full PPR
 * @returns {Promise<{ finalList: [string, { ev: number, change: number, pos: number }][],
 *   missingList: [string, string, string][] }>}
 */
export async function computeBPProjections({ pos, mode, week, year }) {
    let receptionMultiplier = 0.5;

    if (mode == 0) receptionMultiplier = 0.5;
    else if (mode == 1) receptionMultiplier = 0;
    else if (mode == 2) receptionMultiplier = 1;

    //https://www.bovada.lv/services/sports/event/v2/events/A/description/football/nfl

    let testedInts = 0;
    let lastTestedInt = 0;
    let isNewBovadaFileCheck = false;

    let bovadaFileLoopFlag = true;

    let playerToAnyTDDataPoints = new Map();
    let playerToRushYdsDataPoints = new Map();
    let playerToRushRecYdsDataPoints = new Map();
    let playerToRecYdsDataPoints = new Map();
    let playerToRecsDataPoints = new Map();
    let playerToPassTDDataPoints = new Map();
    let playerToPassYdsDataPoints = new Map();
    let playerToIntsDataPoints = new Map();
    let yearPrefix = year != 2023 ? year : "";
    let playerToPosition = new Map();
    // Players whose yardage line was materially corrected for lopsided odds
    // (see impliedYards). Surfaced in the table as a footnote marker.
    const YARDAGE_ADJUST_FLAG = 0.05; // relative shift that earns a marker
    let playerToAdjustedProps = new Map();
    const flagAdjusted = (playerName, label, line, implied) => {
      const l = Number(line);
      if (!(l > 0) || !Number.isFinite(implied)) return;
      if (Math.abs(implied - l) / l > YARDAGE_ADJUST_FLAG) {
        const list = playerToAdjustedProps.get(playerName) || [];
        if (!list.includes(label)) list.push(label);
        playerToAdjustedProps.set(playerName, list);
      }
    };

    // const url = 'https://api.bettingpros.com/v3/props?limit=10000&sport=NFL&market_id=73:74:102:103:101:107:76:105:75:104:66:71:78&event_id=21371:21372:21375:21376:21377:21378:21379:21380:21381:21382:21383:21393:21394:21395:21396:21397&include_selections=false&include_markets=true&include_counts=true'

    // const params = {
    //   method: 'get',
    //   headers: {
    //     "x-api-key": 'CHi8Hy5CEE4khd46XNYL23dCFX96oUdw6qOt1Dnh'
    //   }
    // }

    // await  fetch(url, params).then((response) => {
    //   return response.json();
    // }).then((data) => {
    //   console.log(data);
    // })

    // return;

    while (bovadaFileLoopFlag) {
      if (testedInts > lastTestedInt) {
        isNewBovadaFileCheck = true;
        lastTestedInt++;
      }

      // await fetch(
      //   "https://raw.githubusercontent.com/seoularpro/OddsVis/main/FanduelFiles/" +
      //   yearPrefix +
      //   "week" +
      //   week +
      //   "" +
      //   testedInts
      // ).then((response) => {
      //   return response.json();
      // }).then((data) => {
      //   console.log(data);
      // })

      await fetch(
        BP_BASE +
          yearPrefix +
          "week" +
          week +
          "" +
          testedInts
      )
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          // console.log(data);
          let allMarkets = data.props.slice();

          // Fallback: /props is missing consensus lines for some players
          // (e.g. QB anytime-TD / interceptions), but /offers still has them.
          // For any (market, player) absent from /props, synthesize a
          // props-shaped entry from the distilled /offers data so the same
          // parsing loops below pick it up. See BettingProFetch.yml.
          if (Array.isArray(data.offers)) {
            const cleanName = (n) =>
              (n || "")
                .replace(/\./g, "")
                .replace(/ jr/i, "")
                .replace(/ sr/i, "")
                .replace(/ Jr/i, "");
            const present = new Set(
              allMarkets.map(
                (m) => m.market_id + "|" + cleanName(m.participant?.name)
              )
            );
            for (const o of data.offers) {
              const key = o.market_id + "|" + cleanName(o.name);
              if (present.has(key)) continue;
              present.add(key);
              // /offers has no pass-TD projection, so derive it from the
              // over line + odds (the projection.value the passTD loop reads).
              let projValue = 0;
              if (o.market_id == 102) {
                projValue =
                  o.line -
                  0.5 +
                  1 / americanToDecimal(o.odds) / UNIVERSAL_VIG;
              }
              allMarkets.push({
                market_id: o.market_id,
                participant: {
                  name: o.name,
                  player: { position: o.position || "" },
                },
                over: { consensus_odds: o.odds, consensus_line: o.line },
                projection: { value: projValue },
              });
            }
          }

          let allTDMarket = allMarkets.filter(
            (market) => market.market_id == 78
          );
          let rushYdsMarket = allMarkets.filter(
            (market) => market.market_id == 107
          );
          let recYdsMarket = allMarkets.filter(
            (market) => market.market_id == 105
          );
          let recsMarket = allMarkets.filter(
            (market) => market.market_id == 104
          );
          let passTDMarket = allMarkets.filter(
            (market) => market.market_id == 102
          );
          let passYdsMarket = allMarkets.filter(
            (market) => market.market_id == 103
          );
          let intMarket = allMarkets.filter(
            (market) => market.market_id == 101
          );

          // console.log(recYdsMarket)

          if (typeof allTDMarket !== "undefined") {
            let amonRaFlag = false;
            for (let j = 0; j < allTDMarket.length; j++) {
              let playerOdds = allTDMarket[j];

              let name = playerOdds.participant.name.slice();

              name = name
                .replace(/\./g, "")
                .replace(/ jr/i, "")
                .replace(/ sr/i, "")
                .replace(/ Jr/i, "");

              let position = playerOdds.participant.player.position.slice();
              if (position == "QB") {
                playerToPosition.set(name, 0);
              } else if (position == "RB") {
                playerToPosition.set(name, 1);
              } else if (position == "WR") {
                playerToPosition.set(name, 2);
              } else if (position == "TE") {
                playerToPosition.set(name, 3);
              }

              // if (
              //   name == "Amon-Ra St.Brown" ||
              //   name == "Amon-Ra St. Brown"
              // ) {
              //   name = "Amon-Ra St. Brown";
              // }

              // if (playerOdds.description == "AJ Brown ") {
              //   playerOdds.description = playerOdds.description.slice(0, -1);
              // }
              // if (playerOdds.description == "Gardner Minshew") {
              //   playerOdds.description = "Gardner Minshew II";
              // }
              // if (playerOdds.description == "Devon Achane (MIA)") {
              //   playerOdds.description = "De'Von Achane (MIA)";
              // }
              // if (playerOdds.description == "Brian Robinson") {
              //   playerOdds.description = "Brian Robinson (WAS)";
              // }
              // if (playerOdds.description == "D'Andre Swift") {
              //   playerOdds.description = "D'Andre Swift (CHI)";
              // }
              // if (playerOdds.description == "Gabriel Davis (JAX)") {
              //   playerOdds.description = "Gabe Davis (JAX)";
              // }
              // if (playerOdds.description == "Rome Odunze (CHI) ") {
              //   playerOdds.description = playerOdds.description.slice(0, -1);
              // } if (playerOdds.description == "Chigoziem Okonkwo (TEN)") {
              //   playerOdds.description = "Chig Okonkwo (TEN)";
              // }

              // if (!amonRaFlag) {
              let newAnyTDList = [];
              if (playerToAnyTDDataPoints.has(name)) {
                newAnyTDList = playerToAnyTDDataPoints.get(name).slice();
              }
              newAnyTDList.push(
                (1 /
                  americanToDecimal(playerOdds.over.consensus_odds) /
                  UNIVERSAL_VIG) *
                  6
              );
              playerToAnyTDDataPoints.set(name, newAnyTDList);
            }

            // if (name == "Amon-Ra St. Brown") {
            //   amonRaFlag = true;
            // }
            // }
          }

          if (typeof rushYdsMarket !== "undefined") {
            // let amonRaFlag = false;
            for (let j = 0; j < rushYdsMarket.length; j++) {
              let playerOdds = rushYdsMarket[j];
              let name = playerOdds.participant.name.slice();
              // if (name == "Amon-Ra St.Brown" || name == "Amon-Ra St. Brown") {
              //   name = "Amon-Ra St. Brown";
              // }
              name = name
                .replace(/\./g, "")
                .replace(/ jr/i, "")
                .replace(/ sr/i, "")
                .replace(/ Jr/i, "");
              // if (name == "AJ Brown ") {
              //   name = name.slice(0, -1);
              // }
              // if (name == "Deebo Samuel") {
              //   name = "Deebo Samuel (SF)"
              // }

              let position = playerOdds.participant.player.position.slice();
              if (!playerToPosition.has(name)) {
                if (position == "QB") {
                  playerToPosition.set(name, 0);
                } else if (position == "RB") {
                  playerToPosition.set(name, 1);
                } else if (position == "WR") {
                  playerToPosition.set(name, 2);
                } else if (position == "TE") {
                  playerToPosition.set(name, 3);
                }
              }

              // if (!amonRaFlag) {
              let newRushYdsList = [];
              if (playerToRushYdsDataPoints.has(name)) {
                newRushYdsList = playerToRushYdsDataPoints.get(name);
              }
              const rushImplied = impliedYards(
                playerOdds.over.consensus_line,
                playerOdds.over.consensus_odds
              );
              flagAdjusted(
                name,
                "RushYds",
                playerOdds.over.consensus_line,
                rushImplied
              );
              newRushYdsList.push(rushImplied / 10);
              playerToRushYdsDataPoints.set(name, newRushYdsList);
              // }
              // if (name == "Amon-Ra St. Brown") {
              //   amonRaFlag = true;
              // }
            }
          }
          if (typeof recYdsMarket !== "undefined") {
            // let amonRaFlag = false;
            for (let j = 0; j < recYdsMarket.length; j++) {
              let playerOdds = recYdsMarket[j];
              let name = playerOdds.participant.name.slice();
              // if (name == "Amon-Ra St.Brown" || name == "Amon-Ra St. Brown") {
              //   name = "Amon-Ra St. Brown";
              // }
              name = name
                .replace(/\./g, "")
                .replace(/ jr/i, "")
                .replace(/ sr/i, "")
                .replace(/ Jr/i, "");
              // if (name == "AJ Brown ") {
              //   name = name.slice(0, -1);
              // }
              // if (name == "Deebo Samuel") {
              //   name = "Deebo Samuel (SF)"
              // }

              let position = playerOdds.participant.player.position.slice();
              if (!playerToPosition.has(name)) {
                if (position == "QB") {
                  playerToPosition.set(name, 0);
                } else if (position == "RB") {
                  playerToPosition.set(name, 1);
                } else if (position == "WR") {
                  playerToPosition.set(name, 2);
                } else if (position == "TE") {
                  playerToPosition.set(name, 3);
                }
              }

              // if (!amonRaFlag) {
              let newRecYdsList = [];
              if (playerToRecYdsDataPoints.has(name)) {
                newRecYdsList = playerToRecYdsDataPoints.get(name);
              }

              const recImplied = impliedYards(
                playerOdds.over.consensus_line,
                playerOdds.over.consensus_odds
              );
              flagAdjusted(
                name,
                "RecYds",
                playerOdds.over.consensus_line,
                recImplied
              );
              newRecYdsList.push(recImplied / 10);
              playerToRecYdsDataPoints.set(name, newRecYdsList);
              // }
              // if (name == "Amon-Ra St. Brown") {
              //   amonRaFlag = true;
              // }
            }
          }
          if (typeof recsMarket !== "undefined") {
            // let amonRaFlag = false;

            for (let j = 0; j < recsMarket.length; j++) {
              let playerOdds = recsMarket[j];
              let name = playerOdds.participant.name.slice();
              // if (name == "Amon-Ra St.Brown" || name == "Amon-Ra St. Brown") {
              //   name = "Amon-Ra St. Brown";
              // }
              name = name
                .replace(/\./g, "")
                .replace(/ jr/i, "")
                .replace(/ sr/i, "")
                .replace(/ Jr/i, "");

              let position = playerOdds.participant.player.position.slice();
              if (!playerToPosition.has(name)) {
                if (position == "QB") {
                  playerToPosition.set(name, 0);
                } else if (position == "RB") {
                  playerToPosition.set(name, 1);
                } else if (position == "WR") {
                  playerToPosition.set(name, 2);
                } else if (position == "TE") {
                  playerToPosition.set(name, 3);
                }
              }
              // if (name == "Deebo Samuel") {
              //   name = "Deebo Samuel (SF)"
              // }
              // if (name == "AJ Brown ") {
              //   name = name.slice(0, -1);
              // }
              // if (!amonRaFlag) {
              let newRecsList = [];
              if (playerToRecsDataPoints.has(name)) {
                newRecsList = playerToRecsDataPoints.get(name);
              }
              let handicap = playerOdds.over.consensus_line;
              handicap =
                handicap -
                0.5 +
                1 /
                  americanToDecimal(playerOdds.over.consensus_odds) /
                  UNIVERSAL_VIG;
              newRecsList.push(handicap * receptionMultiplier);
              playerToRecsDataPoints.set(name, newRecsList);
              // }

              // if (name == "Amon-Ra St. Brown") {
              //   amonRaFlag = true;
              // }
            }
          }
          if (typeof passYdsMarket !== "undefined") {
            for (let j = 0; j < passYdsMarket.length; j++) {
              let playerOdds = passYdsMarket[j];
              let name = playerOdds.participant.name.slice();
              name = name
                .replace(/\./g, "")
                .replace(/ jr/i, "")
                .replace(/ sr/i, "")
                .replace(/ Jr/i, "");
              let position = playerOdds.participant.player.position.slice();
              if (!playerToPosition.has(name)) {
                if (position == "QB") {
                  playerToPosition.set(name, 0);
                } else if (position == "RB") {
                  playerToPosition.set(name, 1);
                } else if (position == "WR") {
                  playerToPosition.set(name, 2);
                } else if (position == "TE") {
                  playerToPosition.set(name, 3);
                }
              }
              // if (name == "AJ Brown ") {
              //   name = name.slice(0, -1);
              // }

              let newPassYdsList = [];
              if (playerToPassYdsDataPoints.has(name)) {
                newPassYdsList = playerToPassYdsDataPoints.get(name);
              }
              const passImplied = impliedYards(
                playerOdds.over.consensus_line,
                playerOdds.over.consensus_odds
              );
              flagAdjusted(
                name,
                "PassYds",
                playerOdds.over.consensus_line,
                passImplied
              );
              newPassYdsList.push(passImplied / 25);
              playerToPassYdsDataPoints.set(name, newPassYdsList);
            }
          }
          if (typeof passTDMarket !== "undefined") {
            for (let j = 0; j < passTDMarket.length; j++) {
              let playerOdds = passTDMarket[j];
              let name = playerOdds.participant.name.slice();
              name = name
                .replace(/\./g, "")
                .replace(/ jr/i, "")
                .replace(/ sr/i, "")
                .replace(/ Jr/i, "");
              let position = playerOdds.participant.player.position.slice();
              if (!playerToPosition.has(name)) {
                if (position == "QB") {
                  playerToPosition.set(name, 0);
                } else if (position == "RB") {
                  playerToPosition.set(name, 1);
                } else if (position == "WR") {
                  playerToPosition.set(name, 2);
                } else if (position == "TE") {
                  playerToPosition.set(name, 3);
                }
              }
              // if (name == "AJ Brown ") {
              //   name = name.slice(0, -1);
              // }

              let newPassTdsList = [];
              if (playerToPassTDDataPoints.has(name)) {
                newPassTdsList = playerToPassTDDataPoints.get(name);
              }
              let handicap = playerOdds.over.consensus_line;
              // handicap =
              //   handicap -
              //   0.5 +
              //   1 / playerOdds.outcomes[0].price.decimal / UNIVERSAL_VIG;

              // temporary hack
              handicap = playerOdds.projection.value;
              newPassTdsList.push(handicap * 4);
              playerToPassTDDataPoints.set(name, newPassTdsList);
            }
          }
          if (typeof intMarket !== "undefined") {
            for (let j = 0; j < intMarket.length; j++) {
              let playerOdds = intMarket[j];
              let name = playerOdds.participant.name.slice();
              name = name
                .replace(/\./g, "")
                .replace(/ jr/i, "")
                .replace(/ sr/i, "")
                .replace(/ Jr/i, "");
              let position = playerOdds.participant.player.position.slice();
              if (!playerToPosition.has(name)) {
                if (position == "QB") {
                  playerToPosition.set(name, 0);
                } else if (position == "RB") {
                  playerToPosition.set(name, 1);
                } else if (position == "WR") {
                  playerToPosition.set(name, 2);
                } else if (position == "TE") {
                  playerToPosition.set(name, 3);
                }
              }
              // if (name == "AJ Brown ") {
              //   name = name.slice(0, -1);
              // }

              let newIntsList = [];

              if (playerToIntsDataPoints.has(name)) {
                newIntsList = playerToIntsDataPoints.get(name);
              }
              let handicap = playerOdds.over.consensus_line;
              handicap =
                handicap -
                0.5 +
                1 /
                  americanToDecimal(playerOdds.over.consensus_odds) /
                  UNIVERSAL_VIG;
              newIntsList.push(handicap * -2);
              playerToIntsDataPoints.set(name, newIntsList);
            }
          }
        })
        .catch((e) => {});

      testedInts++;
      isNewBovadaFileCheck = false;
      bovadaFileLoopFlag = await isFetchable(
        BP_BASE +
          yearPrefix +
          "week" +
          week +
          "" +
          testedInts
      );
    }

    // console.log(playerToAnyTDDataPoints)
    // console.log(playerToRushYdsDataPoints)
    // console.log(playerToRecYdsDataPoints)
    // console.log(playerToRecsDataPoints)
    // console.log(playerToPassTDDataPoints)
    // console.log(playerToPassYdsDataPoints)
    // console.log(playerToIntsDataPoints)
    // return;
    // playerToRecYdsDataPoints.set("De'Von Achane (MIA)", [2.85]);
    // playerToRecsDataPoints.set("James Cook (BUF)", [1.25]);
    // playerToRecsDataPoints.set("Travis Etienne (JAX)", [1.675]);
    // playerToRecsDataPoints.set("Jerome Ford (CLE)", [1.28]);
    // playerToRecsDataPoints.set("Zach Charbonnet (SEA)", [1.33]);

    let playerToAnyTD = getLastElementMap(playerToAnyTDDataPoints);
    let playerToRushYds = getLastElementMap(playerToRushYdsDataPoints);
    let playerToRushRecYds = getLastElementMap(playerToRushRecYdsDataPoints);
    let playerToRecYds = getLastElementMap(playerToRecYdsDataPoints);
    let playerToRecs = getLastElementMap(playerToRecsDataPoints);
    let playerToPassTD = getLastElementMap(playerToPassTDDataPoints);
    let playerToPassYds = getLastElementMap(playerToPassYdsDataPoints);
    let playerToInts = getLastElementMap(playerToIntsDataPoints);

    let latestCPlayerToAnyTD = calculateLatestChange(playerToAnyTDDataPoints);
    let latestCPlayerToRushYds = calculateLatestChange(
      playerToRushYdsDataPoints
    );
    let latestCPlayerToRushRecYds = calculateLatestChange(
      playerToRushRecYdsDataPoints
    );
    let latestCPlayerToRecYds = calculateLatestChange(playerToRecYdsDataPoints);
    let latestCPlayerToRecs = calculateLatestChange(playerToRecsDataPoints);
    let latestCPlayerToPassTD = calculateLatestChange(playerToPassTDDataPoints);
    let latestCPlayerToPassYds = calculateLatestChange(
      playerToPassYdsDataPoints
    );
    let latestCPlayerToInts = calculateLatestChange(playerToIntsDataPoints);

    let finalPlayerToEV = new Map();
    let finalPlayerToDPCount = new Map();
    let finalCPlayer = new Map();
    function sumPlayerEVs() {
      Array.from(arguments).forEach((arg) => {
        arg.forEach((value, key) => {
          let temp = value;
          if (finalPlayerToEV.has(key)) {
            temp = finalPlayerToEV.get(key);
            temp += value;
          }
          finalPlayerToEV.set(key, temp);
        });
      });
    }
    function sumPlayerChanges() {
      Array.from(arguments).forEach((arg) => {
        arg.forEach((value, key) => {
          let temp = value;
          if (finalCPlayer.has(key)) {
            temp = finalCPlayer.get(key);
            temp += value;
          }
          finalCPlayer.set(key, temp);
        });
      });
    }
    function sumPlayerDP() {
      Array.from(arguments).forEach((arg) => {
        arg.forEach((value, key) => {
          let temp = 1;
          if (finalPlayerToDPCount.has(key)) {
            temp = finalPlayerToDPCount.get(key);
            temp++;
          }
          finalPlayerToDPCount.set(key, temp);
        });
      });
    }
    sumPlayerEVs(
      playerToAnyTD,
      playerToRushYds,
      playerToRecYds,
      playerToRecs,
      playerToPassTD,
      playerToPassYds,
      playerToInts
    );
    sumPlayerDP(
      playerToAnyTD,
      playerToRushYds,
      playerToRecYds,
      playerToRecs,
      playerToPassTD,
      playerToPassYds,
      playerToInts
    );
    sumPlayerChanges(
      latestCPlayerToAnyTD,
      latestCPlayerToRushYds,
      latestCPlayerToRecYds,
      latestCPlayerToRecs,
      latestCPlayerToPassTD,
      latestCPlayerToPassYds,
      latestCPlayerToInts
    );

    const mapEntries = Array.from(finalPlayerToEV.entries());
    // Sort the array based on the numeric value (assuming values are numbers)
    mapEntries.sort((a, b) => b[1] - a[1]);

    // Create a new Map from the sorted array
    const sortedMap = new Map(mapEntries);
    let finalList;
    // if (year == 2023) {
    //   finalList = Array.from(sortedMap.entries()).filter(
    //     (x) =>
    //       typeof PlayerPosMap23.get(x[0]) !== "undefined" &&
    //       (PlayerPosMap23.get(x[0]) == pos ||
    //         pos == 99 ||
    //         (pos == 98 && PlayerPosMap23.get(x[0]) !== 0)) &&
    //       x[1] > 1
    //   );
    // } else {
    finalList = Array.from(sortedMap.entries()).filter(
      (x) =>
        playerToPosition.get(x[0]) == pos ||
        pos == 99 ||
        (pos == 98 && playerToPosition.get(x[0]) != 0 && x[1] > 1)
      // playerToPosition.get(x[0])
      // typeof PlayerPosMapNoPos.get(x[0]) !== "undefined" &&
      // (PlayerPosMapNoPos.get(x[0]) == pos ||
      //   pos == 99 ||
      //   (pos == 98 && PlayerPosMapNoPos.get(x[0]) !== 0)) &&
    );

    // }
    let replacedRushRecFlag = false;
    let missingList = [];
    if (pos == 0) {
      finalList = finalList.filter((d) => {
        let qbHasAllValues =
          playerToAnyTD.has(d[0]) &&
          playerToRushYds.has(d[0]) &&
          playerToPassTD.has(d[0]) &&
          playerToPassYds.has(d[0]) &&
          playerToInts.has(d[0]);

        if (!qbHasAllValues) {
          let qbMessage = "";
          if (!playerToAnyTD.has(d[0])) {
            qbMessage = qbMessage.concat(" AnyTD ");
          }
          if (!playerToRushYds.has(d[0])) {
            qbMessage = qbMessage.concat(" RushYds ");
          }
          if (!playerToPassTD.has(d[0])) {
            qbMessage = qbMessage.concat(" PassTDs ");
          }
          if (!playerToPassYds.has(d[0])) {
            qbMessage = qbMessage.concat(" PassYds ");
          }
          if (!playerToInts.has(d[0])) {
            qbMessage = qbMessage.concat(" Ints ");
          }
          missingList.push([d[0], qbMessage, d[1].toFixed(2)]);
        }
        return qbHasAllValues;
      });
    } else if (pos == 1) {
      finalList = finalList.filter((d, di) => {
        let rbHasAllValues =
          playerToAnyTD.has(d[0]) &&
          playerToRushYds.has(d[0]) &&
          playerToRecYds.has(d[0]) &&
          playerToRecs.has(d[0]);
        if (!rbHasAllValues) {
          if (
            (playerToAnyTD.has(d[0]) &&
              !playerToRushYds.has(d[0]) &&
              playerToRecYds.has(d[0]) &&
              playerToRecs.has(d[0])) ||
            (playerToAnyTD.has(d[0]) &&
              playerToRushYds.has(d[0]) &&
              !playerToRecYds.has(d[0]) &&
              playerToRecs.has(d[0])) ||
            (playerToAnyTD.has(d[0]) &&
              !playerToRushYds.has(d[0]) &&
              !playerToRecYds.has(d[0]) &&
              playerToRecs.has(d[0]))
          ) {
            if (playerToRushRecYdsDataPoints.has(d[0])) {
              if (playerToRushYds.has(d[0])) {
                finalList[di][1] = finalList[di][1] - playerToRushYds.get(d[0]);
              }
              if (playerToRecYds.has(d[0])) {
                finalList[di][1] = finalList[di][1] - playerToRecYds.get(d[0]);
              }
              finalList[di][1] =
                finalList[di][1] + playerToRushRecYds.get(d[0]);
              replacedRushRecFlag = true;
              return true;
            }
          }
          let rbMessage = "";
          if (!playerToAnyTD.has(d[0])) {
            rbMessage = rbMessage.concat(" AnyTD ");
          }
          if (!playerToRushYds.has(d[0])) {
            rbMessage = rbMessage.concat(" RushYds ");
          }
          if (!playerToRecYds.has(d[0])) {
            rbMessage = rbMessage.concat(" RecYds ");
          }
          if (!playerToRecs.has(d[0])) {
            rbMessage = rbMessage.concat(" Recs ");
          }
          missingList.push([d[0], rbMessage, d[1].toFixed(2)]);
        }
        return rbHasAllValues;
      });
    } else if (pos == 2 || pos == 3) {
      finalList = finalList.filter((d) => {
        let WRHasAllValues =
          playerToAnyTD.has(d[0]) &&
          playerToRecYds.has(d[0]) &&
          playerToRecs.has(d[0]);
        if (!WRHasAllValues) {
          let wrteMessage = "";
          if (!playerToAnyTD.has(d[0])) {
            wrteMessage = wrteMessage.concat(" AnyTD ");
          }
          if (!playerToRecYds.has(d[0])) {
            wrteMessage = wrteMessage.concat(" RecYds ");
          }
          if (!playerToRecs.has(d[0])) {
            wrteMessage = wrteMessage.concat(" Recs ");
          }
          missingList.push([d[0], wrteMessage, d[1].toFixed(2)]);
        }

        return WRHasAllValues;
      });
    } else if (pos == 98) {
      finalList = finalList.filter((d) => {
        let flexHasAllValues =
          (playerToAnyTD.has(d[0]) &&
            playerToRecYds.has(d[0]) &&
            playerToRecs.has(d[0])) ||
          (playerToAnyTD.has(d[0]) &&
            playerToRushYds.has(d[0]) &&
            playerToRecYds.has(d[0]) &&
            playerToRecs.has(d[0]));
        return flexHasAllValues;
      });
    } else if (pos == 99) {
      finalList = finalList.filter((d) => {
        let flexHasAllValues =
          (playerToAnyTD.has(d[0]) &&
            playerToRecYds.has(d[0]) &&
            playerToRecs.has(d[0])) ||
          (playerToAnyTD.has(d[0]) &&
            playerToRushYds.has(d[0]) &&
            playerToRecYds.has(d[0]) &&
            playerToRecs.has(d[0])) ||
          (playerToAnyTD.has(d[0]) &&
            playerToRushYds.has(d[0]) &&
            playerToPassTD.has(d[0]) &&
            playerToPassYds.has(d[0]) &&
            playerToInts.has(d[0]));

        return flexHasAllValues;
      });
    }

    finalList = finalList.slice();
    finalList = finalList.sort((a, b) => b[1] - a[1]);

    finalList = finalList.filter((elem) => {
      return elem[1] > 5;
    });

    finalList = finalList.map((elem) => {
      return [
        elem[0],
        {
          ev: elem[1],
          change: finalCPlayer.get(elem[0]),
          pos: playerToPosition.get(elem[0]),
          adjustedProps: playerToAdjustedProps.get(elem[0]) || [],
        },
      ];
    });
    return { finalList, missingList };
}
