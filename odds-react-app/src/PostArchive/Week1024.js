export default function Week1024(props) {
    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://encrypted-tbn2.gstatic.com/licensed-image?q=tbn:ANd9GcQsHoZ-NJn23wb-ZTN_MIbgnUrh_loqHtmn5bbKGeIgkkhMkBReTjCK7nZsdT9l7kMaQpvhXEiia7hEnrQ1ggS00DJfjnpsTmCmRYhWLw4-VyY3XSeAtRFEXwNRutWmY8ynn7V4veVTUTLk" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 10</h2>
                <h2 class=" text-sm pr-8 pl-8">By Sang Han</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">November 16, 2024</h2>
                    <button class="btn  btn-disabled" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/1gmw30q/player_projections_powered_by_vegas_player_props/">
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    Intention and misdirection.  Perception subconsciously influencing your decision making.  Your heart says to start one player, yet your head is flailing over all the public rankings disagreeing with your decision.  Which voice is right?
                </p>
                <p class="text-lg">
                    Voices in your head, the materialization of your brain's response mechanisms to stimuli.  Our major five senses (sight, sound, smell, taste, touch) send powerful signals throughout your nervous system, yet our brains interpret them in various ways.  I doubt NFL players feel pain the same way we do.  Which leads me into wondering, how valid are our interpretations of stimuli?  Arguably feelings are fake, a reality your brain conjures into existence.  Do you really control how the sodium and potassium ions move in your brain?  Imagine a life independent of feelings.
                </p>
                <p class="text-lg">
                    Reach fantasy prowess through taking advantage of VegasProjections.com, the unbiased, statistically driven fantasy tool above all others.  We are on a constant improvement arc, with constant feature releases.  We have a new major feature, which I detail later in this post.  When you inevitably start to question if your heart is lying to you on a roster decision, why not check if the market agrees with you.  All figures here are driven by market data, where players have a financial incentive to protect their utility/money.  Hence leading to arguably the best predictor of reality you can find.
                </p>
                <p class="text-lg">
                    Top 15* rated skill players this week include:
                </p>
                <p class="text-lg">
                    Alvin Kamara 20.73
                </p>
                <p class="text-lg">
                    Ja'Marr Chase 18.03
                </p>
                <p class="text-lg">
                    Kyren Williams 17.73
                </p>
                <p class="text-lg">
                    Joe Mixon 16.94
                </p>
                <p class="text-lg">
                    Bijan Robinson 16.81
                </p>
                <p class="text-lg">
                    Puka Nacua 16.69
                </p>
                <p class="text-lg">
                    Tyreek Hill 16.67
                </p>
                <p class="text-lg">
                    De'Von Achane 16.48
                </p>
                <p class="text-lg">
                    Saquon Barkley 16.12
                </p>
                <p class="text-lg">
                    Jonathan Taylor 15.98
                </p>
                <p class="text-lg">
                    Justin Jefferson 15.89
                </p>
                <p class="text-lg">
                    Tyrone Tracy 15.58
                </p>
                <p class="text-lg">
                    Jahmyr Gibbs 15.38
                </p>
                <p class="text-lg">
                    James Conner 15.32
                </p>
                <p class="text-lg">
                    Breece Hall 15.04
                </p>
                <p class="text-lg">
                    *These figures are using the new mean projection feature, and Christian McCaffrey should probably be somewhere in this list but he's missing his reception o/u prop atm.
                </p>
                <p class="text-lg">
                    This week we see that Jayden has solidified his position as the best quarterback behind Lamar.  Let's go Maryland.  Never thought I'd live to see the day that the Redskins are good again.  Brock Purdy is on waivers in my league, yet highly respected by Vegas.  You might want to pick him up.  Achane is rightfully exploding up the rankings, with Saquon surprisingly slightly lagging behind.  Tyrone Tracy may be that rare midseason acquisition shooting you into championship relevance.  Forget about Puka throwing hands, as Vegas has him above Tyreek.  And stop doubting James Conner.  Kittle still has the highest projection, as Cade has vaulted into red tier status with him and Travis.
                </p>
                <p class="text-lg">
                    We have a major update for this week, namely mean projections extrapolated from the median projections.  Using some statistics through assuming a gamma distribution due to fantasy scoring being right-skewed, I have extrapolated two mean projections through shifting each median projection rightward based on a skewness calculation determined using this season's data, or recent data.  I also performed an accuracy analysis, to compare my projections to ESPN's projections.  Remarkably, for top 10-15 players with high ceilings within a position, my figures outperformed ESPN's figures.  In general across all players, the mean projections with all season data performed nearly identically to ESPN's projections, while the mean projections using recent data were less accurate.  Granted, I calculated this "accuracy" through mean absolute error, but I am experimenting with other techniques as I am concerned that players with lower projections may not have truly right-skewed distributions.  Note, recent data entails all data within the past six weeks, with a maximum of four data points and a minimum of three.  So players who have played all of the last six weeks are using only their most recent four performances, while players who have been injured for more than half of these six weeks are omitted.  Additionally, we have some styling updates to improve the user experience.
                </p>
                <p class="text-lg">
                    Thanks for all the love, GL this week everyone!
                </p>
            </div>
        </div>
    );
}
