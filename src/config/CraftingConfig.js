export const CraftingConfig = Object.freeze({
  meditation: Object.freeze({ hpPerSecond: 10, mpPerSecond: 8 }),
  practice: Object.freeze({ duration: 5, cooldown: 30, expReward: 18 }),
  craftDuration: 1.6,
  maxUpgradeLevel: 3,
  upgradeStatPerLevel: Object.freeze({ physicalAttack: 2, defense: 1, maxHp: 5, maxMp: 4 }),
  recipes: Object.freeze([
    Object.freeze({ id: "alchemy-healing-pill", station: "alchemy", name: "Hồi Mạch Đan", output: Object.freeze({ itemId: "mending-breath-pill", quantity: 1 }), ingredients: Object.freeze([{ itemId: "mistleaf-herb", quantity: 2 }]), requirements: Object.freeze({ level: 1 }) }),
    Object.freeze({ id: "alchemy-spirit-pill", station: "alchemy", name: "Thanh Tuyền Đan", output: Object.freeze({ itemId: "clear-spring-pill", quantity: 1 }), ingredients: Object.freeze([{ itemId: "mistleaf-herb", quantity: 1 }, { itemId: "spirit-fragment", quantity: 2 }]), requirements: Object.freeze({ level: 2 }) }),
    Object.freeze({ id: "forge-reed-sword", station: "forge", name: "Kiếm Phong Lô", output: Object.freeze({ itemId: "reed-edge-sword", quantity: 1 }), ingredients: Object.freeze([{ itemId: "beast-core", quantity: 1 }, { itemId: "spirit-fragment", quantity: 3 }]), coinCost: 25, requirements: Object.freeze({ level: 2 }) }),
    Object.freeze({ id: "forge-upgrade-equipped", station: "forge", name: "Cường hóa trang bị đang mặc", action: "upgrade", ingredients: Object.freeze([{ itemId: "spirit-fragment", quantity: 2 }]), coinCost: 20, requirements: Object.freeze({ level: 1 }) }),
  ]),
});
