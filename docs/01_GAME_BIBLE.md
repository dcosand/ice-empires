# Ice Empires — Full Game Bible

**Date:** 2026-06-27  
**Working title:** Ice Empires  
**Default playable club:** Arizona Monsoon  
**Version:** 0.2 dream bible / source of truth

---

## 1. High concept

**Ice Empires** is a turn-based 4X hockey civilization strategy game.

The player begins with a tiny fictional hockey club in an unknown, randomized hockey world. From almost nothing — pond ice, volunteers, local kids, bad coffee, and a dream — they explore the map, build hockey infrastructure, research hockey knowledge, discover prospects, recruit staff, negotiate with rival GMs, form leagues, compete in tournaments, unlock drafts, and pursue a dynasty that stands the test of time.

Short pitch:

> Civilization, but your empire is a hockey club.

Tagline:

> Build a hockey civilization from pond ice to dynasty.

---

## 2. Inspiration stack

### Civilization

Borrow:

- Fog of war
- Exploration
- Eras
- Technology tree
- City/production engine
- Strategic resources
- Diplomacy
- Leader personalities
- Victory types
- One-more-turn pacing

Avoid borrowing too literally:

- Historical nations
- Military conquest as the primary fantasy
- Excessive city micromanagement

### Eastside Hockey Manager

Borrow:

- Deep hockey-world imagination
- Scouting/drafting/development fantasy
- Long-term dynasty satisfaction
- Hidden player potential
- Coaches, staff, prospects, tournaments, leagues

Avoid:

- Spreadsheet-first UI
- Too many roster/contract tables too early
- Simulation depth before the strategy loop is fun

### Settlers of Catan

Borrow later:

- Regional yield probability
- Safe high-frequency regions vs rare jackpot regions
- Tradeable resources
- Board-game clarity

Avoid:

- Visible dice roll as the main turn action
- A Catan clone with hockey labels

### Hockey GM/scouting games

Borrow:

- Hidden gems
- Bust risk
- Scouting confidence
- Prospect rankings
- Draft steals
- Rival sniping
- Player development
- Trades and negotiations

Avoid:

- Pure fantasy hockey
- Real licensed team/player dependence

---

## 3. Core fantasy

The player fantasy:

> I am building a hockey civilization from nothing. I know where to scout, who to trust, what to research, how to outmaneuver rival GMs, and how to turn raw talent into a dynasty.

Emotional arc:

1. Humble beginning — “We have a dream and maybe a sheet of ice.”
2. Discovery — “There is a whole hockey world beyond our town.”
3. Identity — “This is who our club is.”
4. Infrastructure — “We are becoming a real organization.”
5. Scouting power — “We see players before others do.”
6. Competition — “We can actually beat people.”
7. Rivalry — “Other GMs know our name.”
8. Dynasty — “This club will outlast all of them.”

---

## 4. Design pillars

### Build, do not merely manage

The player should feel like they are building hockey itself in their region, not just editing an established roster.

### Map-first, dossier-supported

Long term, the game should be map-first. Dossiers, reports, profiles, and panels reveal details. Avoid spreadsheet gravity and avoid collectible-card or pack-opening vibes.

### Hockey depth underneath

The visible interface can be board-game simple while the underlying systems become hockey-credible over time. Player profiles, scouting reports, team attributes, and development systems should be readable at first and deeper later.

### The world is discovered

The hockey world is unknown upfront. The player discovers terrain, hockey regions, resources, neutral player-producing ecosystems, rival clubs, prospects, and institutions.

### Hockey regions are city-state-like ecosystems

Important v0.2 decision: a region such as Frozen Suburb, Finnish Goalie Lakes, Prairie Rink Belt, or NCAA Campus Cluster is not merely terrain and is not the same thing as a rival club.

A **Hockey Region** is a neutral map feature that behaves somewhat like a Civilization city-state: it can be discovered, scouted, influenced, contested, connected, and eventually converted into a recruiting/development pipeline.

Instead of producing military units, these regions produce player profiles, staff opportunities, scouting knowledge, reputation, facilities, league access, and pipeline benefits.

### Eras unlock institutions

At first, there are no drafts, leagues, agents, playoffs, or salary caps. These systems emerge later.

### Rival GMs have personality

Rivals should feel like Civ leaders: dramatic, funny, petty, proud, territorial, occasionally helpful, often dangerous.

### One more turn

Every turn should leave the player wanting one more: a build almost done, a scout nearing fog, a prospect rumor, a rival threat, a tech unlock, a tournament invitation.

---

## 5. Audience

Primary audience:

- Hockey sickos
- Sports management fans
- Strategy/4X fans
- Board-game people
- Scouting/drafting/development fans
- Players who like long-term progression more than twitch gameplay

Secondary audience:

- Casual hockey fans who like strategy
- Indie game fans
- Friend groups who enjoy negotiation and betrayal
- People who enjoy humorous sports-world fiction

Not primary:

- Real-time action sports gamers
- Pure fantasy hockey managers
- People demanding official NHL simulation accuracy

---

## 6. Product/platform shape

Near-term:

- Web prototype
- Local state
- Single-player/local mock systems
- Fast iteration

Mid-term:

- Web game with saves
- Clean game engine logic
- Hotseat or async multiplayer exploration

Long-term:

- Downloadable indie strategy game
- Steam possible
- Godot/Unity/native engine possible after loop validation

---

## 7. Legal/IP principles

Use:

- Fictional clubs
- Fictional players
- Fictional leagues
- Fictional rival GMs
- Real city/region names when appropriate
- Generic hockey terms

Avoid:

- NHL team names/logos
- Real NHL players
- Official league logos
- Branding that is too close to existing teams

Prototype can use descriptive hockey ecosystem labels, but final product should fictionalize where needed.

---

## 8. Default playable club

### Arizona Monsoon

Why it works:

- Distinctive
- Desert hockey is improbable and fun
- “Monsoon” gives Arizona identity without copying existing pro teams
- Suggests a sudden force building from nowhere

Leader archetype: **The Desert Visionary**

Starting philosophy: **Nontraditional hockey growth**

Starting bonus: **Nontraditional Market** — gain +1 Reputation when discovering unusual, overlooked, warm-weather, or low-probability hockey regions.

Identity line:

> A storm is gathering in the desert.

Other fictional clubs:

- Halifax Privateers — maritime grit, old-school toughness
- Stockholm Royals — elegant development machine
- Calgary Freeze — foothills loyalty and physical hockey
- Prague Lions — diplomacy and transfer savvy
- Minneapolis North — talent-rich local powerhouse
- Helsinki Ice Crown — cold, tactical, proud rival

---

## 9. Starting premise

The game begins in the **Pond Hockey Era**.

The player has:

- One Founding Group
- One visible starting region
- A little Budget/Operations/Hockey Knowledge/Reputation
- Nearby fog
- No formal club infrastructure
- No league
- No draft
- No full roster

The first major action:

> Found Club HQ.

---

## 10. 4X translation

### Explore

Discover unknown terrain, hockey regions, talent pools, cultures, rivals, resources, prospect rumors, league opportunities.

### Expand

Build scouting networks, development partnerships, recruiting pipelines, affiliate clubs, regional influence, and league relationships.

### Exploit

Turn regions and resources into facilities, prospects, staff, knowledge, reputation, money, and wins.

### Exterminate

In hockey terms: dominate rivals. Beat them, out-scout them, snipe prospects, win trades, control pipelines, win leagues, and become the dynasty they fear.

---

## 11. Core resources

### Budget

Gold/money. Used for staff, upkeep, facilities, signings, diplomacy, events.

Generated by ownership, fans, arenas, sponsors, broadcasts, winning, reputation, wealthy markets.

### Operations

Production. Used to build facilities, train organizational units, create infrastructure, establish networks.

Generated by Club HQ, rinks, volunteers, staff, facilities, regional infrastructure.

### Hockey Knowledge

Science/research. Used to unlock hockey systems, scouting methods, development methods, tactics, drafts, contracts, and advanced infrastructure.

Generated by coaches, scouts, analysts, games, universities, hockey schools, veterans.

### Reputation

Culture/prestige. Used for recruiting pull, influence, diplomacy, league formation, sponsors, fan growth, and Prestige Victory.

Generated by winning, rivalries, star players, broadcasters, social media, traditions, club identity.

### Scouting Coverage

Map intelligence. Represents how much the club knows about a hockey region.

Scouting Coverage reveals:

- Hockey resource type
- Prospect types
- Staff opportunities
- Hidden traits
- Rival activity
- Region difficulty
- Development potential

Scouting Coverage is not the same as Recruitment Influence. You can know a region well without having its players want to join you.

### Recruitment Influence

A Civ VI religion-like pressure system for hockey recruiting.

Recruitment Influence represents trust, familiarity, local buy-in, and how strongly a region feeds players toward your club.

Recruitment Influence enables:

- Tryouts
- Player commitments
- Local staff hires
- Pipeline creation
- Affiliate relationships
- Reduced poaching risk
- Better prospect yield over time

A Scout reveals and studies. A Recruiter, Regional Scout, Development Envoy, or Pipeline Builder converts knowledge into influence.

### Team Attributes

The hockey equivalent of military strength, but not a single generic number.

Early attributes:

- Skating
- Puck Skill
- Scoring
- Defense
- Goaltending
- Physicality
- Tactics
- Chemistry
- Morale

Later attributes:

- Power Play
- Penalty Kill
- Transition Game
- Puck Possession
- Forecheck
- Discipline
- Depth
- Injury Resilience

Team Attributes resolve games, tournaments, rival contests, and development outcomes.

### Talent

Optional later resource. Represents local player generation and development growth. For early prototypes, express Talent through player profiles, youth cohorts, region yields, and events rather than a single numeric bank.

## 12. Club HQ

The Club HQ is the player's Civ city/capital equivalent.

It:

- Generates resources
- Builds facilities
- Researches hockey knowledge
- Houses staff/profiles
- Anchors influence
- Defines identity
- Tracks era progress

Club HQ panel should show club name, logo placeholder, leader, era, monthly yields, current build, current research, facilities, staff/prospects/player profiles, regional connections, and victory progress.

---

## 13. Starting unit: Founding Group

Represents owner + GM + coach + early believers.

Actions:

- Found Club HQ
- Explore adjacent area
- Inspire Locals
- Generate small Reputation
- Begin Club Identity

After founding, the Founding Group becomes club leadership.

---

## 14. Unit taxonomy

### Executive units

- Owner — boosts Budget, funds facilities, affects ambition/risk
- GM — trades, recruiting, negotiations, roster direction
- President of Hockey Ops — late-game all-department boost

### Staff units

- Head Coach — tactics, morale, development
- Assistant Coach — specialized development/system boosts
- Goalie Coach — goalie discovery and development
- Trainer/Medical Staff — injury and bust-risk mitigation
- Development Coach — raw prospect growth

### Exploration/scouting units

- Scout — reveals fog/regions and basic hockey info
- Regional Scout — builds scouting networks
- International Scout — travels farther and unlocks foreign regions
- Analytics Scout — reveals hidden traits and market inefficiencies

### Player profiles / roster members

Players are the hockey equivalent of the “army,” but they should **not** be primary movable map-combat units.

Players should live as:

- Scout reports
- Prospect profiles
- Roster members
- Development assignments
- Rights/contract assets
- Team-attribute contributors

Types: Forward, Defenseman, Goalie, Prospect, Veteran, Star Player, Playmaker, Power Forward, Two-Way Center, Puck-Moving Defenseman, Franchise Goalie, Enforcer.

Players can be visually linked to map regions, pipelines, affiliates, and scouting reports, but the player should not move a goalie tile-by-tile around the world.

### Culture/media units

- Broadcaster — Reputation, rivalry hype, fan passion
- Social Media Team — hype, youth fans, recruiting reach
- Mascot/Fan Culture — morale/home-ice flavor

### Diplomacy/legal units

- Agent Network — signings, rumors, transfer access
- Lawyer — contracts, player rights, league disputes
- League Official — event/diplomacy entity, not player-owned
- Referees — rules/variance/event system, not controllable units

---

## 15. Facilities

Facilities create **capabilities**: unlocked verbs and systems, not just passive bonuses.

Examples:

- Outdoor Rink unlocks practice, scrimmage, and local coach opportunities.
- Equipment Shed unlocks basic tryouts and player equipment.
- Scouting Office unlocks scouting units and deeper region reports.
- Minor Affiliate unlocks prospect assignment and development slots.

Early:

- Outdoor Rink — +Operations, unlocks Local Coach/Tournament
- Equipment Shed — unlocks basic recruitment
- Stick Workshop — improves Puck Skill development
- Floodlights — increases practice capacity
- Clubhouse — +Reputation
- Volunteer Coaching Bench — +Hockey Knowledge
- Local Notice Board — recruitment events
- Warming Hut — morale/retention flavor

Mid:

- Indoor Arena
- Youth Academy
- Scouting Office
- Broadcast Booth
- Medical Room
- Junior Affiliate
- Regional Scouting Hub
- Recruiting Pipeline Office
- Development Partnership Office

Late:

- Analytics Lab
- Elite Goalie School
- Sports Science Center
- International Scouting Bureau
- Cap Strategy Office
- Hall of Fame
- Mega Arena
- Global Development Campus
- Full Farm System Headquarters

## 16. Outposts/networks

Regional infrastructure is how the club expands without conquering land.

- Scouting Network — increases Scouting Coverage and prospect visibility.
- Recruiting Pipeline — increases Recruitment Influence and player commitment odds.
- Development Partnership — improves growth for players/prospects connected to that region.
- Affiliate Club — provides development slots, player assignment, league access, and call-up paths.
- Analytics Listening Post — reveals hidden traits, market inefficiencies, and rival activity.
- Community Hockey Program — improves local Reputation and long-term youth cohorts.

Your empire is not conquered land. It is hockey relationships, pipelines, facilities, rights, and influence.

### Affiliate progression

| Era | Affiliate concept |
|---|---|
| Pond Hockey | None. You barely have sticks. |
| Club Formation | Informal youth clinic / local development nights. |
| Regional League | Local partner club or shared practice arrangement. |
| Scouting Network | Junior Affiliate / Minor Affiliate level 1. |
| Draft/Rights | Formal player rights and prospect assignment. |
| Professionalization | Full farm system, development slots, call-ups. |
| Dynasty | Global affiliate network. |

## 17. Map design

Long-term map: stylized randomized earth-like hockey world.

Not literal geography. Helsinki is not necessarily where Finland is. Minnesota is not necessarily where Minnesota is.

Terrain types:

- Frozen Lakes
- Tundra
- Forest
- Plains
- Mountains
- Coast
- Urban
- Desert/Dryland
- Campus
- River Valley
- Industrial Town
- Northern Wilderness
- Prairie
- Alpine Region

Discovery states:

- Hidden/Fog
- Discovered terrain
- Hockey region identified
- Region scouted
- Recruitment Influence established
- Contested by rival
- Pipeline established
- Affiliate/partnership established
- Fully networked

### Hockey Regions

Hockey Regions are city-state-like neutral ecosystems.

A tile or cluster may contain a Hockey Region such as:

- Desert Expansion Zone
- Frozen Suburb
- Maritime Grit Coast
- Finnish Goalie Lakes
- Prairie Rink Belt
- WHL Frontier
- NCAA Campus Cluster
- Ontario Prospect Basin
- Baltic Mystery Ice
- Swedish Development Coast
- Czech Skill Corridor
- Swiss Money League
- Northern Skill Forest

Each Hockey Region should have:

- Region name
- Terrain / biome
- Hockey resource
- Scouting difficulty
- Scouting Coverage value
- Recruitment Influence values by club
- Potential player outputs
- Potential staff outputs
- Potential facility/outpost unlocks
- Tags
- Rival presence / contested state
- Scout report

Example:

```ts
const frozenSuburb = {
  id: "frozen-suburb",
  name: "Frozen Suburb",
  terrain: "urban-winter",
  hockeyResource: "local-rink-culture",
  scoutingDifficulty: 2,
  playerOutputs: ["depth-forward", "two-way-defenseman", "late-blooming-goalie"],
  staffOutputs: ["local-coach", "volunteer-trainer"],
  tags: ["suburban", "rink-density", "reliable"],
  scoutReport: "Every third garage has a net with no mesh.",
};
```

Hockey Regions produce players and opportunities. Rival GMs may contest them, but the region itself is not a rival club.

## 18. Catan-style probability layer

This is a passive/later layer, not the main turn mechanic.

Region probability can influence:

- Event frequency
- Prospect emergence
- Rare jackpot outcomes
- Regional volatility

Design tension:

- Safe/common regions are reliable but crowded.
- Weird/rare regions rarely hit but can produce special prospects/resources.
- Arizona Monsoon benefits from unusual regions.

Avoid a visible “Roll” button as the game loop.

---

## 19. Eras

Eras represent the maturity of a hockey civilization, not literal real-world hockey history.

The game should be inspired by hockey history without being trapped by it. Arizona Monsoon can discover basic skating in a desert while Helsinki Ice Crown begins with cold-weather identity. The order is about institutional development, not historical chronology.

### Era 1: Pond Hockey Era

Stone Age hockey. The club discovers skating, sticks, basic rules, goalies, and the miracle of having enough people to scrimmage.

Unlocks Found Club, Outdoor Rink, basic player profiles, Basic Scout, Basic Skating, Primitive Stickmaking, local tryouts, nearby exploration.

### Era 2: Club Formation Era

Organized identity. The club becomes more than a dream.

Unlocks Head Coach, Clubhouse, training schedule, youth clinics, local recruitment, basic positions, team identity, local tournament, first rival contact.

### Era 3: Regional League Era

Formal competition. The club enters a regional hockey world with rules, standings, rivalries, penalties, special teams, broadcasters, and league politics.

Unlocks leagues, scheduled games, standings, home ice, referees, power play, penalty kill, forechecking, medical practices, rivalry systems.

### Era 4: Scouting Network Era

The wider hockey world opens. Discovery becomes a network.

Unlocks regional scouts, Scouting Coverage maps, recruiting pipelines, development partnerships, junior/minor affiliates, player projection, video scouting, broader region access.

### Era 5: Draft/Rights Era

Organized talent acquisition. Prospects become assets with rights, agents, trades, and rival sniping.

Unlocks draft classes, player rights, agents, lawyers, combine, rankings, draft negotiations, trade rules, contract basics, formal minor affiliate systems.

### Era 6: Professionalization Era

Modern hockey organization. The club becomes a serious institution.

Unlocks sports science, analytics, farm system management, league governance, cap framework, broadcast strategy, modern systems hockey, full arena economics.

### Era 7: Dynasty Era

Global power and legacy. The club pushes toward victory and tries to outlast generations.

Unlocks cap mastery, global scouting bureau, elite goalie school, global development campus, tactical innovation, Hall of Fame culture, dynasty victory systems.

## 20. Hockey knowledge tree

### Research philosophy

Hockey Knowledge should behave like a Civ-style science-per-month system in the long term.

The player chooses one active research project. Each month, the club's Hockey Knowledge output progresses that project. Research unlocks new capabilities, not just passive numerical bonuses.

Research should be **club-agnostic**. Flavor can be localized through club traits/events, but core techs should work for Arizona Monsoon, Minnesota Nova, Helsinki Ice Crown, Halifax Privateers, and every other club.

Good core tech names:

- Basic Skating
- Primitive Stickmaking
- Frozen Surface Maintenance
- Goaltending Theory
- Organized Practice
- Youth Development

Avoid core tech names that only make sense for one club or geography.

Example: Arizona can receive a flavor event about improvised desert sticks, but the actual shared tech should be **Primitive Stickmaking**, not a desert-specific tech.

### Era pacing target

Assume **1 turn = 1 month**.

| Era | Target turns | In-world time | Purpose |
|---|---:|---:|---|
| Pond Hockey Era | 24–36 | 2–3 years | Discover the primitive basics of hockey and found the club. |
| Club Formation Era | 36 | 3 years | Become a recognizable club with roles, coaches, identity, and local competition. |
| Regional League Era | 48 | 4 years | Formal competition, standings, rivals, and special teams. |
| Scouting Network Era | 48 | 4 years | Convert discovered regions into scouting/recruiting/development pipelines. |
| Draft/Rights Era | 48 | 4 years | Draft classes, rights, agents, contracts, trades, and formal affiliates. |
| Professionalization Era | 60 | 5 years | Modern club operations, sports science, media, farm systems, governance. |
| Dynasty Era | 60+ | 5+ years | Victory push, global reach, roster renewal, legacy. |

A full standard game should cover roughly **27–30 in-world years**, with optional endless continuation.

Era advancement should not require every tech. A good default is:

> Complete 4–5 important techs in the era plus the era's institutional objective.

### Era 1 — Pond Hockey Era

Theme: discover the basic idea of hockey.

Expected Hockey Knowledge output: 1–3/month.

| Tech | Cost | Prereq | Unlocks / effect |
|---|---:|---|---|
| Basic Skating | 6 | None | Unlocks the Skating team attribute. Reduces bad practice events. |
| Primitive Stickmaking | 8 | None | Unlocks Equipment Shed / Stick Workshop. Practice can improve Puck Skill. |
| Frozen Surface Maintenance | 8 | None | Outdoor Rink produces better Operations and has fewer delay events. |
| Put Someone in Net | 10 | Basic Skating | Unlocks Goaltending attribute and goalie discovery events. |
| The Concept of Passing | 10 | Basic Skating, Primitive Stickmaking | Unlocks Chemistry attribute and basic puck movement events. |
| Rules Everyone Mostly Agrees On | 12 | Passing, Put Someone in Net | Unlocks First Scrimmage and Local Tournament invitation. |
| Scouting Rumors | 10 | None | Basic Scout can reveal hockey-region info, not just terrain. |
| Local Tryouts | 12 | Primitive Stickmaking | Unlocks local player profiles from nearby hockey regions. |

Era advancement requirement:

- Club HQ founded.
- Outdoor Rink completed.
- 4 Pond Hockey techs completed.
- 2 hockey regions discovered.
- First Scrimmage or Local Tournament invitation unlocked.

### Era 2 — Club Formation Era

Theme: become a real club.

Expected Hockey Knowledge output: 3–6/month.

| Tech | Cost | Prereq | Unlocks / effect |
|---|---:|---|---|
| Organized Practice | 18 | Rules Everyone Mostly Agrees On | Unlocks Training Schedule and Head Coach hire. |
| Basic Positions | 18 | The Concept of Passing | Separates roster into Forward / Defense / Goalie groups. |
| Line Changes | 22 | Basic Positions | Unlocks Depth attribute and reduces fatigue in games. |
| Team Identity | 20 | Organized Practice | Unlocks club philosophy bonus and morale events. |
| Youth Clinics | 24 | Local Tryouts | Unlocks Youth Cohorts as abstract future talent. |
| Goaltending Theory | 22 | Put Someone in Net | Improves goalie scouting and goalie development events. |
| Local Recruitment | 24 | Scouting Rumors, Local Tryouts | Unlocks Recruiter unit and Recruitment Influence near Club HQ. |
| First Tactics Board | 28 | Organized Practice, Basic Positions | Unlocks Tactics attribute and simple game-plan choice. |

Era advancement requirement:

- 4 Club Formation techs completed.
- Complete basic team shape: forwards, defense, goalie.
- Recruitment Influence established in at least 1 hockey region.
- First Local Tournament played.

### Era 3 — Regional League Era

Theme: formal competition arrives.

Expected Hockey Knowledge output: 6–10/month.

| Tech | Cost | Prereq | Unlocks / effect |
|---|---:|---|---|
| League Rules | 36 | Rules Everyone Mostly Agrees On | Unlocks Regional League proposal / joining. |
| Referees & Penalties | 34 | League Rules | Unlocks Discipline, Penalty Kill, and penalty events. |
| Special Teams | 42 | Referees & Penalties | Unlocks Power Play and Penalty Kill attributes. |
| Forechecking Systems | 44 | First Tactics Board | Improves Defense and Scoring in tournaments/games. |
| Home Ice Advantage | 38 | Team Identity | Rink/arena facilities boost game outcomes. |
| Rival Scouting | 46 | Scouting Rumors | Reveals rival tendencies and counters in games. |
| Broadcast Basics | 40 | Team Identity | Unlocks Broadcast Booth and Reputation from games. |
| Medical Room Practices | 44 | Organized Practice | Unlocks injury mitigation and durability visibility. |

Era advancement requirement:

- Join or form a Regional League.
- Complete a season or tournament circuit.
- Unlock Special Teams or Forechecking Systems.
- Discover or contact first rival GM.

### Era 4 — Scouting Network Era

Theme: turn map discovery into pipelines.

Expected Hockey Knowledge output: 10–16/month.

| Tech | Cost | Prereq | Unlocks / effect |
|---|---:|---|---|
| Regional Scouting Office | 70 | Rival Scouting | Unlocks Regional Scout unit. |
| Scouting Coverage Maps | 72 | Regional Scouting Office | Regions show Scouting Coverage percentage. |
| Recruiting Pipelines | 78 | Local Recruitment | Unlocks pipeline outpost on hockey regions. |
| Player Projection | 82 | Scouting Coverage Maps | Reveals floor/ceiling ranges and role projections. |
| Development Partnerships | 84 | Youth Clinics | Unlocks Development Partnership region outpost. |
| Junior Partnerships | 90 | Development Partnerships | Unlocks Junior Affiliate / Minor Affiliate level 1. |
| Video Scouting | 88 | Rival Scouting | Reveals hidden traits and improves showcase/draft intel. |
| International Awareness | 96 | Regional Scouting Office | Unlocks distant regions and International Scout precursor. |

Era advancement requirement:

- 2 Scouting Networks established.
- 1 Recruiting Pipeline established.
- 1 Development Partnership established.
- Junior Partnerships or Player Projection completed.

### Era 5 — Draft/Rights Era

Theme: organized talent acquisition and player control.

Expected Hockey Knowledge output: 16–24/month.

| Tech | Cost | Prereq | Unlocks / effect |
|---|---:|---|---|
| Draft Eligibility | 125 | Player Projection | Unlocks Draft Class system. |
| Player Rights | 135 | Draft Eligibility | Drafted players can be retained/developed before joining main roster. |
| Agent Relations | 140 | Player Rights | Unlocks Agent Network and signing negotiation modifiers. |
| Combine Science | 150 | Video Scouting | Unlocks Combine event and better physical/skill projections. |
| Trade Rules | 145 | League Rules, Player Rights | Unlocks player/prospect/right trades with rival GMs. |
| Contract Basics | 155 | Agent Relations | Unlocks basic salary/term decisions without full cap yet. |
| Minor Affiliate System | 160 | Junior Partnerships, Player Rights | Unlocks formal affiliate roster slots and assignments. |
| Information Warfare | 170 | Rival Scouting, Agent Relations | Rival snipes, smokescreens, draft deception, intel trades. |

Era advancement requirement:

- First Draft completed.
- Prospect signed or assigned.
- Formal minor affiliate established.
- First meaningful trade/draft negotiation resolved.

### Era 6 — Professionalization Era

Theme: modern hockey organization.

Expected Hockey Knowledge output: 24–36/month.

| Tech | Cost | Prereq | Unlocks / effect |
|---|---:|---|---|
| Strength & Conditioning | 210 | Medical Room Practices | Improves development, durability, late-season performance. |
| Sports Science Center | 230 | Strength & Conditioning | Unlocks Sports Science facility and injury prevention. |
| Analytics Department | 235 | Video Scouting, Player Projection | Unlocks Analytics Scout and market inefficiency reports. |
| Systems Hockey | 240 | Forechecking Systems, Special Teams | Advanced tactics: transition, possession, matchup plans. |
| Broadcast Strategy | 225 | Broadcast Basics | Major Reputation and Budget growth from winning/rivalries. |
| League Governance | 250 | League Rules, Trade Rules | Vote on league rules, expansion, playoff formats. |
| Cap Framework | 270 | Contract Basics | Introduces cap-like roster constraints, if desired. |
| Farm System Management | 280 | Minor Affiliate System | Multiple affiliate slots, call-ups, development plans. |

Era advancement requirement:

- Modern club infrastructure online: arena/broadcast/medical/scouting/farm systems.
- Club is contending in a regional or pro league structure.
- At least one advanced tactical/analytics/operations system completed.

### Era 7 — Dynasty Era

Theme: legacy, optimization, victory push.

Expected Hockey Knowledge output: 36+/month.

| Tech | Cost | Prereq | Unlocks / effect |
|---|---:|---|---|
| Cap Mastery | 340 | Cap Framework | Advanced roster efficiency, star retention, trade leverage. |
| Global Scouting Bureau | 360 | International Awareness, Analytics Department | Full global prospect discovery and international pipelines. |
| Elite Goalie School | 350 | Goaltending Theory, Sports Science Center | Major goalie discovery/development advantage. |
| Biomechanical Development | 375 | Sports Science Center | Raises development ceiling for selected prospects. |
| Sports Psychology | 330 | Team Identity, Systems Hockey | Boosts morale, playoff performance, bust-risk mitigation. |
| Tactical Innovation | 390 | Systems Hockey, Analytics Department | Unique tactical identity; Innovation Victory progress. |
| Hall of Fame Culture | 360 | Broadcast Strategy | Legacy bonuses and Prestige Victory acceleration. |
| Global Development Campus | 420 | Global Scouting Bureau, Farm System Management | Massive pipeline/development engine; Empire/Scouting Victory push. |

This is victory/endgame territory. No next era is required.

## 21. Scouting/prospects

Scouting information is imperfect.

Use the terms **player profile**, **prospect profile**, **scout report**, and **dossier** instead of “roster dossiers” or collectible-card language.

Prospect fields:

- Name
- Position
- Age
- Current Ability
- Potential range
- Scouting Confidence
- Development Risk
- Traits
- Personality
- Injury Risk
- Role Projection
- Floor/Ceiling
- Region
- Recruitment status
- Rival interest
- Flavor report

Main dopamine hit: discovering a hidden superstar before rivals do.

### Player aging model

Because 1 turn = 1 month, aging matters.

| Player age discovered | Turns until age 18 | In-world time |
|---:|---:|---:|
| 14 | 48 | 4 years |
| 15 | 36 | 3 years |
| 16 | 24 | 2 years |
| 17 | 12 | 1 year |
| 18 | 0 | Ready now |

Design decision:

- Pond Hockey and Club Formation should focus on adult amateurs, 18–23-year-old local players, overlooked walk-ons, and late bloomers.
- Younger teenagers should appear early only as **Youth Cohorts** or academy pipeline outputs, not named individuals requiring micromanagement.
- Individual 16–18-year-old prospects become central around Scouting Network and Draft/Rights eras.
- Draft/Rights Era should make 18-year-old draft classes and prospect rights central.

### Scouting Coverage vs Recruitment Influence

Scouting Coverage answers: **What do we know about this region/player?**

Recruitment Influence answers: **How likely is this region/player to feed into our club?**

A region can be fully scouted but loyal to a rival. It can also like your club but still contain hidden player uncertainty.

## 22. Games as combat

Hockey games are the Civ combat equivalent.

But combat should not be map units attacking each other. A goalie should not wander into a tile and fight a rival goalie.

Instead, competition is resolved through organized hockey events:

- First Scrimmage
- Local Tournament
- Prospect Showcase
- Regional League game
- Rival challenge
- Playoff bracket
- Draft table sniping / information warfare later

Future result inputs:

- Roster quality
- Team Attributes
- Player roles
- Coaching
- Tactics
- Morale
- Facilities
- Home ice
- Injuries
- Randomness
- Rival bonuses
- Era-specific rules

Early visible Team Attributes:

- Skating
- Puck Skill
- Scoring
- Defense
- Goaltending
- Physicality
- Tactics
- Chemistry
- Morale

Later visible Team Attributes:

- Power Play
- Penalty Kill
- Transition Game
- Puck Possession
- Forecheck
- Discipline
- Depth
- Injury Resilience

Prototype should use simple auto-resolution only when needed.

## 23. Mini-games

Possible mini-games:

- Local Tournament — first competition
- Regional League — standings/rivalries
- Prospect Showcase — scouting comparison
- Draft — hidden info, rankings, rival snipes
- Playoffs — bracket, morale, upsets

Do not build draft first. The game should earn that system through eras.

---

## 24. Rival GMs/diplomacy

Rival GMs appear through exploration, region conflict, tournaments, trades, scouting treaties, rivalry, or draft tension.

Relationship states:

- Unknown
- Curious
- Friendly
- Allied
- Competitive
- Suspicious
- Hostile
- Rival
- Nemesis

Example rivals:

- Mikko Vaaranen — Helsinki Ice Crown. Cold, tactical, proud.
- Rex Malloy — Calgary Iron Herd. Old-school, physical, suspicious.
- Elena Novak — Prague Lions. Diplomatic, clever, opportunistic.
- Carter Briggs — Minneapolis North. Confident, territorial, talent-rich.
- Valentina Sokolov — Baltic Black Ice. Mysterious, patient, ruthless.

Diplomacy options:

- Offer scouting treaty
- Trade Budget/Knowledge/map info
- Trade prospect rights
- Demand withdrawal
- Propose tournament
- Form alliance
- Refuse/taunt
- Sabotage relationship
- Negotiate league rules

---

## 25. Victory conditions

### Dynasty Victory

Win multiple championships and maintain elite roster strength over time.

> Your club stands the test of time.

### Scouting Victory

Discover, recruit, and develop the strongest pipeline of legendary players.

> Everyone else sees players. You see the future.

### Empire Victory

Control or influence the most hockey regions, leagues, academies, and pipelines.

> The hockey world runs through your organization.

### Innovation Victory

Complete the hockey knowledge tree and become the most advanced organization in the sport.

> You changed how hockey is played.

### Prestige Victory

Become the most beloved and culturally powerful club in the world.

> Kids everywhere grow up wearing your sweater.

### Shadow GM Victory

Optional/future: win through trades, leverage, alliances, and manipulation.

> You never had the best team. You had the best plan.

---

## 26. First 10 turns target

Turn 1: Move/select Founding Group and found Club HQ. Choose opening club identity emphasis.

Turns 2–3: Choose first facility, first research, and first discovery priority.

Good first facilities:

- Outdoor Rink
- Equipment Shed
- Volunteer Coaching Bench
- Local Notice Board

Good first techs:

- Basic Skating
- Primitive Stickmaking
- Scouting Rumors
- Frozen Surface Maintenance

Turns 4–5: Discover first hockey region, reveal first staff opportunity or player profile, progress first build/research.

Turns 6–7: Unlock Scout, Local Coach, local tryouts, or first goalie/player discovery path depending on choices.

Turns 8–10: First rival hint/contact, first Local Tournament invitation, first Recruitment Influence opportunity, or first region contest.

The player should feel: “I have discovered a hockey ecosystem, and now I want to connect it to my club.”

## 27. First 12 Months prototype

Recommended first build: **Ice Empires: First 12 Months**.

Test monthly flow before full map.

See `03_FIRST_12_MONTHS_PRD.md`.

---

## 28. UI principles

- Strategic board-game clarity
- Avoid spreadsheet gravity
- Map-first when map exists
- Dossiers, reports, profiles, and panels for details
- Contextual right panel
- Event log as story engine
- Flavorful but not parody-level copy

Examples:

- “The ice is rough, the benches are splintered, and the dream is alive.”
- “A local kid has hands like a rumor.”
- “Your players have discovered cones.”
- “Nobody understands goalies, including this goalie.”

---

## 29. Visual principles

See `05_VISUAL_ART_DIRECTION.md`.

Short version:

- Premium indie strategy
- Dark ice + Arizona Monsoon accents
- Earth-like map, not abstract space board
- Civ leader-screen energy
- Do not over-polish before loop is fun

---

## 30. Tech principles

See `06_TECH_PLAN.md`.

Short version:

- Start web-first with React + TypeScript + Vite
- Local state first
- No backend/multiplayer early
- Keep game logic separate from UI
- Use data-driven content
- Consider Godot/Unity only after validating loop

---

## 31. Success definition

Ice Empires is promising if early players say:

- “I want one more turn.”
- “I want to know what’s in the fog.”
- “I care about my little club.”
- “I want to find hidden prospects.”
- “The rival GMs are funny.”
- “This feels like hockey Civ.”
