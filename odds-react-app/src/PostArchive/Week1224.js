export default function Week1224(props) {
    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://gostanford.com/imgproxy/YC_UkGlpjfMMOscO0A8MQZo_5Q9Ef16jKyAHorXsDJQ/rs:fit:1980:0:0/g:ce/q:90/aHR0cHM6Ly9zdG9yYWdlLmdvb2dsZWFwaXMuY29tL3N0YW5mb3JkLXByb2QvMjAyNC8wMS8yMi95dnJJMDhUOWs4bk1OTzRNMW5WaERwbGpVSVpwcXFnOHcyMVoydkV2LmpwZw.jpg" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 12</h2>
                <h2 class=" text-sm pr-8 pl-8">By Sang Han</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">November 30, 2024</h2>
                    <button class="btn  btn-disabled" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/1gye9bk/player_projections_powered_by_vegas_player_props/">
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    Signals and patterns.  A video plays in front of our eyes yet we all perceive it differently.  A life of peace will be scarred by witnessing violence, yet a life of violence might view the same event with humor.  An NFL veteran can discern the underlying schemes behind a play, while us fans express wonder.
                </p>
                <p class="text-lg">
                    Within the current AI boom, companies are desperately trying to integrate these advanced math powers into their processes.  Upper level machine learning engineers have never been more in demand, while being paid through the roof.  Analytics, statistics, and mathematics.  The driving factors behind identifying trends and maximizing profitability.
                </p>
                <p class="text-lg">
                    Follow the same hero arc through visiting VegasProjections.com, your favorite bookmark amongst your fantasy sources.  All figures are derived from sportsbook markets, which have generally shown to be just about the best indicator we have for predicting anything.  Some individuals have made a career out of predicting and influencing election betting markets.
                </p>
                <p class="text-lg">
                    Top 15 rated skill players this week using mean projections include:
                </p>
                <p class="text-lg">
                    Christian McCaffrey 18.03
                </p>
                <p class="text-lg">
                    De'Von Achane 17.01
                </p>
                <p class="text-lg">
                    Jahmyr Gibbs 16.65
                </p>
                <p class="text-lg">
                    Joe Mixon 16.64
                </p>
                <p class="text-lg">
                    Saquon Barkley 16.33
                </p>
                <p class="text-lg">
                    Kyren Williams 15.94
                </p>
                <p class="text-lg">
                    Jaxon Smith-Njigba 15.62
                </p>
                <p class="text-lg">
                    AJ Brown 15.55
                </p>
                <p class="text-lg">
                    Amon-Ra St Brown 15.51
                </p>
                <p class="text-lg">
                    Justin Jefferson 14.97
                </p>
                <p class="text-lg">
                    CeeDee Lamb 14.85
                </p>
                <p class="text-lg">
                    James Conner 14.65
                </p>
                <p class="text-lg">
                    Josh Jacobs 14.59
                </p>
                <p class="text-lg">
                    Derrick Henry 14.23
                </p>
                <p class="text-lg">
                    Kenneth Walker III 14.21 (added post bugfix)
                </p>
                <p class="text-lg">
                    DJ Moore 14.03
                </p>
                <p class="text-lg">
                    This week we see that there is no reason to doubt Jayden Daniels, while Bo Nix continues to make Sean Payton look brilliant.  De'Von Achane has exploded up the rankings, solidifying his insane keeper value.  Jahmyr has back to back weeks at the top of the board, with James Conner continuing to be respected as he's been all season.  Contrasted with the disrespect towards Chuba and Dmo. CeeDee surprisingly has a lower median projection than expected, but his mean projection matches his pedigree.  Amazingly, assuming a right skew in fantasy scoring data has vaulted Jaxon Smith-Njigba to a monstrous 15.62 projection, barely above three wide receiver superstars in AJB, ARSB, and JJ.  The TE situation in the NFL remains the same with Kelce and Brock being leagues above everyone else.
                </p>
                <p class="text-lg">
                    It's the final stretch of the season, bring it home boys.  Eternal championship pedigree awaits.
                </p>
            </div>
        </div>
    );
}
