import "./styles.css";
import React, { useState, useEffect } from "react";

export default function MissingTable(props) {
  return (
    <div className="MissingTable">
      <table style={{ marginTop: "20px", fontSize: "12px", textAlign: "left" }}>
        <tr>
          {props.selectedPosition !== 99 && props.selectedPosition !== 98 ? (
            <>
              <th
                style={{
                  width: "100px",
                }}
              >
                Player name
              </th>
              <th
                style={{
                  width: "150px",
                }}
              >
                Missing prop(s)
              </th>
              <th
                style={{
                  width: "50px",
                }}
              >
                EV without prop(s)
              </th>
            </>
          ) : (
            <th
              style={{
                width: "300px",
              }}
            ></th>
          )}
        </tr>
        {props.missingList.map((player) => (
          <tr>
            <td>{player[0]}</td>
            <td>{player[1]}</td>
            <td>{player[2]}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
