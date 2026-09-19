# Milestone 15 — Third special-ability wave

Milestone 15 adds four deterministic abilities that expand combat beyond direct attacks and crowd control.

- **Hyena — Cackle:** every third normal attack makes the current target take 20% more damage for 1,600 ms. Repeated Cackles refresh duration and do not stack percentage.
- **Eagle — Sky Dive:** every third normal attack deals a separate hit equal to 12% of the target's maximum health, rounded to the nearest integer. Existing damage buffs and vulnerability modify the final hit.
- **Monkey — Banana Aid:** every third normal attack heals the living ally with the lowest remaining-health ratio for 18% of that ally's maximum health. Instance ID resolves exact ties, and healing cannot exceed maximum health.
- **Baboon — Battle Cry:** every fourth normal attack gives the Baboon and living allies within Manhattan distance 2 a 25% damage bonus for 1,800 ms. Repeated cries refresh duration and do not stack percentage.

Damage vulnerability and attack bonuses are evaluated immediately before each hit and rounded once after both modifiers. This lets a Cackle or Battle Cry affect allies acting later in the same tick while preserving the established attack order. Healing has its own ordered event with source, target, amount, and final health.

Presentation includes distinct Cackle, Sky Dive, Banana Aid, and Battle Cry callouts, plus vulnerable, rallied, and healing feedback. Validation covers exact damage, same-tick interactions, healing selection and caps, affected allies, and deterministic replay. Values remain provisional.
