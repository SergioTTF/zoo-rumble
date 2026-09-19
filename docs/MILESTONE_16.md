# Milestone 16 — Complete roster abilities

Milestone 16 completes the first unique ability pass for all sixteen animals.

- **Chicken — Feather Guard:** every fourth normal attack grants one charge that dodges the next incoming damage instance. A new charge refreshes rather than stacks.
- **Jackal — Crippling Bite:** every third normal attack reduces the target's outgoing damage by 25% for 1,600 ms. Reapplication refreshes duration and does not stack percentage.
- **Parrot — Squawk:** every fifth normal attack suppresses the target's named special ability for 1,500 ms. Normal attacks and baseline extra-hit or execute effects continue.
- **Owl — Chain Strike:** every third normal attack deals 60% attack damage to a second living enemy. Selection uses distance from the primary target, current health, then instance ID.
- **Chimpanzee — Stone Splash:** every fourth normal attack deals 50% attack damage to every other living enemy within Manhattan distance 1 of the primary target, resolved by stable instance ID.

Damage reduction joins the existing buff and vulnerability calculation and rounds final damage once. Dodge is consumed before shields and reports an ordered zero-damage hit. Silence is checked after a normal attack and before the named special, so an earlier Parrot can suppress an actor later in the same tick.

Presentation adds distinct ability callouts plus evasive, dodge, weakened, and silenced feedback. Roster validation now requires every animal to expose a completed ability description. Tests cover charge consumption, same-tick weakening and silence, secondary-target choice, splash radius, and all prior behavior. Values remain provisional.
