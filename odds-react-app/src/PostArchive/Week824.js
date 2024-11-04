
export default function Week824(props) {




    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://jetsxfactor.com/wp-content/uploads/2023/12/Breece-Hall-NY-Jets-Stats-Ranking-Fantasy.jpg" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 8</h2>
                <h2 class=" text-sm pr-8 pl-8">By Sang Han</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">October 26, 2024</h2>
                    <button class="btn  btn-primary" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/1gcasgp/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    Sincerity and subterfuge.   Ketchup and barbeque.  As each league is a conglomeration of independent minds, there exists a wide range of player valuation sentiment.  Should you try to scam the shit out of your homies?  Or rather stay transparent to be conducive to future trading.  Mustard is the best condiment on hotdogs.                  </p>
                <p class="text-lg">
                    From one perspective, the Los Angeles Rams pretended to have Cooper Kupp on the trading block, to disguise Puka's "magical" recovery.  Is it that far of a stretch to believe that Puka was always going to play?  Sean McVay deals in absolutes.  Supposedly Alvin Kamara is a battered, broken down human being with countless bone integrity issues.  Yet how the hell do you hold on to a football with a broken hand.  Does anyone actually believe that his hand is broken?  With NFL defensive ends and linebackers throwing haymakers toward the vicinity of the football.  With ball security as the highest priority of the running back position.  You're telling me that Kamara is stiff-arming these Space Jam Monstars with a damn broken hand?  Get out of here.  If you're not cheating, you're not trying.  Misdirection is the name of the game.  The Kansas City Shuffle.                </p>
                <p class="text-lg font-semibold">
                    Transparency is a precious ideal.  Honesty only stands when surrounded by honesty.  Yet within a world of deceit, playing along is almost in your best interest.  Should tanking a matchup for playoff seeding purposes be legal?  Professional sport teams do it all the time; albeit, they at least try to appear competitive.  What is "right" versus what is "wrong".  It can't be more than opinion, whatever this word morality means.  The trolley problem is contingent upon some "utility" aspect, yet utility is subjective.  From my personal perspective, it's a disservice to yourself and your own "greatness" to accomplish anything through deception, yet The Art of War encourages it.  Mental warfare is the bread and butter of Kobe Bryant.
                </p>
                <p class="text-lg">
                    Well forget all of the predatory human traits that you need to be wary of.  <a class="underline" href="https://www.VegasProjections.com">VegasProjections.com</a> removes the human element from fantasy player analysis, with a purely market driven calculation of fantasy value.  All figures are drawn from Vegas / sportsbook player prop odds, which are determined by mathematicians that have dedicated their careers to quantitative analysis.  Every entity within this domain has the strongest incentive to be correct: money.  Leading to these math models being essentially the best predictor of reality that we have.                  </p>
                <h3 class="text-xl font-bold mt-4">Top rated skill players this week include:</h3>
                <ul class="list-disc list-inside text-lg">
                    <li>Breece Hall 16.14</li>
                    <li>Justin Jefferson 15.52</li>
                    <li>Derrick Henry 14.84</li>
                    <li>Joe Mixon 14.81</li>
                    <li>Saquon Barkley 14.77</li>
                    <li>Aaron Jones 14.75</li>
                    <li>Tyreek Hill 14.52</li>
                    <li>JK Dobbins 14.35</li>
                    <li>CeeDee Lamb 14.05</li>
                    <li>Bijan Robinson 13.99</li>
                    <li>Amon-Ra St. Brown 13.94</li>
                    <li>De'Von Achane 13.83</li>
                    <li>Ja'Marr Chase 13.81</li>
                    <li>Kyren Williams 13.79</li>
                </ul>

                <p class="text-lg">
                    This week we see that Breece is still the king of fantasy, outprojecting King Henry by over a point.  Mixon has received his flowers, garnering the respect of the betting public.  Interestingly, an entire tier of godly running backs seem to have similar projections around 14.  If you don't have any of these guys, your season is looking bleak unless you went the famous no RB draft strat.  Jayden and Brian Thomas haven't quite broken into the elite tier yet, but it's only a matter of time.  David Njoku has exploded up the TE rankings.
                </p>
                <p class="text-lg">
                    I've updated the UI so that all the dropdowns fit nicely within a mobile context.  Interestingly, about 90% of traffic to the site is from mobile devices.  I also updated the trade value chart, and am tweaking it throughout the night based on my leaguemates' comments.  I truly believe that full transparency on player valuations is critical for being conducive to future trades.  Winning a single trade now from being deceptive about my opinion on a player's value may make my opponents reluctant to parlay in the future.  We've also created a blog history of all the Reddit writeups, each accompanied by a striking picture of the top weekly player highlighted by that week's Vegas odds.  If you're curious about the history of the site and feature development, check out that blog post history.                </p>

                <p class="text-lg font-semibold">Best of luck this week!</p>
            </div>
        </div>


    );
}
