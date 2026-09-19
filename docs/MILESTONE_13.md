# Milestone 13 — Upgrade celebrations

Merges now communicate power immediately in preparation and remain legible during combat.

- **2★:** a two-note ascending synth cue, cyan burst and ring, larger `★★ 2★ UPGRADE!` reveal, subtle cyan persistent aura, and a cyan portrait glow.
- **3★:** a distinct three-note ascending chord/arpeggio, larger gold burst and ring, `★★★ 3★ UPGRADE!` reveal, persistent double gold aura with four sparks, larger gold stars, stronger portrait glow, and a longer card celebration.

When a batch chains through 2★ into 3★, audio plays the highest achieved level once while Phaser presents each ordered merge. Sounds remain optional, respect pause/page hiding, and are suppressed at 10×. Visual motion respects both browser reduced-motion preference and the in-game Less motion control; persistent color and star distinctions remain without animation.

The aura is attached below the animal sprite and never intercepts dragging. It is reconstructed from snapshot star level on preparation reset, so replay and combat show the same upgraded identity without changing simulation. Combat stats retain the existing 1×/1.8×/3.2× scaling.

Validation covers distinct deterministic note signatures and all existing chained-merge rules. Tests, type checking, lint and production build pass. Browser checks cover free-copy 2★/3★ merges, persistent board/roster treatment, dragging, and console output.
