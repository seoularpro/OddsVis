import ThemeToggleDropdown from "../ThemeToggleDropdown";

export default function About(props) {
    return (
        <div>
            <div className="trade-value-theme">
                <ThemeToggleDropdown />
            </div>
            <div class="card shadow-lg p-6 bg-base-100">
                <div class="card-body space-y-6">
                    <img class="object-cover h-72 w-72 m-auto" src="https://i.imgur.com/7RfL1Cx.png" />

                    <h2 class="text-2xl font-bold ">About Me</h2>

                    {/* <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/1gcasgp/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a> */}
                    <p class="text-lg">
                        Hey fellow fantasy football addicts.  My name is Sang (to be honest it's more like a sound).
                    </p>

                    <p class="text-lg font-semibold">
                        Why did you start the site?
                    </p>
                    <p class="text-lg">
                        I started this site on Week 10 of the 2023 season
                        after having an epiphany due to the recent mega expansion of sportsbetting.  As legalization spread across the country, eventually books started
                        offering player proposition odds on every fantasy relevant football player that encompass all of the factors related to a players weekly fantasy score.
                        Once I built a React app / website that projects every player's weekly median score after autonomously parsing sportsbook API data, I transitioned into
                        a weekly Reddit post cadence.  With the help of some beer, I started to add a creative and existential twist to these posts, which were well received by the community.
                        We even added Game of Thrones and Lord of the Rings themes.  Ultimately leading to the current state of this original idea in action.                  </p>
                    <p class="text-lg font-semibold">
                        Why are you an expert on this subject matter?
                    </p>
                    <p class="text-lg">
                        I've been playing this game for at least the past decade in a ten man Hppr league filled with long time childhood friends.  It gets real sweaty in here.  $260 buyin
                        alongside a sick trophy with the past ten champions engraved on it.  We play $200 auction draft, two keepers with $5/$10/$15 scaling
                        keeper costs per consecutive year, $1000 FAAB budget with stacking 30 minute grace periods whenever a FAAB trade occurs near the Tuesday night FAAB trading
                        deadline.  As of last year's trading boom, we trade frequently, with quite a few blockbusters already this year.  We live and breathe this stuff.
                    </p>
                    <p class="text-lg font-semibold">
                        Questions?
                    </p>
                    <p class="text-lg">
                        Feel free to text me at 619-666-7872
                    </p>

                    <p class="text-lg font-semibold">Thanks for reading this far!</p>
                </div>
            </div>

        </div>
    );
}
