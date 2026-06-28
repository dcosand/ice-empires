# Ice Empires: First 12 Months — Prototype PRD

**Date:** 2026-06-27  
**Version:** 0.2  
**Status:** First focused prototype target  
**Default club:** Arizona Monsoon HC

---

## 1. Objective

Build a playable web prototype that tests the opening-year flow of Ice Empires.

Question to answer:

> Is it fun to start with a tiny hockey club, make monthly decisions, generate resources, build facilities, research hockey knowledge, discover regions, reveal staff/prospect/player profiles and scouting reports, and progress toward becoming a real club?

This is a **game-flow prototype**, not a map prototype and not a full hockey simulation.

---

## 2. Target experience

The player should feel:

- “I’m starting with almost nothing.”
- “My club is slowly becoming real.”
- “Every month gives me a decision.”
- “I’m discovering the hockey world.”
- “My choices unlock new possibilities.”
- “I want to see what happens next.”

Desired ending emotion after 12 months:

> “Okay, I want Month 13.”

---

## 3. Scope

Included:

- Landing screen
- Club founding screen
- Main dashboard
- Resource counters
- Monthly turn loop
- Build project selection/progress
- Research project selection/progress
- Scouting/exploration priority
- Hidden/discovered region profiles/reports
- Event log
- Staff/prospect/player profiles/reports
- Era progress
- Club Formation Era unlock message

Excluded:

- Real multiplayer
- Backend/auth
- Full hex map
- Unit movement
- Deep hockey simulation
- Draft
- Playoffs
- Salary cap
- Full rival GM system
- Real licensed hockey data
- Catan dice roll as main loop
- Collectible-card / pack-opening sports gameplay

---

### v0.2 design note

The First 12 Months prototype may still use rectangular UI panels for readability, but do not frame people as collectible sports cards.

Use:

- Player profiles
- Prospect dossiers
- Staff profiles
- Scout reports
- Region reports
- Front-office records

Hockey regions are neutral player-producing ecosystems. Full map movement, Recruitment Influence, and affiliate systems are future prototypes, but the language and data model should not contradict them.

## 4. Core loop

Each month, the player:

1. Reviews club state.
2. Chooses or adjusts build project.
3. Chooses or adjusts research project.
4. Chooses scouting/exploration priority.
5. Reviews profiles/events/regions.
6. Clicks **End Month**.
7. Watches resources/progress/events resolve.
8. Gets new information or options.

---

## 5. Starting state

Club: **Arizona Monsoon HC**  
Leader archetype: **The Desert Visionary**  
Era: **Pond Hockey Era**

Starting resources:

- Budget: 8
- Operations: 8
- Hockey Knowledge: 5
- Reputation: 9

Base monthly income after founding:

- Budget: +2
- Operations: +3
- Hockey Knowledge: +1
- Reputation: +1

Starting status:

- No formal league
- No full roster
- No arena
- No scouts
- No draft
- No known hockey world beyond rumors

---

## 6. Screens

### Landing screen

Title: **Ice Empires**  
Subtitle: “Build a hockey civilization from pond ice to dynasty.”  
Button: **Start First 12 Months**

### Club founding screen

Default club:

- Arizona Monsoon HC
- Leader: Desert Visionary
- Bonus: Nontraditional Market

Copy:

> A storm is gathering in the desert. There is no arena, no league, no pipeline — just ice, stubbornness, and the belief that hockey can grow anywhere.

CTA: **Found Arizona Monsoon HC**

### Main dashboard

Must include:

- Top resource bar
- Club HQ summary
- Build panel
- Research panel
- Discovery/world panel
- Profiles/reports panel
- Event log
- Era progress
- End Month button

---

## 7. Build projects

### Outdoor Rink

Cost: 20 Operations  
Build time: 3 months  
Effect: +2 Operations/month  
Unlocks: Local Coach  
Flavor: “It is not much, but it is ice. And ice is enough.”

### Equipment Shed

Cost: 12 Operations  
Build time: 2 months  
Effect: unlocks basic player recruitment  
Flavor: “Half the sticks are too short. The dream is regulation size.”

### Clubhouse

Cost: 18 Operations  
Build time: 3 months  
Effect: +1 Reputation/month  
Flavor: “A place for arguments, line charts, and bad coffee.”

### Volunteer Coaching Bench

Cost: 15 Operations  
Build time: 2 months  
Effect: +1 Hockey Knowledge/month  
Flavor: “Your players have discovered cones.”

### Local Notice Board

Cost: 8 Operations  
Build time: 1 month  
Effect: improves local recruitment events  
Flavor: “Tryouts Saturday. Bring skates. Or courage.”

---

## 8. Research projects

### Basic Skating

Cost: 10 Hockey Knowledge  
Unlocks: better player-development events  
Flavor: “Everyone agrees standing up is a competitive advantage.”

### Organized Practice

Cost: 14 Hockey Knowledge  
Unlocks: Coach card and training schedule  
Flavor: “The players discover that drills are not optional suggestions.”

### Scouting Reports

Cost: 12 Hockey Knowledge  
Unlocks: deeper region discovery  
Flavor: “Rumors become reports. Reports become arguments.”

### Youth Development

Cost: 16 Hockey Knowledge  
Unlocks: local prospect generation  
Flavor: “The future arrives wearing skates two sizes too big.”

### Goaltending Theory

Cost: 12 Hockey Knowledge  
Unlocks: goalie prospect events  
Flavor: “Nobody understands goalies. This is your first attempt.”

---

## 9. Discovery priorities

Each month, player chooses one:

### Survey Nearby Ice

Reveals a hidden nearby region card.

### Follow Prospect Rumor

Chance to reveal prospect card or region clue.

### Listen to Local Rinks

Generates Reputation or local staff/player event.

### Study Strange Hockey Culture

Better chance to reveal unusual/nontraditional region.

### Build Relationships

Chance to reveal partner region/staff/diplomacy hint.

---

## 10. Hockey region reports

Start with 8–12 hidden hockey region reports. These represent neutral city-state-like hockey ecosystems, not rival clubs and not empty terrain.

Each hockey region has:

- Name
- Terrain flavor
- Hockey resource
- Scouting difficulty
- Possible yield
- Scouting Coverage
- Recruitment Influence potential
- Possible player outputs
- Scout report
- Tags

Examples:

- Desert Expansion Zone — Untapped Fanbase — “The ice is expensive, but the believers are intense.”
- Frozen Suburb — Local Rink Culture — “Every third garage has a net with no mesh.”
- Maritime Grit Coast — Toughness Culture — “The wind teaches board battles.”
- Finnish Goalie Lakes — Elite Goalie Pipeline — “Quiet kids who never let in soft ones.”
- Prairie Rink Belt — Rink Density — “Every town has a rink and a grudge.”
- WHL Frontier — Physical Prospects — “Long bus rides, heavy hits, and rumors of a power forward.”
- NCAA Campus Cluster — University Pipeline — “Some kids are choosing textbooks and one-timers.”
- Ontario Prospect Basin — Deep Prospect Pool — “There are too many players. That is both the problem and the opportunity.”
- Baltic Mystery Ice — Weird Upside — “The reports are inconsistent. That is usually where the fun begins.”
- Swedish Development Coast — Modern Development — “Everyone skates beautifully and says nothing dramatic.”

---

## 11. Staff/prospect/player profiles/reports

Examples:

### Local Coach

Type: Staff profile  
Effect: +1 Hockey Knowledge/month or improved player events  
Flavor: “He owns three whistles and uses all of them.”

### Volunteer Trainer

Type: Staff profile  
Effect: reduces negative injury events  
Flavor: “Not officially certified, but oddly effective.”

### Raw Desert Winger

Type: Prospect profile  
Position: Forward  
Potential: medium-high  
Risk: high  
Flavor: “Skates like he learned in a parking lot. Hands like he learned in a dream.”

### Quiet Lake Goalie

Type: Prospect profile  
Position: Goalie  
Potential: high  
Risk: unknown  
Flavor: “Says almost nothing. Tracks pucks like a rumor.”

### Prairie Defenseman

Type: Prospect profile  
Position: Defense  
Potential: medium  
Risk: low  
Flavor: “Not flashy. Not fun to play against.”

---

## 12. Monthly event examples

- “The founding group convinced a few locals to help flood the first rink.”
- “A sponsor asked if hockey has quarters. You took the meeting anyway.”
- “Outdoor Rink construction is halfway complete.”
- “Basic Skating research is complete. Falling down is no longer the default tactic.”
- “A local kid stayed after practice firing pucks into an empty net. Your coach made a note.”
- “Your scouting priority revealed Finnish Goalie Lakes.”
- “A rival GM was spotted near a newly discovered pipeline.”
- “Arizona Monsoon gained Reputation from discovering a nontraditional hockey region.”
- “The clubhouse coffee is terrible. Morale somehow improves.”

---

## 13. Era progress

Requirements to enter Club Formation Era:

- Club HQ founded
- Outdoor Rink completed
- At least 1 research completed
- At least 2 regions discovered
- At least 1 staff/prospect/player profile acquired

Unlock message:

> Arizona Monsoon HC has entered the Club Formation Era. The club is no longer just a dream. It has ice, people, arguments, and a schedule.

For this prototype, the unlock message is enough.

---

## 14. UX requirements

The player should always know:

- Current month
- Current era
- Resource totals and income
- Active build
- Active research
- Active discovery priority
- What changed last month
- How close they are to the next era

Every month should include at least one meaningful choice and one readable story/log outcome.

---

## 15. Success criteria

The prototype succeeds if:

- The player understands what to do.
- The monthly turn rhythm makes sense.
- Arizona Monsoon HC feels alive.
- Discoveries feel interesting.
- Build/research progression feels rewarding.
- The player wants to continue after 12 months.
- The game feels like the beginning of hockey Civ, not a spreadsheet.
