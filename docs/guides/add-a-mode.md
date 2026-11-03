# Add a game mode

A game mode is code (the rules of a match), written against the game-mode API of the engine and added to the list of built-in modes. Nothing else changes: not the engine (`sim`), not the match host, not the apps (ARCHITECTURE §7).

## 1. Where it goes

```
packages/modes/src/<mode-id>/
├── <mode-id>.ts        # the mode
└── <mode-id>.test.ts   # its tests
```

Then add it to `builtInModes` in `packages/modes/src/built-in.ts` (the list offered to players) and export it from `packages/modes/src/index.ts`. The mode's name is a translation key (`mode.<mode-id>.name`) in `locales/en.json` and the other interface languages.

## 2. The smallest mode: `sandbox`

`packages/modes/src/sandbox/sandbox.ts` spawns everyone and brings the dead back after 2 seconds. Every mode has the same shape:

```ts
export const sandbox: GameModeDefinition<SandboxSettings> = {
  id: 'sandbox',
  nameKey: 'mode.sandbox.name',
  settings: z.strictObject({ friendlyFire: z.boolean().default(false) }),
  mapRequirements: { teams: 1 },           // spawn areas needed for teams 1…N
  rules: (settings) => ({ friendlyFire: settings.friendlyFire }),
  create(api, settings) {
    return {
      onMatchStart() { /* e.g. spawn everyone */ },
      onEvent(event) { /* each simulation event of the tick: shots, hits, kills… */ },
      onTick() { /* once per tick, after the events: timers, rounds */ },
      onParticipantJoined(id) {},
      onParticipantLeft(id) {},
      state: () => ({}),                     // round, timer, scores, banner, result
    };
  },
};
```

- **`settings`** is a Zod schema with a default for every field. Match settings given by players are validated by it.
- **`rules`** turns settings into simulation rules (today: `friendlyFire`).
- **`api`** (`ModeApi`) is the only door into the match: `participants()`, `characterOf(id)`, `spawn(id)`, `clearWorld()`, `setFrozen(frozen)`, `tick`, `map` and `random` (the mode's own random stream; never `Math.random`).
- **`state()`** is drawn by the HUD: `round`, `timeLeft` (ticks), `teamScores`, `banner` (a translation key with parameters, never text) and, at the end, `result`.
- **Time** is counted in ticks: 60 per second (`TICK_RATE`).
- **Texts** in `state()` are translation keys with parameters. A parameter named `team` holds a team number: the game shows that team's faction name (`{ key: 'mode.team-elimination.roundWon', params: { team: 1 } }` reads "Round to US Army").

## 3. A complete mode: `team-elimination`

`packages/modes/src/team-elimination/team-elimination.ts` shows the usual building blocks of a round-based mode:

- **Phases** (`countdown`, `playing`, `roundOver`, `matchOver`), each ending at a tick computed when it starts.
- **A round starts** with `api.clearWorld()`, `api.spawn()` for every participant and `api.setFrozen(true)` for the countdown; `setFrozen(false)` starts the fight.
- **The round ends** when `api.characterOf()` shows a team with nobody alive, or when time runs out.
- **The match ends** by setting `result` in the state: the match host then reports `finished`.
- **Settings:** `friendlyFire` (off), `roundsToWin` (3), `roundSeconds` (180). After 3 × `roundsToWin` rounds the match stops whatever the score, so repeated draws cannot make it endless (Q51).

## 4. Test it

Run the mode inside a real match host on an ASCII map, as `sandbox.test.ts` and `team-elimination.test.ts` do:

```ts
const host = createMatchHost({ map: asciiMap('#1....2#'), catalog: testCatalog(), mode: sandbox, seed: 's' });
host.addParticipant({ name: { text: 'A' }, team: 1, character: 'rifleman', kind: 'human' });
host.start();
host.step();
```

`asciiMap` and `testCatalog` come from `@pixel-shoot/sim`; tests of `modes` may import `@pixel-shoot/match`.
