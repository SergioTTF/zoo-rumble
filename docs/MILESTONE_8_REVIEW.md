# Milestone 8 — Game-loop evaluation

Evaluation date: September 18, 2026. Feature development is paused at this gate. The current game is an eight-encounter, static-site-compatible run with a 16-animal roster, shop, upgrades, overlapping traits, isometric arena, and the approved directional sprite treatment.

## Reproducible full-run evaluation

Run `npm run evaluate` to regenerate `docs/milestone-8-results.json`. This runs four simple purchasing policies across the same 32 seeds, then repeats every run and checks identical outcomes. All animals and XP are purchased through the real economy functions; no free copies, debug gold, direct star upgrades, or opponent inspection are used. The harness checks nonnegative gold, deployment capacity, and the ten-battle limit.

This controlled benchmark retains the original Bear/Rabbit starters. The subsequent player-requested random tier-1 starters are not represented by these results. The player considers the current provisional balance acceptable; tuning can wait.

Each policy buys capacity early while retaining eight gold, prefers immediate merges, buys affordable offers, and permits at most two paid rerolls per preparation. It ranks deployment by a rough health/DPS score; focused policies give their chosen trait members a 30% preference. These are weak automated policies, not optimal trait builds. They use simple front-column placement and sell the weakest excess bench animal. They do not predict future offers or deliberately counter enemy compositions.

| Purchase preference | Runs won | Average battles per run | Mean combat at 1× | Merges per run |
| ------------------- | -------: | ----------------------: | ----------------: | -------------: |
| Generalist          |     5/32 |                    9.72 |            5.81 s |           5.00 |
| Canine              |     3/32 |                    9.63 |            5.78 s |           4.78 |
| Bird                |     7/32 |                    9.53 |            5.46 s |           5.09 |
| Primate             |     7/32 |                    9.59 |            5.81 s |           4.84 |

Every policy won all first-five-round battles in this sample. Across 128 runs, rounds six and seven produced 13 losses each, while finale attempts produced 313 losses. Finale losses include repeated attempts; they are not 313 distinct runs. Runs usually reach the finale with lives available, then exhaust those lives there. This is a clear concentration of difficulty for these policies, and warrants human testing before balance changes. It does not establish population win rates or prove one trait is stronger than another.

## Assessment and priorities

1. **Smooth the challenge curve after player review.** Early capacity purchases overpower the first five rounds in this sample. The finale dominates losses. Test a gentler finale and more meaningful middle-round pressure as separate controlled balance variants before selecting new defaults.
2. **Give combat room to be watched.** Average fights end in under six seconds even at 1×. At 4× that leaves roughly 1.4 seconds. Compare a modest combat-duration increase with the current pace; do not simply lengthen effects, because animation must remain independent of simulation.
3. **Improve crowded combat readability.** Labels, health bars, stars, and hit numbers can overlap when melee units converge. Prioritize spacing/label treatment and clearer ability silhouettes before adding more particles or roster content.
4. **Unify the arena with the accepted animal art.** Detailed pixel animals now sit on a simpler procedural woodland platform. Keep the isometric layout; align terrain, trees, and UI ornament with the approved pixel direction in a focused art pass.
5. **Author attack and idle poses next if the style holds up in play.** The current sheets contain four directions with four walk frames each. Idle/attack hold a directional contact frame; attacks use procedural lunges/projectiles and death uses fades. They are not dedicated drawn attack, idle, or death cycles.

No economy, trait, enemy, or combat balance defaults were changed during this evaluation. No new run systems were added.

## Verification

Type checking, linting, all 68 unit tests, and the production build pass. The separate evaluation check passes all 128 runs and their identical repeats (256 executions total), including economy, storage, deployment, and termination assertions. Vite retains its existing advisory about the large Phaser chunk.

Browser checks in an isolated test tab confirmed normal shop purchases, a three-copy Rabbit upgrade, combat completion, identical 3.5-second replay results without repeated XP/life rewards, 1×/2×/4× playback, pause/resume, and a single paused step from tick 0 to tick 1. Bird and Primate presets were used separately for visual coverage; their debug resources are not included in the full-run benchmark. Dragging a purchased Monkey from bench into the shop removed it and restored its one-gold cost. No browser warnings or errors were captured. Full-run outcomes are covered headlessly; the browser checks are representative combat and interaction checks, not 128 manual runs.

## Human review gate

The automated evaluation can verify progression and expose patterns, but cannot validate fun. Play three fresh runs without sandbox tools: one flexible composition, one focused trait, and one experiment. Note preparation time, whether shop choices feel meaningful, which fights can be followed, whether a loss has an understandable cause, and whether another run feels appealing. Compare the middle rounds and finale specifically. Saved runs and telemetry remain outside this milestone.

The next implementation pass should address the highest observed friction from those runs. Further roster expansion and new systems remain paused until that review.
