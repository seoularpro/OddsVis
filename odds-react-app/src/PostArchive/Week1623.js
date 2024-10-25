
export default function Week1623(props) {




    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcTPbir0TDzkE2Zn81iA7fkLyN1tcAhIWpEbkWkFcC9hQoBO2zBIOPqYZKpwTsRHvkJhwy4-H2QzpHPtrO0" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 16</h2>
                <h2 class=" text-sm pr-8 pl-8">By Sang Han</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">December 22, 2023</h2>
                    <button class="btn  btn-primary" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/18ou5sr/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    Feelings aren’t real. You wade through the depths of existence trying to make the best of your senses, but your brain keeps flipping from one story to the next. Uncountable neurons in your brain firing from various one handed catches, culminating in a “damn that was sick” realization of awe. You see one highlight, yet miss another in the chaos of ten nfl matchups simultaneously resolving. As we battle to process the unfolding information into fantasy prowess.. We have reached the finals, where greatness lives up to its definition. Will you fade away into irrelevance, or will you make your ancestors proud by..                </p>
                <p class="text-lg">
                    Taking advantage of <a class="underline" href="https://www.VegasProjections.com">VegasProjections.com</a>, your lightweight counter to fantasy mediocrity. All numbers are derived from Vegas player props, which have a financial incentive to be correct. The number one projected player last week Jalen Hurts was projected 21.84 last week in HPPR, then scored 21.8. Oh yeah.                </p>
                <p class="text-lg">
                    From this weeks projections, we see that Jalen and Lamar are the fathers of this league, ready to play catch with the rest of the qbs. James Cook is your dynasty league winner, while Chuba keeps Chuba’ing (whatever that means). For some reason, Vegas keeps disrespecting the Lions god duo of Dmo and Jahmyr, and Rashee will win leagues. As CeeDee solidifies himself as a top 5 overall pick next year. Love is in the air with McBride as the bonafide TE waiver wire league winner.
                </p>

                <p class="text-lg">
                    No new features this week, but check out the player selector feature below the primary projection table. You can click/touch your players in the primary table and add them to the selector list below.            </p>
                <p class="text-lg">
                    Question for those who have read this far, my league just started playing keepers but we are trying to combat a tanking epidemic where eliminated teams dump their squads for future keepers next year, ultimately creating super teams. If you’ve been in a similar spot, lmk      </p>
                <p class="text-lg">
                    GL all bring it home
                </p>

            </div>
        </div>


    );
}
