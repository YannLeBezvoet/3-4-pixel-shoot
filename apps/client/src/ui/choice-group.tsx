// A row of buttons of which one is chosen, with a legend.
import type { ComponentChildren } from 'preact';

export function ChoiceGroup<T extends string | number>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: ComponentChildren;
  options: readonly { value: T; label: ComponentChildren }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      {options.map((option) => (
        <button
          type="button"
          key={String(option.value)}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

/** A number chosen with − and + buttons. */
export function Stepper({
  legend,
  value,
  min,
  max,
  onChange,
  labels,
}: {
  legend: ComponentChildren;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Accessible names of the − and + buttons. */
  labels: { readonly fewer: string; readonly more: string };
}) {
  return (
    <fieldset class="stepper">
      <legend>{legend}</legend>
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        aria-label={labels.fewer}
      >
        -
      </button>
      <output>{value}</output>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        aria-label={labels.more}
      >
        +
      </button>
    </fieldset>
  );
}
