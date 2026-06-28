# Ice Empires — Decisions

**Date:** 2026-06-27  
**Version:** 0.2  
**Purpose:** Record product/design decisions so future docs, prompts, and coding-agent work stay aligned.

---

## 1. Eras represent hockey civilization maturity

Eras are not literal real-world hockey history.

The Pond Hockey Era can behave like the Stone Age equivalent of hockey: clubs may need to discover skating, sticks, basic rules, goalies, and organized practice.

This lets Arizona, Minnesota, Helsinki, Halifax, Prague, and other clubs share the same tech tree while local flavor appears through events, bonuses, regions, and club identity.

---

## 2. Research techs should be club-agnostic

Core research tech names should work for every club.

Good:

- Basic Skating
- Primitive Stickmaking
- Frozen Surface Maintenance
- Organized Practice
- Goaltending Theory
- Recruiting Pipelines

Avoid:

- Club-specific or geography-specific techs such as desert-only stickmaking names.

Local flavor can appear through events and club bonuses, not core shared tech names.

---

## 3. Hockey regions behave like city-state-like ecosystems

A Hockey Region is a neutral map feature that can be discovered, scouted, influenced, contested, and connected.

Examples:

- Frozen Suburb
- Finnish Goalie Lakes
- Prairie Rink Belt
- NCAA Campus Cluster
- Desert Expansion Zone
- Ontario Prospect Basin
- Swedish Development Coast

Hockey Regions are not rival clubs and not individual players.

They produce:

- Player profiles
- Staff opportunities
- Scouting knowledge
- Recruitment pipelines
- Development partnerships
- Reputation
- League/tournament access
- Affiliate opportunities

---

## 4. Avoid collectible-card gameplay language

Use:

- Player profiles
- Prospect dossiers
- Staff profiles
- Scout reports
- Region reports
- Front-office records

Avoid using “roster cards” or collectible-card framing in product/design docs and UI copy.

Rectangular UI panels are fine. The fantasy should be front-office scouting and club-building, not pack opening.

---

## 5. Players are not primary movable map-combat units

Map units should represent organizational reach:

- Founding Group
- Scout
- Recruiter
- Regional Scout
- Development Envoy
- International Scout
- Analytics Scout
- Agent Network
- League Delegate

Players should live as profiles, prospects, roster members, rights, affiliate assignments, and contributors to Team Attributes.

A goalie should not wander around the map and fight another goalie.

---

## 6. Scouting Coverage and Recruitment Influence are separate

Scouting Coverage answers:

> What do we know about this region/player?

Recruitment Influence answers:

> How strongly does this region/player lean toward our club?

A region can be well-scouted but loyal to a rival. A region can like your club but still contain unknown player risk.

Recruitment Influence can use Civ VI religious pressure as a mental model.

---

## 7. Facilities create capabilities

Facilities should unlock verbs/systems, not only numbers.

Examples:

- Outdoor Rink unlocks practice, scrimmage, local coach opportunities.
- Equipment Shed unlocks tryouts and basic player equipment.
- Clubhouse unlocks identity, morale, and local reputation.
- Scouting Office unlocks scouting units and deeper region reports.
- Minor Affiliate unlocks development slots and prospect assignment.

---

## 8. Team strength is composed of attributes

Do not reduce team quality to one generic visible currency.

Early Team Attributes:

- Skating
- Puck Skill
- Scoring
- Defense
- Goaltending
- Physicality
- Tactics
- Chemistry
- Morale

Later Team Attributes:

- Power Play
- Penalty Kill
- Transition Game
- Puck Possession
- Forecheck
- Discipline
- Depth
- Injury Resilience

Game/tournament resolution can derive a hidden summary score from these attributes, but the player should think in hockey terms.

---

## 9. Player aging should be handled carefully

Because 1 turn = 1 month, a 14-year-old takes 48 turns to become 18.

Early eras should focus on:

- Adult amateurs
- 18–23-year-old local players
- Overlooked walk-ons
- Late bloomers
- Youth cohorts as abstract future talent

Individual 16–18-year-old prospects become central around Scouting Network and Draft/Rights eras.

---

## 10. Minor affiliates are a midgame system

Affiliate progression:

| Era | Affiliate concept |
|---|---|
| Pond Hockey | None. |
| Club Formation | Informal youth clinic / local development nights. |
| Regional League | Partner club or shared practice relationship. |
| Scouting Network | Junior/minor affiliate level 1. |
| Draft/Rights | Formal prospect assignment and player rights. |
| Professionalization | Full farm system, call-ups, multiple development slots. |
| Dynasty | Global affiliate network. |

---

## 11. First 12 Months remains a flow prototype

These v0.2 decisions should shape language and data models, but they should not explode the first build.

The First 12 Months prototype still excludes:

- Full hex map
- Full unit movement
- Draft
- Playoffs
- Full rival GM diplomacy
- Full player database
- Full affiliate system
- Collectible-card gameplay

It should test monthly rhythm: found club, build, research, discover, reveal profiles/reports, and want Month 13.
