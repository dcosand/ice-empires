# Ice Empires — Full Game Bible

**Date:** 2026-06-27  
**Working title:** Ice Empires  
**Default playable club:** Arizona Monsoon HC  
**Version:** 0.1 dream bible / source of truth

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

### Map-first, card-supported

Long term, the game should be map-first. Cards and panels reveal details. Avoid spreadsheet gravity.

### Hockey depth underneath

The visible interface can be board-game simple while the underlying systems become hockey-credible over time.

### The world is discovered

The hockey world is unknown upfront. The player discovers terrain, regions, resources, rival clubs, prospects, and institutions.

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

### Arizona Monsoon HC

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
- Saskatoon Freeze — prairie loyalty and physical hockey
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

Production. Used to build facilities, train units, create infrastructure, establish networks.

Generated by Club HQ, rinks, volunteers, staff, facilities, regional infrastructure.

### Hockey Knowledge

Science/research. Used to unlock hockey systems, scouting methods, development methods, tactics, drafts, contracts, and advanced infrastructure.

Generated by coaches, scouts, analysts, games, universities, hockey schools, veterans.

### Reputation

Culture/prestige. Used for recruiting, influence, diplomacy, league formation, sponsors, fan growth, and Prestige Victory.

Generated by winning, rivalries, star players, broadcasters, social media, traditions, club identity.

### Talent

Optional later resource. Represents local player generation and development growth. For early prototypes, express Talent through cards/events.

---

## 12. Club HQ

The Club HQ is the player's Civ city/capital equivalent.

It:

- Generates resources
- Builds facilities
- Researches hockey knowledge
- Houses staff/cards
- Anchors influence
- Defines identity
- Tracks era progress

Club HQ panel should show club name, logo placeholder, leader, era, monthly yields, current build, current research, facilities, staff/prospects, regional connections, and victory progress.

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

### Player cards/units

Players are the “army” but should begin as cards, not complex movable military units.

Types: Forward, Defenseman, Goalie, Prospect, Veteran, Star Player, Playmaker, Power Forward, Two-Way Center, Puck-Moving Defenseman, Franchise Goalie, Enforcer.

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

Early:

- Outdoor Rink — +Operations, unlocks Local Coach/Tournament
- Equipment Shed — unlocks basic recruitment
- Clubhouse — +Reputation
- Volunteer Coaching Bench — +Hockey Knowledge
- Local Notice Board — recruitment events

Mid:

- Indoor Arena
- Youth Academy
- Scouting Office
- Broadcast Booth
- Medical Room
- Junior Affiliate
- Regional Scouting Hub

Late:

- Analytics Lab
- Elite Goalie School
- Sports Science Center
- International Scouting Bureau
- Cap Strategy Office
- Hall of Fame
- Mega Arena
- Global Development Campus

---

## 16. Outposts/networks

Regional infrastructure:

- Scouting Network — prospect visibility/events
- Development Partnership — prospect growth/local influence
- Recruiting Pipeline — signing odds/local access
- Affiliate Club — players/league access/development slots
- Analytics Listening Post — hidden traits/rival activity

Your empire is not conquered land. It is hockey relationships, pipelines, facilities, rights, and influence.

---

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
- Explored hockey info
- Influenced by player
- Influenced by rival
- Contested
- Fully networked

Example regions:

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
- Russian Shadow Pipeline
- Northern Skill Forest

---

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

### Era 1: Pond Hockey Era

Humble beginnings. Unlocks Found Club, Outdoor Rink, Basic Scout, Basic Skating, local player cards, nearby exploration.

### Era 2: Club Formation Era

Organized identity. Unlocks Head Coach, Clubhouse, training schedule, youth recruitment, local tournament, first rival contact.

### Era 3: Regional League Era

Formal competition. Unlocks leagues, standings, scheduled games, broadcasters, rivalries, league diplomacy.

### Era 4: Scouting Network Era

Wider hockey world opens. Unlocks regional scouts, scouting networks, prospect pools, intel trading, junior/college/European pathways.

### Era 5: Draft Era

Organized talent acquisition. Unlocks draft mini-game, player rights, agents, lawyers, combine, rankings, GM draft negotiations.

### Era 6: Dynasty Era

Global power. Unlocks cap strategy, star retention, advanced facilities, international tournaments, Hall of Fame, victory push.

---

## 20. Hockey knowledge tree

Early techs:

- Basic Skating — development
- Organized Practice — coaches/training
- Goaltending Theory — goalie discovery
- Forechecking Systems — game/tournament results
- Scouting Reports — scout/deeper discovery
- Youth Development — youth academy/prospect generation

Mid techs:

- Video Scouting
- Analytics Department
- Junior Partnerships
- League Governance
- Broadcast Strategy
- Strength & Conditioning

Late techs:

- Draft Combine Science
- Cap Management
- Sports Psychology
- International Transfer Knowledge
- Biomechanical Development
- Global Scouting AI

---

## 21. Scouting/prospects

Scouting information is imperfect.

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
- Flavor report

Main dopamine hit: discovering a hidden superstar before rivals do.

---

## 22. Games as combat

Hockey games are the Civ combat equivalent.

Future result inputs:

- Roster strength
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

Prototype should use simple auto-resolution only when needed.

---

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
- Rex Malloy — Saskatoon Iron Herd. Old-school, physical, suspicious.
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

Turn 1: Found Club HQ and choose Arizona Monsoon identity.

Turns 2–3: Build Outdoor Rink, research Basic Skating or Scouting Reports, discover one nearby region.

Turns 4–5: Gain yields, discover first hockey resource, reveal staff/prospect card.

Turns 6–7: Train Scout or Local Coach, explore/discover deeper, choose next build/research.

Turns 8–10: First rival hint/contact, unlock local tournament or scouting path, player wants one more turn.

---

## 27. First 12 Months prototype

Recommended first build: **Ice Empires: First 12 Months**.

Test monthly flow before full map.

See `03_FIRST_12_MONTHS_PRD.md`.

---

## 28. UI principles

- Strategic board-game clarity
- Avoid spreadsheet gravity
- Map-first when map exists
- Cards and panels for details
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
