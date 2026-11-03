// Time inside the simulation is counted in ticks (decision 0002). Durations given in theme
// files (milliseconds) are converted once, when the content is loaded.

/** Simulation steps per second. */
export const TICK_RATE = 60;
/** Duration of one tick, in seconds. */
export const TICK_SECONDS = 1 / TICK_RATE;

/** The number of whole ticks closest to a duration in milliseconds. */
export function msToTicks(ms: number): number {
  return Math.round((ms * TICK_RATE) / 1000);
}

export function ticksToMs(ticks: number): number {
  return (ticks * 1000) / TICK_RATE;
}
