export class SaveSystem {
  constructor(storage, config) {
    this.storage = storage;
    this.storageKey = config.key;
    this.currentVersion = config.version;
  }

  hasSave() {
    if (!this.storage) return false;
    try { return Boolean(this.storage.getItem(this.storageKey)); } catch { return false; }
  }

  hasValidCharacterSave() {
    if (!this.storage) return false;
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return false;
      const record = this.migrate(JSON.parse(raw));
      return Boolean(record && this.hasCharacterShape(record.character));
    } catch {
      return false;
    }
  }

  saveCharacter(characterData) {
    if (!this.storage || !this.hasCharacterShape(characterData)) return false;

    const record = {
      version: this.currentVersion,
      savedAt: new Date().toISOString(),
      character: characterData,
    };

    try {
      this.storage.setItem(this.storageKey, JSON.stringify(record));
      return true;
    } catch (error) {
      console.warn("Không thể lưu dữ liệu nhân vật cục bộ.", error);
      return false;
    }
  }

  loadCharacter(fallback, limits) {
    if (!this.storage) return this.copyCharacter(fallback);
    let rawRecord;
    try {
      rawRecord = this.storage.getItem(this.storageKey);
    } catch (error) {
      console.warn("Không thể truy cập dữ liệu lưu cục bộ.", error);
      return this.copyCharacter(fallback);
    }

    if (!rawRecord) return this.copyCharacter(fallback);

    try {
      const parsedRecord = JSON.parse(rawRecord);
      const migratedRecord = this.migrate(parsedRecord);
      if (!migratedRecord) return this.copyCharacter(fallback);
      return this.sanitizeCharacter(migratedRecord.character, fallback, limits);
    } catch (error) {
      console.warn("Dữ liệu lưu không hợp lệ; sử dụng nhân vật mặc định.", error);
      return this.copyCharacter(fallback);
    }
  }

  migrate(record) {
    if (!record || typeof record !== "object") return null;
    if (record.version === this.currentVersion) return record;
    if ([1, 2, 3, 4, 5].includes(record.version) && this.currentVersion === 6) {
      const character = record.character ?? {};
      if (!character.classId) character.classId = "sword-cultivator";
      return { ...record, character, version: 6 };
    }
    return null;
  }

  sanitizeCharacter(data, fallback, limits) {
    if (!this.hasCharacterShape(data)) return this.copyCharacter(fallback);
    const bounds = limits.worldBounds;
    const cultivation = limits.cultivationConfig;
    const classes = limits.classConfig;
    const itemConfig = limits.itemConfig;
    const classData = classes.classes[data.classId]
      ?? classes.classes[fallback.classId]
      ?? classes.classes[classes.defaultClassId];
    const realm = cultivation.realms.find((entry) => entry.id === data.realmId)
      ?? cultivation.realms.find((entry) => entry.id === fallback.realmId)
      ?? cultivation.realms[0];
    const stage = realm.stages.find((entry) => entry.id === data.realmStageId)
      ?? realm.stages[0];
    const characterLevel = this.safeInteger(data.level, fallback.level, 1, cultivation.maxLevel);
    const maxHp = this.safeNumber(data.maxHp, fallback.maxHp, 1, limits.maxStatValue);
    const maxMp = this.safeNumber(data.maxMp, fallback.maxMp, 1, limits.maxStatValue);
    const attributes = {};
    for (const attribute of classes.attributes.order) {
      attributes[attribute] = this.safeInteger(
        data.attributes?.[attribute],
        fallback.attributes[attribute],
        classData.baseAttributes[attribute],
        999,
      );
    }
    const skillLevels = {};
    for (const skill of classData.skills) {
      skillLevels[skill.id] = characterLevel < skill.requiredLevel
        ? 0
        : this.safeInteger(
          data.skillLevels?.[skill.id],
          fallback.skillLevels[skill.id],
          0,
          skill.maxLevel,
        );
    }
    const inventory = this.sanitizeInventory(data.inventory, fallback.inventory, itemConfig);
    const equipment = {};
    for (const slot of itemConfig.equipmentSlots) {
      const savedItem = itemConfig.items[data.equipment?.[slot.id]];
      const fallbackItem = itemConfig.items[fallback.equipment?.[slot.id]];
      equipment[slot.id] = savedItem?.type === "equipment"
        && savedItem.equipmentSlot === slot.id
        && this.meetsItemRequirements(savedItem, characterLevel, realm.id, itemConfig, classData.id)
        ? savedItem.id
        : fallbackItem?.type === "equipment"
          && fallbackItem.equipmentSlot === slot.id
          && this.meetsItemRequirements(fallbackItem, characterLevel, realm.id, itemConfig, classData.id)
          ? fallbackItem.id
          : null;
    }

    return {
      name: this.safeString(data.name, fallback.name, 40),
      classId: classData.id,
      level: characterLevel,
      realm: this.safeString(data.realm, fallback.realm, 80),
      realmId: realm.id,
      realmStageId: stage.id,
      realmSubLevel: this.safeInteger(data.realmSubLevel, fallback.realmSubLevel, 1, stage.subLevels),
      maxHp,
      maxMp,
      baseMaxHp: this.safeNumber(data.baseMaxHp, maxHp, 1, limits.maxStatValue),
      baseMaxMp: this.safeNumber(data.baseMaxMp, maxMp, 1, limits.maxStatValue),
      hp: this.safeNumber(data.hp, fallback.hp, 1, maxHp),
      mp: this.safeNumber(data.mp, fallback.mp, 0, maxMp),
      exp: this.safeInteger(data.exp, fallback.exp, 0, Number.MAX_SAFE_INTEGER),
      attributePoints: this.safeInteger(data.attributePoints, fallback.attributePoints, 0, 9999),
      skillPoints: this.safeInteger(data.skillPoints, fallback.skillPoints, 0, 9999),
      baseStats: {
        attack: this.safeNumber(data.baseStats?.attack, fallback.baseStats.attack, 1, limits.maxStatValue),
        defense: this.safeNumber(data.baseStats?.defense, fallback.baseStats.defense, 0, limits.maxStatValue),
        spirit: this.safeNumber(data.baseStats?.spirit, fallback.baseStats.spirit, 0, limits.maxStatValue),
        agility: this.safeNumber(data.baseStats?.agility, fallback.baseStats.agility, 0, limits.maxStatValue),
      },
      attributes,
      skillLevels,
      inventory,
      equipment,
      coins: this.safeInteger(data.coins, fallback.coins, 0, Number.MAX_SAFE_INTEGER),
      safeSpawn: {
        x: this.safeNumber(data.safeSpawn?.x, fallback.safeSpawn.x, bounds.minX, bounds.maxX),
        y: this.safeNumber(data.safeSpawn?.y, fallback.safeSpawn.y, bounds.minY, bounds.maxY),
      },
      questState: this.sanitizeQuestState(data.questState, limits.questConfig),
      equipmentUpgrades: this.sanitizeEquipmentUpgrades(data.equipmentUpgrades, equipment, limits.craftingConfig),
      activityState: {
        practiceCooldown: this.safeNumber(data.activityState?.practiceCooldown, 0, 0, limits.craftingConfig?.practice.cooldown ?? 30),
        progress: this.safeNumber(data.activityState?.progress, 0, 0, limits.craftingConfig?.practice.duration ?? 5),
        practiceCompletions: this.safeInteger(data.activityState?.practiceCompletions, 0, 0, Number.MAX_SAFE_INTEGER),
      },
      companionState: this.sanitizeCompanionState(data.companionState, limits.companionConfig),
      mapState: this.sanitizeMapState(data.mapState, limits.mapConfig),
    };
  }

  sanitizeEquipmentUpgrades(data, equipment, craftingConfig) {
    const result = {};
    for (const itemId of Object.values(equipment)) {
      if (!itemId) continue;
      result[itemId] = this.safeInteger(data?.[itemId], 0, 0, craftingConfig?.maxUpgradeLevel ?? 0);
    }
    return result;
  }

  sanitizeQuestState(data, questConfig) {
    if (!questConfig || !data || typeof data !== "object") return { accepted: {}, completed: {}, trackedQuestId: null, currentAreaId: "thanh-van-ngoai-mon" };
    const ids = new Set(questConfig.quests.map((quest) => quest.id));
    const accepted = {};
    for (const quest of questConfig.quests) {
      const source = data.accepted?.[quest.id];
      if (!source || typeof source !== "object") continue;
      const progress = {};
      for (const objective of quest.objectives) progress[objective.id] = this.safeInteger(source.progress?.[objective.id], 0, 0, objective.amount);
      accepted[quest.id] = { progress };
    }
    const completed = {};
    for (const id of Object.keys(data.completed ?? {})) if (ids.has(id)) completed[id] = true;
    const areaIds = new Set(questConfig.areas.map((area) => area.id));
    return { accepted, completed, trackedQuestId: ids.has(data.trackedQuestId) && accepted[data.trackedQuestId] ? data.trackedQuestId : null, currentAreaId: areaIds.has(data.currentAreaId) ? data.currentAreaId : "thanh-van-ngoai-mon" };
  }

  sanitizeCompanionState(data, companionConfig) {
    const fallback = { owned: {}, activeId: null, assistEnabled: true, treasureCooldown: 0 };
    if (!companionConfig || !data || typeof data !== "object") return fallback;
    const owned = {};
    for (const [id, state] of Object.entries(data.owned ?? {})) {
      const def = companionConfig.companions[id];
      if (!def || !state || typeof state !== "object") continue;
      owned[id] = {
        level: this.safeInteger(state.level, 1, 1, def.maxLevel),
        exp: this.safeInteger(state.exp, 0, 0, def.expPerLevel * def.maxLevel),
      };
    }
    return {
      owned,
      activeId: owned[data.activeId] ? data.activeId : (Object.keys(owned)[0] ?? null),
      assistEnabled: data.assistEnabled !== false,
      treasureCooldown: this.safeNumber(data.treasureCooldown, 0, 0, 60),
    };
  }

  sanitizeMapState(data, mapConfig) {
    const fallback = { currentMapId: mapConfig?.defaultMapId ?? "thanh-van-ngoai-mon", discovered: {}, positions: {} };
    if (!mapConfig || !data || typeof data !== "object") return { ...fallback, discovered: { [fallback.currentMapId]: true } };
    const currentMapId = mapConfig.maps[data.currentMapId] ? data.currentMapId : mapConfig.defaultMapId;
    const discovered = { [mapConfig.defaultMapId]: true }; const positions = {};
    for (const id of Object.keys(data.discovered ?? {})) if (mapConfig.maps[id]) discovered[id] = true;
    for (const [id, position] of Object.entries(data.positions ?? {})) { const map = mapConfig.maps[id]; if (!map) continue; positions[id] = { x: this.safeNumber(position?.x, map.entries.start?.x ?? 300, map.world.bounds.minX, map.world.bounds.maxX), y: this.safeNumber(position?.y, map.entries.start?.y ?? 1200, map.world.bounds.minY, map.world.bounds.maxY) }; }
    const resourceIds = new Set(); const poiIds = new Set();
    for (const map of Object.values(mapConfig.maps)) {
      for (const node of map.resources ?? []) resourceIds.add(node.id);
      for (const poi of map.pointsOfInterest ?? []) poiIds.add(poi.id);
    }
    const nodeReadyAt = {}; const discoveredPois = {};
    for (const [id, readyAt] of Object.entries(data.exploration?.nodeReadyAt ?? {})) {
      if (resourceIds.has(id) && Number.isFinite(readyAt) && readyAt > 0) nodeReadyAt[id] = Math.min(readyAt, Date.now() + 86400000);
    }
    for (const id of Object.keys(data.exploration?.discoveredPois ?? {})) if (poiIds.has(id)) discoveredPois[id] = true;
    return { currentMapId, discovered, positions, exploration: { nodeReadyAt, discoveredPois } };
  }

  hasCharacterShape(data) {
    return Boolean(
      data
      && typeof data === "object"
      && data.safeSpawn
      && typeof data.safeSpawn === "object",
    );
  }

  sanitizeInventory(data, fallback, itemConfig) {
    const source = Array.isArray(data) ? data : fallback;
    const inventory = [];
    for (const entry of source) {
      if (inventory.length >= itemConfig.inventory.slotLimit) break;
      const item = itemConfig.items[entry?.itemId];
      if (!item) continue;
      const quantity = this.safeInteger(entry.quantity, 0, 1, item.stackLimit);
      if (quantity > 0) inventory.push({ itemId: item.id, quantity });
    }
    return inventory;
  }

  meetsItemRequirements(item, level, realmId, itemConfig, classId) {
    const requirements = item.requirements ?? {};
    if (requirements.level && level < requirements.level) return false;
    if (requirements.realmId) {
      const currentRank = itemConfig.realmOrder.indexOf(realmId);
      const requiredRank = itemConfig.realmOrder.indexOf(requirements.realmId);
      if (requiredRank >= 0 && currentRank < requiredRank) return false;
    }
    if (requirements.classId && classId && requirements.classId !== classId) return false;
    return true;
  }

  safeString(value, fallback, maxLength) {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : fallback;
  }

  safeNumber(value, fallback, min, max) {
    return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  }

  safeInteger(value, fallback, min, max) {
    return Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : fallback;
  }

  copyCharacter(character) {
    return {
      ...character,
      safeSpawn: { ...character.safeSpawn },
      baseStats: { ...character.baseStats },
      attributes: { ...character.attributes },
      skillLevels: { ...character.skillLevels },
      inventory: character.inventory.map((entry) => ({ ...entry })),
      equipment: { ...character.equipment },
      equipmentUpgrades: { ...(character.equipmentUpgrades ?? {}) },
      activityState: { ...(character.activityState ?? {}) },
      questState: structuredClone(character.questState ?? {}),
      companionState: structuredClone(character.companionState ?? {}),
      mapState: structuredClone(character.mapState ?? {}),
    };
  }

  clear() {
    if (!this.storage) return false;
    try {
      this.storage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.warn("Không thể xóa dữ liệu lưu cục bộ.", error);
      return false;
    }
  }

  loadSettings() {
    try { const data = JSON.parse(this.storage?.getItem(`${this.storageKey}.settings`) ?? "null"); return { musicVolume: this.safeNumber(data?.musicVolume, 0.18, 0, 1), sfxVolume: this.safeNumber(data?.sfxVolume, 0.55, 0, 1), muted: data?.muted === true, showDebug: data?.showDebug === true }; } catch { return { musicVolume: 0.18, sfxVolume: 0.55, muted: false, showDebug: false }; }
  }

  saveSettings(settings) { try { this.storage?.setItem(`${this.storageKey}.settings`, JSON.stringify(settings)); return true; } catch { return false; } }
}
