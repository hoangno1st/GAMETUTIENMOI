const region = (id, enemyType, minLevel, maxLevel, x, y, width, height, maxActive, respawnDelay, points) => Object.freeze({ id, enemyType, minLevel, maxLevel, bounds: Object.freeze({ x, y, width, height }), maxActive, respawnDelay, points: Object.freeze(points.map((point) => Object.freeze(point))) });
const enemy = (definition) => Object.freeze({ aiType: "patrol-chase-return", statScalingId: "standard-by-level", spawnRestrictions: Object.freeze({ mapRegionsOnly: true, avoidPlayer: true }), respawnBehavior: "region-delay", ...definition });

export const EnemyConfig = Object.freeze({
  performanceCapPerMap: 14,
  minimumSpawnDistanceFromPlayer: 360,
  scaling: Object.freeze({ hpPerLevel: 0.2, attackPerLevel: 0.105, defensePerLevel: 0.55, speedPerLevel: 1.5, expPerLevel: 0.22, speedBonusCap: 38 }),
  archetypes: Object.freeze({
    herbSpirit: enemy({ id: "herbSpirit", name: "Tức Diệp Tinh", description: "Linh thể thực vật hút linh khí quanh các vườn thảo dược.", species: "herb-spirit", levelRange: Object.freeze([1, 5]), baseHp: 35, baseAttack: 7, baseDefense: 1, baseSpeed: 100, aggroRange: 400, attackRange: 58, leashRange: 560, attackCooldown: 1.65, attackWindup: 0.55, baseExp: 12, collisionRadius: 27, lootTableId: "training-herb-spirit", color: "#5caa69" }),
    mountainCat: enemy({ id: "mountainCat", name: "Nham Bì Ly", description: "Sơn thú nhanh nhẹn thường phục kích ở bìa rừng và khe đá.", species: "mountain-cat", levelRange: Object.freeze([2, 12]), baseHp: 26, baseAttack: 10, baseDefense: 2, baseSpeed: 180, aggroRange: 430, attackRange: 64, leashRange: 600, attackCooldown: 1.35, attackWindup: 0.5, baseExp: 16, collisionRadius: 29, lootTableId: "training-mountain-cat", color: "#8c735d" }),
    stoneBeast: enemy({ id: "stoneBeast", name: "Mạch Nham Khôi", description: "Khôi lỗi đá kết tụ quanh các mạch linh thạch.", species: "stone-beast", levelRange: Object.freeze([6, 9]), baseHp: 62, baseAttack: 12, baseDefense: 5, baseSpeed: 92, aggroRange: 390, attackRange: 70, leashRange: 580, attackCooldown: 1.8, attackWindup: 0.75, baseExp: 24, collisionRadius: 34, lootTableId: "stone-beast", color: "#77736a" }),
    shadowWolf: enemy({ id: "shadowWolf", name: "Phong Nha Lang", description: "Lang thú săn theo bầy trên cổ đạo nhiều gió dữ.", species: "shadow-wolf", levelRange: Object.freeze([10, 18]), baseHp: 58, baseAttack: 15, baseDefense: 4, baseSpeed: 205, aggroRange: 470, attackRange: 68, leashRange: 650, attackCooldown: 1.25, attackWindup: 0.62, baseExp: 32, collisionRadius: 31, lootTableId: "shadow-wolf", color: "#48434d" }),
    valleyWraith: enemy({ id: "valleyWraith", name: "Vọng U Ảnh", description: "U ảnh sinh ra từ ký ức lạc trong sương cốc.", species: "valley-wraith", levelRange: Object.freeze([16, 25]), baseHp: 72, baseAttack: 18, baseDefense: 6, baseSpeed: 145, aggroRange: 450, attackRange: 82, leashRange: 620, attackCooldown: 1.55, attackWindup: 0.82, baseExp: 42, collisionRadius: 30, lootTableId: "valley-wraith", color: "#6b5684" }),
    lavaLizard: enemy({ id: "lavaLizard", name: "Nham Hỏa Xà", description: "Xà linh sinh trong nham thạch nóng, vảy đỏ rực phát ra hỏa khí.", species: "lava-lizard", levelRange: Object.freeze([23, 30]), baseHp: 88, baseAttack: 22, baseDefense: 8, baseSpeed: 160, aggroRange: 440, attackRange: 72, leashRange: 640, attackCooldown: 1.4, attackWindup: 0.65, baseExp: 55, collisionRadius: 32, lootTableId: "lava-lizard", color: "#c45a2a" }),
    cinderGolem: enemy({ id: "cinderGolem", name: "Tro Nham Khôi", description: "Khôi lỗi hình thành từ tro tàn và nham thạch kết tụ, chậm nhưng mãnh liệt.", species: "cinder-golem", levelRange: Object.freeze([25, 32]), baseHp: 120, baseAttack: 26, baseDefense: 12, baseSpeed: 100, aggroRange: 400, attackRange: 78, leashRange: 600, attackCooldown: 1.9, attackWindup: 0.85, baseExp: 68, collisionRadius: 38, lootTableId: "cinder-golem", color: "#8a4428" }),
    infernalDrake: enemy({ id: "infernalDrake", name: "Hỏa Dực Long Ảnh", description: "Long ảnh cổ đại thức tỉnh từ Long Cốt Tàn, mang sức mạnh long hỏa.", species: "infernal-drake", aiType: "patrol-chase-return", levelRange: Object.freeze([28, 32]), baseHp: 280, baseAttack: 35, baseDefense: 16, baseSpeed: 130, aggroRange: 520, attackRange: 88, leashRange: 700, attackCooldown: 2.0, attackWindup: 0.9, baseExp: 160, collisionRadius: 42, lootTableId: "infernal-drake", color: "#e06020", isElite: true }),
  }),
  maps: Object.freeze({
    "thanh-van-ngoai-mon": Object.freeze({ levelRange: Object.freeze([1, 4]), regions: Object.freeze([
      region("sect-herb-garden", "herbSpirit", 1, 3, 2600, 650, 650, 520, 3, 7, [{ x: 2760, y: 820 }, { x: 3040, y: 980 }, { x: 2860, y: 1050 }]),
      region("sect-training-edge", "mountainCat", 2, 4, 2750, 1500, 620, 500, 2, 8, [{ x: 2880, y: 1720 }, { x: 3200, y: 1840 }]),
    ]) }),
    "rung-linh-thao": Object.freeze({ levelRange: Object.freeze([3, 7]), regions: Object.freeze([
      region("forest-west-grove", "herbSpirit", 3, 5, 900, 650, 700, 650, 3, 8, [{ x: 1100, y: 820 }, { x: 1370, y: 1080 }, { x: 1200, y: 1240 }]),
      region("forest-deep", "mountainCat", 5, 7, 2050, 1050, 850, 700, 3, 9, [{ x: 2250, y: 1240 }, { x: 2600, y: 1450 }, { x: 2750, y: 1180 }]),
    ]) }),
    "bai-da-linh-khi": Object.freeze({ levelRange: Object.freeze([6, 12]), regions: Object.freeze([
      region("stones-ridge", "stoneBeast", 6, 9, 900, 650, 800, 650, 3, 10, [{ x: 1100, y: 850 }, { x: 1400, y: 1050 }, { x: 1250, y: 1220 }]),
      region("stones-core", "mountainCat", 9, 12, 2100, 1050, 800, 700, 3, 10, [{ x: 2250, y: 1250 }, { x: 2600, y: 1450 }, { x: 2800, y: 1180 }]),
    ]) }),
    "hac-phong-son-dao": Object.freeze({ levelRange: Object.freeze([10, 18]), regions: Object.freeze([
      region("pass-lower", "shadowWolf", 10, 14, 850, 700, 850, 700, 3, 12, [{ x: 1080, y: 900 }, { x: 1400, y: 1180 }, { x: 1500, y: 1370 }]),
      region("pass-upper", "shadowWolf", 14, 18, 2100, 900, 850, 800, 3, 13, [{ x: 2250, y: 1120 }, { x: 2600, y: 1400 }, { x: 2800, y: 1080 }]),
    ]) }),
    "u-minh-coc": Object.freeze({ levelRange: Object.freeze([16, 25]), regions: Object.freeze([
      region("valley-mist", "valleyWraith", 16, 20, 900, 650, 850, 750, 3, 14, [{ x: 1100, y: 850 }, { x: 1400, y: 1100 }, { x: 1550, y: 1300 }]),
      region("valley-depths", "valleyWraith", 21, 25, 2100, 900, 850, 800, 3, 16, [{ x: 2250, y: 1120 }, { x: 2600, y: 1420 }, { x: 2800, y: 1100 }]),
    ]) }),
    "long-hoa-dia-uyen": Object.freeze({ levelRange: Object.freeze([23, 32]), regions: Object.freeze([
      region("abyss-outer", "lavaLizard", 23, 28, 900, 650, 850, 750, 3, 14, [{ x: 1100, y: 850 }, { x: 1400, y: 1100 }, { x: 1550, y: 1300 }]),
      region("abyss-core", "cinderGolem", 27, 32, 2100, 900, 850, 800, 3, 16, [{ x: 2250, y: 1120 }, { x: 2600, y: 1420 }, { x: 2800, y: 1100 }]),
      region("abyss-dragon-lair", "infernalDrake", 28, 32, 2350, 1700, 500, 400, 1, 60, [{ x: 2550, y: 1880 }]),
    ]) }),
  }),
});
