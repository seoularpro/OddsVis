import "../styles.css";
import React, { useEffect } from "react";
import ThemeToggleDropdown from "../ThemeToggleDropdown";

export default function About() {
  useEffect(() => {
    document.title = "About";
  }, []);

  return (
    <div>
      <div className="trade-value-theme">
        <ThemeToggleDropdown />
      </div>
      <div className="vl-page" style={{ paddingTop: 16 }}>
        <div className="vl-card">
          <div className="vl-prose">
            <img src="https://i.imgur.com/7RfL1Cx.png" alt="" />

            <h2>About Me</h2>

            <p>
              Hey fellow fantasy football addicts. My name is Sang (to be honest it's more like a
              sound).
            </p>

            <h3>Why did you start the site?</h3>
            <p>
              I started this site on Week 10 of the 2023 season after having an epiphany due to
              the recent mega expansion of sportsbetting. As legalization spread across the
              country, eventually books started offering player proposition odds on every fantasy
              relevant football player that encompass all of the factors related to a players
              weekly fantasy score. Once I built a React app / website that projects every
              player's weekly median score after autonomously parsing sportsbook API data, I
              transitioned into a weekly Reddit post cadence. With the help of some beer, I started
              to add a creative and existential twist to these posts, which were well received by
              the community. We even added Game of Thrones and Lord of the Rings themes. Ultimately
              leading to the current state of this original idea in action.
            </p>

            <h3>Why are you an expert on this subject matter?</h3>
            <p>
              I've been playing this game for at least the past decade in a ten man Hppr league
              filled with long time childhood friends. It gets real sweaty in here. $260 buyin
              alongside a sick trophy with the past ten champions engraved on it. We play $200
              auction draft, two keepers with $5/$10/$15 scaling keeper costs per consecutive year,
              $1000 FAAB budget with stacking 30 minute grace periods whenever a FAAB trade occurs
              near the Tuesday night FAAB trading deadline. As of last year's trading boom, we trade
              frequently, with quite a few blockbusters already this year. We live and breathe this
              stuff.
            </p>

            <h3>Questions?</h3>
            <p>Feel free to text me at 619-666-7872</p>

            <p>
              <b>Thanks for reading this far!</b>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
