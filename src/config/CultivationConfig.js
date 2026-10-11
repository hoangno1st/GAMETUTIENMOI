export const CultivationConfig = Object.freeze({
  maxLevel: 36,
  experience: Object.freeze({
    base: 45,
    exponent: 1.28,
    linearGrowth: 12,
  }),
  initialStats: Object.freeze({
    attack: 10,
    defense: 6,
    spirit: 6,
    agility: 5,
  }),
  growthPerLevel: Object.freeze({
    maxHp: 12,
    maxMp: 6,
    attack: 2,
    defense: 1,
    spirit: 1,
    agility: 0.5,
  }),
  levelUp: Object.freeze({
    hpRestoreRatio: 0.22,
    mpRestoreRatio: 0.25,
    attributePointsPerLevel: 2,
    skillPointLevels: Object.freeze([3, 5, 6, 8, 11, 14, 17, 20, 24, 28, 32, 36]),
  }),
  breakthrough: Object.freeze({
    statRequirementFactor: 0.6,
  }),
  realms: Object.freeze([
    Object.freeze({
      id: "qi-refining",
      name: "Dẫn Mạch",
      stages: Object.freeze([
        Object.freeze({ id: "early", name: "Sơ Kỳ", entryLevel: 1, subLevels: 3 }),
        Object.freeze({ id: "middle", name: "Trung Kỳ", entryLevel: 4, subLevels: 3 }),
        Object.freeze({ id: "late", name: "Hậu Kỳ", entryLevel: 7, subLevels: 3 }),
      ]),
    }),
    Object.freeze({
      id: "foundation-forging",
      name: "Kết Mạch",
      stages: Object.freeze([
        Object.freeze({ id: "early", name: "Sơ Kỳ", entryLevel: 10, subLevels: 3 }),
        Object.freeze({ id: "middle", name: "Trung Kỳ", entryLevel: 13, subLevels: 3 }),
        Object.freeze({ id: "late", name: "Hậu Kỳ", entryLevel: 16, subLevels: 3 }),
      ]),
    }),
    Object.freeze({
      id: "golden-core",
      name: "Tinh Hạch",
      stages: Object.freeze([
        Object.freeze({ id: "early", name: "Sơ Kỳ", entryLevel: 19, subLevels: 3 }),
        Object.freeze({ id: "middle", name: "Trung Kỳ", entryLevel: 22, subLevels: 3 }),
        Object.freeze({ id: "late", name: "Hậu Kỳ", entryLevel: 25, subLevels: 3 }),
      ]),
    }),
    Object.freeze({
      id: "nascent-spirit",
      name: "Mạch Linh",
      stages: Object.freeze([
        Object.freeze({ id: "early", name: "Sơ Kỳ", entryLevel: 28, subLevels: 3 }),
        Object.freeze({ id: "middle", name: "Trung Kỳ", entryLevel: 31, subLevels: 3 }),
        Object.freeze({ id: "late", name: "Hậu Kỳ", entryLevel: 34, subLevels: 3 }),
      ]),
    }),
  ]),
});
