export default function Week1624(props) {
    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://encrypted-tbn2.gstatic.com/licensed-image?q=tbn:ANd9GcQ00LZKbiN72udlW2tFA3Muy9oHnoCWcbocsF6xEn_nw67Sy3GnJAElZ1zKUcZLbmVXRo8F-TtbtMNfVvE" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 16</h2>
                <h2 class=" text-sm pr-8 pl-8">By Sang Han</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">December 28, 2024</h2>
                    <button class="btn  btn-disabled" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/1hjqo6v/vegas_projections_powered_by_vegas_player_props/">
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    Hope and despair.  We attempt to stay optimistic, as our players drop like flies.  As reality unfolds in front of our eyes, we constantly battle positivity and negativity.  Some minds immediately degenerate into critical thoughts; whereas, some individuals naturally react with enthusiasm and support.  Glass half full vs half empty.  Yet which mentality is better?  Bill Belichick ruled with an iron fist, whilst Rex Ryan was a players coach.  I'm pretty sure Tua would have loved Rex over Brian Flores.  Should you relentlessly push athletes through cruelty, or should you motivate through kindness.  A retired NBA player Richard Jefferson once claimed that in his experiences, NBA players come from such a wide variety of circumstances to the point that some can handle criticism while others crumble to it.
                </p>
                <p class="text-lg">
                    Win or go home.  Unless you're part of some sports league, fantasy football playoffs may be the closest we get to experiencing the thrill of chasing a championship.  The heartbreak and the heartache.  I can't speak for the rest of the community, but I contend that the pedigree gained from winning a chip outweighs any monetary award.  Regular season weeks pale in comparison to the magnitude of this week's results, even more so for those in single week playoff matchups.  Kamara owners floundering to find a replacement, as Jerome Ford piques our interest as a potential sleeper league winner.  Who knows what Kendre Miller will do in frigid Green Bay.  Ah, the beauty of pressure.
                </p>
                <p class="text-lg">
                    Find your way to eternal championship stature through visiting VegasProjections.com, your emotionless, machine-like friend ready to provide you fantasy advice.  All figures are derived from Vegas player props, therefore backed by market data.  Markets have shown to be generally the best predictor of reality, as players risk utility in the form of money.  The primary way to win in this market is from having a more accurate prediction system than the sportsbook quants, but once an individual/system gains credibility as a sharp, the markets adjust accordingly.  As we get closer to the event, markets get increasingly more accurate, due to considering more data.
                </p>
                <p class="text-lg">
                    Top 15 rated skill position players this week using median projections include:
                </p>
                <p class="text-lg">
                    Jahmyr Gibbs 18.89
                </p>
                <p class="text-lg">
                    Bijan Robinson 16.97
                </p>
                <p class="text-lg">
                    Chase Brown 16.71
                </p>
                <p class="text-lg">
                    Ja'Marr Chase 16.51
                </p>
                <p class="text-lg">
                    Josh Jacobs 16.40
                </p>
                <p class="text-lg">
                    James Conner 16.13
                </p>
                <p class="text-lg">
                    Puka Nacua 15.17
                </p>
                <p class="text-lg">
                    Saquon Barkley 15.11
                </p>
                <p class="text-lg">
                    De'Von Achane 14.70
                </p>
                <p class="text-lg">
                    Nico Collins 14.52
                </p>
                <p class="text-lg">
                    Chuba Hubbard 14.51
                </p>
                <p class="text-lg">
                    Justin Jefferson 14.14
                </p>
                <p class="text-lg">
                    Mike Evans 14.10
                </p>
                <p class="text-lg">
                    Kyren Williams 14.07
                </p>
                <p class="text-lg">
                    Jonathan Taylor 14.00
                </p>
                <p class="text-lg">
                    This week we see that Joe Burrow has elevated to the red tier, albeit slightly behind Josh Allen and Lamar.  Baker has finally claimed a top 6 spot, while Darnold, Goff, Purdy, and Mahomes lag a tier below.  To the surprise of no one, Jahmyr has the highest projection I believe I've ever seen, Chase Brown is the RB3, and everyone should've been trying to trade for Josh Jacobs at the trade deadline.  Chuba is slightly better than a Kyren, while Derrick Henry is disrespected.  Bucky is barely above Breece, cementing his status as the new best keeper.  Ford may be that RB2 that will save your season, while Alexander Mattison might be that start that may lose you your season.  As Najee has plummeted to irrelevance.  The wide receiver scene has nothing to note, as it is exactly as we all expected it to be.  Same for the tight end scene.
                </p>
                <p class="text-lg">
                    This week we are using median projections, as the code I used to calculate mean projections used an ESPN API endpoint that grabs all of the scores of starting players within my ten man league.  Unfortunately, playoff matchups have screwed it up.  Please let me know if you have a better idea for sourcing fantasy scoring.  As always, thanks for the support.
                </p>
                <p class="text-lg">
                    We are approaching the Mount Everest of fantasy prowess.  Bring. It. Home.
                </p>
            </div>
        </div>
    );
}
