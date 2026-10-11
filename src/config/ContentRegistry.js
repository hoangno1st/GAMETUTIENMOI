import { MapConfig } from "./MapConfig.js";
import { EnemyConfig } from "./EnemyConfig.js";
import { NpcConfig } from "./NpcConfig.js";
import { QuestConfig } from "./QuestConfig.js";
import { ItemConfig } from "./ItemConfig.js";
import { ResourceNodeConfig } from "./ResourceNodeConfig.js";

const indexById = (definitions) => new Map(
  (Array.isArray(definitions) ? definitions : Object.values(definitions)).map((definition) => [definition.id, definition]),
);

export const ContentRegistry = Object.freeze({
  maps: MapConfig.maps,
  mapOrder: MapConfig.order,
  defaultMapId: MapConfig.defaultMapId,
  enemyTypes: EnemyConfig.archetypes,
  enemyMaps: EnemyConfig.maps,
  enemyScaling: EnemyConfig.scaling,
  npcs: NpcConfig.definitions,
  npcPlacements: NpcConfig.placements,
  quests: QuestConfig.quests,
  questAreas: QuestConfig.areas,
  items: ItemConfig.items,
  dropTables: ItemConfig.dropTables,
  resourceNodes: ResourceNodeConfig.definitions,
  indexes: Object.freeze({
    maps: indexById(MapConfig.maps),
    enemies: indexById(EnemyConfig.archetypes),
    npcs: indexById(NpcConfig.definitions),
    quests: indexById(QuestConfig.quests),
    items: indexById(ItemConfig.items),
    resources: indexById(ResourceNodeConfig.definitions),
  }),
});
