export default function Week1324(props) {
    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTTb7DIdtkK5Zc0FKl3m9QUCSSxqCTOf-YPlny0xnn9mP6MY9SVNGOtcRMCmLbhQofJISrLxnLTXLh23Tnilmz0XoOvXtmXj-l0s-QXx1E" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 13</h2>
                <h2 class=" text-sm pr-8 pl-8">By Sang Han</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">December 7, 2024</h2>
                    <button class="btn  btn-disabled" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/1h3py6v/player_projections_powered_by_vegas_player_props/">
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    Absence and saturation. The transition from nothingness into existence is inexplicable, yet it predicated humanity.  From zero, to one, to many. From none, to single-cell, to multicellular.  A fantasy player starts every week with no production, then hopefully explodes into significance.
                </p>
                <p class="text-lg">
                    Time is running out.  Your days are limited, a blink of time from certain perspectives.  A finite number of potential championship exists in your lifetime, so now is more important than ever.  A win or two may elevate you into playoff contention, whereas losing may render all your investments into fantasy meaningless.
                </p>
                <p class="text-lg">
                    Fight for significance by taking advantage of the wonders of life expansion by visiting VegasProjections.com, your undisputed, unadulterated assistant towards fantasy enlightenment. All figures are dictated by math, the best indicator of truth in the universe. Math doesn’t lie, unlike our human decision making processes, and occasional deceptive colleagues.
                </p>
                <p class="text-lg">
                    Top 20 rated skill position players this week using mean projections include:
                </p>
                <p class="text-lg">
                    Alvin Kamara 21.61
                </p>
                <p class="text-lg">
                    Kyren Williams 17.48
                </p>
                <p class="text-lg">
                    Bijan Robinson 16.71
                </p>
                <p class="text-lg">
                    Joe Mixon 16.68
                </p>
                <p class="text-lg">
                    Ja’Marr Chase 16.64
                </p>
                <p class="text-lg">
                    CeeDee Lamb 16.63 (Actual 4.9)
                </p>
                <p class="text-lg">
                    Jahmyr Gibbs 16.06 (Actual 9.4)
                </p>
                <p class="text-lg">
                    Saquon Barkley 15.88
                </p>
                <p class="text-lg">
                    Christian McCaffrey 15.80
                </p>
                <p class="text-lg">
                    Justin Jefferson 15.47
                </p>
                <p class="text-lg">
                    Chase Brown 15.46
                </p>
                <p class="text-lg">
                    Josh Jacobs 14.68 (Actual 19.7)
                </p>
                <p class="text-lg">
                    AJ Brown 14.65
                </p>
                <p class="text-lg">
                    Breece Hall 14.44
                </p>
                <p class="text-lg">
                    Ladd McConkey 14.39
                </p>
                <p class="text-lg">
                    De’Von Achane 14.35 (Actual 17.0)
                </p>
                <p class="text-lg">
                    Amon-Ra St Brown 14.29 (Actual 9.8)
                </p>
                <p class="text-lg">
                    Jaylen Waddle 14.29 (Actual 9.3)
                </p>
                <p class="text-lg">
                    Puka Nacua 14.09
                </p>
                <p class="text-lg">
                    Nico Collins 14.03
                </p>
                <p class="text-lg">
                    This week we continue to see Jayden and Anthony Richardson as fantasy studs, while somehow Bo Nix has a monstrous 22 point mean projection.  Kamara’s previous 43 point week continues to spike his mean projection, similarly consistent with Dmo outperforming disrespect from Vegas.  Chase Brown has exploded into the eighth highest running back ranking, rewarding those that recently acquired him while giving up minimal capital. Nico is back like he never left, Ladd has elevated to the fifth highest ranked receiver, and Keenan’s success was correctly identified before Thanksgiving.  Goedert and Hunter Henry appear to be a half tier below Kelce and Bowers.
                </p>
                <p class="text-lg">
                    We have fixed the missing consensus players in Ken Walker and Aaron Jones, as I mistakenly assumed this odds provider option was not dependent on our previous fixed players constant list.  Apparently I didn’t update the position prop matching functionality to the new api, but now it’s fixed.  Consequently, the consensus dropdown is now truly missing player proof.  Thanks to those who reported that.
                </p>
                <p class="text-lg">
                    Best of luck all, the race for the chip has intensified.
                </p>
            </div>
        </div>
    );
}
