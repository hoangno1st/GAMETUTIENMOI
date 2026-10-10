# Thanh Vân Sơn — Cultivation MMORPG Prototype

An original, single-player browser prototype exploring the foundations of a persistent 2D cultivation MMORPG. It uses HTML5 Canvas, CSS, and vanilla JavaScript with no build step or external game engine.

## Run locally

Native JavaScript modules need a local HTTP server. From this directory, run:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`. If your Python launcher is `py`, use `py -m http.server 8000` instead.

## Current playable features

- Smooth movement through the Thanh Vân Sơn outer-sect courtyard
- Camera following, procedural scenery, NPCs, and training objects
- NPC and object interaction with blocking dialogue panels
- Two enemy archetypes with wandering, aggro, telegraphed attacks, leashing, defeat, and fixed respawns
- Directional basic attacks and the Linh Phong Trảm starter skill
- HP, MP, cooldowns, damage feedback, invincibility frames, defeat, and safe respawning
- Automatic EXP leveling with configured stat growth and point awards
- Four cultivation realms with early, middle, late, and three sub-level stages
- Deterministic realm breakthroughs at the Tụ Linh Đài
- Cultivation panel with EXP, base stats, realm requirements, attribute points, and skill points
- Kiếm Tu class data with the Kiếm Tâm passive and three manually activated sword skills
- Confirmed attribute allocation with live derived-stat previews and capped speed bonuses
- Level-gated, fixed skill upgrades through a dedicated skill panel
- Persistent 30-slot inventory with stackable materials, consumables, item inspection, and confirmed discard
- Five cultivation equipment slots with requirement checks, stat comparison, and data-driven bonuses
- Training-area coin, herb, pill, and low-tier equipment drops shown on the ground before pickup
- Kiếm Tu starts with Thanh Vân Luyện Kiếm and Tố Vân Đạo Bào equipped
- Versioned local character saving

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Move |
| E | Interact or close dialogue |
| Escape | Close dialogue |
| Left mouse / J | Basic attack |
| K | Linh Phong Trảm |
| Q | Kiếm Ảnh Bộ after learning it at level 3 |
| R | Thiên Quang Kiếm after learning it at level 6 |
| C | Open or close the attribute/cultivation panel |
| L | Open or close the skill panel |
| I or HUD button | Open or close inventory and equipment |
| B | Attempt a breakthrough while meditating at the Tụ Linh Đài |
| Arrow keys | Navigate and adjust values while a panel is open |
| Enter | Confirm attribute allocation or learn/upgrade a selected skill |
| Tab | Switch between inventory and equipment while the inventory panel is open |
| U | Unequip the selected equipment item |
| Delete, then Enter | Request and confirm discarding the selected inventory stack |
| Backspace | Clearly labeled test/debug attribute reset while the attribute panel is open |

## Save behavior

The game loads one local character record when it starts. It autosaves every five seconds and when the page is being left. Save version 4 persists coins, validated inventory stacks, and equipped item IDs in addition to progression, attributes, and skills. Version 1–3 prototype saves are migrated with safe Kiếm Tu starter gear and inventory defaults.

Enemy state, ground loot, positions, attack timers, active effects, cooldowns, dialogue state, and the player's current roaming position are intentionally not saved. Missing item definitions and invalid quantities are skipped safely. Missing, malformed, or unsupported save records fall back to configured character defaults. The format is versioned so migrations can be added later.

Browser `localStorage` is suitable only for this offline prototype. It is user-editable and is neither secure nor authoritative multiplayer persistence. A future online game must replace the storage provider with authenticated, server-authoritative persistence.

## Known limitations

- Single-player only; no server or networking exists
- One small region, one player archetype, three skills, and two enemy archetypes
- No crafting, shops, production quests, or additional classes yet
- The current realm ladder ends at Nguyên Anh Hậu Kỳ Tam Trọng
- Procedural placeholder art and no production audio
- Basic circular proximity and combat checks; no obstacle navigation or full physics system
