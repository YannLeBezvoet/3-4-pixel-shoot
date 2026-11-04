// npm run bench:sim [-- --rounds N]
// Plays N bot-only team-elimination rounds (8 vs 8) on the Vietnam map and prints how they
// ended, what the combat toolbox did and the simulation tick time (C1.6, C1.10). Default: 100
// rounds.
import { loadArena, playRound, summarize } from './bot-rounds';

const index = process.argv.indexOf('--rounds');
const rounds = index > 0 ? Number(process.argv[index + 1]) : 100;
const arena = await loadArena();
const results = [];
for (let i = 0; i < rounds; i++) {
  const result = playRound(arena, `round-${i}`);
  results.push(result);
  if ((i + 1) % 10 === 0) console.log(`${i + 1}/${rounds} rounds…`);
}
for (const line of summarize(results)) console.log(line);
const late = results.filter((r) => r.end === 'time').map((r) => r.seed);
if (late.length > 0) console.log(`Rounds that reached the time limit: ${late.join(', ')}`);
