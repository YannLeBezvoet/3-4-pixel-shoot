# Open questions

> Points the vision does not settle. Each open question has a **proposal** the lead developer follows if the owner agrees.
> When a question is settled, it moves to [Settled](#settled) with the date and the answer, and the affected docs are updated in the same commit.
> Open questions are grouped by the milestone that needs the answer.

## Open

### Needed before M2 (raised with its detailed plan, 2026-11-03)

- **Q61. Loadouts and the flamethrower.** Q17 gives each faction one fixed loadout; M2 adds grenades and a flamethrower. *Proposal:* a character carries one primary weapon and one throwable with a count per life (Q30: 2 grenades). Riflemen carry a rifle and grenades. The flamethrower is the primary weapon of a second character per faction, the flamethrower trooper. In solo, the player chooses rifleman or flamethrower trooper in the setup; one bot in four is a flamethrower trooper. No weapon switching in M2. Alternative: every character carries both a rifle and a flamethrower and switches with keys.
- **Q62. Throwing control.** *Proposal:* the right mouse button throws a grenade toward the cursor (G as an alternative key). While dead, right click keeps switching the spectated teammate (Q53).
- **Q63. What burns.** If grass burned, one flamethrower could set the whole map on fire. *Proposal:* in the Vietnam theme, tall grass, thatch roofs, bamboo walls, fences and crates are flammable; grass, jungle floor, paddies, mud, paths and trees are not. Fire on a tile burns about 5 s, has a chance each second to spread to each adjacent flammable tile, then leaves burnt ground or the burnt variant. Fire blocks nothing but damages characters standing in it.
- **Q64. Explosions and friendly fire.** *Proposal:* a grenade hurts its thrower, even with friendly fire off; it hurts teammates only with friendly fire on (Q30). The same rule applies to fire: a character is hurt by fire it started.
- **Q65. What stops a blast.** Q30 says explosions are blocked by walls. *Proposal:* the blast is stopped by `solid` and by `cover`, since sandbags exist to protect from it. A grenade flies over cover in its arc and bounces off solid obstacles.
- **Q66. Blood setting.** *Proposal:* *full*: sprays, decals and pools (default); *reduced*: smaller sprays, no decals or pools; *off*: no blood, hits show the impact effect. The setting is in the settings screen.
- **Q67. Bots and the new weapons.** *Proposal:* bots carrying a flamethrower close in and use it within its range; bots throw a grenade when an enemy they know of is behind cover or when several enemies stand close together, at most once every few seconds and never when a teammate is within the blast radius. Alternative: no grenades for bots in M2.
- **Q68. C2.5 wording.** Cover does not block sight (Q29), so a bot cannot be "hidden by cover". *Proposal:* C2.5 counts a position where cover or a solid obstacle stops the attacker's bullets.
- **Q69. 32 participants for C2.7.** Solo is capped at 16 (Q24). *Proposal:* the solo cap stays at 16 in M2; the 32-participant measurement uses a development page (`/dev/scene` with a participant count in the URL).
- **Q70. Initial values.** All are theme data, tunable at any time. *Proposal:* M26 and Type 67: blast radius 3 tiles (144 px), 120 damage at the center falling linearly to 0 at the edge, maximum throw 8 tiles; flamethrowers: range 4 tiles, 10 damage per flame hit, 3 s of fire per tank then a 3 s refill; burning characters lose 8 hit points per second for 3 s; destructibles: bamboo wall 60, fence 40, crate 80 hit points, sandbags 200 and only damaged by explosions (Q33), fuel barrel 30 and explosive.

## Settled

On 2026-11-03 the owner accepted every proposal below as written (Q1–Q47).

### Needed before M0

- **Q1. Game title and copyright holder.** Needed for `LICENSE`, the README and the browser tab title.
  *Settled:* working title "Pixel Shoot" (from the repository name) until you choose one; copyright line "Copyright (c) 2026 Yann Le Bezvoet and contributors".
- **Q2. Licenses.** *Settled:* MIT for code, CC BY 4.0 for assets, mapped with REUSE ([0013](decisions/0013-licensing.md)). Alternatives: AGPL-3.0 for code if you want anyone running a modified server to publish their changes; CC BY-SA 4.0 for assets if derivatives must stay open.
- **Q3. Continuous integration.** *Settled:* add a GitHub Actions workflow running `npm run check` and the REUSE check. It only runs when you push.
- **Q4. Committing Aseprite exports.** *Settled:* commit both `.aseprite` sources and their PNG + JSON exports, so the game builds without Aseprite ([0007](decisions/0007-aseprite-pipeline.md)).
- **Q5. Configuration format.** *Settled:* JSON with generated JSON Schemas (autocompletion and inline errors in VS Code) ([0006](decisions/0006-themes-as-data.md)). Alternative: YAML (comments, lighter syntax, more error-prone).
- **Q6. Transparency in images.** *Settled:* every pixel is either fully opaque or fully transparent; the palette check rejects partial alpha. Soft effects (smoke, shadows, fades) are made with dithering or at runtime (see Q14).
- **Q7. Screens that are not a multiple of 960×540** (1366×768, 1440×900, 2560×1440, ultrawide). *Settled:* always the largest integer factor, with letterboxing in a dark palette color (2560×1440 → ×2 with borders; 1366×768 → ×1 with wide borders). No larger field of view, to keep online matches fair. A non-integer "fill screen" option can be added later if small screens prove a problem.
- **Q8. Aseprite conventions.** *Settled* (detailed in [ARCHITECTURE §10](ARCHITECTURE.md)): tags `<action>.<direction>` with directions `down`, `down-side`, `side`, `up-side`, `up`, sides drawn facing right; slices `hand` (character), `grip` and `muzzle` (weapon, drawn pointing right), optional `origin` defaulting to the bottom-center pixel; untrimmed 48×48 frames.
- **Q9. Default language.** *Settled:* the browser's preferred language if a translation exists, otherwise English; the player's choice is remembered.
- **Q10. Fonts and future languages.** French needs accented glyphs (é, è, à, ç, œ, «»…). *Settled:* a free pixel font (OFL or CC0) covering Latin-1 and Latin Extended-A, chosen during M0 and credited in `CREDITS.md`. No other language is planned for now; adding a Cyrillic, Greek or CJK language will require a font that covers it.
- **Q11. Supported platforms.** *Settled:* desktop browsers only, the two latest versions of Chrome, Edge, Firefox and Safari; keyboard and mouse required; no touch or mobile support.
- **Q12. Versioning.** *Settled:* version `0.<n>.0` at the end of milestone n (`0.1.0` = playable solo); `CHANGELOG.md` keeps an "Unreleased" section in between, in the Keep a Changelog format.
- **Q13. Roadmap change.** *Settled:* implement team elimination in M1 (solo against bots) instead of M3, so solo has a goal and the game-mode interface is tested early; M3 brings it online. See [ROADMAP](ROADMAP.md).

### Needed before M1

- **Q14. Palette at runtime.** Fades, smoke and transparent overlays blend colors, producing off-palette pixels on screen. *Settled:* a final full-screen pass snaps every pixel to the nearest Resurrect 64 color, on by default, so these effects stay in palette. Alternative: forbid all blending at runtime.
- **Q15. Health model.** *Settled:* 100 hit points, no regeneration, no armor; damage per weapon set in the theme. No headshots (top-down view).
- **Q16. Ammunition.** *Settled:* magazines and reload; optional reserve per weapon in the theme (unlimited by default in M1).
- **Q17. Loadout.** *Settled:* each faction has a fixed default loadout in the theme for M1; choosing among several loadouts before a round comes later.
- **Q18. Facing and walking.** *Settled:* the body faces the cursor (8 directions); the walk animation plays forward whatever the movement direction. Alternative: play it backward when moving away from the cursor.
- **Q19. Movement feel.** *Settled:* one speed, near-instant acceleration (full speed in about 0.08 s), no sprint, no dodge roll in M1.
- **Q20. Camera and visibility.** *Settled:* the camera keeps the local player's character at the exact center of the screen (changed by the owner on 2026-11-03; the first answer added a look-ahead toward the cursor); beyond the map edges, the background color shows. No fog of war: anything on screen is visible, even behind walls. Alternative: line-of-sight visibility (more tactical, costlier, changes the arcade feel).
- **Q21. Team elimination rules.** *Settled:* 2 teams; rounds, first team to 3 round wins; 3-minute round limit, after which the team with more survivors wins the round (equal → draw); no respawn within a round; dead players spectate teammates; friendly fire off by default (a match setting).
- **Q22. Factions of the Vietnam theme.** *Settled:* team A = US Army, team B = People's Army of Vietnam and Viet Cong (shown as one faction at first). ARVN or other forces could be added later.
- **Q23. Weapons of the Vietnam theme.** *Settled:* M1: M16A1 (US) and AK-47 / Type 56 (PAVN-VC). M2: M26 fragmentation grenade and Type 67 stick grenade; a flamethrower for each side (M2A1-7 for the US, LPO-50 for the PAVN). Later: M60, RPD, M79, Ithaca 37, SKS. Different names and looks, **balanced stats** between sides. Alternatively, asymmetric factions with different strengths.
- **Q24. Participants in M1.** *Settled:* solo setup capped at 16 participants in M1; the 64 cap arrives with M4 once performance work is done.
- **Q25. Reference machine for performance criteria.** *Settled:* your own machine, or a mid-range laptop from about 2020 with integrated graphics (Intel Iris Xe class), latest Chrome, 1080p. Measurements run on the owner's machine until such a laptop is available; each milestone report states the hardware used.
- **Q26. Names and health bars over characters.** *Settled:* shown for teammates only; enemies show nothing.
- **Q27. First map.** *Settled:* I generate a first Vietnam map (about 80×60 tiles: jungle edge, village, rice paddies, river) with placeholder tilesets, editable in Tiled; you rework or replace it whenever you want.
- **Q28. Corpses.** *Settled:* corpses stay on the ground until the end of the round and block nothing.

On 2026-11-03 the owner also accepted Q48–Q60, raised with the detailed plan of M1, as proposed, except Q49 (amended) and Q57 (clarified), and changed Q20 (camera strictly centered).

### Needed before M1 (raised with its detailed plan)

- **Q48. Characters touching each other.** *Settled:* characters never overlap: when two collider circles touch, both are pushed apart equally, so they slide around each other; teammates included. Alternative: characters pass through each other (simpler and smoother online, but crowds pile up on one spot).
- **Q49. Friendly fire.** *Settled (amended by the owner):* friendly fire is a match setting (Q21, off by default) that the solo setup offers from M1, without waiting for the M4 settings form. Off: bullets pass through teammates, so a teammate never blocks your fire. On: bullets stop on teammates and damage them.
- **Q50. Terrain that cannot be crossed.** Q29 defines `solid` and `cover`; the river of the first map needs a rule. *Settled:* a third tile flag, `impassable`: blocks movement only; bullets and sight pass over it (deep water, chasms). In the first map the river is deep, crossed at fords and bridges; rice paddies are walkable at normal speed. Alternative: every water tile is walkable (no new flag). Slow terrain (mud, paddies) is not planned.
- **Q51. Round flow.** *Settled:* at the start of a round everyone is placed, then a 3-second countdown runs during which nobody can move or fire; at the end of a round the result shows for 5 seconds, then the next round starts; teams keep their spawn side every round. A match ends at 3 round wins **or after 9 rounds**, then the team with more round wins takes it (equal → match draw), so repeated draws can never make a match endless.
- **Q52. Spawns in Tiled.** *Settled:* spawns are **rectangles** in the `gameplay` layer with a `team` property (1, 2…), not single points. At each round start, the members of a team are placed on free tiles inside their team's areas, one per tile, chosen with the match's seeded generator. A map suits team elimination when each team's areas hold at least 8 free tiles (the M1 maximum per team).
- **Q53. Controls during a match.** *Settled:* ZQSD / WASD (physical keys) and the arrow keys move; the left mouse button fires (held for automatic weapons); R reloads, and reloading also starts by itself when the magazine is empty; Escape opens the pause menu (a solo match pauses); while spectating, left and right click switch to the next or previous living teammate; over the game, the system cursor is replaced by a pixel crosshair.
- **Q54. Initial gameplay values.** All are theme data, tunable at any time. *Settled:* character speed 180 px/s (3.75 tiles/s); collider radius 10 px, also used for bullet hits; rifle bullet at 1500 px/s (about 31 tiles/s) with a range of 900 px; the current M16A1 and AK-47 values are kept (both kill in 4 hits). Bullets travel at the height of the hands, so on screen they cross the torso of the character they hit.
- **Q55. Maps in a theme.** *Settled:* every `maps/<name>.tmj` file of a theme is a map (no list to maintain); its display name comes from a `nameKey` map property (a theme translation). Collision footprints of tile objects (trees, huts) are **rectangles** drawn in Tiled's collision editor; ellipses and polygons are rejected with a clear message until a behavior needs them.
- **Q56. Theme format version during development.** M1 adds files and fields to themes. *Settled:* the format stays version `1` during the 0.x versions; themes in the repository are updated in the same commit as each format change, and the add-a-theme guide says so. The version increases only once themes exist outside the repository. Alternative: increase it at every milestone that changes the format.
- **Q57. Names in solo.** The kill feed and teammate labels need names; nicknames arrive with multiplayer (Q41). *Settled (clarified by the owner):* nothing is drawn above the local player's own character (the camera is centered on it, Q20); in the kill feed the local player is "You" / "Vous" (translated) and the lines that involve them are highlighted; bots are "Bot 1" to "Bot 15" (a translated text with a number). Named bots drawn from lists in the theme can come later.
- **Q58. HUD layout** (960×540, bitmap font). *Settled:* bottom left: health bar and value. Bottom right: rounds in the magazine, reserve when the weapon has one, reload indicator. Top center: round score, round timer, living participants per team with faction names. Top right: kill feed (killer, weapon, victim; up to 5 lines, each kept 5 s). Center: countdown and round result banners. Above teammates: name and health bar (Q26).
- **Q59. Menus.** *Settled:* **main menu:** Solo, Settings, language menu (Multiplayer appears in M3; developer tools in development builds). **Solo setup:** theme, map (only maps that suit the mode), your side, allied bots 0–7 and enemy bots 1–8 (total ≤ 16, Q24), bot difficulty easy / normal / hard (normal by default), friendly fire (off by default, Q49); the other team elimination settings keep their Q21 defaults until the generic settings form of M4. **Settings:** language, palette pass (Q14). **Pause:** Resume, Settings, Quit to main menu. **End of match:** winner, round score, kills and deaths of every participant; Play again, Main menu. Round results are shown in the HUD, not in a menu.
- **Q60. The example theme (C1.8).** *Settled:* `themes/example/`, an abstract training theme: two factions, "Red" and "Blue", recolored placeholder soldiers, one rifle shared by both, a small 40×30 map. It is also the smallest example in the add-a-theme guide.

### Needed before M2

- **Q29. Cover rules.** *Settled:* two kinds of obstacle. `solid` (walls, rocks, huts): blocks movement, bullets and line of sight. `cover` (sandbags, low walls): blocks movement and bullets but not line of sight, so you see over it. No shooting over cover, even when adjacent (simple arcade rule).
- **Q30. Grenades.** *Settled:* thrown to the cursor, clamped to a maximum range; bounce off walls; 2.5 s fuse from the throw, no cooking; 2 per life; explosion blocked by walls; friendly fire follows the match setting.
- **Q31. Fire.** *Settled:* the flamethrower ignites flammable tiles, objects and characters; fire spreads between adjacent flammable tiles and burns out, leaving a burnt variant; burning characters take damage for about 3 seconds; no way to extinguish.
- **Q32. Blood and gore.** *Settled:* impact sprays, decals and pools under corpses that last for the round; no dismemberment. A blood setting (full / reduced / off), full by default.
- **Q33. Destructible elements.** *Settled* for the Vietnam theme: bamboo and thatch hut walls, crates, fences, sandbags, fuel barrels (explosive). Each has hit points and an optional damage filter (e.g. sandbags only damaged by explosions). Destroyed elements leave rubble with no collision.
- **Q34. Canopies and roofs.** *Settled:* when the local player is under an overhead element, a dithered circle around them makes it see-through.

### Needed before M3

- **Q35. Who hosts a match.** *Settled:* a dedicated server hosts every room; the player who creates a room only administers it (settings, start), their browser does not run the server. Confirmed.
- **Q36. Hosting.** *Settled:* during M3, local and LAN only. For public play later: one small VPS (EU) running the server in a container, with the static client served from it or from GitHub Pages. Budget and provider to be decided.
- **Q37. Room codes and privacy.** *Settled:* 5 characters from an alphabet without ambiguous characters (no 0/O, 1/I/L), case-insensitive; rooms are private (code only, no public list); a room closes 10 minutes after its last human leaves.
- **Q38. Room administrator leaving.** *Settled:* the role passes to the human connected the longest; the room stays open while at least one human is present.
- **Q39. Disconnection mid-round.** *Settled:* a bot takes over the character until the end of the round; the player can reconnect within 60 seconds to take it back.
- **Q40. Late joining and teams.** *Settled:* players choose their team in the lobby; the administrator can lock or shuffle teams; bots fill the gaps; someone joining during a round spectates until the next one and joins the smaller team.
- **Q41. Nicknames.** *Settled:* 2 to 16 characters, no profanity filter; duplicates get a numeric suffix.

### Needed before M4

- **Q42. Civilians.** *Settled:* civilians wander inside Tiled zones and flee from gunfire and explosions. Until a mode gives them a role, bullets and explosions **pass through them without harming them**. Alternative: they can be hit, and each mode decides the consequences. Chosen: they are not harmed.
- **Q43. Match settings.** *Settled:* theme, map, mode, humans and bots per team (total ≤ 64), bot difficulty, friendly fire, rounds to win, round time, blood level. No other setting for now.
- **Q44. Map size for 64 participants.** *Settled:* about 160×120 tiles (7680×5760 px), with several spawn areas per team.
- **Q45. Gamepad and key remapping.** *Settled:* after M4; the input layer is designed so a gamepad is just another input source.
- **Q46. Must a theme support every mode?** *Settled:* no: the validator warns when a theme has no map for a registered mode, and the lobby hides combinations that do not work.
- **Q47. Solo simulation in a Web Worker.** *Settled:* introduced in M4 when 63 bots run in the browser; the `Session` interface stays the same.
