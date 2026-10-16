# Interactive tutorial (feature/interactive-tutorial)

A guided, playable **Training Grounds** battle using the actual Knightmare engine and existing map controls.

**Access:** Main menu → **Interactive Tutorial** → **Start tutorial** (also via **Play tutorial** in the footer).

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
