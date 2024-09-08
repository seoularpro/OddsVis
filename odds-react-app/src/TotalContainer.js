import "./styles.css";
import React, { useState, useEffect } from "react";
import { PlayerPosMap, PlayerPosMap23, slotcodes, UNIVERSAL_VIG } from "./constants";
import SangTable from "./SangTable";
import { isFetchable, getLastElementMap, calculateLatestChange } from "./util";
import MissingTable from "./MissingTable";

function TotalContainer() {
  const [selectedPosition, setSelectedPosition] = useState(0);
  const [playerList, setPlayerList] = useState([]);
  const [playerMap, setPlayerMap] = useState(new Map());
  const [selectedMode, setSelectedMode] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [playerMissingList, setPlayerMissingList] = useState([]);

  const scrapeEspnStats = async (week) => {
    //https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2024/segments/0/leagues/995547?view=mMatchup&view=mMatchupScore
    const getUrl =
      "https://raw.githubusercontent.com/seoularpro/OddsVis/main/ESPNAPIFiles/latestHppr";
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
            const name = p.playerPoolEntry.player.fullName;
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

            data.push([week, tmid, name, slot, pos, inj, proj, act]);
            playerMap.set(name, {
              proj: proj?.toFixed(2),
              act: act?.toFixed(2),
            });
          }
        }
      })
      .catch((e) => {
        playerMap.clear();
      });
    setPlayerMap(playerMap);
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
    let playerToRecYdsDataPoints = new Map();
    let playerToRecsDataPoints = new Map();
    let playerToPassTDDataPoints = new Map();
    let playerToPassYdsDataPoints = new Map();
    let playerToIntsDataPoints = new Map();
    let yearPrefix = selectedYear == 2024 ? selectedYear : ""
    while (bovadaFileLoopFlag) {
      if (testedInts > lastTestedInt) {
        isNewBovadaFileCheck = true;
        lastTestedInt++;
      }
      

      await fetch(
        "https://raw.githubusercontent.com/seoularpro/OddsVis/main/BovadaAPIFiles/" + yearPrefix + "week" +
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
                  .replace(/ jr/i, "");
                if (playerOdds.description == "AJ Brown ") {
                  playerOdds.description = playerOdds.description.slice(0, -1);
                }
                if (playerOdds.description == "Gardner Minshew") {
                  playerOdds.description = "Gardner Minshew II";
                }
                if (playerOdds.description == "De'Von Achane") {
                  playerOdds.description = "Devon Achane";
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
            if (typeof eachGameRushingOutcomes !== "undefined") {
              let amonRaFlag = false;
              for (let j = 0; j < eachGameRushingOutcomes.length; j++) {
                let playerOdds = eachGameRushingOutcomes[j];
                let name = playerOdds.description.slice(22);
                if (name == "Amon-Ra St.Brown" || name == "Amon-Ra St. Brown") {
                  name = "Amon-Ra St. Brown";
                }
                name = name.replace(/\./g, "").replace(/ jr/i, "");
                if (name == "AJ Brown ") {
                  name = name.slice(0, -1);
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
                name = name.replace(/\./g, "").replace(/ jr/i, "");
                if (name == "AJ Brown ") {
                  name = name.slice(0, -1);
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
                name = name.replace(/\./g, "").replace(/ jr/i, "");
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
                name = name.replace(/\./g, "").replace(/ jr/i, "");
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
                name = name.replace(/\./g, "").replace(/ jr/i, "");
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
                name = name.replace(/\./g, "").replace(/ jr/i, "");
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
        .catch((e) => { });

      testedInts++;
      isNewBovadaFileCheck = false;
      bovadaFileLoopFlag = await isFetchable(
        "https://raw.githubusercontent.com/seoularpro/OddsVis/main/BovadaAPIFiles/" + yearPrefix + "week" +
        week +
        "" +
        testedInts
      );
    }



    let playerToAnyTD = getLastElementMap(playerToAnyTDDataPoints);
    let playerToRushYds = getLastElementMap(playerToRushYdsDataPoints);
    let playerToRecYds = getLastElementMap(playerToRecYdsDataPoints);
    let playerToRecs = getLastElementMap(playerToRecsDataPoints);
    let playerToPassTD = getLastElementMap(playerToPassTDDataPoints);
    let playerToPassYds = getLastElementMap(playerToPassYdsDataPoints);
    let playerToInts = getLastElementMap(playerToIntsDataPoints);


    let latestCPlayerToAnyTD = calculateLatestChange(playerToAnyTDDataPoints);
    let latestCPlayerToRushYds = calculateLatestChange(
      playerToRushYdsDataPoints
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
      finalList = finalList.filter((d) => {
        let rbHasAllValues =
          playerToAnyTD.has(d[0]) &&
          playerToRushYds.has(d[0]) &&
          playerToRecYds.has(d[0]) &&
          playerToRecs.has(d[0]);
        if (!rbHasAllValues) {
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

    console.log(finalList);
  };

  useEffect(() => {
    scrapeEspnStats(selectedWeek);
  }, [selectedWeek]);
  useEffect(() => {
    scrapeData(selectedPosition, selectedMode, selectedWeek).catch(
      console.error
    );
  }, [selectedPosition, selectedMode, selectedWeek]);

  const redirectToPatreon = () => {
    window.location.href = "https://www.patreon.com/VegasProjections";
  };

  return (
    <div>
      <div>
        <div
          style={{
            display: "flex",
            marginLeft: "20px",
            marginBottom: "5px",
            marginTop: "15px",
          }}
        >
          Fantasy Football Projections Powered by Vegas Player Props
        </div>
        <div style={{ display: "flex" }}>
          <select
            defaultValue={selectedPosition}
            onChange={(e) => {
              setSelectedPosition(parseInt(e.target.value));
            }}
            style={{ display: "flex", marginLeft: "20px" }}
          >
            <option value="0">QB</option>
            <option value="1">RB</option>
            <option value="2">WR</option>
            <option value="3">TE</option>
            <option value="98">FLEX</option>
            <option value="99">SUPERFLEX</option>
          </select>
          <select
            defaultValue={selectedMode}
            onChange={(e) => {
              setSelectedMode(parseInt(e.target.value));
            }}
            style={{ display: "flex", marginLeft: "20px" }}
          >
            <option value="0">Half PPR</option>
            <option value="1">Standard</option>
            <option value="2">Full PPR</option>
          </select>
          <select
            defaultValue={selectedYear}
            onChange={(e) => {
              if (parseInt(e.target.value) == 2023) {
                if (selectedWeek < 10) {
                  console.log('selectedweek < 10')
                  setSelectedWeek(18)
                  const selectElement = document.getElementById('weekSelect');
                  selectElement.value = "18"
                }
              } else {
                // we will need to update this for now
                if (selectedWeek > 1) {
                  setSelectedWeek(1)
                  const selectElement = document.getElementById('weekSelect');
                  selectElement.value = "1"
                }
              }
              setSelectedYear(parseInt(e.target.value));
            }}
            style={{ display: "flex", marginLeft: "20px" }}
          >
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>
          <select
            id="weekSelect"
            defaultValue={selectedWeek}
            onChange={(e) => {
              setSelectedWeek(parseInt(e.target.value));
            }}
            style={{ display: "flex", marginLeft: "20px" }}
          >
            <option disabled={selectedYear == 2024} value="18">Week 18</option>
            <option disabled={selectedYear == 2024} value="17">Week 17</option>
            <option disabled={selectedYear == 2024} value="16">Week 16</option>
            <option disabled={selectedYear == 2024} value="15">Week 15</option>
            <option disabled={selectedYear == 2024} value="14">Week 14</option>
            <option disabled={selectedYear == 2024} value="13">Week 13</option>
            <option disabled={selectedYear == 2024} value="12">Week 12</option>
            <option disabled={selectedYear == 2024} value="11">Week 11</option>
            <option disabled={selectedYear == 2024} value="10">Week 10</option>
            <option disabled={selectedYear == 2023 || selectedYear == 2024} value="9">Week 9</option>
            <option disabled={selectedYear == 2023 || selectedYear == 2024} value="8">Week 8</option>
            <option disabled={selectedYear == 2023 || selectedYear == 2024} value="7">Week 7</option>
            <option disabled={selectedYear == 2023 || selectedYear == 2024} value="6">Week 6</option>
            <option disabled={selectedYear == 2023 || selectedYear == 2024} value="5">Week 5</option>
            <option disabled={selectedYear == 2023 || selectedYear == 2024} value="4">Week 4</option>
            <option disabled={selectedYear == 2023 || selectedYear == 2024} value="3">Week 3</option>
            <option disabled={selectedYear == 2023 || selectedYear == 2024} value="2">Week 2</option>
            <option disabled={selectedYear == 2023} value="1">Week 1</option>
          </select>
          <select
            defaultValue={selectedTheme}
            onChange={(e) => {
              setSelectedTheme(parseInt(e.target.value));
            }}
            style={{ display: "flex", marginLeft: "20px" }}
          >
            <option value="0">Color</option>
            <option value="2">Color Outline</option>
            <option value="1">Silver Outline</option>
            
          </select>
        </div>
        <SangTable
          evList={playerList}
          espnPlayerMap={playerMap}
          selectedTheme={selectedTheme}
        />
      </div>
      <MissingTable
        selectedPosition={selectedPosition}
        missingList={playerMissingList}
      />

      <div class="patreonSection">
        <div>
          Access the Pro version with extra statistical insight and future
          functionality by supporting my Patreon link below.
        </div>
        <button
          class="button"
          onClick={(e) => {
            redirectToPatreon();
          }}>
          <span>vpPro+</span>
        </button>
      </div>

    </div>
  );
}

export default TotalContainer;
