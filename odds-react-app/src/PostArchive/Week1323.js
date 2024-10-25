
export default function Week1323(props) {




    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://media.bleacherreport.com/image/upload/w_800,h_533,c_fill/v1729543730/tx0hfn06miqg1oonmh96.jpg" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 13</h2>
                <h2 class=" text-sm pr-8 pl-8">By Sang Han</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">December 1, 2023</h2>
                    <button class="btn  btn-primary" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/189egdr/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    Fantasy football is like a dream.. You wake up Tuesday morning either in peace, or in emotional turmoil as if you were in a nightmare. Some of us rode some unlikely heroes to the promised land of the playoffs, while others are questioning why they were born in the reality where Justin Tucker trolled them. We have reached the last week of the regular season, where your fate has been determined or you are still clinging to hope. Will the dream continue, or will you wake up and face the cold harsh reality of fantasy depression.                </p>
                <p class="text-lg">
                    Once again I welcome you to <a class="underline" href="https://www.VegasProjections.com">VegasProjections.com</a>, your fantasy roster decision cheatsheet and path to nirvana. Using this tool, you can see how Vegas thinks your players will perform, as the numbers are calculated from Vegas player prop odds. This is now the fourth week of the tool’s existence, evolved into its current form. Community feedback has been continuously addressed, and will continue to be the primary driving force behind new features and changes. That along with quality of data, and additional ways we can use the beauty of math and statistics to give us edges.                </p>
                <p class="text-lg">
                    From this week’s new data, we see that Vegas bettors are hammering Tua props, indicating a wide-spread belief that the Dolphins are going to pop off. Russell Wilson is steadily climbing the rankings, as the markets give him his flowers for his recent performances. Rachaad White and Kyren Williams are league winners, but don’t give up on Ekeler and Rhamondre. Among the receivers, the top dogs stand out so far from the rest of the pack that you may simply be out of contention for not having one. While all the tight ends are equally mediocre besides the unicorn of Kelce. If you have many players with a red background, it’s looking good for you, as the background colors are based on percentile within the grouping of players.                </p>

                <p class="text-lg">
                    New features:

                </p>
                <p class="text-lg">
                    -Ability to switch from the colored theme to a simple black/silver theme. If desired by the people, I’ll implement a cookie that will save your last dropdown selections so you can load your last settings upon return                </p>
                <p class="text-lg">
                    -In order to address the missing player concerns, the missing players list at the bottom of the page has been updated into a table, where you can see which exact props are missing for the player, along with their point projection without the missing prop’s extrapolated EV. I would either check again later for updates, or come up with your own expectation and add it to the listed EV. For example, if a player is missing receptions, and you estimate he’ll have two total, you should just add one point (in half PPR) to the listed EV value. If you still don’t see someone, he’s most likely injured, but possibly some obscure edge case i missed so let me know
                </p>
                <p class="text-lg">
                    Edit: odds have been updated for the final time at 10:27am eastern time. The line movements over the final couple hours should be negligible, and new lines are unlikely to emerge, so we should be at a good final state right now
                </p>
                <p class="text-lg">
                    GL ALL
                </p>

            </div>
        </div>


    );
}
