# Milestone 12 — First special abilities

Milestone 12 establishes deterministic status effects with the first two named specials. Existing extra-attack and execute effects remain unchanged.

- **Wolf — Howl:** after every third normal attack, the Wolf and each living allied Wolf within Manhattan distance 2 gain 30% attack speed for 2,000 ms. Wolves howl independently. Repeated howls refresh duration and do not stack percentage. The buff can bring a scheduled attack forward; new cooldowns created while buffed use the shorter interval. Distant Wolves receive nothing.
- **Bear — Bear Hug:** after every third normal attack against a surviving target, that target is stunned for 1,000 ms. Stunned units cannot move or attack. Cooldowns do not reset during stun, so a ready unit can act when it expires. A lethal third hit does not trigger the Hug.

Only normal attacks advance special cadence. Extra hits do not. A unit killed by retaliation cannot trigger a special or extra attack. A stun from an earlier actor prevents a later actor in the same tick from acting.

Presentation shows HOWL and BEAR HUG on casters and HOWL or STUNNED over affected animals with blue or gold pulses. Animations never control simulation. Shop and selected-animal details state cadence and duration.

Validation: 86 tests across 14 files cover exact Bear cadence/duration, same-tick interruption, Howl proximity, independent simultaneous howls, accelerated cooldowns, deterministic replay, lethal-hit exclusion, and previous combat/progression behavior. Type checking, lint and production build pass. Values remain provisional.
