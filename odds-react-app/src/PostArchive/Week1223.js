
export default function Week1223(props) {




    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://www.indystar.com/gcdn/authoring/authoring-images/2024/09/29/PIND/75443820007-092924-colts-steelers-0093.jpg?crop=4160,2341,x0,y518&width=660&height=371&format=pjpg&auto=webp" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 12</h2>
                <h2 class=" text-sm pr-8 pl-8">By Sang Han</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">November 25, 2023</h2>
                    <button class="btn  btn-primary" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/183si11/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    We are now at the last stretch of the regular season, with the culmination of all of our realities represented by our team’s record. If you’re reading this, you’re most likely in the hunt, needing a win or two to secure that precious playoff spot. Those of you with a spot secured, enjoy an extra edge over your league of tacos. It’s the witching hour of our fantasy season, where seasons turn to dust or seasons reverberate with life. Your playoff odds will drastically change after this weeks’ results, so it’s time to care more than ever. Personally I am embroiled in a four way tie for division lead at 7-4, with only three playoff spots available. The odd man out loses football credibility for the rest of the year.                </p>
                <p class="text-lg">
                    Once again I present to you <a class="underline" href="https://www.VegasProjections.com">VegasProjections.com</a>, your constantly evolving source of player projections. All the core information you need for fantasy roster decisions is concentrated in this tool, providing inspiration for 8D mahjong strategies to get you to the finish line. The figures are calculated from Vegas player prop odds, which have a financial incentive to be correct. In this fog-of-war environment of unknown information, markets consistently converge on the most accurate value as they react the fastest.                </p>
                <p class="text-lg">
                    From this data, we see that Justin Fields and Kyler Murray are exactly who we thought they were in their heydays. Vegas bettors acknowledge that at any time they can make an electric play with their legs and give us that coveted QB rushing floor. The Cardinals are back. Not going to say the same about the Bears. Jonathan Taylor is exactly who you imagined when you took the risk drafting him this year, and Pacheco and Rachaad are RB1s. Adam Thielen is rising up the rankings again after Frank Reich took back play calling duties, and don’t give up on Chris Olave, he’s still it. Kyler has elevated Trey McBride to another level, and Vegas is still clueless about what a Taysom is.                </p>

                <p class="text-lg">
                    Update: missing players list due to missing player props have been added below the table

                    Update2: Rachaad is expected to play as suggested by all required rb Vegas props being available (anytime td, rush yd over under, receiving yard over under, reception total over under)

                    Update3: thank you all for the support gl on your fantasy seasons                </p>
                <p class="text-lg">
                    New features:

                    -Delta column where the % change of EV since the last odds update is calculated. With this stat you can see which of your players are being bet for or against heavily since the last time the odds were refreshed. Im working on a fixed time cadence / automatic mechanism / github action for loading new odds but right now its just updating sporadically at my own cadence. This column is not visible on portrait view on mobile phones, but visible on desktop or if you turn your phone sideways.                </p>
                <p class="text-lg">
                    Quality of life updates:

                    -major projection data accuracy updates:

                    1. now we are calculating the expected reception count, passTD count, and interception count more accurately by extrapolating the true expected number (say the over under is at 1.5 interceptions at -135 odds, i now calculate the true expected interception count (something like 1.65) from the vegas odds, whereas before we were just using whatever the interception over/under was at, in this case 1.5)

                    2. now players will not be shown without the exact minimum requirements of data points that their position requires. QBs need anytime td, passtd, passyds, interceptions, rushyds. Rbs need anytimeTD, rushyds, rec yds, and receptions. WRs need anytime TD, rec yds, and receptions. TEs need the same as WRs. (Note, it is possible that some superversatile receiver also has rush yd props, and i need to figure out a way to handle that case where you will see their projection if all their WR lines are up but the rush yds prop is down thus being underprojected. However this is probably a rare scenario, but i will address it asap)

                    3. now all anytime TD EV calculations have a fixed 6.23% vig (aka sportsbook cut) factored into the calculation so projections from anytimeTDs should now be more accurate
                </p>

            </div>
        </div>


    );
}
