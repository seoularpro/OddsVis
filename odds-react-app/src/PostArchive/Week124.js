
export default function Week124(props) {




    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://statico.profootballnetwork.com/wp-content/uploads/2022/05/15085858/Bijan-Robinson-RB-Texas-NFL-Draft-Scouting-Report.jpg" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 1</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">September 6, 2024</h2>
                    <button class="btn  btn-primary" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/1fbhfsf/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    Another year, another chance at glory. Do we dictate our own realities? What’s real and what’s right. Are these conclusions or are they opinions.  Substance behind thought, creating our own universes from our experiences.              </p>
                <p class="text-lg">
                    Well we know one things for sure. The NFL is back and better than ever.  Kudos to the league with a banger opening night matchup between two powerhouse franchises, juxtaposed with an international game in Brazil on a soccer field. My league waits to draft the day before the start of the season to avoid bs, yet the Bengals still haven’t figured out paying Ja’Marr.  Hence the uncertainty and chaos behind our fantasy football obsession, scouring each Reddit post for some spark of inspiration for our next fantasy move, within a field of abundant noise, or perhaps dark silence.   </p>



                <p class="text-lg">
                    So once again I present to you, <a class="underline" href="https://www.VegasProjections.com">VegasProjections.com</a>, the renamed, rebranded, rebirthed, and reinvigorated fantasy football Light of Eärendil, your cheat code towards greater decision making. Through this weapon, you can see how Vegas quants feel about your weekly players through a numerically enlightened perspective. You can feel how your high school math team captain makes a living using their own experiences to outsmart everyone. Markets are the most accurate in predicting just about anything, due to the inherent financial incentive to be correct. </p>
                <p class="text-lg">
                    Call Vegas crazy but they believe in Jayden Daniels already. They seem to be ready to crown Bijanatron, even though I’d need to see it to believe it. Puka and Kupp are viewed to both have plenty to eat, placing Kupp as a potential buy low target. It’s as early as it gets in the season, so we have the assumption that these current lines are inherently the least accurate out of all weeks.    </p>

                <p class="text-lg">
                    Thank you all for the support last year.  Hopefully we can parlay that momentum into something greater this year. There are a few ideas currently brewing, to throw my stats/AI background into the mix of insight gathering.  If you see any missing players, please let me know as the player prop odds API decided to update the player naming convention this year, and there’s probably some rookies I missed.  Some of these player names like DK or Amon-Ra have variable name spellings in the API which is causing some issues, but I should have those discrepancies smoothed out shortly.  </p>            </div>
        </div>


    );
}
