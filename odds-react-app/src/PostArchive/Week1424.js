export default function Week1424(props) {
    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/3054850.png&w=350&h=254" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 14</h2>
                <h2 class=" text-sm pr-8 pl-8">By Sang Han</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">December 14, 2024</h2>
                    <button class="btn  btn-disabled" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/1h951a1/vegas_projections_powered_by_vegas_player_props/">
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    The front and the back.  We view the same object from different angles yet perceive differences.  How many times have you thought the back of some random person's head was your friend?  Arguably an absence of light removes an object from existence; or perhaps, even an abundance of light as our sun overwhelmed CeeDee's irises a few weeks ago.  Particles behave differently when being observed.  Does a bear shit in the woods?  Velocity only exists with a direction, as our solar system spirals through the universe.  An NFL receiver has seen a wide range of ball flightpath patterns throughout his life, and naturally reacts appropriately.
                </p>
                <p class="text-lg">
                    The paths that each of us has taken to reach our current roster states have their similarities, yet primarily peppered with differences.  We can view the same roster, while each of our brains conjure a unique "best" course of action.  The field of Artificial Intelligence attempts to codify these decision making processes using cold, metal machines.  In contrast to our soft, moist brains.  Markets on the other hand are theoretical, yet backed by mathematics, our best model of truth in the universe.  Whereas our heads invoke propositions influenced by media propaganda, and what we personally want to happen.
                </p>
                <p class="text-lg">
                    Take the best parts of emotionless machines and imaginary statistic conjectures while methodically ignoring the biases in our human heads through visiting VegasProjections.com, your market-driven superpower passed down by the fantasy gods.  All figures are dictated by the sports betting player proposition market, where individuals and quants affect the values through sharp, informed wagers.  As players must risk the greatest form of utility also known as money, market values have shown to best converge upon "true" values over time, in comparison to other estimation techniques.  As sportsbooks are incentivized to predict accurate median lines to maximize profit through sportsbook fees aka vigorish, we can use their player prop lines to extrapolate each player's median expected fantasy score.  As fantasy scoring is right-skewed due to touchdowns and breakouts causing high ceilings, we can extrapolate true mean/expected value figures by shifting the medians rightwards.  We can determine exactly how much to shift each player's median by calculating each player's skew through assuming a gamma distribution.
                </p>
                <p class="text-lg">
                    Top 16* rated skill position players this week using mean projections include:
                </p>
                <p class="text-lg">
                    Alvin Kamara 25.35
                </p>
                <p class="text-lg">
                    Saquon Barkley 18.72
                </p>
                <p class="text-lg">
                    Ja’Marr Chase 17.67
                </p>
                <p class="text-lg">
                    CeeDee Lamb 16.3
                </p>
                <p class="text-lg">
                    Zach Charbonnet 16.21
                </p>
                <p class="text-lg">
                    Justin Jefferson 15.97
                </p>
                <p class="text-lg">
                    Chase Brown 15.86
                </p>
                <p class="text-lg">
                    Jaxon Smith-Njigba 15.8
                </p>
                <p class="text-lg">
                    De'Von Achane 15.08
                </p>
                <p class="text-lg">
                    Jahmyr Gibbs 15.05
                </p>
                <p class="text-lg">
                    Amon-Ra St. Brown 14.84
                </p>
                <p class="text-lg">
                    Josh Jacobs 14.54
                </p>
                <p class="text-lg">
                    Bijan Robinson 14.42
                </p>
                <p class="text-lg">
                    Kyren Williams 14.18
                </p>
                <p class="text-lg">
                    Bucky Irving 14.09
                </p>
                <p class="text-lg">
                    Rico Dowdle 14.06
                </p>
                <p class="text-lg">
                    *Isaac Guerendo has the 11th highest median projection under the FLEX dropdown, but not enough data to move it to a mean/EV projection.  The site shows Braelon Allen at a 14.53 mean projection but there isn't enough scoring data to assign confidence to that figure.
                </p>
                <p class="text-lg">
                    This week we see that Vegas has Kyler, Herbert, Purdy, Mahomes, Darnold, and Baker a single tier below Burrow, Josh Allen, and Hurts.  Somehow Alvin Kamara has a monstrous 25.35 mean projection; albeit, I'm a bit skeptical of this figure as using another skewness estimation formula (Pearson correlation coefficient) over his last month of data produced a 22.18 point mean projection.  Regardless, he's projected an absurd amount.  Chase Brown has exploded into the orange tier, and using his 22.11 point Mean Projection using Recent Data may be particularly more relevant.  Bucky Irving, Isaac Guerendo, and Rico Dowdle are saving fantasy seasons nationwide as their player prop over unders have higher numbers than Kyren Williams.  Don't panic if you have Kyren, as he still has a dominant mean projection along with recent playoff pedigree from carrying players to championships last year.  CeeDee is still as dominant as ever with the second highest WR mean projection, while Jaxon Smith-Njibga continues to maintain top 5 WR status.  Outside of the top 15 receivers, everyone appears to be similarly slightly above mediocrity, if not mediocre.  The tight end picture is incredibly well-structured, as no two players are in the same tier.
                </p>
                <p class="text-lg">
                    As always, thank you for the support.  This week I cleaned up some bugs based on missing player reports.  Now, I truly believe that missing players on the consensus dropdown should be impossible, but let me know if I'm wrong.  In particular, BTJ, Brian Robinson Jr., and Trey McBride were reported to be missing last week and are now fixed.
                </p>
                <p class="text-lg">
                    This is the final week of the regular season, where seasons flourish with life or flounder in misery.  Bring it home.
                </p>
            </div>
        </div>
    );
}
