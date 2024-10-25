
export default function Week1523(props) {




    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://static.clubs.nfl.com/image/upload/t_person_squared_mobile/f_auto/lions/hylodqu3mhxbzfj4xben.jpg" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 15</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">December 15, 2023</h2>
                    <button class="btn  btn-primary" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/18k27v1/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    The highs and the lows. The ups and the downs. Fantasy success and fantasy failure. Neither can exist without the other. Without the rest of the league failing, a chip is meaningless. Therein is the reality we live in. Those riding hopes into the playoffs, enjoy lapping up the delicious tears of your league mates. It’s your time to go big or go home, it’s your time to get your name engraved on the eternal trophy, it’s your time to…
                </p>
                <p class="text-lg">
                    Rise above your competition into fantasy heaven by taking advantage of <a class="underline" href="https://www.VegasProjections.com">VegasProjections.com</a>, your fantasy football tool for clairvoyance. All figures are derived from Vegas player props, which have a financial incentive to be correct. “Put your money where your mouth is” mentality dictates these projections, as the sharp bettors are confident enough to risk large sums of money.
                </p>
                <p class="text-lg">
                    From this weeks projections, we see Mahomes returns back down to earth, while the game changer qbs properly take up the top two spots with a red background. Kyren is the second coming of Jesus Christ, and Jahmyr has firmly established himself as the man in Detroit. Only the top 6 backs seem to be not mediocre, leading me to downgrade drafting rb early in favor of fishing for Raheems. JJ and Kupp are firmly back as the best receivers, and Vegas was definitely wrong about Kupp last week. Stefon seems to be dropping, and Aiyuk is it.
                </p>

                <p class="text-lg">
                    New feature: Player selector table
                </p>
                <p class="text-lg">
                    You are now able to click/touch a player name and it will appear in a table below, so that you can find the total projection of an entire team. The warmer the colors of a team, the stronger it is. Depending on how deep your league is, you probably want at least green/yellow players filling your lineup. Bonus points for an all red and orange lineup, it’s your year.
                </p>
                <p class="text-lg">
                    GL ALL
                </p>

            </div>
        </div>


    );
}
