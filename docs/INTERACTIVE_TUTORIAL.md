# Interactive tutorial (feature/interactive-tutorial)

A guided, playable **Training Grounds** battle using the actual Knightmare engine and existing map controls.

**Access:** Main menu → footer **Interactive tutorial** (next to Field manual); the tutorial is deliberately separate from the Game modes section.

## Lessons
1. Begin the training battle.
2. Select the supplied Britannian Gloucester.
3. Move to the gold-outlined green hex.
4. Attack the weakened enemy guard; mobile attacks use the existing two-tap confirmation.
5. End turn to refresh unit actions.
6. Capture the undefended Relay Outpost with infantry.
7. Select Headquarters.
8. Use Factory to recruit any affordable Knightmare.
9. Assign the loaned Suzaku to that new unit, then finish.

## Isolation and constraints

- Training is a small non-wrapping `scenario`-mode map registered only in memory, not in the regional scenario selector.
- Tutorial actions use the real `E.move`, `E.attack`, `E.recruit`, `E.assign` and `E.beginTurn` calls.
- Training turns advance **without enemy AI**; the city to capture has no shield and the lone guard has 1 HP.
- `save()` is a no-op while training, so tutorial sessions do not replace the conquest, regional scenario or campaign save slots.
- Training lends Suzaku in a temporary `game.roster` and skips importing or writing permanent HQ commander data.
- Restart and Exit are available on the coach at any time.
- HUD and map controls remain usable; the coach points to the required hex rather than simulating a battle.

## Source and build

- Tutorial controller: `dist/ui/tutorial.js`
- Design: `dist/tutorial.css`
- Script/style inclusion: `dist/index.html`
- Start button and redraw: `src/hud/00-start-menu.part.js`
- Action and selection hooks: `src/hud/04-orders-and-actions.part.js`, `dist/ui/input.js`, `dist/ui/view.js`, `dist/ui/turns.js`
- Gold objective marker: `src/renderer/05-frame-painting.part.js`
- Commander roster isolation: `dist/ui/dialogs.js`
- Save isolation: `dist/ui/core.js`

Build generated bundles with `node tools/build_sources.cjs` before running locally. The generated bundles remain untracked.

## Optional Training Academy chapters

The main-menu **Interactive tutorial** entry opens a Training Academy selector. The original Basic Training is unchanged. Eleven additional drills are available:

- **Combat Academy:** Damage and counterfire; City shields and capture; Unit classes and roles; Repair and reinforce; Terrain and positioning.
- **Strategic Command:** Economy and production; Turn controls and orders.
- **Advanced Warfare:** Naval warfare and ports; Research and Elite Forces; Army groups and automation; F.L.E.I.J.A. and Eliminators.

Drills combine real map movement, combat, city capture, repairs, reinforcement, factory recruitment, naval landing, army-group routing, a training city-automation queue and a real isolated F.L.E.I.J.A. interception with explanatory questions. Some topics, especially permanent HQ upgrades, are explained using a temporary loaned Elite frame rather than changing the persistent player profile. Commander ability lessons were explicitly excluded.

Each drill begins in a fresh isolated 11 × 9 training battle. Restarting or exiting does not overwrite game modes or HQ progression, and strategic resources or superweapons used by drills are disposable.

Training Academy source: `dist/ui/tutorial-labs.js`. Mechanical smoke coverage: `tools/tutorial_academy_smoke.cjs`.
