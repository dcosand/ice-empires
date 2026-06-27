import type { FlavorEventDef } from "../types/game";

// Low-stakes monthly flavor beats. These keep the log alive on quiet months.
// Mechanical events (build done, region found, etc.) are logged by the engine.
export const FLAVOR_EVENTS: FlavorEventDef[] = [
  {
    id: "flood-first-rink",
    message:
      "The founding group convinced a few locals to help flood the first rink.",
  },
  {
    id: "sponsor-quarters",
    message:
      "A sponsor asked if hockey has quarters. You took the meeting anyway.",
  },
  {
    id: "kid-empty-net",
    message:
      "A local kid stayed after practice firing pucks into an empty net. Your coach made a note.",
  },
  {
    id: "terrible-coffee",
    message: "The clubhouse coffee is terrible. Morale somehow improves.",
  },
  {
    id: "rival-spotted",
    message: "A rival GM was spotted near a newly discovered pipeline.",
  },
  {
    id: "borrowed-zamboni",
    message:
      "Someone borrowed a Zamboni for the weekend. No questions were asked.",
  },
  {
    id: "skate-sharpening",
    message:
      "A retired skate-sharpener offered to help 'just on Tuesdays.' You said yes.",
  },
  {
    id: "weather-delay",
    message:
      "It was 104 degrees outside. The indoor sheet has never felt more valuable.",
  },
];
