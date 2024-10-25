
export default function Week1723(props) {




    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://a57.foxsports.com/static-media.fox.com/fmc/prod/sports/c1c20488-a872-4325-afae-e5fa7a9d77e9/1290/724/itrcpe427xxowd8b.jpg?ve=1&tl=1" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 17</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">December 29, 2023</h2>
                    <button class="btn  btn-primary" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/18u1bs1/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    “Winter is coming”
                </p>
                <p class="text-lg">
                    Uncertainty from all directions. Joe Flacco’s reemergence. The unnerving threat from the North. How must one maneuver around such cloudiness. The end goal is near, with only a few decisions separating you from a chip. Will you play your cards right? The time has come to pull out the ultimate Cirsei Lannister big brain 8d mahjong strats to push you past the finish line. Morality is out the window, and the only option is to win at all costs. Ultimate fantasy credibility is on the line, with that sweet extra paycheck as the cherry on top. Will you be remembered as simply a contender, or will you elevate to greatness by..
                </p>
                <p class="text-lg">
                    Taking advantage of <a class="underline" href="https://www.VegasProjections.com">VegasProjections.com</a>, your penultimate guide to fantasy decisions. All projections are extrapolated from Vegas player props, where values are dictated by the market. Due to the inherent risk of losing utility in the form of money, bettors will cause market values to converge on the true value from sharp, informed bets.                </p>

                <p class="text-lg">
                    From this week’s projections, we see that Dak is expected to be unstoppable. Rachaad and James Cook have solidified themselves as godly keepers, while Vegas is confused about the 49ers. Tony, Saquon, and Ekeler won’t lose you a chip, but are unlikely to win you one. CeeDee is expected to be targeted all game, while the top receivers still blow the field away. And fire up your Michael Pittman Jrs as if he’s your WR1. Finally, Trey McBride and Njoku are respected, and are probably in many championship matchups.                </p>
                <p class="text-lg">
                    As a statistician Redditor pointed out last week, these projections are summations of multiple player prop lines, which each represent the sportsbook’s idea of a median value rather than the average value (the general theory behind Vegas lines is to estimate the median so that wagering on either side of the line is profitable for them due to juice/vigorish). Thus, EV is not the right term here (I’ll rename the site next year). However, I would expect the true median point projection to be very similar to the true mean point projection, if not nearly identical. The rankings should generally stay the same. I would mentally increase the projections of players that can have insanely high scoring days, as these median projections will undervalue statistic outliers.                </p>
                <p class="text-lg">
                    Check out how this site was developed through visiting the GitHub repo at https://github.com/seoular/OddsVis. If you spend the time, you can learn how React Effects dictate the state of the site. Simply mastering React Effects can land you a front-end software engineer position, without any education or experience. Feel free to make your own tool using this code, as I intend to completely rearchitect everything for next year. You can use codepen.io’s react sandbox and copy/paste the files in, if you don’t want to set up a local environement. If you have any questions, dm me.
                </p>
                <p class="text-lg">
                    As a parting note, I just wanted to thank the individuals who donated the $1. The $1 amount was a litmus test to see if anyone at all is willing to pay anything, and surprisingly we had about 30 paid members. I did some brainstorming on anything I could try for the final week, and I came up with fantasy chip/evProjecter related coasters. If you appreciated the site, please consider buying some of my personally designed coasters at the bottom of the website. With enough demand, I’ll pay some freelance graphic designer on fiverr to make some better designs. I’ll also post the quantity of coasters sold, if anyone is curious. The idea came from when I worked at a previous company that sold cute family related things online, and the number one searched keyword was “coasters”.                </p>
            </div>
        </div>


    );
}
