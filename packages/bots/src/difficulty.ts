// Bot difficulty: a set of parameters, not separate code (decision 0011).
import { TICK_RATE } from '@pixel-shoot/sim';

export interface Difficulty {
  /** Ticks between first seeing an enemy and firing at it. */
  readonly reactionTicks: number;
  /** Largest random aim error, in radians, drawn again at each decision. */
  readonly aimError: number;
  /** Fastest aim turn, in radians per tick. */
  readonly turnRate: number;
  /** Ticks between two decisions (about 10 per second at normal). */
  readonly thinkTicks: number;
}

export const DIFFICULTIES = {
  easy: {
    reactionTicks: Math.round(0.6 * TICK_RATE),
    aimError: 0.14,
    turnRate: 0.1,
    thinkTicks: 9,
  },
  normal: {
    reactionTicks: Math.round(0.35 * TICK_RATE),
    aimError: 0.07,
    turnRate: 0.18,
    thinkTicks: 6,
  },
  hard: {
    reactionTicks: Math.round(0.18 * TICK_RATE),
    aimError: 0.03,
    turnRate: 0.3,
    thinkTicks: 4,
  },
} as const satisfies Record<string, Difficulty>;

export type DifficultyLevel = keyof typeof DIFFICULTIES;
export const DIFFICULTY_LEVELS = Object.keys(DIFFICULTIES) as DifficultyLevel[];
