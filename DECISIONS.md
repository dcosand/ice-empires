# Ice Empires — Decisions Log

Records the product/tech decisions called out in `docs/07_DATA_MODEL_AND_SYSTEMS.md §16`.

## D1 — Hockey Knowledge is science-per-turn
Hockey Knowledge has two roles: it's a displayed resource total **and** the fuel
for research. Each month, your Hockey Knowledge income is applied as progress
toward the active tech (`progressKnowledge += hkIncome`). Research has a point
cost; no upfront payment. This keeps the Civ-like "science per turn" feel.

## D2 — Build costs are paid upfront
Selecting a facility immediately deducts its Operations cost. Build then takes N
months of real time. (Recommended in the data-model doc.)

## D3 — Discovery is seeded-random, not pure-random
A deterministic mulberry32 PRNG is threaded through `state.rngSeed`. Outcomes
are reproducible per founding seed, so turns are debuggable, while months still
feel varied. Each discovery priority has a defined behavior (see
`engine/discoverySystem.ts`).

## D4 — Cards are unique
A card id can only be acquired once (`grantCard` is a no-op if already held).

## D5 — Month 12 does not hard-stop
Reaching Month 12 shows a "First 12 Months complete" teaser banner, but the
player can keep ending months (Month 13+). The whole point is to make them want
Month 13. Phase stays `playing`.

## D6 — "Recruited" = a card in `state.cards`
Acquiring any staff/prospect/player card satisfies the era requirement. No
roster/contracts in this prototype.

## D7 — Facility effects stack additively
Monthly-income effects from club base + facilities + cards are summed in
`getMonthlyIncome`. Income is recomputed from state each month (not stored), so a
facility completed this month begins yielding next month.
