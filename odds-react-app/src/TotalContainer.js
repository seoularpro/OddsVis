import "./styles.css";
import React, { useState, useEffect } from "react";
import {
  PlayerPosMap,
  PlayerPosMap23,
  PlayerPosMapNoPos,
  slotcodes,
  UNIVERSAL_VIG,
} from "./constants";
import SangTable from "./SangTable";
import {
  isFetchable,
  getLastElementMap,
  calculateLatestChange,
  getQueryStringValue,
  americanToDecimal,
} from "./util";
import MissingTable from "./MissingTable";
import ThemeToggleDropdown from "./ThemeToggleDropdown";

function TotalContainer() {
  const [selectedPosition, setSelectedPosition] = useState(2);
  const [playerList, setPlayerList] = useState([]);
  const [playerMap, setPlayerMap] = useState(new Map());
  const [allMap, setAllMap] = useState(new Map());
  const [recentMap, setRecentMap] = useState(new Map());
  const [selectedMode, setSelectedMode] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedTheme, setSelectedTheme] = useState(1);
  const [playerMissingList, setPlayerMissingList] = useState([]);
  const [apiSource, setApiSource] = useState(0);

  // var skewness = require('compute-skewness');
  // console.log(skewness([24.5, 15.2, 5.4, 14.9, 9.6, 21.4, 14.2, 43, 19.5]))

  const handleClick = () => {
    window.open("https://venmo.com/sanghan", "_blank", "noopener,noreferrer");
  };

  const handleTradeClick = () => {
    window.location.href = "/tradeValues";
  };

  const scrapeAllActualEspnStats = async (tempWeek) => {
    let otherMap = new Map();
    let weekIndex = 1;
    while (weekIndex < tempWeek) {
      await fetch(`./week${weekIndex}hppr`)
        .then((response) => {
          return response.json();
        })
        .then((r) => {
          let data = [];
          const d = r;
          // console.log(d);
          for (const week of d.schedule) {
            // console.log(week);
            if (weekIndex == week.matchupPeriodId) {
              let allPlayers = week.away.rosterForCurrentScoringPeriod.entries
                .slice()
                .concat(week.home.rosterForMatchupPeriod.entries.slice());

              // const tmid = tm.id;
              for (const p of allPlayers) {
                let name = p.playerPoolEntry.player.fullName;
                const slot = p.lineupSlotId;
                const pos = slotcodes[slot];

                // Injured status (need try/catch because of D/ST)
                let inj = "NA";
                try {
                  inj = p.playerPoolEntry.player.injuryStatus;
                } catch (error) {
                  // Do nothing, leave 'NA' as the default value for injured status
                }

                // Projected/actual points
                let proj = null,
                  act = null;

                for (const stat of p.playerPoolEntry.player.stats) {
                  // if (stat.scoringPeriodId !== weekIndex-1) {
                  //   continue;
                  // }
                  if (stat.statSourceId === 0) {
                    act = stat.appliedTotal;
                  } else if (stat.statSourceId === 1) {
                    proj = stat.appliedTotal;
                  }
                }

                name = name
                  .replace(/\./g, "")
                  .replace(/ jr/i, "")
                  .replace(/ sr/i, "")
                  .replace(/ Jr/i, "");
                data.push([weekIndex, name, slot, pos, inj, proj, act]);
                // console.log([weekIndex, name, slot, pos, inj, proj, act])
                if (otherMap.has(name)) {
                  let tempPlayer = otherMap.get(name);
                  while (tempPlayer.act.length < weekIndex - 1) {
                    tempPlayer = { act: tempPlayer.act.slice().concat([null]) };
                  }
                  if (typeof act?.toFixed(2) == "undefined") {
                    otherMap.set(name, {
                      // proj: tempPlayer.proj.slice().concat([proj?.toFixed(2)]),
                      act: tempPlayer.act.slice().concat([null]),
                    });
                  } else {
                    otherMap.set(name, {
                      // proj: tempPlayer.proj.slice().concat([proj?.toFixed(2)]),
                      act: tempPlayer.act.slice().concat([act?.toFixed(2)]),
                    });
                  }
                } else {
                  let tempPlayer = {
                    // proj: [],
                    act: [],
                  };
                  while (tempPlayer.act.length < weekIndex - 1) {
                    tempPlayer = { act: tempPlayer.act.slice().concat([null]) };
                  }
                  if (typeof act?.toFixed(2) == "undefined") {
                    tempPlayer = { act: tempPlayer.act.concat([null]) };
                  } else {
                    tempPlayer = {
                      act: tempPlayer.act.concat([act?.toFixed(2)]),
                    };
                  }
                  otherMap.set(name, tempPlayer);
                }
              }
            }
          }
        })
        .catch((e) => {
          console.log(e);
          otherMap.clear();
          // increment here just in case return doesnt break out
          weekIndex = weekIndex + 1;
          return;
        });
      for (const [key, value] of otherMap.entries()) {
        if (value.act.length < weekIndex) {
          let valCopy = otherMap.get(key);
          valCopy = { act: valCopy.act.slice().concat([null]) };
          otherMap.set(key, valCopy);
        }
      }
      weekIndex = weekIndex + 1;
    }
    // console.log(otherMap)

    setAllMap(otherMap);
  };

  const scrapeEspnStats = async (week) => {
    //https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2024/segments/0/leagues/995547?view=mMatchup&view=mMatchupScore
    const getUrl =
      "https://raw.githubusercontent.com/seoularpro/OddsVis/main/ESPNAPIFiles/testHppr";
    // const getUrl = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2024/segments/0/leagues/995547?view=mBoxscore&view=mMatchupScore&view=mRoster&view=mSettings&view=mStatus&view=mTeam&view=modular&view=mNav"
    // weekly url https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2024/segments/0/leagues/995547?scoringPeriodId=11&view=modular&view=mNav&view=mMatchupScore&view=mScoreboard&view=mSettings&view=mTopPerformers&view=mTeam
    // we may need to return to this but currently just use the latest one as it has past history as well
    //  "https://raw.githubusercontent.com/seoularpro/OddsVis/main/ESPNAPIFiles/week" + week + "hppr";

    await fetch(getUrl)
      .then((response) => {
        return response.json();
      })
      .then((r) => {
        let data = [];
        const d = r;
        for (const tm of d.teams) {
          const tmid = tm.id;
          for (const p of tm.roster.entries) {
            let name = p.playerPoolEntry.player.fullName;
            const slot = p.lineupSlotId;
            const pos = slotcodes[slot];

            // Injured status (need try/catch because of D/ST)
            let inj = "NA";
            try {
              inj = p.playerPoolEntry.player.injuryStatus;
            } catch (error) {
              // Do nothing, leave 'NA' as the default value for injured status
            }

            // Projected/actual points
            let proj = null,
              act = null;

            for (const stat of p.playerPoolEntry.player.stats) {
              if (stat.scoringPeriodId !== week) {
                continue;
              }
              if (stat.statSourceId === 0) {
                act = stat.appliedTotal;
              } else if (stat.statSourceId === 1) {
                proj = stat.appliedTotal;
              }
            }

            name = name
              .replace(/\./g, "")
              .replace(/ jr/i, "")
              .replace(/ sr/i, "")
              .replace(/ Jr/i, "");
            data.push([week, tmid, name, slot, pos, inj, proj, act]);
            playerMap.set(name, {
              proj: proj?.toFixed(2),
              act: act?.toFixed(2),
            });
          }
        }
      })
      .catch((e) => {
        console.log(e);
        playerMap.clear();
      });
    setPlayerMap(playerMap);
  };

  const scrapeBPData = async (pos, mode, week) => {
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
    let yearPrefix = selectedYear == 2024 ? selectedYear : "";
    let playerToPosition = new Map();

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
        "https://raw.githubusercontent.com/seoularpro/OddsVis/main/BettingProsFiles/" +
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
                  (americanToDecimal(playerOdds.over.consensus_odds) /
                    UNIVERSAL_VIG)) *
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
              newRushYdsList.push(playerOdds.over.consensus_line / 10);
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

              newRecYdsList.push(playerOdds.over.consensus_line / 10);
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
                  (americanToDecimal(playerOdds.over.consensus_odds) /
                    UNIVERSAL_VIG);
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
              newPassYdsList.push(playerOdds.over.consensus_line / 25);
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
                  (americanToDecimal(playerOdds.over.consensus_odds) /
                    UNIVERSAL_VIG);
              newIntsList.push(handicap * -2);
              playerToIntsDataPoints.set(name, newIntsList);
            }
          }
        })
        .catch((e) => {});

      testedInts++;
      isNewBovadaFileCheck = false;
      bovadaFileLoopFlag = await isFetchable(
        "https://raw.githubusercontent.com/seoularpro/OddsVis/main/BettingProsFiles/" +
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
    // if (selectedYear == 2023) {
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
        },
      ];
    });
    setPlayerMissingList(missingList);

    setPlayerList(finalList);
  };

  const scrapeData = async (pos, mode, week) => {
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
    let yearPrefix = selectedYear == 2024 ? selectedYear : "";

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
        "https://raw.githubusercontent.com/seoularpro/OddsVis/main/BovadaAPIFiles/" +
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
          let allNflGames = data[0].events.slice();

          for (let i = 0; i < allNflGames.length; i++) {
            let eachGameTDOutcomes = allNflGames[i].displayGroups
              .find((x) => x.id == "100-1870")
              ?.markets.find(
                (y) =>
                  y.descriptionKey == "Anytime Touchdown Scorer" &&
                  y.period.id == "119"
              )?.outcomes;
            let eachGameRushingOutcomes = allNflGames[i].displayGroups
              .find((x) => x.id == "100-93")
              ?.markets.filter((y) => y.marketTypeId == "121337");
            let eachGameRushingAndReceivingOutcomes = allNflGames[
              i
            ].displayGroups
              .find((x) => x.id == "100-93")
              ?.markets.filter((y) => y.marketTypeId == "121328");
            let eachGameReceivingOutcomes = allNflGames[i].displayGroups
              .find((x) => x.id == "100-94")
              ?.markets.filter((y) => y.marketTypeId == "121333");
            let eachGameReceptionOutcomes = allNflGames[i].displayGroups
              .find((x) => x.id == "100-94")
              ?.markets.filter((y) => y.marketTypeId == "121332");
            let eachGamePassingYdOutcomes;
            let eachGamePassingTDOutcomes;
            let eachGameIntOutcomes;
            if (selectedYear == 2023) {
              eachGamePassingYdOutcomes = allNflGames[i].displayGroups
                .find((x) => x.id == "100-1188")
                ?.markets.filter((y) => y.marketTypeId == "121348");
              eachGamePassingTDOutcomes = allNflGames[i].displayGroups
                .find((x) => x.id == "100-1188")
                ?.markets.filter((y) => y.marketTypeId == "121335");
              eachGameIntOutcomes = allNflGames[i].displayGroups
                .find((x) => x.id == "100-1188")
                ?.markets.filter((y) => y.marketTypeId == "121329");
            } else {
              eachGamePassingYdOutcomes = allNflGames[i].displayGroups
                .find((x) => x.id == "100-1932")
                ?.markets.filter((y) => y.marketTypeId == "121348");
              eachGamePassingTDOutcomes = allNflGames[i].displayGroups
                .find((x) => x.id == "100-1932")
                ?.markets.filter((y) => y.marketTypeId == "121335");
              eachGameIntOutcomes = allNflGames[i].displayGroups
                .find((x) => x.id == "100-1932")
                ?.markets.filter((y) => y.marketTypeId == "121329");
            }

            if (typeof eachGameTDOutcomes !== "undefined") {
              let amonRaFlag = false;
              for (let j = 0; j < eachGameTDOutcomes.length; j++) {
                let playerOdds = eachGameTDOutcomes[j];

                if (
                  playerOdds.description == "Amon-Ra St.Brown" ||
                  playerOdds.description == "Amon-Ra St. Brown"
                ) {
                  playerOdds.description = "Amon-Ra St. Brown";
                }
                playerOdds.description = playerOdds.description
                  .replace(/\./g, "")
                  .replace(/ jr/i, "")
                  .replace(/ sr/i, "")
                  .replace(/ Jr/i, "");

                if (playerOdds.description == "AJ Brown ") {
                  playerOdds.description = playerOdds.description.slice(0, -1);
                }
                if (playerOdds.description == "Gardner Minshew") {
                  playerOdds.description = "Gardner Minshew II";
                }
                if (playerOdds.description == "Devon Achane (MIA)") {
                  playerOdds.description = "De'Von Achane (MIA)";
                }
                if (playerOdds.description == "Brian Robinson") {
                  playerOdds.description = "Brian Robinson (WAS)";
                }
                if (playerOdds.description == "D'Andre Swift") {
                  playerOdds.description = "D'Andre Swift (CHI)";
                }
                if (playerOdds.description == "Gabriel Davis (JAX)") {
                  playerOdds.description = "Gabe Davis (JAX)";
                }
                if (playerOdds.description == "Rome Odunze (CHI) ") {
                  playerOdds.description = playerOdds.description.slice(0, -1);
                }
                if (playerOdds.description == "Chigoziem Okonkwo (TEN)") {
                  playerOdds.description = "Chig Okonkwo (TEN)";
                }

                if (!amonRaFlag) {
                  let newAnyTDList = [];
                  if (playerToAnyTDDataPoints.has(playerOdds.description)) {
                    newAnyTDList = playerToAnyTDDataPoints
                      .get(playerOdds.description)
                      .slice();
                  }
                  newAnyTDList.push(
                    (1 / playerOdds.price.decimal / UNIVERSAL_VIG) * 6
                  );
                  playerToAnyTDDataPoints.set(
                    playerOdds.description,
                    newAnyTDList
                  );
                }

                if (name == "Amon-Ra St. Brown") {
                  amonRaFlag = true;
                }
              }
            }
            if (typeof eachGameRushingAndReceivingOutcomes !== "undefined") {
              let amonRaFlag = false;
              for (
                let j = 0;
                j < eachGameRushingAndReceivingOutcomes.length;
                j++
              ) {
                let playerOdds = eachGameRushingAndReceivingOutcomes[j];
                let name = playerOdds.description.slice(34);
                if (name == "Amon-Ra St.Brown" || name == "Amon-Ra St. Brown") {
                  name = "Amon-Ra St. Brown";
                }
                name = name
                  .replace(/\./g, "")
                  .replace(/ jr/i, "")
                  .replace(/ sr/i, "");
                if (name == "AJ Brown ") {
                  name = name.slice(0, -1);
                }
                if (name == "Deebo Samuel") {
                  name = "Deebo Samuel (SF)";
                }

                if (!amonRaFlag) {
                  let newRushRecYdsList = [];
                  if (playerToRushRecYdsDataPoints.has(name)) {
                    newRushRecYdsList = playerToRushRecYdsDataPoints.get(name);
                  }
                  newRushRecYdsList.push(
                    playerOdds.outcomes[0].price.handicap / 10
                  );
                  playerToRushRecYdsDataPoints.set(name, newRushRecYdsList);
                }
                if (name == "Amon-Ra St. Brown") {
                  amonRaFlag = true;
                }
              }
            }
            if (typeof eachGameRushingOutcomes !== "undefined") {
              let amonRaFlag = false;
              for (let j = 0; j < eachGameRushingOutcomes.length; j++) {
                let playerOdds = eachGameRushingOutcomes[j];
                let name = playerOdds.description.slice(22);
                if (name == "Amon-Ra St.Brown" || name == "Amon-Ra St. Brown") {
                  name = "Amon-Ra St. Brown";
                }
                name = name
                  .replace(/\./g, "")
                  .replace(/ jr/i, "")
                  .replace(/ sr/i, "");
                if (name == "AJ Brown ") {
                  name = name.slice(0, -1);
                }
                if (name == "Deebo Samuel") {
                  name = "Deebo Samuel (SF)";
                }

                if (!amonRaFlag) {
                  let newRushYdsList = [];
                  if (playerToRushYdsDataPoints.has(name)) {
                    newRushYdsList = playerToRushYdsDataPoints.get(name);
                  }
                  newRushYdsList.push(
                    playerOdds.outcomes[0].price.handicap / 10
                  );
                  playerToRushYdsDataPoints.set(name, newRushYdsList);
                }
                if (name == "Amon-Ra St. Brown") {
                  amonRaFlag = true;
                }
              }
            }
            if (typeof eachGameReceivingOutcomes !== "undefined") {
              let amonRaFlag = false;
              for (let j = 0; j < eachGameReceivingOutcomes.length; j++) {
                let playerOdds = eachGameReceivingOutcomes[j];
                let name = playerOdds.description.slice(24);
                if (name == "Amon-Ra St.Brown" || name == "Amon-Ra St. Brown") {
                  name = "Amon-Ra St. Brown";
                }

                name = name
                  .replace(/\./g, "")
                  .replace(/ jr/i, "")
                  .replace(/ sr/i, "");
                if (name == "AJ Brown ") {
                  name = name.slice(0, -1);
                }
                if (name == "Deebo Samuel") {
                  name = "Deebo Samuel (SF)";
                }

                if (!amonRaFlag) {
                  let newRecYdsList = [];
                  if (playerToRecYdsDataPoints.has(name)) {
                    newRecYdsList = playerToRecYdsDataPoints.get(name);
                  }
                  newRecYdsList.push(
                    playerOdds.outcomes[0].price.handicap / 10
                  );
                  playerToRecYdsDataPoints.set(name, newRecYdsList);
                }
                if (name == "Amon-Ra St. Brown") {
                  amonRaFlag = true;
                }
              }
            }
            if (typeof eachGameReceptionOutcomes !== "undefined") {
              let amonRaFlag = false;

              for (let j = 0; j < eachGameReceptionOutcomes.length; j++) {
                let playerOdds = eachGameReceptionOutcomes[j];
                let name = playerOdds.description.slice(19);
                if (name == "Amon-Ra St.Brown" || name == "Amon-Ra St. Brown") {
                  name = "Amon-Ra St. Brown";
                }
                name = name
                  .replace(/\./g, "")
                  .replace(/ jr/i, "")
                  .replace(/ sr/i, "");
                if (name == "Deebo Samuel") {
                  name = "Deebo Samuel (SF)";
                }
                if (name == "AJ Brown ") {
                  name = name.slice(0, -1);
                }
                if (!amonRaFlag) {
                  let newRecsList = [];
                  if (playerToRecsDataPoints.has(name)) {
                    newRecsList = playerToRecsDataPoints.get(name);
                  }
                  let handicap = playerOdds.outcomes[0].price.handicap;
                  handicap =
                    handicap -
                    0.5 +
                    1 / playerOdds.outcomes[0].price.decimal / UNIVERSAL_VIG;
                  newRecsList.push(handicap * receptionMultiplier);
                  playerToRecsDataPoints.set(name, newRecsList);
                }

                if (name == "Amon-Ra St. Brown") {
                  amonRaFlag = true;
                }
              }
            }
            if (typeof eachGamePassingYdOutcomes !== "undefined") {
              for (let j = 0; j < eachGamePassingYdOutcomes.length; j++) {
                let playerOdds = eachGamePassingYdOutcomes[j];
                let name = playerOdds.description.slice(22);
                name = name
                  .replace(/\./g, "")
                  .replace(/ jr/i, "")
                  .replace(/ sr/i, "");
                if (name == "AJ Brown ") {
                  name = name.slice(0, -1);
                }

                let newPassYdsList = [];
                if (playerToPassYdsDataPoints.has(name)) {
                  newPassYdsList = playerToPassYdsDataPoints.get(name);
                }
                newPassYdsList.push(playerOdds.outcomes[0].price.handicap / 25);
                playerToPassYdsDataPoints.set(name, newPassYdsList);
              }
            }
            if (typeof eachGamePassingTDOutcomes !== "undefined") {
              for (let j = 0; j < eachGamePassingTDOutcomes.length; j++) {
                let playerOdds = eachGamePassingTDOutcomes[j];
                let name = playerOdds.description.slice(27);
                name = name
                  .replace(/\./g, "")
                  .replace(/ jr/i, "")
                  .replace(/ sr/i, "");
                if (name == "AJ Brown ") {
                  name = name.slice(0, -1);
                }

                let newPassTdsList = [];
                if (playerToPassTDDataPoints.has(name)) {
                  newPassTdsList = playerToPassTDDataPoints.get(name);
                }
                let handicap = playerOdds.outcomes[0].price.handicap;
                handicap =
                  handicap -
                  0.5 +
                  1 / playerOdds.outcomes[0].price.decimal / UNIVERSAL_VIG;
                newPassTdsList.push(handicap * 4);
                playerToPassTDDataPoints.set(name, newPassTdsList);
              }
            }
            if (typeof eachGameIntOutcomes !== "undefined") {
              for (let j = 0; j < eachGameIntOutcomes.length; j++) {
                let playerOdds = eachGameIntOutcomes[j];
                let name = playerOdds.description.slice(29);
                name = name
                  .replace(/\./g, "")
                  .replace(/ jr/i, "")
                  .replace(/ sr/i, "");
                if (name == "AJ Brown ") {
                  name = name.slice(0, -1);
                }

                let newIntsList = [];

                if (playerToIntsDataPoints.has(name)) {
                  newIntsList = playerToIntsDataPoints.get(name);
                }
                let handicap = playerOdds.outcomes[0].price.handicap;
                handicap =
                  handicap -
                  0.5 +
                  1 / playerOdds.outcomes[0].price.decimal / UNIVERSAL_VIG;
                newIntsList.push(handicap * -2);
                playerToIntsDataPoints.set(name, newIntsList);
              }
            }
          }
        })
        .catch((e) => {});

      testedInts++;
      isNewBovadaFileCheck = false;
      bovadaFileLoopFlag = await isFetchable(
        "https://raw.githubusercontent.com/seoularpro/OddsVis/main/BovadaAPIFiles/" +
          yearPrefix +
          "week" +
          week +
          "" +
          testedInts
      );
    }

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
    if (selectedYear == 2023) {
      finalList = Array.from(sortedMap.entries()).filter(
        (x) =>
          typeof PlayerPosMap23.get(x[0]) !== "undefined" &&
          (PlayerPosMap23.get(x[0]) == pos ||
            pos == 99 ||
            (pos == 98 && PlayerPosMap23.get(x[0]) !== 0)) &&
          x[1] > 1
      );
    } else {
      finalList = Array.from(sortedMap.entries()).filter(
        (x) =>
          typeof PlayerPosMap.get(x[0]) !== "undefined" &&
          (PlayerPosMap.get(x[0]) == pos ||
            pos == 99 ||
            (pos == 98 && PlayerPosMap.get(x[0]) !== 0)) &&
          x[1] > 1
      );
    }
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
        },
      ];
    });
    setPlayerMissingList(missingList);
    setPlayerList(finalList);
  };
  useEffect(() => {
    if (apiSource == 0) {
      scrapeBPData(selectedPosition, selectedMode, selectedWeek).catch(
        console.error
      );
    } else {
      scrapeData(selectedPosition, selectedMode, selectedWeek).catch(
        console.error
      );
    }

    // scrapeAllActualEspnStats(selectedWeek)
  }, [selectedPosition, selectedMode, selectedWeek, apiSource]);

  useEffect(() => {
    scrapeBPData(selectedPosition, selectedMode, selectedWeek).catch(
      console.error
    );
    scrapeAllActualEspnStats(selectedWeek);
  }, []);

  useEffect(() => {
    scrapeEspnStats(selectedWeek);
  }, [selectedWeek]);

  const redirectToPatreon = () => {
    window.location.href = "https://www.patreon.com/VegasProjections";
  };

  return (
    <div>
      <div>
        {/* <div
          style={{
            display: "flex",
            marginLeft: "5px",
            marginBottom: "5px",
            marginTop: "15px",
          }}
        >
          Fantasy Football Projections Powered by Vegas Player Props
        </div> */}

        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <select
            className="select select-bordered "
            defaultValue={selectedPosition}
            onChange={(e) => {
              setSelectedPosition(parseInt(e.target.value));
            }}
            style={{ display: "flex", marginLeft: "5px" }}
          >
            <option value="0">QB</option>
            <option value="1">RB</option>
            <option value="2">WR</option>
            <option value="3">TE</option>
            <option value="98">FLEX</option>
            <option value="99">SUPERFLEX</option>
          </select>
          <select
            className="select select-bordered "
            defaultValue={selectedMode}
            onChange={(e) => {
              setSelectedMode(parseInt(e.target.value));
            }}
            style={{ display: "flex", marginLeft: "5px" }}
          >
            <option value="0">Half PPR</option>
            <option value="1">Standard</option>
            <option value="2">Full PPR</option>
          </select>
          <select
            className="select select-bordered"
            defaultValue={selectedYear}
            onChange={(e) => {
              if (parseInt(e.target.value) == 2023) {
                if (selectedWeek < 10) {
                  setSelectedWeek(18);
                  const selectElement = document.getElementById("weekSelect");
                  selectElement.value = "18";
                }
              } else {
                // we will need to update this for now
                if (selectedWeek > 1) {
                  setSelectedWeek(1);
                  const selectElement = document.getElementById("weekSelect");
                  selectElement.value = "1";
                }
              }
              setSelectedYear(parseInt(e.target.value));
            }}
            style={{ display: "flex", marginLeft: "5px" }}
          >
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option disabled={apiSource == 0} value="2023">
              2023
            </option>
          </select>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <select
            className="select select-bordered"
            id="weekSelect"
            defaultValue={selectedWeek}
            onChange={(e) => {
              setSelectedWeek(parseInt(e.target.value));
            }}
            style={{ display: "flex", marginLeft: "5px", marginTop: "10px" }}
          >
            <option disabled={selectedYear == 2025} value="18">
              Week 18
            </option>
            <option disabled={selectedYear == 2025} value="17">
              Week 17
            </option>
            <option disabled={selectedYear == 2025} value="16">
              Week 16
            </option>
            <option disabled={selectedYear == 2025} value="15">
              Week 15
            </option>
            <option disabled={selectedYear == 2025} value="14">
              Week 14
            </option>
            <option disabled={selectedYear == 2025} value="13">
              Week 13
            </option>
            <option disabled={selectedYear == 2025} value="12">
              Week 12
            </option>
            <option disabled={selectedYear == 2025} value="11">
              Week 11
            </option>
            <option disabled={selectedYear == 2025} value="10">
              Week 10
            </option>
            <option
              disabled={selectedYear == 2023 || selectedYear == 2025}
              value="9"
            >
              Week 9
            </option>
            <option
              disabled={selectedYear == 2023 || selectedYear == 2025}
              value="8"
            >
              Week 8
            </option>
            <option
              disabled={selectedYear == 2023 || selectedYear == 2025}
              value="7"
            >
              Week 7
            </option>
            <option
              disabled={selectedYear == 2023 || selectedYear == 2025}
              value="6"
            >
              Week 6
            </option>
            <option
              disabled={selectedYear == 2023 || selectedYear == 2025}
              value="5"
            >
              Week 5
            </option>
            <option
              disabled={selectedYear == 2023 || selectedYear == 2025}
              value="4"
            >
              Week 4
            </option>
            <option
              disabled={selectedYear == 2023 || selectedYear == 2025}
              value="3"
            >
              Week 3
            </option>
            <option
              disabled={selectedYear == 2023 || selectedYear == 2025}
              value="2"
            >
              Week 2
            </option>
            <option disabled={selectedYear == 2023} value="1">
              Week 1
            </option>
          </select>
          <ThemeToggleDropdown />
          <select
            className="select select-bordered"
            defaultValue={selectedTheme}
            onChange={(e) => {
              setSelectedTheme(parseInt(e.target.value));
            }}
            style={{
              display: "inline-flex",
              marginLeft: "5px",
              marginTop: "10px",
            }}
          >
            <option value="0">Color</option>
            <option value="2">Color Outline</option>
            <option value="1">Silver Outline</option>
          </select>
          <select
            className="select select-bordered"
            defaultValue={apiSource}
            onChange={(e) => {
              setApiSource(parseInt(e.target.value));
            }}
            style={{
              display: "inline-flex",
              marginLeft: "5px",
              marginTop: "10px",
            }}
          >
            <option value="0">Consensus</option>
            <option value="1">Bovada</option>
          </select>
        </div>
        <div
          style={{
            display: "flex",
            marginLeft: "5px",
            marginBottom: "15px",
            marginTop: "15px",
            fontSize: "12px",
          }}
        >
          <button class="trade-button" onClick={handleTradeClick}>
            10 man .5 PPR Trade Value Chart
          </button>
          <div style={{ marginTop: "3px", marginLeft: "15px" }}>Tips:</div>
          <button class="button2" onClick={handleClick}>
            Venmo
          </button>
        </div>
        <div
          className="hero-message"
          style={{
            display: "flex",
            marginLeft: "5px",
            marginBottom: "15px",
            marginTop: "15px",
            fontWeight: 600,
            // fontSize: "18px",
            textAlign: "left",
          }}
        ></div>
        <div
          style={{
            display: "flex",
            marginLeft: "5px",
            marginBottom: "15px",
            marginTop: "30px",
            fontWeight: 600,
            fontSize: "13px",
            textAlign: "left",
          }}
        >
          If your player is not present in the table below, please toggle the
          Bovada/consensus odds dropdown, or check the Missing Prop table at the
          bottom of the page. You can generally assume players in the main table
          are playing and not injured.
        </div>
        <SangTable
          selectedWeek={selectedWeek}
          evList={playerList}
          selectedProvider={apiSource}
          espnPlayerMap={playerMap}
          selectedTheme={selectedTheme}
          allMap={allMap}
          recentMap={recentMap}
        />
      </div>
      <div
        style={{
          display: "flex",
          marginLeft: "0px",
          marginBottom: "15px",
          marginTop: "30px",
          fontWeight: 600,
          fontSize: "13px",
          textAlign: "left",
        }}
      >
        Players below do not have all their required props. They will be added
        to the primary table when their props are available. Players here may be
        under injury risk, as Christian McCaffrey was stuck down here throughout
        week 1.
      </div>
      <MissingTable
        selectedPosition={selectedPosition}
        missingList={playerMissingList}
      />

      <div class="patreonSection">
        <div style={{ fontWeight: 600, marginTop: "1rem" }}>
          Support future functionality by subscribing to my Patreon link below.
        </div>
        <button
          class="button"
          onClick={(e) => {
            redirectToPatreon();
          }}
        >
          <span>vpPro+</span>
        </button>
      </div>
    </div>
  );
}

export default TotalContainer;
