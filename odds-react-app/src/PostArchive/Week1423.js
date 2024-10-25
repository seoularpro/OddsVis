
export default function Week1423(props) {




    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcR91YXmT63Yy66uSBBIli4eIHR6dotb9n_5PdZ603LLAYaHUuKf" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 14</h2>
                <h2 class=" text-sm pr-8 pl-8">By Sang Han</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">December 8, 2023</h2>
                    <button class="btn  btn-primary" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/18eofac/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    “You shall not pass”                </p>
                <p class="text-lg">
                    Gandalf proclaimed and poof there went your fantasy season. The quest towards destroying the ring continues; yet, were you sacrificed like Boromir or are you Frodo. The fellowship has disbanded, and now it’s time to execute the necessary steps towards achieving the ultimate goal. Your path is clouded by uncertainty, and filled with malicious actors in the form of bad fantasy advice,                </p>
                <p class="text-lg">
                    So once again I present to you your fantasy football light of Eärendil, <a class="underline" href="https://www.VegasProjections.com">VegasProjections.com</a>. Within this tool you will find the inspiration towards fantasy greatness, as every figure presented is extrapolated from Vegas player prop odds, which have a financial incentive to be correct. Over time, these projections will be more accurate than any other model, as they are dictated by the market.                </p>

                <p class="text-lg">
                    In this weeks latest projections, we see that Dak has firmly cemented himself as a league winner having the same efficacy as Mahomes, with a blistering 23 point projection. Their names are almost overflowing their container due to the high valuations. Kamara and Cmac are so far ahead of their rb peers that the #3 rb and below are green (background color is dictated by percentile within displayed grouping). Rachaad seems to be mortal again, while Vegas is confused about how to value Raheem when paired with Achane. Tyreek and Amon-Ra should switch names, and I would dampen your expectations with JJ. Unfortunately, after riding your bench for four weeks, Cooper Kupp may be the epitome of a league loser. While the state of tight ends has been exactly the same all season.                </p>
                <p class="text-lg">
                    Fun idea for your league, vote to remove kickers, due to their inherent randomness and lack of skill involved. (I got you Josh)                </p>
                <p class="text-lg">
                    Best of luck these playoffs                </p>
                <p class="text-lg">
                    (Feature development is currently on slight hold as i recover from fantasy depression)             </p>
            </div>
        </div>


    );
}
