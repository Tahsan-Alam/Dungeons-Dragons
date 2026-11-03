# Painted Realms rules

Painted Realms is a cooperative, three-encounter adventure. One to ten heroes recover three lantern shards. Everyone wins together; scripted enemies oppose the party. A solo game can include scripted companions. Companions are ordinary party members, and count toward the ten-hero limit.

## On your turn

1. Click a reachable square to move. Each square is five feet; movement follows horizontal and vertical paths. Walls, water, and occupied squares block movement.
2. Take one action: attack, use your class power, guard, or drink a potion. To attack, select an enemy, then press **Roll d20** to start the animated die. The result shows the confirmed d20, hit/miss or critical hit, and damage; press **Continue** to return to the board. Offensive class powers use the same roll prompt; canceling before rolling spends nothing. Reduced motion skips the tumble. You can move before or after your action, within your remaining movement.
3. End your turn. Other heroes and enemies then take their turns.

Ranged attacks need a clear line of sight. Walls block sight; water does not. Knights and clerics attack adjacent squares. Rangers attack within five squares and mages within four. Range uses horizontal-plus-vertical distance, matching movement. These are intentionally simple grid conventions.

Each hero begins with two potions and two class-power uses per encounter. Knight: extra damage. Ranger: a longer ranged shot with advantage. Mage: extra arcane damage to one target. Cleric: restore an injured or downed ally's health within four squares. Powers consume the turn's action. Potions heal 2d4 + 6 HP and consume an action.

Guard makes attack rolls against you use disadvantage until your next turn. In streamlined mode it also halves incoming damage. A natural 20 on an attack adds another damage die.

Once every enemy is defeated, open the chest from an adjacent square. The party gains a shard and a potion each. Move next to the glowing gateway to continue. Between scenes the party regains some health, refreshes powers, and receives at least two potions each. Leaving the third scene with its shard wins the adventure.

## Streamlined mode

The party acts before enemies each round. Attacks hit unless the d20 is a natural 1. Downed heroes skip their turns and can be healed by a cleric. If the encounter ends while a hero is down, the magical lantern revives them at half health. If the entire party is down, the adventure ends in defeat.

## Classic mode — an SRD-inspired subset

This mode adds individual d20 initiative, attack rolls against Armor Class, natural-1 misses and natural-20 hits, advantage/disadvantage, and death saving throws. It is **not the complete Dungeons & Dragons ruleset**. Character statistics, powers, potion healing, cardinal grid movement, encounter recovery, and the three-scene adventure are custom game rules.

A downed hero rolls a d20 at the start of their turn: 10 or higher adds a success; below 10 adds a failure; a natural 1 adds two failures; a natural 20 returns the hero with 1 HP. Three successes stabilize them; three failures put them out until the encounter ends. Stabilized heroes still need healing. The lantern revives fallen party members after a won encounter in both modes, a deliberately forgiving house rule. If everyone is down, the adventure is lost.

Not implemented: full character creation, races/species, official classes and spell lists, levels, spell slots, bonus actions, reactions, opportunity attacks, cover, saving-throw spells, conditions, equipment systems, encumbrance, resting rules, death permanence, or an arbitrary tabletop rule adjudicator. The UI should use “Classic (SRD subset),” not “Full D&D.”

## What is scripted now

Adventure openings have three narrator personalities. Seeded map details, initiative, and dice rolls are reproducible. Bots select legal actions, heal, attack, move, and collect objectives using fixed rules. No model API is called. The server validates human actions and owns the shared state and random generator. Future narration or action-parsing models should request actions through these same checks; they must not directly set health, dice results, turns, or inventory.

## Rules reference

The mechanics are informed by the publicly available [D&D Free Rules](https://www.dndbeyond.com/sources/dnd/free-rules) and [System Reference Document 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf). See [CREDITS.md](./CREDITS.md) for the SRD attribution. All narrative text, characters, maps, names, and class implementations here are original to this prototype. No official setting, adventure text, artwork, or proprietary rulebook content is bundled.
