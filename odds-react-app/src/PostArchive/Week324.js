
export default function Week324(props) {




    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://www.myarklamiss.com/wp-content/uploads/sites/15/2024/01/GettyImages-1815080030.jpg?w=2560&h=1440&crop=1" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 3</h2>
                <h2 class=" text-sm pr-8 pl-8">By Sang Han</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">September 20, 2024</h2>
                    <button class="btn  btn-primary" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/1flt6gv/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    Cause and effect.  An endless chain of events, each a consequence of an infinite array of factors.  The butterfly effect of muscle fibers leading to noncontact hamstring injuries.  Does a bear shit in the woods?  Once again we find ourselves in a quagmire of an endless list of injuries, leading to a flurry of trash waiver moves for those who failed to draft a deep bench.               </p>
                <p class="text-lg">
                    Year after year, we come into the season with an idea of which teams will be competent, yet year after year we fail to predict the number one guy.  Contracts, personalities, relationships, families, there's an endless list of factors.  Leading to scouts failing to predict anything.  We scour r/fantasyfootball for some insight, yet we all only see a small part of the big picture.  Particles behave differently when being observed.  Jordan Mason's honesty showed us that coaching staffs will do anything to have a slight advantage, leading us to question everything we hear.  So more than ever, filtering out the bad noise/news is critical, within a world of deceit and subterfuge.       </p>



                <p class="text-lg">
                    Which leads me into suggesting the ultimate fantasy tool <a class="underline" href="https://www.VegasProjections.com">VegasProjections.com</a>, your unbiased, unadulterated source of fantasy Zen.  These projections are purely driven by market data, hence agnostic to the fake propaganda of media outlets attempting to generate clicks through inciting our emotions.  As we get closer to game time, the market projections have more and more data to draw from, leading to better predictions in the long run. These figures have about a year of adjustment, as various statistician Redditors have contributed to the formulas being used.</p>
                <p class="text-lg">
                    From this week's projections, we see that Jayden continues to be highly respected by Vegas, while Anthony Richardson has dropped off.  Kamara has leapfrogged Robinson into the top projection, with Pollard emerging as a draft steal.  Mason may be a league winner, causing Cmac's trade value to be the most uncertain out of all players.  Follow the money, as Aiyuk still commands respect, and Godwin has rightfully started to be respected.  Not shockingly, Trey McBride may have risen to the TE1 ROS.   </p>

                <p class="text-lg">
                    This week we have a new feature which is a 10 man half PPR trade value chart, inspired by my longtime league's opinions on players.  It is based on a $200 draft auction budget, as if we are redrafting right now at this exact moment.  The reasoning behind this format is so multiple players' projections will properly add up to a single player's value, so that a $25 + $25 player is worth a $50 player.  The primary factors driving valuations are first two week scoring, historical past pedigree, and injuries.  Granted, these projections are purely based on feel, and assume that leagues are won by complete rosters, leading to lower QB valuations.  As always, please let me know if you have any suggestions or concerns. </p>            </div>
        </div>


    );
}
