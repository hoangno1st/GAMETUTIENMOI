const resource = (definition) => Object.freeze({
  type: "resource",
  interactionLabel: "Thu thập",
  ...definition,
});

export const ResourceNodeConfig = Object.freeze({
  definitions: Object.freeze({
    "sect-herb-bed": resource({ id: "sect-herb-bed", mapId: "thanh-van-ngoai-mon", name: "Vườn Linh Thảo", materialId: "mistleaf-herb", x: 2570, y: 720, quantity: 1, gatherDuration: 1.4, respawnDelay: 45, interactionLabel: "Hái" }),
    "forest-herb-west": resource({ id: "forest-herb-west", mapId: "rung-linh-thao", name: "Bụi Linh Thảo", materialId: "mistleaf-herb", x: 1780, y: 720, quantity: 2, gatherDuration: 1.8, respawnDelay: 55 }),
    "forest-herb-deep": resource({ id: "forest-herb-deep", mapId: "rung-linh-thao", name: "Linh Thảo Cổ", materialId: "mistleaf-herb", x: 2940, y: 760, quantity: 2, gatherDuration: 2.2, respawnDelay: 75 }),
    "stone-vein-north": resource({ id: "stone-vein-north", mapId: "bai-da-linh-khi", name: "Mạch Linh Thạch", materialId: "spirit-fragment", x: 1870, y: 650, quantity: 2, gatherDuration: 2.3, respawnDelay: 70, interactionLabel: "Khai thác" }),
    "stone-vein-east": resource({ id: "stone-vein-east", mapId: "bai-da-linh-khi", name: "Quặng Linh Khí", materialId: "spirit-fragment", x: 3010, y: 1740, quantity: 3, gatherDuration: 2.8, respawnDelay: 95, interactionLabel: "Khai thác" }),
    "pass-remains": resource({ id: "pass-remains", mapId: "hac-phong-son-dao", name: "Yêu Thú Di Cốt", materialId: "beast-core", x: 1920, y: 720, quantity: 1, gatherDuration: 2.6, respawnDelay: 110, interactionLabel: "Tìm kiếm" }),
    "valley-ghost-herb": resource({ id: "valley-ghost-herb", mapId: "u-minh-coc", name: "Vọng U Linh Thảo", materialId: "mistleaf-herb", x: 1840, y: 670, quantity: 2, gatherDuration: 2.5, respawnDelay: 100 }),
    "valley-ruin-shards": resource({ id: "valley-ruin-shards", mapId: "u-minh-coc", name: "Linh Thạch Tàn", materialId: "spirit-fragment", x: 3010, y: 1740, quantity: 3, gatherDuration: 3, respawnDelay: 120, interactionLabel: "Tìm kiếm" }),
    "abyss-lava-vein": resource({ id: "abyss-lava-vein", mapId: "long-hoa-dia-uyen", name: "Mạch Hỏa Tinh", materialId: "lava-crystal", x: 1860, y: 680, quantity: 2, gatherDuration: 2.8, respawnDelay: 100, interactionLabel: "Khai thác" }),
    "abyss-dragon-remains": resource({ id: "abyss-dragon-remains", mapId: "long-hoa-dia-uyen", name: "Long Cốt Di Tích", materialId: "dragon-scale-shard", x: 3020, y: 1760, quantity: 1, gatherDuration: 3.5, respawnDelay: 140, interactionLabel: "Tìm kiếm" }),
  }),
});

export function getResourceNodesForMap(mapId) {
  return Object.freeze(Object.values(ResourceNodeConfig.definitions).filter((node) => node.mapId === mapId));
}
