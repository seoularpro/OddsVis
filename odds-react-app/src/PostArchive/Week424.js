
export default function Week424(props) {




    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://images2.minutemediacdn.com/image/upload/c_crop,w_6958,h_3913,x_0,y_213/c_fill,w_720,ar_16:9,f_auto,q_auto,g_auto/images/ImagnImages/mmsport/commander_country/01japmc5h2xk1egx8stx.jpg" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 4</h2>
                <h2 class=" text-sm pr-8 pl-8">By Sang Han</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">September 27, 2024</h2>
                    <button class="btn  btn-primary" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/1fr2goe/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    Pride and humility.  On one end of the spectrum, life warrants aggression and brash confidence.  Yet do we ever feel good with those Sith lord tendencies coursing through our veins.  Within the ultimate life paradox: is your conscience actually beneficial to you?  Intelligence begets cruelty, while cats and dogs rise appear immune to the default treachery amongst us humans.  Zen is the antibiotic of negativity.               </p>
                <p class="text-lg">
                    Three weeks into the 2024 NFL season we see a rollout of outcomes that escaped our expectations.  Carolina exploded with the red-headed beast back in action, with Dallas wondering if anyone should ever get a big contract.  The players we shunned to the waiver wire death realm exploded back into relevance, proving how wildly variable and meaningless the first two weeks of the season are.  It almost feels like a valid strategy to buy low on every historic stud after a slow start, with Ja'Marr and Terry emerging from the grave and rightfully regaining their spots in the WR room.  In the midst of running backs on new teams rejuvenating their careers.  The National Football League, where rookies making "pennies" outperform multi million dollar veteran contracts all the time.  Does money even matter?                </p>



                <p class="text-lg">
                    Of course it does, which is why <a class="underline" href="https://www.VegasProjections.com">VegasProjections.com</a> has actionable insights, extrapolated from money-based data.  Markets, aka the conglomeration of us neanderthals attempting to predict where this oblong conic blasphemy of a shape lands, act as the most accurate predictor of future performance, due to the monetary incentive to be correct.  All figures on this site are driven from people with more math knowledge and financial capital than us, leading to their figures best converging on the "true" values.  Our projections have been impacted by about a year of Redditor perspective and statistical expertise, resulting in an extremely lightweight, purely functional product.  </p>
                <p class="text-lg">
                    This week we see Kyren rightfully exploding up the projections, as if we never should have questioned it to begin with.  Brian Robinson is apparently a Jonathan Taylor, Aaron Jones, and Derrick Henry, which makes my brain degenerate into a questionable state.  Nico and Rashee represent the new generation, the Baltimore Orioles-esque representation of reality where the younguns bleed youth and ability.  With the Melisandre of the Panthers skyrocketing Diontae above DK Metcalf.  With Brock synonymous as Geodude as the new top TE. </p>

                <p class="text-lg">
                    We've now brought in consensus data, in order to have the site figures populated earlier in the week.  Given we now have multiple data sources, players missing from all data sources are more likely to have some underlying uncertainty, say injury.  Please feel free to suggest future functionality.  Thank you everyone for your contributions to the veracity and quality of this tool. </p>            </div>
        </div>


    );
}
