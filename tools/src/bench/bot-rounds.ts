// Headless team-elimination rounds between bots on a real theme map (C1.6, C1.10): how rounds
// end, whether any bot fired with no enemy in sight, what the combat toolbox did (grenades, fire,
// map elements) and how long a simulation tick takes. One bot in four is the second character of
// its side, a flamethrower trooper in Vietnam (Q61).
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { DIFFICULTY_LEVELS, canSee } from '@pixel-shoot/bots';
import type { DifficultyLevel } from '@pixel-shoot/bots';
import { buildCatalog, loadMap, loadTheme } from '@pixel-shoot/content';
import { createMatchHost } from '@pixel-shoot/match';
import { COUNTDOWN_TICKS, teamElimination } from '@pixel-shoot/modes';
import type { Catalog, MapData } from '@pixel-shoot/sim';
import { TICK_RATE, builtInBehaviors } from '@pixel-shoot/sim';
import { listLanguages, nodeFileProvider } from '../content/node-files';
import { repoRoot } from '../paths';

export const ROUND_SECONDS = 180;
/** A shot counts as aimed at a seen enemy when one is within this angle of it. */
const SIGHT_CONE = (35 * Math.PI) / 180;

export interface RoundResult {
  readonly seed: string;
  /** Bots in each team. */
  readonly perTeam: number;
  /** How the round ended: a team eliminated, or the time limit. */
  readonly end: 'elimination' | 'time';
  /** Seconds of play after the countdown. */
  readonly seconds: number;
  readonly shots: number;
  /** Shots fired by a bot with no living enemy in sight within the shot's cone. */
  readonly blindShots: number;
  readonly grenades: number;
  readonly explosions: number;
  /** Map elements that caught fire. */
  readonly fires: number;
  /** Map elements destroyed or burnt out. */
  readonly destroyed: number;
  readonly tickMs: readonly number[];
}

export async function loadArena(
  themeId = 'vietnam',
  mapRef = 'maps/river-village',
  root = repoRoot,
) {
  const files = nodeFileProvider(root);
  const { theme, issues } = await loadTheme(files, themeId, {
    behaviors: builtInBehaviors,
    languages: await listLanguages(root),
  });
  if (!theme)
    throw new Error(`Theme "${themeId}" is invalid: ${issues.map((i) => i.message).join('; ')}`);
  const loaded = await loadMap(files, theme, mapRef);
  if (!loaded.map) throw new Error(`Map "${mapRef}" is invalid.`);
  const charactersOf = (team: number) =>
    [...theme.characters.values()]
      .filter((c) => c.faction === theme.factions[team - 1]?.id)
      .map((c) => c.id);
  return {
    map: loaded.map,
    catalog: buildCatalog(theme),
    characters: [charactersOf(1), charactersOf(2)],
  };
}

/** One bot in four is the side's second character, as in solo (Q61). */
function rosterCharacter(characters: readonly string[], index: number): string {
  return (index % 4 === 3 ? characters[1] : undefined) ?? characters[0] ?? '';
}

/** Plays the first round of a bot-only team elimination match. */
export function playRound(
  arena: { map: MapData; catalog: Catalog; characters: readonly (readonly string[])[] },
  seed: string,
  perTeam = 8,
  difficulty: DifficultyLevel = 'normal',
): RoundResult {
  const host = createMatchHost({
    map: arena.map,
    catalog: arena.catalog,
    mode: teamElimination,
    settings: { roundSeconds: ROUND_SECONDS },
    seed,
  });
  const bots = new Set<number>();
  for (const team of [1, 2])
    for (let n = 0; n < perTeam; n++)
      bots.add(
        host.addParticipant({
          name: { key: 'participant.bot', params: { n } },
          team,
          character: rosterCharacter(arena.characters[team - 1] ?? [], n),
          kind: 'bot',
          difficulty,
        }),
      );
  host.start();
  const { grid } = host.simulation;
  const tickMs: number[] = [];
  let shots = 0;
  let blindShots = 0;
  let grenades = 0;
  let explosions = 0;
  let fires = 0;
  let destroyed = 0;
  const limit = COUNTDOWN_TICKS + ROUND_SECONDS * TICK_RATE + 2;
  for (let tick = 0; tick < limit; tick++) {
    const before = host.view().actors;
    const start = performance.now();
    const events = host.step();
    tickMs.push(performance.now() - start);
    for (const event of events) {
      if (event.type === 'thrown') grenades++;
      if (event.type === 'exploded') explosions++;
      if (event.type === 'fireStarted') fires++;
      if (event.type === 'elementDestroyed') destroyed++;
      if (event.type !== 'shotFired') continue;
      const shooter = before.find((a) => a.id === event.shooter);
      if (!shooter) continue;
      shots++;
      const seen = before.some((enemy) => {
        if (!enemy.alive || enemy.team === shooter.team) return false;
        const angle = Math.atan2(enemy.y - shooter.y, enemy.x - shooter.x);
        const off = Math.abs(
          Math.atan2(Math.sin(angle - event.angle), Math.cos(angle - event.angle)),
        );
        return off < SIGHT_CONE && canSee(shooter, enemy.x, enemy.y, grid);
      });
      if (!seen) blindShots++;
    }
    const banner = host.view().mode.banner;
    if (banner && 'key' in banner && /round(Won|Draw)$/.test(banner.key)) {
      const seconds = (host.tick - COUNTDOWN_TICKS) / TICK_RATE;
      return {
        seed,
        perTeam,
        end: seconds < ROUND_SECONDS ? 'elimination' : 'time',
        seconds,
        shots,
        blindShots,
        grenades,
        explosions,
        fires,
        destroyed,
        tickMs,
      };
    }
  }
  return {
    seed,
    perTeam,
    end: 'time',
    seconds: ROUND_SECONDS,
    shots,
    blindShots,
    grenades,
    explosions,
    fires,
    destroyed,
    tickMs,
  };
}

export function summarize(results: readonly RoundResult[]): string[] {
  const ticks = results.flatMap((r) => r.tickMs).sort((a, b) => a - b);
  const average = ticks.reduce((s, t) => s + t, 0) / Math.max(1, ticks.length);
  const p99 = ticks[Math.floor(ticks.length * 0.99)] ?? 0;
  const eliminations = results.filter((r) => r.end === 'elimination').length;
  const seconds = results.map((r) => r.seconds);
  const total = (key: 'grenades' | 'explosions' | 'fires' | 'destroyed') =>
    results.reduce((sum, r) => sum + r[key], 0);
  return [
    `Rounds: ${results.length} (${results[0]?.perTeam ?? 0} vs ${results[0]?.perTeam ?? 0} bots, normal difficulty)`,
    `Ended by elimination before ${ROUND_SECONDS} s: ${eliminations} (${((100 * eliminations) / Math.max(1, results.length)).toFixed(0)} %)`,
    `Round length: average ${(seconds.reduce((s, x) => s + x, 0) / Math.max(1, seconds.length)).toFixed(1)} s, longest ${Math.max(...seconds).toFixed(1)} s`,
    `Shots: ${results.reduce((s, r) => s + r.shots, 0)}, with no enemy in sight: ${results.reduce((s, r) => s + r.blindShots, 0)}`,
    `Grenades: ${total('grenades')}, explosions: ${total('explosions')}, fires: ${total('fires')}, map elements destroyed: ${total('destroyed')}`,
    `Tick (${2 * (results[0]?.perTeam ?? 0)} participants): average ${average.toFixed(3)} ms, p99 ${p99.toFixed(3)} ms, ${ticks.length} ticks`,
    `Hardware: ${cpus()[0]?.model ?? 'unknown CPU'}, Node ${process.version}`,
  ];
}

export { DIFFICULTY_LEVELS };
