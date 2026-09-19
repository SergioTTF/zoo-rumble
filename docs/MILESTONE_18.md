# Milestone 18 — Release hardening

Milestone 18 prepares the current game for static browser release.

- Vite keeps relative asset URLs for static-file hosting, while Phaser remains isolated behind the existing dynamic import.
- Desktop, narrow-tablet, and phone layouts retain the arena and controls. On small screens, the shop and bench become intentional horizontal strips instead of crushing cards below readable size.
- The battlefield has accessible instructions. Selecting an owned animal exposes an 18-cell keyboard placement grid with occupied-cell labels and swap behavior.
- Visible focus styles remain on buttons, inputs, summaries, and placement controls. Space pauses or resumes active combat, `?` opens the guide, and Escape closes it.
- Status and result announcements use the existing live regions. The end-of-run panel now reports battles fought, collection size, and highest achieved star.
- Page metadata includes a product description and mobile theme color.

The production bundle continues to contain the Phaser runtime as a separate lazy chunk. Its size is expected for the renderer; application code remains in the smaller entry bundle. Release verification covers type checking, lint, unit tests, deterministic evaluation, production build, responsive browser views, and console errors.
