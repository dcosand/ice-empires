# Vendor Assets

Third-party game assets staged for future UI, icon, and sound integration.

## Kenney

Source: https://kenney.nl

Imported packs:

- `kenney/interface-sounds`
  - Source: https://kenney.nl/assets/interface-sounds
  - License: Creative Commons Zero (CC0)
  - Pack license file: `kenney/interface-sounds/License.txt`
- `kenney/ui-audio`
  - Source: https://kenney.nl/assets/ui-audio
  - License: Creative Commons Zero (CC0)
  - Pack license file: `kenney/ui-audio/License.txt`

Kenney credit is appreciated but not required by the included license files.

## Game-icons.net

Source: https://game-icons.net
GitHub mirror: https://github.com/game-icons/icons

Imported folder:

- `game-icons/svg`

License:

- Creative Commons Attribution 3.0 (CC-BY 3.0), unless a specific author is marked CC0 in `game-icons/license.txt`.
- Attribution is required. The Game-icons guidance says a mention like "Icons made by {author}. Available on https://game-icons.net" is fine.

Imported authors in this curated subset:

- Delapouite: `archive-research.svg`, `barn.svg`, `check-mark.svg`, `checklist.svg`, `classical-knowledge.svg`, `coins.svg`, `factory.svg`, `family-house.svg`, `flag-objective.svg`, `hockey.svg`, `ice-cubes.svg`, `ice-skate.svg`, `iceberg.svg`, `money-stack.svg`, `road.svg`, `sport-medal.svg`, `trophy-cup.svg`, `village.svg`, `whistle.svg`
- Lorc: `spyglass.svg`
- Sbed: `arena.svg`

Suggested in-game/about-screen attribution if these icons ship:

> Icons made by Delapouite, Lorc, and Sbed. Available on https://game-icons.net.


## Curating replacements (hand-pick guide)

**Sounds** — full libraries to browse:
- Kenney Interface Sounds (100 files, CC0): https://kenney.nl/assets/interface-sounds
- Kenney UI Audio (50 files, CC0): https://kenney.nl/assets/ui-audio
- More Kenney audio packs (all CC0): https://kenney.nl/assets/category:Audio
- Freesound (filter License = CC0): https://freesound.org/search/?f=license:%22Creative+Commons+0%22
- OpenGameArt SFX: https://opengameart.org/art-search-advanced?field_art_type_tid%5B%5D=13

To swap a sound: drop the file in `kenney/*/Audio/` (or a new folder) and edit
the `FILES` map in `src/engine/sfx.ts` — one line per sound name.

**Icons** — full library to browse (4,000+, searchable):
- https://game-icons.net (e.g. search "hockey", "winter", "medal", "scroll")
- Download individual SVGs, drop into `game-icons/svg/`, keep CC-BY attribution
  in game-icons/license.txt.

To swap an icon: the notification-rail mapping is `NOTIF_ICONS` and the dock
mapping is the `icon=` props on `DockButton`, both in
`src/components/Dashboard.tsx`. File name (minus .svg) is the key.
