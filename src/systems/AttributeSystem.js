import { CraftingConfig } from "../config/CraftingConfig.js";

export class AttributeSystem {
  constructor(config, itemConfig) {
    this.config = config;
    this.itemConfig = itemConfig;
    this.selectedIndex = 0;
    this.pending = { strength: 0, constitution: 0, agility: 0, spirit: 0 };
  }

  getClass(player) {
    return this.config.classes[player.classId] ?? this.config.classes[this.config.defaultClassId];
  }

  getSelectedAttribute() {
    return this.config.attributes.order[this.selectedIndex];
  }

  moveSelection(direction) {
    const count = this.config.attributes.order.length;
    this.selectedIndex = (this.selectedIndex + direction + count) % count;
  }

  getPendingTotal() {
    return Object.values(this.pending).reduce((total, value) => total + value, 0);
  }

  getRemainingPoints(player) {
    return player.attributePoints - this.getPendingTotal();
  }

  adjustPending(player, amount) {
    const attribute = this.getSelectedAttribute();
    if (amount > 0 && this.getRemainingPoints(player) <= 0) return false;
    if (amount < 0 && this.pending[attribute] <= 0) return false;
    this.pending[attribute] += amount;
    return true;
  }

  confirm(player) {
    const spent = this.getPendingTotal();
    if (spent <= 0 || spent > player.attributePoints) return false;
    for (const attribute of this.config.attributes.order) {
      player.attributes[attribute] += this.pending[attribute];
    }
    player.attributePoints -= spent;
    this.clearPending();
    this.recalculate(player);
    return true;
  }

  resetForDebug(player) {
    const defaults = this.getClass(player).baseAttributes;
    let refunded = 0;
    for (const attribute of this.config.attributes.order) {
      refunded += Math.max(0, player.attributes[attribute] - defaults[attribute]);
      player.attributes[attribute] = defaults[attribute];
    }
    player.attributePoints += refunded;
    this.clearPending();
    this.recalculate(player);
    return refunded;
  }

  clearPending() {
    for (const attribute of this.config.attributes.order) this.pending[attribute] = 0;
  }

  getPreviewAttributes(player) {
    const preview = { ...player.attributes };
    for (const attribute of this.config.attributes.order) preview[attribute] += this.pending[attribute];
    return preview;
  }

  getDerivedStats(player, attributes = player.attributes) {
    const classData = this.getClass(player);
    const defaults = classData.baseAttributes;
    const effects = this.config.attributes.effects;
    const strengthBonus = Math.max(0, attributes.strength - defaults.strength);
    const constitutionBonus = Math.max(0, attributes.constitution - defaults.constitution);
    const agilityBonus = Math.max(0, attributes.agility - defaults.agility);
    const spiritBonus = Math.max(0, attributes.spirit - defaults.spirit);
    const movementBonus = Math.min(effects.movementSpeedBonusCap, agilityBonus * effects.movementSpeedPerAgility);
    const attackSpeedBonus = Math.min(effects.attackSpeedBonusCap, agilityBonus * effects.attackSpeedPerAgility);
    const skillDamageBonus = Math.min(effects.skillDamageBonusCap, spiritBonus * effects.skillDamagePerSpirit);
    const gear = this.getEquipmentBonuses(player);
    const gearMovement = Math.min(this.itemConfig.equipmentCaps.movementSpeedBonus, gear.movementSpeedPercent);
    const gearSkillDamage = Math.min(this.itemConfig.equipmentCaps.skillDamageBonus, gear.skillDamagePercent);

    return {
      physicalAttack: player.baseStats.attack + strengthBonus * effects.physicalAttackPerStrength + gear.physicalAttack,
      defense: player.baseStats.defense + constitutionBonus * effects.defensePerConstitution + gear.defense,
      maxHp: player.baseMaxHp + constitutionBonus * effects.maxHpPerConstitution + gear.maxHp,
      maxMp: player.baseMaxMp + spiritBonus * effects.maxMpPerSpirit + gear.maxMp,
      movementSpeed: player.baseMovementSpeed * (1 + movementBonus + gearMovement),
      attackSpeedMultiplier: 1 + attackSpeedBonus,
      skillDamageMultiplier: 1 + skillDamageBonus + gearSkillDamage,
      swordDamageMultiplier: classData.passive.swordDamageMultiplier,
      equipmentBonuses: gear,
    };
  }

  getEquipmentBonuses(player) {
    const totals = { physicalAttack: 0, defense: 0, maxHp: 0, maxMp: 0, movementSpeedPercent: 0, skillDamagePercent: 0 };
    for (const slot of this.itemConfig.equipmentSlots) {
      const item = this.itemConfig.items[player.equipment?.[slot.id]];
      if (!item) continue;
      for (const stat of Object.keys(totals)) totals[stat] += item.stats?.[stat] ?? 0;
      const upgradeLevel = Math.max(0, Math.min(CraftingConfig.maxUpgradeLevel, player.equipmentUpgrades?.[item.id] ?? 0));
      const primaryStat = item.equipmentSlot === "weapon" ? "physicalAttack"
        : item.equipmentSlot === "robe" || item.equipmentSlot === "headwear" ? "maxHp"
          : item.equipmentSlot === "accessory" ? "maxMp" : "defense";
      totals[primaryStat] += (CraftingConfig.upgradeStatPerLevel[primaryStat] ?? 0) * upgradeLevel;
    }
    return totals;
  }

  recalculate(player) {
    player.derivedStats = this.getDerivedStats(player);
    player.maxHp = player.derivedStats.maxHp;
    player.maxMp = player.derivedStats.maxMp;
    player.hp = Math.min(player.hp, player.maxHp);
    player.mp = Math.min(player.mp, player.maxMp);
  }
}
