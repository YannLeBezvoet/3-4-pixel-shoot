# Open questions

> Points the vision does not settle. Each has a **proposal** the lead developer will follow if the owner agrees.
> When a question is settled, it moves to [Settled](#settled) with the date and the answer, and the affected docs are updated in the same commit.
> Grouped by the milestone that needs the answer.

## Needed before M0

- **Q1. Game title and copyright holder.** Needed for `LICENSE`, the README and the browser tab title.
  *Proposal:* working title "Pixel Shoot" (from the repository name) until you choose one; copyright line "Copyright (c) 2026 Yann Le Bezvoet and contributors".
- **Q2. Licenses.** *Proposal:* MIT for code, CC BY 4.0 for assets, mapped with REUSE ([0013](decisions/0013-licensing.md)). Alternatives: AGPL-3.0 for code if you want anyone running a modified server to publish their changes; CC BY-SA 4.0 for assets if derivatives must stay open.
- **Q3. Continuous integration.** *Proposal:* add a GitHub Actions workflow running `npm run check` and the REUSE check. It only runs when you push.
- **Q4. Committing Aseprite exports.** *Proposal:* commit both `.aseprite` sources and their PNG + JSON exports, so the game builds without Aseprite ([0007](decisions/0007-aseprite-pipeline.md)).
- **Q5. Configuration format.** *Proposal:* JSON with generated JSON Schemas (autocompletion and inline errors in VS Code) ([0006](decisions/0006-themes-as-data.md)). Alternative: YAML (comments, lighter syntax, more error-prone).
- **Q6. Transparency in images.** *Proposal:* every pixel is either fully opaque or fully transparent; the palette check rejects partial alpha. Soft effects (smoke, shadows, fades) are made with dithering or at runtime (see Q14).
- **Q7. Screens that are not a multiple of 960×540** (1366×768, 1440×900, 2560×1440, ultrawide). *Proposal:* always the largest integer factor, with letterboxing in a dark palette color (2560×1440 → ×2 with borders; 1366×768 → ×1 with wide borders). No larger field of view, to keep online matches fair. A non-integer "fill screen" option can be added later if small screens prove a problem.
- **Q8. Aseprite conventions.** *Proposal* (detailed in [ARCHITECTURE §10](ARCHITECTURE.md)): tags `<action>.<direction>` with directions `down`, `down-side`, `side`, `up-side`, `up`, sides drawn facing right; slices `hand` (character), `grip` and `muzzle` (weapon, drawn pointing right), optional `origin` defaulting to the bottom-center pixel; untrimmed 48×48 frames. Does this fit how you like to work in Aseprite?
- **Q9. Default language.** *Proposal:* the browser's preferred language if a translation exists, otherwise English; the player's choice is remembered.
- **Q10. Fonts and future languages.** French needs accented glyphs (é, è, à, ç, œ, «»…). *Proposal:* a free pixel font (OFL or CC0) covering Latin-1 and Latin Extended-A, proposed with its license during M0. Which other languages do you foresee? Cyrillic, Greek or CJK each need a font that covers them.
- **Q11. Supported platforms.** *Proposal:* desktop browsers only, the two latest versions of Chrome, Edge, Firefox and Safari; keyboard and mouse required; no touch or mobile support.
- **Q12. Versioning.** *Proposal:* version `0.<n>.0` at the end of milestone n (`0.1.0` = playable solo); `CHANGELOG.md` keeps an "Unreleased" section in between, in the Keep a Changelog format.
- **Q13. Roadmap change.** *Proposal:* implement team elimination in M1 (solo against bots) instead of M3, so solo has a goal and the game-mode interface is tested early; M3 brings it online. See [ROADMAP](ROADMAP.md).

## Needed before M1

- **Q14. Palette at runtime.** Fades, smoke and transparent overlays blend colors, producing off-palette pixels on screen. *Proposal:* a final full-screen pass snaps every pixel to the nearest Resurrect 64 color, on by default, so these effects stay in palette. Alternative: forbid all blending at runtime.
- **Q15. Health model.** *Proposal:* 100 hit points, no regeneration, no armor; damage per weapon set in the theme. No headshots (top-down view).
- **Q16. Ammunition.** *Proposal:* magazines and reload; optional reserve per weapon in the theme (unlimited by default in M1).
- **Q17. Loadout.** *Proposal:* each faction has a fixed default loadout in the theme for M1; choosing among several loadouts before a round comes later.
- **Q18. Facing and walking.** *Proposal:* the body faces the cursor (8 directions); the walk animation plays forward whatever the movement direction. Alternative: play it backward when moving away from the cursor.
- **Q19. Movement feel.** *Proposal:* one speed, near-instant acceleration (full speed in about 0.08 s), no sprint, no dodge roll in M1.
- **Q20. Camera and visibility.** *Proposal:* the camera follows the player with a look-ahead toward the cursor (up to a quarter of the screen); no fog of war: anything on screen is visible, even behind walls. Alternative: line-of-sight visibility (more tactical, costlier, changes the arcade feel).
- **Q21. Team elimination rules.** *Proposal:* 2 teams; rounds, first team to 3 round wins; 3-minute round limit, after which the team with more survivors wins the round (equal → draw); no respawn within a round; dead players spectate teammates; friendly fire off by default (a match setting).
- **Q22. Factions of the Vietnam theme.** *Proposal:* team A = US Army, team B = People's Army of Vietnam and Viet Cong (shown as one faction at first). ARVN or other forces could be added later. How do you want the factions named and depicted?
- **Q23. Weapons of the Vietnam theme.** *Proposal:* M1: M16A1 (US) and AK-47 / Type 56 (PAVN-VC). M2: M26 fragmentation grenade and Type 67 stick grenade; a flamethrower for each side (M2A1-7 for the US, LPO-50 for the PAVN). Later: M60, RPD, M79, Ithaca 37, SKS. Different names and looks, **balanced stats** between sides. Alternatively, asymmetric factions with different strengths.
- **Q24. Participants in M1.** *Proposal:* solo setup capped at 16 participants in M1; the 64 cap arrives with M4 once performance work is done.
- **Q25. Reference machine for performance criteria.** *Proposal:* your own machine, or a mid-range laptop from about 2020 with integrated graphics (Intel Iris Xe class), latest Chrome, 1080p. Which one?
- **Q26. Names and health bars over characters.** *Proposal:* shown for teammates only; enemies show nothing.
- **Q27. First map.** *Proposal:* I generate a first Vietnam map (about 80×60 tiles: jungle edge, village, rice paddies, river) with placeholder tilesets, editable in Tiled; you rework or replace it whenever you want.
- **Q28. Corpses.** *Proposal:* corpses stay on the ground until the end of the round and block nothing.

## Needed before M2

- **Q29. Cover rules.** *Proposal:* two kinds of obstacle. `solid` (walls, rocks, huts): blocks movement, bullets and line of sight. `cover` (sandbags, low walls): blocks movement and bullets but not line of sight, so you see over it. No shooting over cover, even when adjacent (simple arcade rule).
- **Q30. Grenades.** *Proposal:* thrown to the cursor, clamped to a maximum range; bounce off walls; 2.5 s fuse from the throw, no cooking; 2 per life; explosion blocked by walls; friendly fire follows the match setting.
- **Q31. Fire.** *Proposal:* the flamethrower ignites flammable tiles, objects and characters; fire spreads between adjacent flammable tiles and burns out, leaving a burnt variant; burning characters take damage for about 3 seconds; no way to extinguish.
- **Q32. Blood and gore.** *Proposal:* impact sprays, decals and pools under corpses that last for the round; no dismemberment. A blood setting (full / reduced / off), full by default.
- **Q33. Destructible elements.** *Proposal* for the Vietnam theme: bamboo and thatch hut walls, crates, fences, sandbags, fuel barrels (explosive). Each has hit points and an optional damage filter (e.g. sandbags only damaged by explosions). Destroyed elements leave rubble with no collision.
- **Q34. Canopies and roofs.** *Proposal:* when the local player is under an overhead element, a dithered circle around them makes it see-through.

## Needed before M3

- **Q35. Who hosts a match.** *My reading of the vision:* a dedicated server hosts every room; the player who creates a room only administers it (settings, start), their browser does not run the server. Is that right?
- **Q36. Hosting.** *Proposal:* during M3, local and LAN only. For public play later: one small VPS (EU) running the server in a container, with the static client served from it or from GitHub Pages. Budget and provider to be decided.
- **Q37. Room codes and privacy.** *Proposal:* 5 characters from an alphabet without ambiguous characters (no 0/O, 1/I/L), case-insensitive; rooms are private (code only, no public list); a room closes 10 minutes after its last human leaves.
- **Q38. Room administrator leaving.** *Proposal:* the role passes to the human connected the longest; the room stays open while at least one human is present.
- **Q39. Disconnection mid-round.** *Proposal:* a bot takes over the character until the end of the round; the player can reconnect within 60 seconds to take it back.
- **Q40. Late joining and teams.** *Proposal:* players choose their team in the lobby; the administrator can lock or shuffle teams; bots fill the gaps; someone joining during a round spectates until the next one and joins the smaller team.
- **Q41. Nicknames.** *Proposal:* 2 to 16 characters, no profanity filter; duplicates get a numeric suffix.

## Needed before M4

- **Q42. Civilians.** *Proposal:* civilians wander inside Tiled zones and flee from gunfire and explosions. Until a mode gives them a role, bullets and explosions **pass through them without harming them**. Alternative: they can be hit, and each mode decides the consequences. This is a design and tone decision for you.
- **Q43. Match settings.** *Proposal:* theme, map, mode, humans and bots per team (total ≤ 64), bot difficulty, friendly fire, rounds to win, round time, blood level. Anything else?
- **Q44. Map size for 64 participants.** *Proposal:* about 160×120 tiles (7680×5760 px), with several spawn areas per team.
- **Q45. Gamepad and key remapping.** *Proposal:* after M4; the input layer is designed so a gamepad is just another input source.
- **Q46. Must a theme support every mode?** *Proposal:* no: the validator warns when a theme has no map for a registered mode, and the lobby hides combinations that do not work.
- **Q47. Solo simulation in a Web Worker.** *Proposal:* introduced in M4 when 63 bots run in the browser; the `Session` interface stays the same.

## Settled

*(none yet)*
