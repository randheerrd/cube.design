# Ship checklist

Run it yourself before design review. Arriving unchecked wastes the hour.

## The four states
- [ ] Empty — first-run and no-results are separate screens
- [ ] Loading — designed at 200ms, 2s and 20s
- [ ] Error — scoped to the failed component, says what to do next
- [ ] Overflow — 10,000 rows, 90-char names, negatives, nulls
- [ ] Stale data is visible where the numbers are

## Structure & type
- [ ] Squint test passes
- [ ] Type from the scale, no one-off sizes
- [ ] Line length 45–75 characters for prose

## Colour & contrast
- [ ] WCAG AA — 4.5:1 body, 3:1 large. Checked, not eyeballed
- [ ] Colour is never the only signal
- [ ] One accent per screen
- [ ] Both themes checked on the real screen

## Data display
- [ ] Chart type matches the question
- [ ] Numerals tabular-lining, right-aligned, consistent decimals
- [ ] Precision matches confidence — no 4dp on an estimate
- [ ] Forecast visually distinct from actual
- [ ] Axes honest; truncation labelled

## Words
- [ ] No lorem, no placeholders, no schema names
- [ ] Buttons name their verb
- [ ] Sentence case
- [ ] Errors in second person, actionable

## Accessibility
- [ ] Full keyboard path, tab order follows visual order
- [ ] Visible focus style
- [ ] 44px touch targets
- [ ] Alt text meaningful, or empty for decorative
