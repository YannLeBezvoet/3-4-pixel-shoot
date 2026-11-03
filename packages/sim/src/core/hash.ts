// A hash of simulation state, to prove determinism: same seed and inputs, same hash.
import { hashString } from '@pixel-shoot/shared';

const FNV_PRIME = 0x01000193;

/** Type tags, so that e.g. the string "1" and the number 1 hash differently. */
const Tag = { number: 1, string: 2, true: 3, false: 4, nothing: 5, array: 6, object: 7 } as const;

/** 32-bit FNV-1a over numbers (as their 64-bit float bits), strings, booleans and plain data. */
export class StateHasher {
  #hash = 0x811c9dc5;
  readonly #bits = new DataView(new ArrayBuffer(8));

  #byte(value: number): this {
    this.#hash = Math.imul(this.#hash ^ value, FNV_PRIME) >>> 0;
    return this;
  }

  number(value: number): this {
    this.#bits.setFloat64(0, value);
    for (let i = 0; i < 8; i++) this.#byte(this.#bits.getUint8(i));
    return this;
  }

  string(value: string): this {
    return this.number(value.length).number(hashString(value));
  }

  /** Numbers, strings, booleans, undefined, null, arrays and plain objects (in key order). */
  value(value: unknown): this {
    switch (typeof value) {
      case 'number':
        return this.#byte(Tag.number).number(value);
      case 'string':
        return this.#byte(Tag.string).string(value);
      case 'boolean':
        return this.#byte(value ? Tag.true : Tag.false);
      case 'undefined':
        return this.#byte(Tag.nothing);
      case 'object': {
        if (value === null) return this.#byte(Tag.nothing);
        if (Array.isArray(value)) {
          this.#byte(Tag.array).number(value.length);
          for (const item of value) this.value(item);
          return this;
        }
        const entries = Object.entries(value);
        this.#byte(Tag.object).number(entries.length);
        for (const [key, item] of entries) this.string(key).value(item);
        return this;
      }
      default:
        throw new TypeError(`Cannot hash a value of type ${typeof value}.`);
    }
  }

  get result(): number {
    return this.#hash;
  }
}
