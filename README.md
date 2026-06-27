# Ice Empires — First 12 Months (prototype)

A web prototype of the opening year of **Ice Empires**, a turn-based hockey
civilization strategy game. You found Arizona Monsoon HC and play twelve monthly
turns: generate resources, build facilities, research hockey knowledge, scout an
unknown hockey world, reveal staff/prospect/player cards, and progress toward the
Club Formation Era.

This is a **game-flow prototype** — not a map, not a sim, not the dream game.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL. `npm run build` typechecks and builds.

## Architecture

- `src/types/` — shared TypeScript types (`game.ts`).
- `src/data/` — game **content** as plain data (clubs, facilities, research,
  regions, cards, events, eras, discovery). No rules here.
- `src/engine/` — game **rules**: `gameReducer`, `turnResolution.endMonth`, and
  per-system modules (build, research, discovery, event, era, cards), plus
  `selectors` and a seeded `rng`.
- `src/components/` — React components that render state and dispatch actions.
  No game rules in JSX.

The single source of truth is `GameState`, driven by a `useReducer`. The monthly
turn is one pure-ish function, `endMonth(state)`.

## Docs

Source material is in `/docs`. Project decisions are in `DECISIONS.md`; status in
`PROGRESS_LOG.md`; work tracking in `TASKS.md`.
