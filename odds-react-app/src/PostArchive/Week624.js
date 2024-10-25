
export default function Week624(props) {




    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://www.wvnstv.com/wp-content/uploads/sites/76/2024/07/66a24fced750d6.83752238.jpeg?strip=1" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 6</h2>
                <h2 class=" text-sm pr-8 pl-8">By Sang Han</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">October 11, 2024</h2>
                    <button class="btn  btn-primary" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/1g1pd1y/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    Snap back to reality. Clarity versus uncertainty. The infinite array of possibilities, yet we associate picking one as free will. Do we really choose anything? Are your decisions a conscious reaction to your stimuli, or are they an inevitable outcome of reality. Your thoughts and feelings are simply potassium and sodium ions moving around your brain, but do we have any control over those movements? Scientific papers have an inherent causality premise.                </p>
                <p class="text-lg">
                    Should any player be undroppable? Should any trade be vetoable? We only question things these things due to malice. What are rules other than human motivation to mediate. What is the right blueprint for structure, in a world of uncertainty. Harmony versus dissonance. Art versus chaos. Communism versus democracy.                </p>

                <h3 class="text-xl font-bold mt-4">Well we know math and statistics is above politics. The top ten skill position players that Vegas has highlighted this week include:</h3>
                <ul class="list-disc list-inside text-lg">
                    <li>Saquon Barkley 15.73</li>
                    <li>Alvin Kamara 15.66</li>
                    <li>CeeDee Lamb 15.29</li>
                    <li>Bijan Robinson 14.77</li>
                    <li>Jordan Mason 14.34</li>
                    <li>Amon-Ra St Brown 14.03</li>
                    <li>Ja'Marr Chase 13.74</li>
                    <li>Chuba Hubbard 13.01</li>
                    <li>Breece Hall 12.93</li>
                    <li>James Conner 12.64</li>
                </ul>

                <p class="text-lg">
                    How do you beat such raw, quantifiable data points? Come stay the night at <a class="underline" href="https://www.VegasProjections.com">VegasProjections.com</a>, your unbiased source of fantasy football projections. These figures are derived from market data, therefore immune to the opinions of humanity. You can gain trade insight, and make better roster decisions from taking advantage of this tool.                </p>
                <p class="text-lg">
                    This week we see that Dak is back. The qb option we all drafted him to be. Jayden is further solidified as a league winner, for years to come. Chuba and James Conner are now Breeces, yet it’s still uncertain whether Breece is slumping or Chuba and Conner are over performing. The real question is: how much is enough time to make any definitive conclusions? Jayden Reed has cemented himself as a stud, along with Diggs proving that he was always one. Jake Ferguson is the TE king at the moment.                </p>

                <p class="text-lg font-semibold">As always, thank you guys for the support. In a world of competition and comparison, hopefully this tool is creating value. If you don’t see your player, try switching to the consensus odds drop down. GL ALL!</p>
            </div>
        </div>


    );
}
