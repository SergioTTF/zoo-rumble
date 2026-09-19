# Milestone 9 — Combat readability

The preceding arena revision provides an inverted 8×6 board, full-sprite selection, and yellow valid-drop previews. This pass focuses on combat presentation. Combat balance and simulation timing remain unchanged; the player accepts the provisional difficulty and tuning can wait.

Health labels now render independently of animal depth. During combat, stars and team-colored health bars remain visible, while names and exact health appear for the hovered animal. Preparation and results show full details. A deterministic placement helper separates nearby label rectangles, avoids neighboring animal silhouettes, and bounds placement to the arena. Small team-colored guide lines connect displaced labels to their animals. Placement is bounded; extremely crowded configurations can still exhaust candidate space and fall back to the nearest anchor.

Damage numbers choose open space around existing numbers and health labels. Ability text occupies a higher lane, uses smaller type, and distinguishes cyan EXTRA HIT from orange EXECUTE. Repeated ability text is limited to once per eight simulation ticks per animal; effects still reflect each trigger. Ability particles are reduced from nine to four to keep the sprites visible. These changes do not suppress or alter combat events.

Paused single-tick stepping clears previous effects, resets flashes, and snaps positions to the current snapshot. This fixes frozen movement/flash effects obscuring stepped state. Normal pause continues to freeze playback. Reduced motion retains health and text feedback while omitting movement and particle effects.

Sprites and health-label containers are destroyed together on preparation resets. Floating labels are removed from their tracking set on completion and reset. Existing drag/picking behavior remains on the animal sprite container; labels do not intercept input.

Validation covers deterministic placement of twelve crowded labels, arena bounds, avoiding neighboring silhouettes, and placing new floating text without moving existing text. The existing combat/progression checks continue to verify simulation independently. Browser review covers preparation, paused steps, and combat completion. Dedicated attack/idle/death artwork and terrain art remain Milestone 10.
