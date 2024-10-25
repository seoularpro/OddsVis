
export default function Week1123(props) {




    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://media.video-cdn.espn.com/motion/2024/1018/dm_241018_Tony_Pollard_ffp/dm_241018_Tony_Pollard_ffp.jpg" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 11</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-disabled" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">November 18, 2023</h2>
                    <button class="btn  btn-primary" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/17yyuw3/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    As leagues inch closer to the playoffs with the trade deadline right around the corner, many of us are debating between a multitude of strategies. I've spent way too much time this week staring at my league-mates rosters, desperately trying to find all the trades that will elevate my team to another level. Win or go home mentality has struck, and every extra point I can find this week is absolutely crucial.                </p>
                <p class="text-lg">
                    On that note, I present to you the latest version of <a class="underline" href="https://www.VegasProjections.com">VegasProjections.com</a>, your cheat-sheet for roster decisions and finding 8D Mahjong strategies. This tool will provide you what I believe to be the most accurate projections, as they are calculated from Vegas Player Prop betting lines from sportsbooks, who have a financial incentive to be correct. Information is key, and those who have the most accurate, insider knowledge will affect the lines through sharp bets. All in all, by game time, the odds will have converged to the most accurate value given all the information.                </p>
                <p class="text-lg">
                    Whether it be from finding trades that give you a slight EV boost this week, finding players that are trending up (Javonte's current projection against a solid defense is above Tony Pollard and Saquon's projections), or making critical roster decisions when deciding who to start, evProjecter is your supply of endless inspiration. As future functionality rolls out, more ways to take advantage will surely emerge.                </p>

                <p class="text-lg">
                    Please feel free to suggest any new features or styling changes                </p>
                <p class="text-lg">
                    Latest updates:

                    new week drop down selector so that you can look at projection history across different weeks

                    variety of QOL improvements based on community feedback + ensuring data accuracy + ensuring all players with the required player props are present                </p>
                <p class="text-lg">
                    Upcoming features:

                    Boom/bust % estimation (ie. a volatility metric) as determined from applying my stats + AI background (pretty much the only thing i cared about in college) to the following data:

                    player point distribution (what % of the total projection comes from each player prop) as for example points projected from td props will be more volatile than points projected from say a receiving yard over under prop

                    player scoring history/volatility with weeks further back having less weight

                    player scoring versus projections ( see how they did compared to how vegas projected them to see trends )

                    anything else i think of

                    indicate with a green or red arrow if each player projection has increased or decreased since the last update

                    update functionality so that after Thursday night, the Thursday night players are not removed from the display Edit: completed this last night so when odds update tmrw, the Sunday players will remain on the list

                    see if chatgpt can generate a function that avoids colors that white font is hard to read on                </p>

            </div>
        </div>


    );
}
