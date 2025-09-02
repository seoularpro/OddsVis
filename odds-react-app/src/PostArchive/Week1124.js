export default function Week1124(props) {
    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://d.newsweek.com/en/full/2711869/christian-mccaffrey.jpg?w=1600&h=1600&q=88&f=26971f64dcba292b3cedb43492918919" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 11</h2>
                <h2 class=" text-sm pr-8 pl-8">By Sang Han</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">November 23, 2024</h2>
                    <button class="btn  btn-disabled" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/1gsawwz/vegas_projections_powered_by_vegas_player_props/">
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    Adverbs and nouns. Cycling through rapid prepositions to manifest an idea.  We attempt to filter out the noise, yet I expected Sticky Gesicki to go ballistic last week.  An idea starts as nothing but when articulated properly, it spreads like fire.
                </p>
                <p class="text-lg">
                    Sometimes rhetoric can hypnotize an entire nation.  Fantasy information follows the same arc.  We have great, actionable insight creators in this subreddit, contrasted with some idiots individuals who still think Jonathan Brooks is going to derail Chuba.
                </p>
                <p class="text-lg">
                    Relieve yourself of the stress of filtering bad noise about Brooks by taking advantage of VegasProjections.com, your holy grail of fantasy advice.  When Cirsei Lannister burned down King’s Landing, she surely consulted VegasProjections’s advice.  As the Ents stormed Isengard, you know they took council from VegasProjections first.  Prior to the Oracle advising Neo, she visited VegasProjections.
                </p>
                <p class="text-lg">
                    Top 15 rated skill players (using mean projections) this week include:
                </p>
                <p class="text-lg">
                    Christian McCaffrey ?? (Median is at 18.54 but not enough season data for a mean projection)
                </p>
                <p class="text-lg">
                    Alvin Kamara 21.91
                </p>
                <p class="text-lg">
                    Jahmyr Gibbs 17.6
                </p>
                <p class="text-lg">
                    Kyren Williams 17.05
                </p>
                <p class="text-lg">
                    Joe Mixon 17.01
                </p>
                <p class="text-lg">
                    Ja'Marr Chase 16.87
                </p>
                <p class="text-lg">
                    Saquon Barkley 16.41
                </p>
                <p class="text-lg">
                    De'Von Achane 15.95
                </p>
                <p class="text-lg">
                    Tyreek Hill 15.61
                </p>
                <p class="text-lg">
                    Justin Jefferson 15.42
                </p>
                <p class="text-lg">
                    Amon-Ra St Brown 15.21
                </p>
                <p class="text-lg">
                    Breece Hall 15.19
                </p>
                <p class="text-lg">
                    Bijan Robinson 14.66
                </p>
                <p class="text-lg">
                    Josh Jacobs 14.6
                </p>
                <p class="text-lg">
                    Derrick Henry 13.89
                </p>
                <p class="text-lg">
                    This week we see that Bo Nix is older than his years.  Cmac has come roaring back, as if he was never injured.  As sometimes I wonder if insider knowledge affects player prop lines through coaches placing wagers though friends, Cmac’s monster projection may indicate the 49ers intent to fully reintegrate him into his bell cow role last year.  Vegas hasn’t given up on Breece yet, even though owners have been frustrated with him all year.  Pickens is a WR1 (albeit rank 10), while Ladd McConkey and Jakobi have barely surpassed Devonta Smith.  As Jayden Reed seems to be falling in value.  Tucker Kraft may not be the mid season wonder we thought he was, and Mahomes is back to staring at Kelce.
                </p>
                <p class="text-lg">
                    No new updates this week.  As always, feel free to reach out for anything related to the source code behind this site.  Friendly reminder that there’s still a lot of time before the playoffs so no need to panic yet.  Thanks all and good luck!
                </p>
            </div>
        </div>
    );
}
