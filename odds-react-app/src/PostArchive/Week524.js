
export default function Week524(props) {




    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcSRKLfSLOWdK5ADGcCuhvnOJsExWIxU_hMNsbw-r3oGcXYH9iqwysNkfbUT9IfdXYWdMNfxda_eFfoy6Bg" />

                <h2 class="text-2xl font-bold ">Player Projections Powered by Vegas Player Props - Week 5</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">October 4, 2024</h2>
                    <button class="btn  btn-primary" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <a class="underline" href="https://www.reddit.com/r/fantasyfootball/comments/1fx2d80/player_projections_powered_by_vegas_player_props/"
                >
                    Original Reddit Post Link
                </a>
                <p class="text-lg">
                    “Relax. We're going to be OK.” Rodgers once said following a torrid start to the season. Grab yourself a towel and remind yourself that it’s only a month into the season. In a whirlwind of new advanced stats and player tracking technologies, it’s easy to get lost in the noise. Rational decision making, versus paralysis by analysis. There’s certainly a trade or roster move out there that will significantly improve your playoff odds, yet how does one find it.                     </p>
                <p class="text-lg">
                    Your fantasy players are like stock prices. Liquid, and valued purely based on potential future performance. Shapeless like water. At any moment they can tear their acl during warmup stretches. We reallocate, redistribute, and reevaluate their prices constantly. After every new data point, and every word of dialogue within a head coach interview. There exists an abundance of win-win trades based on each team’s situation and needs, paralleled with reality as nearly every business relies on some mutually profitable arrangement. Yet the problem still remains: how do we identify these opportunities?                    </p>



                <p class="text-lg">
                    Once again I present <a class="underline" href="https://www.VegasProjections.com">VegasProjections.com</a>, your market driven, actionable insight tool driven by Vegas player prop odds. Based on the market’s idea of your running back’s rushing yard over/under, you can see how knowledgeable “experts” are placing their wagers. As money is synonymous with utility, these markets and market players have the greatest incentive to be correct, as they sacrifice money/utility if they are wrong. Players ranked highly on this site are great trade targets, especially if they don’t have historic pedigree.  </p>
                <p class="text-lg">
                    This week we see the initial indications of a significant change in paradigm towards young talent. We see that Kyren has cemented himself as the king of fantasy, the bell cow running back that you always dreamed of. Quick, and powerful, a proven archetype while he seems to be the latest, greatest version of modern medicine and physiology. Aaron Jones looks to be that late round sleeper pick that may win you your league. Is Najee a Breece? Jayden Reed is apparently everything we thought Davante was, as he has risen to the red/orange realm of fantasy gods. Godwin has finally received his deserved respect, while Kelce has reclaimed the heavyweight championship belt of the skill positions. </p>

                <p class="text-lg">
                    We’re a bit light on updates this week due to some life factors. As always, thank you all for the support. This started as a random idea, and has blossomed into its current state. Both consensus and Bovada odds are on an automatic update cadence through GitHub actions. Interestingly, adding consensus odds does not seem to add any value to this tool, as they are generally identical to Bovada’s odds. Which makes sense as the entire sports betting industry is a shitshow of copying each others’ odds. Please feel free to reach out if you’re curious about the source code. GL all this week. </p>            </div>
        </div>


    );
}
