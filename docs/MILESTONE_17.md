# Milestone 17 — Balance and combat review

Milestone 17 refreshes the automated game-loop evaluation after random starters, the 8×6 arena, seven traits, and sixteen unique abilities.

The harness now starts every run through the real seeded starter selection. It evaluates a generalist policy plus all seven trait preferences across 24 seeds, repeats every run, and requires identical results. All purchases, rerolls, XP, merges, sales, deployments, rewards, and opponents use production functions. Results are written to [milestone-17-results.json](./milestone-17-results.json).

The first updated run completed only 15 of 192 runs. Rounds 1–6 had virtually no losses, while the finale contained nearly all failures. The accepted adjustment adds one 2★ elite to Cold Front and Jungle Patrol, then changes King of the Wild from six enemies with three 2★ elites to five enemies with two 2★ elites.

After adjustment, 69 of 192 simple-policy runs complete. Every policy wins 7–9 of its 24 samples, average combat lasts 5.8 seconds, occasional losses begin in the middle encounters, and the finale remains the main challenge. These policies remain intentionally simple and are a regression signal rather than a claim about human win rates.

Human review should still watch whether abilities are understandable at 1×, whether early shops produce meaningful choices, and whether finale losses have an obvious cause. Balance values remain tunable, but the extreme finale concentration is resolved.
