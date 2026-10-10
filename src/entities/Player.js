import { clamp, normalize } from "../core/MathUtils.js";

export class Player {
  constructor(config, sprites, worldConfig, renderSize, showWorldHealthBar, cultivationConfig, classConfig, itemConfig) {
    this.name = config.name;
    this.classId = classConfig.defaultClassId;
    const classData = classConfig.classes[this.classId];
    this.level = config.level;
    const startingRealm = cultivationConfig.realms[0];
    const startingStage = startingRealm.stages[0];
    this.realmId = startingRealm.id;
    this.realmStageId = startingStage.id;
    this.realmSubLevel = 1;
    this.realm = `${startingRealm.name} · ${startingStage.name} · Nhất Trọng`;
    this.hp = config.maxHp;
    this.maxHp = config.maxHp;
    this.mp = config.maxMp;
    this.maxMp = config.maxMp;
    this.baseMaxHp = config.maxHp;
    this.baseMaxMp = config.maxMp;
    this.baseMovementSpeed = config.movementSpeed;
    this.renderSize = renderSize;
    this.collisionRadius = config.collisionRadius;
    this.sprites = sprites;
    this.worldConfig = worldConfig;
    this.spawnX = worldConfig.safeSpawn.x;
    this.spawnY = worldConfig.safeSpawn.y;
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.invincibilityDuration = config.invincibilityDuration;
    this.invincibilityRemaining = 0;
    this.healthBarRemaining = 0;
    this.defeated = false;
    this.exp = 0;
    this.attributePoints = 0;
    this.skillPoints = 0;
    this.baseStats = { ...cultivationConfig.initialStats };
    this.attributes = { ...classData.baseAttributes };
    this.skillLevels = {};
    for (const skill of classData.skills) this.skillLevels[skill.id] = skill.initialLevel;
    this.derivedStats = {
      physicalAttack: this.baseStats.attack,
      defense: this.baseStats.defense,
      maxHp: this.maxHp,
      maxMp: this.maxMp,
      movementSpeed: this.baseMovementSpeed,
      attackSpeedMultiplier: 1,
      skillDamageMultiplier: 1,
      swordDamageMultiplier: classData.passive.swordDamageMultiplier,
    };
    this.inventory = itemConfig.startingInventory.map((entry) => ({ ...entry }));
    this.equipment = { ...itemConfig.startingEquipment };
    this.coins = 0;
    this.questState = { accepted: {}, completed: {}, trackedQuestId: null, currentAreaId: "ngoai-mon" };
    this.equipmentUpgrades = {};
    this.activityState = { practiceCooldown: 0, practiceCompletions: 0, progress: 0 };
    this.companionState = { owned: {}, activeId: null, assistEnabled: true, treasureCooldown: 0 };
    this.showWorldHealthBar = showWorldHealthBar;
    this.facing = "south";
    this.walkTime = 0;
    this.isMoving = false;
  }

  update(deltaTime, movementAxis) {
    const movement = normalize(movementAxis.x, movementAxis.y);
    this.isMoving = movement.x !== 0 || movement.y !== 0;

    if (this.isMoving) {
      if (Math.abs(movement.x) > Math.abs(movement.y)) {
        this.facing = movement.x > 0 ? "east" : "west";
      } else {
        this.facing = movement.y > 0 ? "south" : "north";
      }
    }
    if (this.isMoving) this.walkTime += deltaTime * 9;

    this.x += movement.x * this.derivedStats.movementSpeed * deltaTime;
    this.y += movement.y * this.derivedStats.movementSpeed * deltaTime;

    const radius = this.collisionRadius;
    const bounds = this.worldConfig.bounds;
    this.x = clamp(this.x, bounds.minX + radius, bounds.maxX - radius);
    this.y = clamp(this.y, bounds.minY + radius, bounds.maxY - radius);
  }

  updateCombatTimers(deltaTime) {
    this.invincibilityRemaining = Math.max(0, this.invincibilityRemaining - deltaTime);
    this.healthBarRemaining = Math.max(0, this.healthBarRemaining - deltaTime);
  }

  takeDamage(amount) {
    if (this.defeated || this.invincibilityRemaining > 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invincibilityRemaining = this.invincibilityDuration;
    this.healthBarRemaining = 3;
    if (this.hp === 0) this.defeated = true;
    return true;
  }

  respawn(hpRatio, mpRatio) {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.hp = Math.max(1, Math.round(this.maxHp * hpRatio));
    this.mp = Math.round(this.maxMp * mpRatio);
    this.invincibilityRemaining = this.invincibilityDuration;
    this.healthBarRemaining = 2.5;
    this.defeated = false;
    this.facing = "south";
  }

  getFacingVector() {
    const vectors = {
      north: { x: 0, y: -1 },
      south: { x: 0, y: 1 },
      east: { x: 1, y: 0 },
      west: { x: -1, y: 0 },
    };
    return vectors[this.facing];
  }

  getPersistentState() {
    return {
      name: this.name,
      classId: this.classId,
      level: this.level,
      realm: this.realm,
      realmId: this.realmId,
      realmStageId: this.realmStageId,
      realmSubLevel: this.realmSubLevel,
      hp: this.hp,
      mp: this.mp,
      maxHp: this.maxHp,
      maxMp: this.maxMp,
      baseMaxHp: this.baseMaxHp,
      baseMaxMp: this.baseMaxMp,
      exp: this.exp,
      attributePoints: this.attributePoints,
      skillPoints: this.skillPoints,
      baseStats: { ...this.baseStats },
      attributes: { ...this.attributes },
      skillLevels: { ...this.skillLevels },
      inventory: this.inventory.map((entry) => ({ ...entry })),
      equipment: { ...this.equipment },
      coins: this.coins,
      safeSpawn: { x: this.spawnX, y: this.spawnY },
      questState: structuredClone(this.questState),
      equipmentUpgrades: { ...this.equipmentUpgrades },
      activityState: { ...this.activityState },
      companionState: structuredClone(this.companionState),
    };
  }

  applyPersistentState(data) {
    this.name = data.name;
    this.classId = data.classId;
    this.level = data.level;
    this.realm = data.realm;
    this.realmId = data.realmId;
    this.realmStageId = data.realmStageId;
    this.realmSubLevel = data.realmSubLevel;
    this.maxHp = data.maxHp;
    this.maxMp = data.maxMp;
    this.baseMaxHp = data.baseMaxHp;
    this.baseMaxMp = data.baseMaxMp;
    this.hp = data.hp;
    this.mp = data.mp;
    this.exp = data.exp;
    this.attributePoints = data.attributePoints;
    this.skillPoints = data.skillPoints;
    this.baseStats = { ...data.baseStats };
    this.attributes = { ...data.attributes };
    this.skillLevels = { ...data.skillLevels };
    this.inventory = data.inventory.map((entry) => ({ ...entry }));
    this.equipment = { ...data.equipment };
    this.coins = data.coins;
    this.questState = data.questState ?? { accepted: {}, completed: {}, trackedQuestId: null, currentAreaId: "ngoai-mon" };
    this.equipmentUpgrades = { ...(data.equipmentUpgrades ?? {}) };
    this.activityState = { ...(data.activityState ?? { practiceCooldown: 0, progress: 0 }) };
    this.companionState = structuredClone(data.companionState ?? { owned: {}, activeId: null, assistEnabled: true, treasureCooldown: 0 });
    this.spawnX = data.safeSpawn.x;
    this.spawnY = data.safeSpawn.y;
    this.x = this.spawnX;
    this.y = this.spawnY;
  }

  render(ctx) {
    const bob = this.isMoving ? Math.sin(this.walkTime) * 4 : Math.sin(this.walkTime * 0.25) * 1.5;
    const size = this.renderSize;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    if (this.defeated) ctx.globalAlpha = 0.25;
    else if (this.invincibilityRemaining > 0 && Math.floor(this.invincibilityRemaining * 18) % 2 === 0) {
      ctx.globalAlpha = 0.42;
    }
    if (this.facing === "west") ctx.scale(-1, 1);
    ctx.drawImage(this.sprites[this.facing], -size / 2, -size * 0.76, size, size);
    ctx.restore();

    if (this.showWorldHealthBar && this.healthBarRemaining > 0 && !this.defeated) {
      this.drawHealthBar(ctx);
    }
  }

  drawHealthBar(ctx) {
    const width = 112;
    const x = this.x - width / 2;
    const y = this.y - this.renderSize * 0.88;
    ctx.fillStyle = "rgb(5 14 11 / 82%)";
    ctx.fillRect(x, y, width, 12);
    ctx.fillStyle = "#c04e46";
    ctx.fillRect(x + 2, y + 2, (width - 4) * (this.hp / this.maxHp), 8);
  }
}
