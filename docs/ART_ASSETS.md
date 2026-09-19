# Active directional animal art

All sixteen animals now use the user-approved detailed pixel style. Bear and Rabbit originate from the user-supplied sheets; the remaining fourteen were generated using those sheets and the approved Wolf study as references. The earlier procedural pixel passes and toy-like atlas remain historical studies, and are not loaded by the game.

Sources are preserved in `public/assets/art-studies/`. `scripts/prepare_directional_animals.py` prepares transparent 128×128 frames, four columns and four rows (left, front, rear, right), on 512×512 runtime sheets in `public/assets/animals/directional/`. One scale per species preserves pose proportions, nearest-neighbor resizing retains pixel edges, and all feet align at pixel 120. Portraits use a right-facing frame. Rabbit's mismatched left-row third frame is replaced with a mirrored right-row pose during preparation only; the source is unchanged.

The script validates all frames and transparent borders, writes a roster preview and preparation report, and generates `src/game/animalArtMetadata.json` with per-direction star heights. The sixteen runtime sheets total approximately 2.67 MB before transfer compression. Raw source sheets are not requested at runtime.

Walking advances only within the selected directional row. Idle and attack hold a contact frame; attack lunges, projectiles, hits, abilities, upgrades, and death fades remain procedural. Dedicated drawn attack/idle/death cycles are future work. Pause, hidden-page time, and reduced motion preserve the simulation/presentation separation. See [DIRECTIONAL_ART_IMPLEMENTATION.md](./DIRECTIONAL_ART_IMPLEMENTATION.md) for prompts and preparation details.

# Historical art studies

The following describes superseded passes for provenance. Their drawing scripts and files remain available for comparison.

# Original pixel animal art

This superseded animal artwork was original, code-drawn pixel art created September 16, 2026. Bear, Rabbit, and Wolf now use a second, individually drawn study; the other thirteen animals remain on the first pixel pass pending review. Pixeline’s porcupine and Helm3t’s Green Heart animals are style references supplied by the user; no third-party pixels, sprite sheets, or traced silhouettes were imported. The earlier generated toy-like atlas is no longer used at runtime.

## Trio revision for review

The user rejected the first pixel pass as repetitive and stiff. This revision is deliberately limited to Bear, Rabbit, and Wolf before extending its treatment across the roster. `scripts/draw_pixel_trio.py` independently draws their body structures: a broad shoulder and curved back for Bear, larger haunches and tilted ears for Rabbit, and a narrow torso, ruff, long muzzle, and articulated legs for Wolf. Smaller heads, curated fur clusters, and an elevated view replace the shared large-head template.

Each animal uses a 48×48 transparent canvas and 576×48 twelve-frame sheet, with the feet baseline at pixel 44. Files are `<id>-v2.png` and `<id>-v2-sheet.png`; older assets remain for comparison. `ANIMAL_LAYOUT` provides each sheet size, foot origin, and star position. Sprite rendering stays at 96px nominal size, letting Rabbit appear smaller naturally. No generated bitmap or third-party pixels are used in this revision.

`ANIMAL_POSE_TIMINGS` gives Bear a 360ms movement/swipe cycle, Rabbit a 240ms hop and 200ms jab, and Wolf a 240ms stride and 260ms bite. Action playback shortens with battle speed. Idle holds the neutral pose longer between blinks. Floating idle motion is removed; these three use drawn movement poses rather than a scaled body bounce. Simulation still resolves hits immediately from ordered events; visual anticipation does not delay damage.

Review assets: `public/assets/pixel-trio-v2-preview.png` shows neutral, movement, wind-up, and strike poses; `pixel-trio-v2-motion.gif` shows the frame study (its preview timing differs from animal-specific runtime timing). Rebuild just the trio with `python scripts/draw_pixel_trio.py`; the full `draw_pixel_animals.py` rebuild also invokes the trio generator. The scripts assert transparent borders to catch clipped poses.

## Drawing source and output

`scripts/draw_pixel_animals.py` defines integer-coordinate shapes, outlines, species features, and restrained shared colors on transparent 32×32 canvases. Rebuild with Python and Pillow: `python scripts/draw_pixel_animals.py`. Pillow is an asset-authoring dependency only, not a game dependency. No image-generation tool is used for this pixel pass.

Each of the thirteen animals still on the first pixel pass has a 32×32 portrait (`public/assets/animals/<id>.png`) and a transparent 384×32 sheet (`<id>-sheet.png`): frames 0–3 idle, 4–7 walk, 8–11 attack. Walk frames alternate feet or wings; attack frames include anticipation, reaching/bite/beak poses and recovery. The idle includes a blink. These are modest four-frame cycles, with mirrored left/right facing; separate front/back directions and drawn death frames are not included. Runtime death fades and impact/ability effects remain procedural.

`public/assets/pixel-roster-preview.png` is a nearest-neighbor enlarged contact sheet. The React portraits use pixelated image rendering. Phaser loads 32px sheet frames, draws at 3× nominal scale for first-pass animals, and aligns their feet at the pixel-29 origin; the trio uses its own layout described above. Stars sit above the tallest ears. Phaser’s pixel-art rendering prevents texture smoothing.

## Playback

The presentation clock selects idle/walk/attack frames independently of simulation. Combat events start poses, and snapshots remain authoritative for health and location. Action poses shorten with playback speed; pause and hidden-page time freeze frame progression. Reduced motion shows the neutral frame. Drawing frames and completing effects never trigger attacks, damage, or movement. Existing deterministic battle results and progression rules are unchanged.

## Historical generated prototype

The following documents the superseded Milestone 7 prototype for provenance. It is not the active sprite pipeline.

### Earlier Milestone 7 animal art

Generated with the built-in image-generation tool on September 16, 2026. No external image service or image-generation dependency runs inside the game. The source is `public/assets/animal-atlas-v1.png` (1254 × 1254, RGBA). Sixteen project-owned normalized PNG sprites live in `public/assets/animals/`. `src/game/animalVisuals.ts` maps these assets for React and Phaser using Vite's base URL.

## Final generation prompt (verbatim)

Use case: stylized-concept. Asset type: ONE game sprite atlas, 2048 by 2048 PNG, actual transparent alpha background. Create a precise 4-column by 4-row uniform sprite sheet of sixteen charming full-body woodland animal characters for Zoo Rumble, a polished casual auto-battler. One character centered wholly inside each equal 512x512 cell, feet at the same baseline 440px within each cell, abundant transparent padding, no character crosses a cell boundary. Row 1 left to right: brown Bear, cream Rabbit with long ears, gray Wolf, golden floppy-eared Dog. Row 2: orange Fox with bushy white-tipped tail, spotted Hyena with rounded ears, white Chicken with red comb, black-and-white Penguin. Row 3: brown Eagle with white head, little brown Monkey with curled tail, Baboon with colored muzzle, dark muscular Gorilla. Row 4: tan pointy-eared Jackal, colorful red green blue Parrot, tawny Owl with round eye disks, dark Chimpanzee with pale face. Consistent high-quality illustrated toy-like 3D chibi style, oversized expressive heads, small grounded bodies and visible feet, subtle painted fur/feather shapes, clean silhouette, warm natural colors, soft upper-left light, slight three-quarter view facing right, friendly determined expressions. All sixteen have the same coherent visual treatment and readable silhouettes at small game size. NO circles, badges, borders, grids, cell labels, text, scenery, ground planes, equipment, or cast shadow backgrounds. Transparent unused canvas everywhere. This is a production sprite atlas, not a poster or contact sheet.

## Asset preparation

The tool returned 1254 pixels rather than the requested 2048. Divide the source into four equal rows and columns using rounded pixel boundaries. Within each cell, find the bounds of alpha above 32, crop, and resize proportionally to fit 230 × 232. Preserve the original RGBA pixels and alpha; place each result on a transparent 256 × 256 frame, horizontally centered with its feet at pixel 248. The original source remains available for revision. Runtime sprites are single illustrated poses; breathing, hopping, lunging, facing, hit flashes, death, and upgrade motion are procedural. Fully drawn multi-frame or skeletal animation remains a possible follow-up after review.
