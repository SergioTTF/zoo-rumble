# Visual direction and planned improvements

## Arena perspective — user feedback, September 16, 2026

The finished map should have an isometric or TFT-style perspective, with depth and a raised arena rather than a flat top-down chessboard. This is a registered requirement for the later arena/art pass; Milestone 3 keeps the existing renderer while adding economy and progression.

Keep the 8×4 logical combat grid independent of screen coordinates. The perspective pass must update drawing, pointer-to-cell conversion, drop hit testing, and depth sorting together; simulation positions, pathfinding, seeded outcomes, and deployment rules remain authoritative. Consolidate projection and inverse projection before replacing the board.

Use a game-focused interface with compact controls and expressive animal animation. Final sprites, directional movement, attack anticipation, hit/death effects, and ability feedback remain planned. Avoid landing-page slogans and decorative product badges.

## Milestone 7 implementation

The perspective requirement is implemented as a raised isometric woodland arena. Logical cells, all pointer/drop conversions, and depth sorting share `src/game/projection.ts`; combat rules are unchanged. Matching full-body sprites replace the old face tokens and animal emoji in player-facing collection panels. This is the first artwork pass, with single-pose procedural animation. Review silhouette readability, overlapping animals, ranged feedback, and audio before deciding on additional animation assets or more scenery detail.

## Art review — pixel-art direction, September 16, 2026

The user finds the generated animal art visibly AI-generated. The next art revision should use the Pixeline porcupine and Helm3t Green Heart animal pack as visual references: crisp pixel clusters, compact silhouettes, restrained palettes, and expressive drawn animation frames. Prefer existing artist-authored assets with documented permission over another generated atlas. Keep the raised isometric arena; pixel characters do not require returning to a flat chessboard.

The user clarified that both links are style references for original sprites, not a request to import asset packs. Create one original sprite family across the existing roster. Check facing, feet alignment, overlap, nearest-neighbor scaling, and health-bar readability in motion. Keep frame playback independent of combat progression.

The original pixel pass now replaces all sixteen runtime portraits and adds twelve-frame sheets with idle, walk, and attack poses. The isometric arena remains. `scripts/draw_pixel_animals.py` contains the editable pixel drawing source; `docs/ART_ASSETS.md` documents the runtime assets. This feedback supersedes the toy-like 3D animal style as the intended final direction.

## Trio revision — review before extending

The first pixel pass was rejected by the user. Bear, Rabbit, and Wolf now have individually drawn body shapes with smaller heads, an elevated view, and different gait/attack timings. This is a limited style study for review, not approval of the complete roster. The other thirteen retain first-pass art. Source, versioned assets, and review previews are documented in `docs/ART_ASSETS.md`.

## Approved directional art and Milestone 8 evaluation — September 18, 2026

The approved Bear/Rabbit reference treatment is now integrated across all sixteen animals, replacing the prior limited procedural trio revision. Four-direction walk sheets use consistent foot alignment and per-direction star placement. Idle/attack/death remain procedural rather than authored cycles. The source sheets and prompts are preserved.

Milestone 8 pauses feature expansion. A reproducible evaluation uses 128 shop-funded runs and repeats each result. Simple buying policies clear the first five rounds but win only 3–7 of 32 runs each, with losses concentrated in the finale; mean combat lasts 5.5–5.8 seconds at 1×. These are bot-policy findings, not human win rates. Next priorities are a reviewed difficulty curve, combat pacing, crowded labels, and arena art consistency. No balance defaults were changed. See `docs/MILESTONE_8_REVIEW.md` for method, results, and the human review gate.

## Random starting squad

Player feedback accepts the current provisional balance and requests random starters. Each new run gets a fresh seed and two distinct 1-star tier-1 animals sampled without replacement from Rabbit, Dog, Chicken, and Monkey. The seeded starter stream is separate from shops and combat. Applying the same development seed recreates the run; replays do not reroll anything. The fixed Bear/Rabbit debug encounter remains available. The Milestone 8 benchmark predates this change and used the original fixed starters.

## Foreground player arena and drag fixes

User requests player/left side nearer the bottom, opponent/right side toward the back, and extra tiles for larger squads. Arena becomes 8×6 with three player deployment columns (18 placement tiles). Depth remains based on screen y. Full opaque sprite pixels determine picks, replacing broad overlapping center/bottom hit rectangles. Clicking a neighboring animal selects rather than swapping immediately. Both bench and board drags share a validity-checked yellow tile preview, which clears on drop/cancel. Current deployment capacity remains level-dependent, maximum six. Previous Milestone 8 measurements used the smaller board and fixed starters.

## Milestone 9 — combat readability

Player approves the map and drag revision and requests the next milestone. This presentation pass provides compact combat health labels, hover details, deterministic label separation, silhouette avoidance, guide lines, separated damage-number lanes, and distinct EXTRA HIT/EXECUTE colors. Dedicated label containers follow sprite movement without sharing sprite depth. Paused stepping now snaps positions and clears previous frozen effects. No balance or combat-duration changes are made, consistent with the player’s positive balance feedback. Milestone 10 remains the arena art and authored attack/idle/death animation pass.
