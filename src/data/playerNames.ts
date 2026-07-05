// Name + personality pools for generated players. Pond-era recruits are
// enthusiastic locals, not prospects — the names and notes should feel like a
// small town showed up after seeing one flyer.

export const MALE_FIRST_NAMES = [
  "Gord", "Dale", "Marty", "Cliff", "Bernie", "Ray", "Doug", "Earl",
  "Wayne", "Kirby", "Stu", "Hank", "Lars", "Sven", "Mikko", "Janne",
  "Pavel", "Tomas", "Karel", "Anton", "Red", "Buck", "Moose", "Ace",
  "Tibor", "Ollie", "Ned", "Vern", "Gus", "Alf", "Bruno", "Cecil",
];

export const FEMALE_FIRST_NAMES = [
  "Ada", "Anya", "Bea", "Camille", "Clara", "Daria", "Elise", "Freya",
  "Greta", "Hanna", "Ines", "Iris", "Jana", "Katja", "Lena", "Mara",
  "Mila", "Nadia", "Nika", "Noor", "Petra", "Raina", "Sasha", "Talia",
  "Vera", "Willa", "Yara", "Zoe",
];

export const FIRST_NAMES = [...MALE_FIRST_NAMES, ...FEMALE_FIRST_NAMES];

export const LAST_NAMES = [
  "Toews", "Lindqvist", "Marchetti", "Okafor", "Bergström", "Kowalski",
  "Tremblay", "Novak", "Virtanen", "MacIsaac", "Delacroix", "Hartikainen",
  "Ramirez", "Yamamoto", "O'Callahan", "Petrov", "Janssen", "Bouchard",
  "Svoboda", "Nilsson", "Gustafsson", "Byrne", "Keller", "Vachon",
  "Halverson", "Dubois", "Antonelli", "Fitzgerald", "Larocque", "Sorensen",
];

// One-line scout notes for tryout candidates. Deliberately funny-but-warm:
// nobody here can play hockey yet, and that's the whole point of Act I.
export const CANDIDATE_NOTES = [
  "Has never stopped. Not once. Doesn't know how.",
  "Showed up with a garden rake taped like a stick.",
  "Falls with tremendous confidence.",
  "Skates exclusively in left turns. Refuses to explain.",
  "Once stood outside all winter. Just... stood there.",
  "Brought his own puck. It's a can of beans.",
  "Terrifying slap shot. Terrifying for everyone, all directions.",
  "Can't skate backward but insists it's a lifestyle choice.",
  "The only volunteer who read the four-page rulebook twice.",
  "Blocks shots with parts of the body experts advise against.",
  "Chases the puck like it owes her money.",
  "Warm-up lap took eleven minutes. Finished it, though.",
  "Says he played 'a bit' back home. Home is a mystery.",
  "Fast. Genuinely fast. Stopping is next month's project.",
  "Yells 'I got it' regardless of whether they've got it.",
  "Keeps calling the blue line 'the cold line'. Not wrong.",
];

// Goalie-specific notes — the strange ones find the crease on their own.
export const GOALIE_NOTES = [
  "Volunteered for goalie before knowing what a goalie was.",
  "Unsettlingly calm. The pond froze around him and he waited.",
  "Stands in front of things by instinct. Doors, mostly.",
  "Says the puck 'whispers' to her. The saves are real, though.",
  "Wears three coats instead of pads. It's working, somehow.",
];
