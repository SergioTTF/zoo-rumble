# Milestone 11 — Traits and natural roles

Every species now has at least one trait and a descriptive combat role, shown in the shop and selected-animal panel. Roles guide composition using existing health, cadence, movement and range; they do not change targeting or introduce another synergy layer. Dedicated special abilities remain Milestone 12.

| Animal     | Role           | Traits                                |
| ---------- | -------------- | ------------------------------------- |
| Bear       | Tank           | Hardy, Woodland                       |
| Rabbit     | Skirmisher     | Woodland                              |
| Wolf       | Brawler        | Canine, Predator                      |
| Dog        | Brawler        | Canine                                |
| Fox        | Skirmisher     | Canine, Predator, Woodland, Scavenger |
| Hyena      | Brawler        | Predator, Scavenger                   |
| Chicken    | Skirmisher     | Bird                                  |
| Penguin    | Tank           | Bird, Hardy                           |
| Eagle      | Ranged hunter  | Bird, Predator                        |
| Monkey     | Ranged support | Primate, Woodland                     |
| Baboon     | Brawler        | Primate, Predator                     |
| Gorilla    | Tank           | Primate, Hardy                        |
| Jackal     | Skirmisher     | Canine, Predator, Scavenger           |
| Parrot     | Ranged support | Bird                                  |
| Owl        | Ranged hunter  | Bird, Predator, Woodland, Scavenger   |
| Chimpanzee | Brawler        | Primate, Woodland                     |

Roles reflect sturdy frontline animals, agile skirmishers, territorial brawlers, hunting birds, and social/mobile ranged animals. Ranged support is a composition role; it does not yet imply healing or a support ability. Hyenas are not canids and no longer contribute to Canine. Woodland and Scavenger are gameplay groupings inspired by habitats and opportunistic feeding rather than strict taxonomy.

- **Hardy (1):** surviving members retaliate for 3 damage after each incoming normal or extra hit. Shields absorb retaliation. Dead defenders do not retaliate; retaliation cannot trigger abilities or further retaliation.
- **Scavenger (1/4):** living members heal 8%/18% of their maximum health after an allied death, capped at maximum health. Fallen members cannot heal or revive.
- **Woodland (2/4/6):** members start with shields worth 10%/20%/35% of maximum health, rounded after star/stat scaling. Shields persist until consumed, protect health, and do not count toward timeout health scores.

Canine, Bird, Primate, and Predator retain existing thresholds/effects. Counts use distinct deployed species per team at battle start; duplicates receive effects without adding count. Bench animals contribute nothing. Only the highest reached tier applies. Activation stays fixed for the battle even after deaths.

The headless engine owns all effects. Events retain tick/sequence ordering. Hits resolve damage, death, surviving allied healing, and elimination before eligible retaliation. Retaliation death prevents the attacker's extra attack. Terminal combat is immutable. Snapshots expose shields; Phaser shows a blue shield strip, shield health text, BLOCK for fully absorbed hits, and short proc cues. React shows roles, all breakpoints and duplicate rules.

Validation: 83 tests cover reachability, species coverage, duplicate buffs, shield depletion, lethal retaliation, dead-defender exclusion, healing cap/order, deterministic replay, and prior combat/progression behavior. Type checking, lint and production build pass. Balance remains provisional: new traits affect player and enemy squads.
