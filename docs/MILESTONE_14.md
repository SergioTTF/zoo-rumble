# Milestone 14 — Second special-ability wave

Milestone 14 gives four more animals dedicated combat identities using reusable deterministic effects.

- **Dog — Loyal Guard:** every fourth normal attack shields the living ally with the lowest remaining-health ratio for 15% of that ally's maximum health. Instance ID resolves exact ties. Ability shields can accumulate up to 50% maximum health.
- **Fox — Pounce:** every fourth normal attack deals a separate burst worth 80% of the Fox's attack, rounded to the nearest integer. The burst can eliminate its target and uses the normal damage event pipeline.
- **Penguin — Chill:** every third normal attack slows the target's future attack and movement cooldowns by 30% for 1,500 ms. An action that was already ready in the triggering tick still resolves; cooldowns created while chilled use the longer interval.
- **Gorilla — Ground Slam:** every third normal attack stuns every living enemy within Manhattan distance 1 of the Gorilla for 500 ms. Affected enemies are processed in stable instance-ID order, and enemies later in the same tick lose their action.

Only normal attacks advance cadence. A lethal triggering hit does not cast a special. Ability events and each affected status carry the simulation tick and global sequence number. Presentation adds distinct combat callouts and colors for guarding, pouncing, chilling, and slamming; all animation remains downstream of simulation state.

Validation covers target selection, rounded burst damage, slowed cooldown timing, area selection and ordering, and deterministic replay. Type checking, lint, tests, and production build must pass before review. Values remain provisional.
