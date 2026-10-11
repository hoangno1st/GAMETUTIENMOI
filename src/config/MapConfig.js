import { GameConfig } from "./GameConfig.js";
import { getNpcSpawnsForMap } from "./NpcConfig.js";
import { getResourceNodesForMap } from "./ResourceNodeConfig.js";

const bounds = Object.freeze({ minX: 72, minY: 72, maxX: 3528, maxY: 2328 });
const emptyStations = Object.freeze([]);
const poi = (id, name, x, y, icon, lore) => Object.freeze({ id, type: "poi", name, x, y, icon, lore, interactionLabel: "Khám phá" });
const obstacle = (id, x, y, width, height, kind = "rock") => Object.freeze({ id, x, y, width, height, kind });
const baseWorld = (name, theme, colors) => Object.freeze({
  width: 3600, height: 2400, bounds, locationName: name, theme, colors,
  safeSpawn: Object.freeze({ x: 300, y: 1200 }), trainingArea: Object.freeze({ x: 9999, y: 9999, width: 1, height: 1 }),
  trainingObjects: emptyStations, activityStations: emptyStations,
  meditationArea: Object.freeze({ id: `${theme}-inactive-dais`, type: "inactive", name: "", x: -9999, y: -9999, interactionLabel: "" }),
});

export const MapConfig = Object.freeze({
  defaultMapId: "thanh-van-ngoai-mon",
  order: Object.freeze(["thanh-van-ngoai-mon", "rung-linh-thao", "bai-da-linh-khi", "hac-phong-son-dao", "u-minh-coc", "long-hoa-dia-uyen"]),
  maps: Object.freeze({
    "thanh-van-ngoai-mon": Object.freeze({
      id: "thanh-van-ngoai-mon", name: "Tĩnh Lam Môn — Viện Sơ Tu", recommendedLevel: "1–4", requiredLevel: 1, requiredRealmId: "qi-refining",
      world: Object.freeze({ ...GameConfig.world, theme: "sect", colors: Object.freeze({ ground: "#789076", accent: "#d8c88d" }) }),
      entries: Object.freeze({ start: Object.freeze({ x: 1800, y: 1330 }), west: Object.freeze({ x: 3100, y: 1230 }) }),
      exits: Object.freeze([{ id: "sect-to-forest", x: 3350, y: 1230, targetMapId: "rung-linh-thao", targetEntryId: "west", label: "Đường đến Rừng Tức Diệp" }]),
      npcSpawns: getNpcSpawnsForMap("thanh-van-ngoai-mon"), enemyZoneIds: Object.freeze(["sect-herb-garden", "sect-training-edge"]),
      resources: getResourceNodesForMap("thanh-van-ngoai-mon"),
      pointsOfInterest: Object.freeze([poi("sect-scripture-stone", "Bia Tâm Pháp", 1040, 610, "◇", "Trên bia khắc lời tổ sư: tâm tĩnh thì linh khí tụ, kiếm tĩnh thì vạn niệm quy nhất.")]),
      obstacles: Object.freeze([obstacle("sect-main-hall", 1490, 465, 620, 190, "hall"), obstacle("sect-pond", 245, 1580, 570, 350, "pond")]),
    }),
    "rung-linh-thao": Object.freeze({
      id: "rung-linh-thao", name: "Rừng Tức Diệp", recommendedLevel: "3–7", requiredLevel: 3, requiredRealmId: "qi-refining",
      world: baseWorld("Rừng Tức Diệp", "forest", Object.freeze({ ground: "#496f55", accent: "#9bc47e" })),
      entries: Object.freeze({ west: Object.freeze({ x: 320, y: 1200 }), east: Object.freeze({ x: 3280, y: 1200 }) }),
      exits: Object.freeze([{ id: "forest-to-sect", x: 180, y: 1200, targetMapId: "thanh-van-ngoai-mon", targetEntryId: "west", label: "Cổng Viện Sơ Tu" }, { id: "forest-to-stones", x: 3420, y: 1200, targetMapId: "bai-da-linh-khi", targetEntryId: "west", label: "Lối sang Thạch Mạch Hoang" }]),
      npcSpawns: getNpcSpawnsForMap("rung-linh-thao"),
      enemyZoneIds: Object.freeze(["forest-west-grove", "forest-deep"]),
      resources: getResourceNodesForMap("rung-linh-thao"),
      pointsOfInterest: Object.freeze([poi("forest-ancient-tree", "Cổ Thụ Dẫn Linh", 1860, 1780, "♧", "Rễ cây ôm lấy một mạch linh khí cũ. Dấu chân đệ tử dẫn về phía Thạch Mạch Hoang."), poi("forest-sealed-cave", "Hang Đá Phong Ấn", 2860, 1900, "⌂", "Cửa hang bị dây phù phong kín. Linh áp bên trong vượt xa tu vi hiện tại.")]),
      obstacles: Object.freeze([obstacle("forest-thicket-a", 520, 300, 310, 520, "trees"), obstacle("forest-thicket-b", 1710, 310, 420, 250, "trees"), obstacle("forest-thicket-c", 2940, 1450, 330, 420, "trees")]),
    }),
    "bai-da-linh-khi": Object.freeze({
      id: "bai-da-linh-khi", name: "Thạch Mạch Hoang", recommendedLevel: "6–12", requiredLevel: 6, requiredRealmId: "qi-refining",
      world: baseWorld("Thạch Mạch Hoang", "stones", Object.freeze({ ground: "#777b68", accent: "#c6bb89" })),
      entries: Object.freeze({ west: Object.freeze({ x: 320, y: 1200 }), east: Object.freeze({ x: 3280, y: 1200 }) }),
      exits: Object.freeze([{ id: "stones-to-forest", x: 180, y: 1200, targetMapId: "rung-linh-thao", targetEntryId: "east", label: "Đường về Rừng Tức Diệp" }, { id: "stones-to-pass", x: 3420, y: 1200, targetMapId: "hac-phong-son-dao", targetEntryId: "west", label: "Phong Nha Cổ Đạo" }]),
      npcSpawns: getNpcSpawnsForMap("bai-da-linh-khi"),
      enemyZoneIds: Object.freeze(["stones-ridge", "stones-core"]),
      resources: getResourceNodesForMap("bai-da-linh-khi"),
      pointsOfInterest: Object.freeze([poi("stone-abandoned-cart", "Xe Quặng Bỏ Hoang", 2380, 1950, "▣", "Chiếc xe gãy trục vẫn hướng lên Phong Nha Cổ Đạo. Trên gỗ còn vết vuốt sâu."), poi("stone-echo-cliff", "Vách Đá Hồi Âm", 2740, 540, "△", "Tiếng gió trong khe đá nghe như kiếm ngân, thích hợp lĩnh ngộ thân pháp.")]),
      obstacles: Object.freeze([obstacle("stone-cliff-a", 650, 300, 460, 410, "cliff"), obstacle("stone-cliff-b", 1700, 1640, 560, 430, "cliff"), obstacle("stone-cliff-c", 2770, 320, 370, 300, "cliff")]),
    }),
    "hac-phong-son-dao": Object.freeze({
      id: "hac-phong-son-dao", name: "Phong Nha Cổ Đạo", recommendedLevel: "10–18", requiredLevel: 10, requiredRealmId: "foundation-forging",
      world: baseWorld("Phong Nha Cổ Đạo", "mountain", Object.freeze({ ground: "#555d58", accent: "#9da6a0" })),
      entries: Object.freeze({ west: Object.freeze({ x: 320, y: 1200 }), east: Object.freeze({ x: 3280, y: 1200 }) }),
      exits: Object.freeze([{ id: "pass-to-stones", x: 180, y: 1200, targetMapId: "bai-da-linh-khi", targetEntryId: "east", label: "Đường về Thạch Mạch" }, { id: "pass-to-valley", x: 3420, y: 1200, targetMapId: "u-minh-coc", targetEntryId: "west", label: "Cửa vào Cốc Vọng U" }]),
      npcSpawns: getNpcSpawnsForMap("hac-phong-son-dao"),
      enemyZoneIds: Object.freeze(["pass-lower", "pass-upper"]),
      resources: getResourceNodesForMap("hac-phong-son-dao"),
      pointsOfInterest: Object.freeze([poi("pass-old-watchtower", "Cổ Phong Đài", 2180, 1900, "⌂", "Phong đài từng bảo vệ thương lộ. Cờ hiệu rách chỉ về Cốc Vọng U."), poi("pass-lost-camp", "Trại Tu Sĩ Bỏ Hoang", 2860, 620, "⚑", "Lửa trại đã tắt từ lâu. Những vết cào quanh lều cảnh báo bầy Phong Nha Lang.")]),
      obstacles: Object.freeze([obstacle("pass-chasm-north", 720, 260, 520, 650, "chasm"), obstacle("pass-ruin", 1660, 1650, 390, 330, "ruin"), obstacle("pass-chasm-south", 2700, 1480, 520, 610, "chasm")]),
    }),
    "u-minh-coc": Object.freeze({
      id: "u-minh-coc", name: "Cốc Vọng U", recommendedLevel: "16–25", requiredLevel: 16, requiredRealmId: "foundation-forging",
      world: baseWorld("Cốc Vọng U", "valley", Object.freeze({ ground: "#343f46", accent: "#8270a2" })),
      entries: Object.freeze({ west: Object.freeze({ x: 320, y: 1200 }), east: Object.freeze({ x: 3280, y: 1200 }) }),
      exits: Object.freeze([{ id: "valley-to-pass", x: 180, y: 1200, targetMapId: "hac-phong-son-dao", targetEntryId: "east", label: "Đường về Phong Nha" }, { id: "valley-to-abyss", x: 3420, y: 1200, targetMapId: "long-hoa-dia-uyen", targetEntryId: "west", label: "Lối xuống Long Hỏa Địa Uyên" }]),
      npcSpawns: getNpcSpawnsForMap("u-minh-coc"),
      enemyZoneIds: Object.freeze(["valley-mist", "valley-depths"]),
      resources: getResourceNodesForMap("u-minh-coc"),
      pointsOfInterest: Object.freeze([poi("valley-sunken-ruin", "Phế Tích Chìm", 2280, 1900, "⌘", "Nửa tòa điện chìm trong sương tím. Phù văn cổ nhắc đến một lối sâu hơn chưa thể mở."), poi("valley-sealed-altar", "U Minh Phong Ấn", 2880, 600, "✦", "Phong ấn phát ra hàn khí. Đây có thể là lối đi cho một hành trình sau này.")]),
      obstacles: Object.freeze([obstacle("valley-ruin-a", 700, 300, 440, 420, "ruin"), obstacle("valley-marsh", 1640, 1580, 500, 410, "marsh"), obstacle("valley-ruin-b", 2820, 1320, 390, 420, "ruin")]),
    }),
    "long-hoa-dia-uyen": Object.freeze({
      id: "long-hoa-dia-uyen", name: "Long Hỏa Địa Uyên", recommendedLevel: "23–32", requiredLevel: 23, requiredRealmId: "golden-core",
      world: baseWorld("Long Hỏa Địa Uyên", "abyss", Object.freeze({ ground: "#3a2018", accent: "#d4813a" })),
      entries: Object.freeze({ west: Object.freeze({ x: 320, y: 1200 }) }),
      exits: Object.freeze([{ id: "abyss-to-valley", x: 180, y: 1200, targetMapId: "u-minh-coc", targetEntryId: "east", label: "Đường về Cốc Vọng U" }]),
      npcSpawns: getNpcSpawnsForMap("long-hoa-dia-uyen"),
      enemyZoneIds: Object.freeze(["abyss-outer", "abyss-core", "abyss-dragon-lair"]),
      resources: getResourceNodesForMap("long-hoa-dia-uyen"),
      pointsOfInterest: Object.freeze([poi("abyss-dragon-skull", "Long Cốt Tàn", 2400, 1880, "☠", "Đầu lâu rồng cổ đại chìm trong nham thạch. Linh hỏa vẫn âm ỉ trong hốc mắt."), poi("abyss-lava-font", "Hỏa Mạch Nguyên Tuyền", 2820, 580, "⚶", "Dòng nham thạch lỏng phun lên từ mạch sâu, linh hỏa khi cuộn theo sóng nhiệt.")]),
      obstacles: Object.freeze([obstacle("abyss-lava-pool-a", 680, 280, 480, 440, "lava"), obstacle("abyss-ridge", 1680, 1600, 460, 380, "volcanic-ridge"), obstacle("abyss-lava-pool-b", 2780, 1350, 400, 440, "lava")]),
    }),
  }),
});
