import { describe, expect, it } from 'vitest';
import { ComponentStore } from './entities';
import { StateHasher } from './hash';
import { Button, NEUTRAL_INPUT, hasButton, sanitizeInput } from './input';
import { TICK_RATE, msToTicks, ticksToMs } from './time';

describe('time', () => {
  it('converts milliseconds to whole ticks and back', () => {
    expect(TICK_RATE).toBe(60);
    expect(msToTicks(1000)).toBe(60);
    expect(msToTicks(2200)).toBe(132);
    expect(msToTicks(80)).toBe(5);
    expect(ticksToMs(132)).toBe(2200);
  });
});

describe('sanitizeInput', () => {
  it('keeps valid input as it is', () => {
    const input = { move: { x: 0.6, y: -0.8 }, aim: 1, aimDistance: 200, buttons: Button.fire };
    expect(sanitizeInput(input)).toEqual(input);
  });

  it('shortens movement longer than 1 and normalizes the aim', () => {
    const result = sanitizeInput({ ...NEUTRAL_INPUT, move: { x: 1, y: 1 }, aim: 3 * Math.PI });
    expect(Math.hypot(result.move.x, result.move.y)).toBeCloseTo(1, 12);
    expect(result.aim).toBeCloseTo(Math.PI, 12);
  });

  it('replaces non-finite values and drops unknown buttons', () => {
    expect(
      sanitizeInput({
        move: { x: Number.NaN, y: Infinity },
        aim: Number.NaN,
        aimDistance: Number.NaN,
        buttons: 0xff,
      }),
    ).toEqual({
      move: { x: 0, y: 0 },
      aim: 0,
      aimDistance: 0,
      buttons: Button.fire | Button.reload | Button.throw,
    });
    expect(sanitizeInput({ ...NEUTRAL_INPUT, aimDistance: -5 }).aimDistance).toBe(0);
    expect(sanitizeInput({ ...NEUTRAL_INPUT, buttons: 1.5 }).buttons).toBe(0);
  });

  it('reads buttons', () => {
    const input = { ...NEUTRAL_INPUT, buttons: Button.reload };
    expect(hasButton(input, Button.reload)).toBe(true);
    expect(hasButton(input, Button.fire)).toBe(false);
  });
});

describe('ComponentStore', () => {
  it('stores components by entity and iterates in insertion order', () => {
    const store = new ComponentStore<string>();
    store.set(3, 'c');
    store.set(1, 'a');
    store.set(2, 'b');
    store.delete(1);
    expect(store.has(1)).toBe(false);
    expect(store.get(2)).toBe('b');
    expect(store.size).toBe(2);
    expect([...store.entries()]).toEqual([
      [3, 'c'],
      [2, 'b'],
    ]);
    expect([...store.ids()]).toEqual([3, 2]);
  });
});

describe('StateHasher', () => {
  const hash = (value: unknown) => new StateHasher().value(value).result;

  it('gives equal hashes for equal data', () => {
    const data = { a: 1, b: ['x', true, null], c: { d: -0.5, e: undefined } };
    expect(hash(data)).toBe(hash(structuredClone(data)));
  });

  it('tells apart values that look alike', () => {
    const values = [1, '1', true, false, null, [], {}, [1], { a: 1 }, { b: 1 }, 1.0000001, 'ab'];
    expect(new Set(values.map(hash)).size).toBe(values.length);
    expect(hash(['a', 'b'])).not.toBe(hash(['b', 'a']));
  });

  it('refuses values that are not plain data', () => {
    expect(() => hash(() => 1)).toThrow('Cannot hash a value of type function.');
  });
});
