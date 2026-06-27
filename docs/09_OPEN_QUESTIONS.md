# Ice Empires — Open Questions

**Date:** 2026-06-27  
**Purpose:** Preserve unresolved design questions for future one-question-at-a-time interviews.

---

## 1. Core loop

### Q1. What is the main monthly decision?

A. Building the club  
B. Discovering regions  
C. Recruiting people  
D. Researching hockey knowledge  
E. Balancing all four

Current leaning: balanced, with discovery and club-building strongest early.

### Q2. How important is unit movement in the first real prototype?

A. Essential from beginning  
B. Important after First 12 Months flow prototype  
C. Nice visual layer, region-card discovery enough early  
D. Save movement for later engine prototype

Current recommendation: First 12 Months before true movement.

### Q3. What is the first mini-game?

A. Local Tournament  
B. Prospect Showcase  
C. First Scrimmage  
D. First Draft  
E. League Formation Vote

Current recommendation: Local Tournament or Prospect Showcase. Avoid Draft too early.

---

## 2. Map

### Q4. How literal should the map be?

A. Earth-like continents but randomized  
B. Pure mythic board-game world  
C. Region network map  
D. Hex map with terrain but no geography

Current leaning: earth-like randomized landmasses with mythic hockey regions.

### Q5. Should real region/league names be used?

Examples: Ontario, Minnesota, Sweden, Finland, NCAA, USHL, WHL/OHL/QMJHL.

Current leaning: prototype can use descriptive real-region language; final product should fictionalize or avoid official branding where needed.

### Q6. How many regions in a standard game?

A. Small board: 30–50  
B. Medium: 80–150  
C. Large Civ-like world: 200+  
D. Scenario dependent

Early prototype: 8–12 region cards.

---

## 3. Resources

### Q7. Should Hockey Knowledge be stored currency or science-per-turn?

A. Stored and spent  
B. Science-per-turn progress toward selected tech

Civ-like answer: B. Prototype can use either if documented.

### Q8. Should Talent be numeric?

Current recommendation: not in First 12 Months. Use cards/events first.

### Q9. Should Reputation be spendable or threshold-based?

A. Spend it  
B. Threshold/unlock  
C. Both

Early prototype: threshold/unlock.

---

## 4. Players/prospects

### Q10. When do players become central?

A. Immediately  
B. After Outdoor Rink  
C. After Youth Development  
D. Club Formation Era  
E. Draft Era

Current recommendation: introduce cards early; roster management later.

### Q11. What should scouting hide?

Possible hidden fields:

- True potential
- Work ethic
- Injury risk
- Personality
- Fit
- Development curve
- Bust probability

### Q12. How should development work?

A. Simple monthly progress  
B. Event-driven  
C. Facility/coach modifiers  
D. Full sim engine  
E. Hybrid

Current recommendation: event-driven + simple modifiers early.

---

## 5. Competition

### Q13. How should games resolve?

A. Simple formula  
B. Card battle  
C. Auto-sim with visible modifiers  
D. Tactical mini-game  
E. Full match engine

Current recommendation: simple auto-sim with visible modifiers.

### Q14. What are games for?

Possible purposes:

- Reputation
- Budget
- Development
- Rivalries
- Dynasty scoring
- League access
- Morale

### Q15. When does a league form?

A. Automatically in Regional League Era  
B. Player creates/joins through diplomacy  
C. Rival GMs propose it  
D. Event-driven

Current idea: era unlock + diplomacy/event choice.

---

## 6. Diplomacy

### Q16. How funny should rival GMs be?

1. Serious sports drama  
2. Mostly serious with wit  
3. Civ-like theatrical  
4. Comedic satire  
5. Full absurdist hockey soap opera

Current leaning: 2–3.

### Q17. How much sabotage?

A. No sabotage  
B. Soft sabotage: rumors, influence, sniping  
C. Hard sabotage: poaching, legal disputes, league politics  
D. Shadow GM mode

Current leaning: soft sabotage early, Shadow GM optional later.

### Q18. Can rival GMs become allies?

Likely yes.

Possible benefits: scouting treaty, trade route, shared tournament, map info, prospect loan/affiliate, league voting bloc.

---

## 7. Victory

### Q19. Which victory type is central?

A. Dynasty  
B. Scouting  
C. Empire  
D. Innovation  
E. Prestige  
F. Shadow GM

Current leaning: Dynasty as default, others as strategic alternatives.

### Q20. Hard ending or endless?

A. First victory wins  
B. Highest score after X eras/turns  
C. Endless mode available  
D. Scenario-based

Current recommendation: victory ending + optional continue later.

---

## 8. Technical

### Q21. Web or game engine long term?

Current recommendation: web first, evaluate Godot/Unity later.

### Q22. Use map library/engine?

First 12 Months: no.  
Map prototype: React/SVG or Canvas first.  
Engine later only if needed.

### Q23. Multiplayer mode?

A. Single-player only  
B. Local hotseat  
C. Async multiplayer  
D. Live multiplayer  
E. All eventually

Current recommendation: single-player first, hotseat/async later.

---

## 9. Visuals

### Q24. How realistic should art be?

A. Abstract board game  
B. Premium illustrated strategy  
C. Semi-realistic sports sim  
D. Cartoon/stylized

Current leaning: premium illustrated strategy.

### Q25. Should Arizona Monsoon get real logo exploration now?

Current recommendation: light placeholder only. Do not over-invest before game loop works.

### Q26. What should map look like?

Need future visual exploration:

- Civ-like terrain
- Hockey overlays
- Fog
- Frozen-world atmosphere
- Not too dark/space-like

---

## 10. Next interview question

> For First 12 Months, when you click End Month, what result would make you smile most: a facility completing, a region being discovered, a prospect appearing, or a funny rival GM hint?
