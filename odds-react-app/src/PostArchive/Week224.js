
export default function Week224(props) {




    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://www.cincinnati.com/gcdn/authoring/images/smg/2024/09/11/SMGW/75170426007-2170860606.jpeg?crop=7205,4054,x0,y720&width=660&height=371&format=pjpg&auto=webp" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 2</h2>
                <h2 class=" text-sm pr-8 pl-8">By Sang Han</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">September 13, 2024</h2>
                    <button class="btn  btn-primary" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/1fgbbzq/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    Perspective and circumstance.  The things driving our decision making.  At one moment you find clarity, yet it never lasts long.  The buzz of caffeine inevitably fades.  The half life of uranium, spanning millions of years, yet a blink of an eye within the sands of time.              </p>
                <p class="text-lg">
                    Fantasy prowess never fades.  Championship pedigree is something you will carry beyond death, eternal like Wikipedia pages.  We happen to be located within a particular supercluster of galaxies; however, this supercluster resides within a void in the universe, where matter is sparse.  Hence the stability of our system, hence the creation of fantasy football.  As fickle as life is, we have been blessed with the opportunity to live life talk shit to our fantasy mates, and year after year, have a great reason to meet up with our longtime homies.  Whereas much of the universe is chaotic violence.   </p>



                <p class="text-lg">
                    So why not take advantage of our blessed experience by making the most out of reality using <a class="underline" href="https://www.VegasProjections.com">VegasProjections.com</a>, the one-stop, consolidated path to fantasy enlightenment.  All figures are extrapolated from Vegas player props, therefore backed by market data.  As our brief time together passes, market values most accurately converge towards the "true" value, due to the financial incentive to be correct.  Utilizing the numbers from this website, we can see approximate median projections for each player.  Using these median values, we can estimate true mean/Expected Value projections.  Given that outliers do not affect median, you should mentally elevate the players that have greater potential to pop off.</p>
                <p class="text-lg">
                    This week we see Jayden Daniels has officially declared himself as a league winner, as owners spent very little draft capital on a bona fide fantasy stud.  Same but not so much with Anthony Richardson.  Surprisingly Gibbs is outprojecting Dmo by a full two points, while Najee is similarly disrespected. Vegas has declared Rashee as an elite receiver, and don't give up on Marvin Harrison just yet.  Don't get too high on Jameson, it's still the Sun God's show.     </p>

                <p class="text-lg">
                    We've had a bunch of new updates this week.  I've finally addressed the color concerns once and for all, as I've fallen upon a new default theme which I think you all will like.  Thanks to a friend's suggestion to use DaisyUI, a tailwind CSS component library, we have a wide array of new background themes.  We've also implemented an automatic update cadence, which required spoofing cookie values in order to get past the sportsbook API's automation prevention.  Please feel free to suggest any future improvements, and as always, please let me know if there are missing players.  Currently in the works is pulling from multiple sportsbook APIs, in order to have projections available earlier in the week.   </p>            </div>
        </div>


    );
}
