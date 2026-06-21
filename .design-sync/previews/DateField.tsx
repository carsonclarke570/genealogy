import { useState, useEffect, useRef } from "react";
import { DateField } from "@family-archive/ui";
import type { PartialDate } from "@family-archive/ui";

/**
 * The picker open on the day grid — the headline of the redesign. A wrapper
 * auto-opens the popover (clicking the trigger) and reserves vertical room so the
 * absolutely-positioned calendar sits inside the card instead of overlapping the
 * next story.
 */
export function PickingADay() {
  const [value, setValue] = useState<PartialDate | null>({
    precision: "day",
    year: 1971,
    month: 3,
    day: 12,
  });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current
      ?.querySelector<HTMLButtonElement>(".fa-datefield__trigger")
      ?.click();
  }, []);
  return (
    <div ref={ref} style={{ minHeight: 400 }}>
      <DateField label="Died" value={value} onChange={setValue} />
    </div>
  );
}

export function KnownToTheMonth() {
  const [value, setValue] = useState<PartialDate | null>({
    precision: "month",
    year: 1911,
    month: 6,
    day: null,
  });
  return (
    <DateField
      label="Married"
      hint="Known to the month — leave the day off."
      value={value}
      onChange={setValue}
    />
  );
}

export function KnownToTheYear() {
  const [value, setValue] = useState<PartialDate | null>({
    precision: "year",
    year: 1888,
    month: null,
    day: null,
  });
  return (
    <DateField
      label="Born"
      hint="An approximate year is fine."
      value={value}
      onChange={setValue}
    />
  );
}

export function FullDate() {
  const [value, setValue] = useState<PartialDate | null>({
    precision: "day",
    year: 1971,
    month: 3,
    day: 12,
  });
  return (
    <DateField
      label="Died"
      hint="The full date is recorded."
      value={value}
      onChange={setValue}
    />
  );
}

export function Empty() {
  const [value, setValue] = useState<PartialDate | null>(null);
  return (
    <DateField
      label="Emigrated"
      hint="Pick how much you know, then fill it in."
      value={value}
      onChange={setValue}
    />
  );
}

export function WithError() {
  const [value, setValue] = useState<PartialDate | null>({
    precision: "month",
    year: null,
    month: null,
    day: null,
  });
  return (
    <DateField
      label="Baptised"
      required
      error="Enter a year between 1 and 2026."
      value={value}
      onChange={setValue}
    />
  );
}
