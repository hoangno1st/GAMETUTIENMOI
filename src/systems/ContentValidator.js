const hasOwn = (object, id) => Object.prototype.hasOwnProperty.call(object ?? {}, id);
const withinBounds = (point, bounds) => Number.isFinite(point?.x) && Number.isFinite(point?.y)
  && point.x >= bounds.minX && point.x <= bounds.maxX
  && point.y >= bounds.minY && point.y <= bounds.maxY;

export function validateContent(registry, dependencies = {}) {
  const errors = [];
  const warnings = [];
  const error = (path, message) => errors.push({ path, message });
  const warning = (path, message) => warnings.push({ path, message });
  const checkKeyedIds = (definitions, label) => {
    for (const [key, definition] of Object.entries(definitions ?? {})) {
      if (!definition?.id) error(`${label}.${key}`, "Thiếu ID ổn định.");
      else if (definition.id !== key) error(`${label}.${key}`, `ID '${definition.id}' không khớp khóa '${key}'.`);
    }
  };
  const checkUnique = (definitions, label) => {
    const seen = new Set();
    for (const definition of definitions ?? []) {
      if (!definition?.id) error(label, "Có định nghĩa thiếu ID.");
      else if (seen.has(definition.id)) error(`${label}.${definition.id}`, "ID bị trùng.");
      else seen.add(definition.id);
    }
  };

  checkKeyedIds(registry.maps, "maps");
  checkKeyedIds(registry.enemyTypes, "enemyTypes");
  checkKeyedIds(registry.npcs, "npcs");
  checkKeyedIds(registry.items, "items");
  checkKeyedIds(registry.resourceNodes, "resourceNodes");
  checkUnique(registry.quests, "quests");
  checkUnique(registry.questAreas, "questAreas");
  if (!hasOwn(registry.maps, registry.defaultMapId)) error("defaultMapId", `Không tìm thấy map '${registry.defaultMapId}'.`);

  const orderedMaps = new Set();
  for (const mapId of registry.mapOrder ?? []) {
    if (orderedMaps.has(mapId)) error(`mapOrder.${mapId}`, "Map bị lặp trong thứ tự thế giới.");
    orderedMaps.add(mapId);
    if (!hasOwn(registry.maps, mapId)) error(`mapOrder.${mapId}`, "Map không tồn tại.");
  }

  const exitIds = new Set();
  const poiIds = new Set();
  for (const [mapId, map] of Object.entries(registry.maps)) {
    const bounds = map.world?.bounds;
    if (!map.name) error(`maps.${mapId}.name`, "Thiếu tên hiển thị.");
    if (!Number.isFinite(map.world?.width) || !Number.isFinite(map.world?.height) || !bounds) error(`maps.${mapId}.world`, "Thiếu kích thước hoặc biên va chạm.");
    if (!map.world?.theme || !map.world?.colors) error(`maps.${mapId}.world`, "Thiếu theme hoặc cấu hình màu nền.");
    if (!map.recommendedLevel || !Number.isInteger(map.requiredLevel) || !map.requiredRealmId) error(`maps.${mapId}`, "Thiếu cấp/cảnh giới đề nghị.");
    if (dependencies.realmIds && !dependencies.realmIds.has(map.requiredRealmId)) error(`maps.${mapId}.requiredRealmId`, `Cảnh giới '${map.requiredRealmId}' không tồn tại.`);
    for (const [entryId, entry] of Object.entries(map.entries ?? {})) if (bounds && !withinBounds(entry, bounds)) error(`maps.${mapId}.entries.${entryId}`, "Điểm vào nằm ngoài biên map.");
    for (const exit of map.exits ?? []) {
      if (exitIds.has(exit.id)) error(`maps.${mapId}.exits.${exit.id}`, "Exit ID bị trùng.");
      exitIds.add(exit.id);
      const targetMap = registry.maps[exit.targetMapId];
      if (!targetMap) error(`maps.${mapId}.exits.${exit.id}`, `Map đích '${exit.targetMapId}' không tồn tại.`);
      else if (!targetMap.entries?.[exit.targetEntryId]) error(`maps.${mapId}.exits.${exit.id}`, `Entry '${exit.targetEntryId}' không tồn tại ở map đích.`);
      if (bounds && !withinBounds(exit, bounds)) error(`maps.${mapId}.exits.${exit.id}`, "Exit nằm ngoài biên map.");
    }
    const enemyMap = registry.enemyMaps[mapId];
    if (!enemyMap) error(`enemyMaps.${mapId}`, "Map chưa có định nghĩa spawn enemy.");
    const zoneIds = new Set((enemyMap?.regions ?? []).map((region) => region.id));
    for (const zoneId of map.enemyZoneIds ?? []) if (!zoneIds.has(zoneId)) error(`maps.${mapId}.enemyZoneIds.${zoneId}`, "Không tìm thấy spawn region tương ứng.");
    for (const spawn of map.npcSpawns ?? []) if (!hasOwn(registry.npcs, spawn.id)) error(`maps.${mapId}.npcSpawns.${spawn.id}`, "NPC không có trong registry.");
    for (const node of map.resources ?? []) if (!hasOwn(registry.resourceNodes, node.id)) error(`maps.${mapId}.resources.${node.id}`, "Resource node không có trong registry.");
    for (const poi of map.pointsOfInterest ?? []) {
      if (poiIds.has(poi.id)) error(`maps.${mapId}.pointsOfInterest.${poi.id}`, "POI ID bị trùng.");
      poiIds.add(poi.id);
    }
  }

  const zoneIds = new Set();
  for (const [mapId, enemyMap] of Object.entries(registry.enemyMaps ?? {})) {
    if (!hasOwn(registry.maps, mapId)) error(`enemyMaps.${mapId}`, "Định nghĩa spawn tham chiếu map không tồn tại.");
    for (const region of enemyMap.regions ?? []) {
      if (zoneIds.has(region.id)) error(`enemyMaps.${mapId}.${region.id}`, "Spawn region ID bị trùng.");
      zoneIds.add(region.id);
      const enemy = registry.enemyTypes[region.enemyType];
      if (!enemy) error(`enemyMaps.${mapId}.${region.id}.enemyType`, `Enemy '${region.enemyType}' không tồn tại.`);
      else if (region.minLevel < enemy.levelRange[0] || region.maxLevel > enemy.levelRange[1]) warning(`enemyMaps.${mapId}.${region.id}`, `Level ${region.minLevel}-${region.maxLevel} nằm ngoài khoảng enemy ${enemy.levelRange.join("-")}.`);
      if (region.maxActive > region.points.length) warning(`enemyMaps.${mapId}.${region.id}`, "maxActive lớn hơn số spawn point.");
      if (!(region.respawnDelay > 0)) error(`enemyMaps.${mapId}.${region.id}.respawnDelay`, "Respawn delay phải lớn hơn 0.");
    }
  }
  for (const [enemyId, enemy] of Object.entries(registry.enemyTypes)) if (!hasOwn(registry.dropTables, enemy.lootTableId)) error(`enemyTypes.${enemyId}.lootTableId`, `Drop table '${enemy.lootTableId}' không tồn tại.`);

  for (const [mapId, placements] of Object.entries(registry.npcPlacements ?? {})) {
    const map = registry.maps[mapId];
    if (!map) error(`npcPlacements.${mapId}`, "Map đặt NPC không tồn tại.");
    for (const placement of placements) {
      if (!hasOwn(registry.npcs, placement.npcId)) error(`npcPlacements.${mapId}.${placement.npcId}`, "NPC không tồn tại.");
      if (map && !withinBounds(placement, map.world.bounds)) error(`npcPlacements.${mapId}.${placement.npcId}`, "NPC nằm ngoài biên map.");
    }
  }

  const questIds = new Set(registry.quests.map((quest) => quest.id));
  for (const [npcId, npc] of Object.entries(registry.npcs)) for (const questId of npc.questIds ?? []) if (!questIds.has(questId)) error(`npcs.${npcId}.questIds.${questId}`, "Quest không tồn tại.");
  for (const quest of registry.quests) {
    if (!hasOwn(registry.npcs, quest.giverNpcId)) error(`quests.${quest.id}.giverNpcId`, `NPC '${quest.giverNpcId}' không tồn tại.`);
    if (!hasOwn(registry.npcs, quest.turnInNpcId)) error(`quests.${quest.id}.turnInNpcId`, `NPC '${quest.turnInNpcId}' không tồn tại.`);
    if (registry.npcs[quest.giverNpcId] && !registry.npcs[quest.giverNpcId].questIds.includes(quest.id)) warning(`quests.${quest.id}.giverNpcId`, "Quest chưa được liệt kê trong questIds của NPC giao.");
    if (registry.npcs[quest.turnInNpcId] && !registry.npcs[quest.turnInNpcId].questIds.includes(quest.id)) warning(`quests.${quest.id}.turnInNpcId`, "Quest chưa được liệt kê trong questIds của NPC trả.");
    const prerequisiteId = quest.prerequisites?.completedQuestId;
    if (prerequisiteId && !questIds.has(prerequisiteId)) error(`quests.${quest.id}.prerequisites`, `Quest tiên quyết '${prerequisiteId}' không tồn tại.`);
    checkUnique(quest.objectives, `quests.${quest.id}.objectives`);
    for (const objective of quest.objectives ?? []) {
      const valid = objective.type === "talk" ? hasOwn(registry.npcs, objective.targetId)
        : objective.type === "defeat" ? hasOwn(registry.enemyTypes, objective.targetId)
          : ["collect", "deliver"].includes(objective.type) ? hasOwn(registry.items, objective.targetId)
            : objective.type === "visit" ? hasOwn(registry.maps, objective.targetId) : false;
      if (!valid) error(`quests.${quest.id}.objectives.${objective.id}`, `Target '${objective.targetId}' không hợp lệ cho type '${objective.type}'.`);
    }
    for (const reward of quest.rewards?.items ?? []) if (!hasOwn(registry.items, reward.itemId)) error(`quests.${quest.id}.rewards.${reward.itemId}`, "Item thưởng không tồn tại.");
    if (quest.rewards?.companion && dependencies.companions && !hasOwn(dependencies.companions, quest.rewards.companion)) error(`quests.${quest.id}.rewards.companion`, `Linh thú '${quest.rewards.companion}' không tồn tại.`);
  }

  for (const [tableId, drops] of Object.entries(registry.dropTables)) for (const drop of drops) if (drop.itemId && !hasOwn(registry.items, drop.itemId)) error(`dropTables.${tableId}.${drop.itemId}`, "Item rơi không tồn tại.");
  for (const [nodeId, node] of Object.entries(registry.resourceNodes)) {
    if (!hasOwn(registry.maps, node.mapId)) error(`resourceNodes.${nodeId}.mapId`, `Map '${node.mapId}' không tồn tại.`);
    if (!hasOwn(registry.items, node.materialId)) error(`resourceNodes.${nodeId}.materialId`, `Material '${node.materialId}' không tồn tại.`);
    if (registry.items[node.materialId]?.type !== "material") warning(`resourceNodes.${nodeId}.materialId`, "Resource node đang trả về item không phải material.");
  }
  for (const recipe of dependencies.recipes ?? []) {
    if (recipe.output?.itemId && !hasOwn(registry.items, recipe.output.itemId)) error(`recipes.${recipe.id}.output`, `Item '${recipe.output.itemId}' không tồn tại.`);
    for (const ingredient of recipe.ingredients ?? []) if (!hasOwn(registry.items, ingredient.itemId)) error(`recipes.${recipe.id}.ingredients.${ingredient.itemId}`, "Nguyên liệu không tồn tại.");
  }

  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), warnings: Object.freeze(warnings) });
}

export function reportContentValidation(report) {
  const method = report.valid ? "info" : "error";
  console[method](`[ContentValidator] ${report.valid ? "Hợp lệ" : `${report.errors.length} lỗi`} · ${report.warnings.length} cảnh báo.`);
  for (const issue of report.errors) console.error(`[ContentValidator] ${issue.path}: ${issue.message}`);
  for (const issue of report.warnings) console.warn(`[ContentValidator] ${issue.path}: ${issue.message}`);
  return report;
}
