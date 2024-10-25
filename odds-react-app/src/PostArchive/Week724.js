
export default function Week724(props) {




    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://media.cnn.com/api/v1/images/stellar/prod/gettyimages-1449858901.jpg?c=16x9&q=h_833,w_1480,c_fill" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 7</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">October 19, 2024</h2>
                    <button class="btn  btn-disabled" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/1g7l756/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    New horizons. Unpredictable catalysts. The butterfly effect of injuries. A flurry of trades this week propelling Amari and Davante into a possible “save your miserable season” state.
                </p>
                <p class="text-lg">
                    The Jets barely lose a game and immediately make a move. The Bills immediately respond with a gamebreaking move of their own. A whirlwind of events has reshuffled the deck of fantasy outcomes, with the same infinite potential future game states. Will we see another 33-0 comeback by our lord and savior Kirk Cousins? <span class="italic">"You like that?"</span> Our thoughts are a small subset within a tsunami of human opinion, as we upvote the most credible / whatever sounds good. Propaganda can't persist without eloquence.
                </p>
                <p class="text-lg">
                    Those of us in fantasy purgatory at 2-4 and 3-3 are gripping the handrails, desperately hanging on as the ship sinks from roster holes. Complete fantasy squads are beginning to separate from the pack, yet we're not deep enough into the season for it to be much more than a one game difference. The waiver wire is barren. The league is reluctant to trade. All these restricting factors preventing you from reaching fantasy zen.
                </p>
                <p class="text-lg font-semibold">
                    Make a move for a Vegas projected stud through <a class="underline" href="https://www.VegasProjections.com">VegasProjections.com</a>, your Optimus Prime of fantasy football projections. You can't get much better than this.
                </p>
                <p class="text-lg">
                    We have color coded ranking tiers, where hot colors indicate higher median fantasy projection tiers within the dropdown constraints. We have a "Luxury" DaisyUI theme dropdown option, lining up with classiness and the upcoming holiday in Halloween. You have to check it out. All figures are based on Vegas market odds, the world capital of money schemes through statistical edges.
                </p>
                <h3 class="text-xl font-bold mt-4">Top rated skill players this week include:</h3>
                <ul class="list-disc list-inside text-lg">
                    <li>Justin Jefferson 15.99</li>
                    <li>Alvin Kamara 15.50</li>
                    <li>Kenneth Walker 14.40</li>
                    <li>Saquon Barkley 14.16</li>
                    <li>Bijan Robinson 14.11</li>
                    <li>Chuba Hubbard 14.06</li>
                    <li>Chris Godwin 13.78</li>
                    <li>Ja’Marr Chase 13.70</li>
                    <li>Tony Pollard 13.45</li>
                    <li>Derrick Henry 13.44</li>
                    <li>Amon-Ra St. Brown 13.28</li>
                    <li>Drake London 13.26</li>
                    <li>Malik Nabers 13.21</li>
                    <li>Breece Hall 13.20</li>
                </ul>

                <p class="text-lg">
                    This week we see Jayden Daniels emerging as the king of fantasy, as the greatest projection amongst all players. At least he didn't go 32nd like Lamar. Kenneth Skywalker is fulfilling his prophecies, and maybe Pollard opened up all of Dallas's opportunities last year.
                </p>
                <p class="text-lg">
                    Justin Jefferson is apparently a tier above everyone else, highlighting the level differences even at the pinnacle of premier sports leagues. Godwin is anointed as a literal god, legitimately merging with the sun Amon-Ra. Malik may be the second coming of Christ. Is Tank about to live up to his namesake? As BTJ and Jaxon Smith-Njigba are steadily climbing up to fantasy relevance. Kelce is the man again, and Engram and LaPorta have finally emerged from the PokéCenter.
                </p>

                <p class="text-lg font-semibold">GL all this week. Don't forget to switch between the Bovada and Consensus dropdown options to see as many data points as possible.</p>
            </div>
        </div>


    );
}
