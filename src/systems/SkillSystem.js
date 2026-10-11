export class SkillSystem {
  constructor(config) {
    this.config = config;
    this.panelOpen = false;
    this.selectedIndex = 0;
    this.cooldowns = {};
    this.feedback = [];
  }

  getClass(player) {
    return this.config.classes[player.classId] ?? this.config.classes[this.config.defaultClassId];
  }

  initializePlayer(player) {
    const classData = this.getClass(player);
    for (const skill of classData.skills) {
      if (!Number.isInteger(player.skillLevels[skill.id])) {
        player.skillLevels[skill.id] = skill.initialLevel;
      }
      this.cooldowns[skill.id] = this.cooldowns[skill.id] ?? 0;
    }
  }

  update(deltaTime) {
    for (const skillId of Object.keys(this.cooldowns)) {
      this.cooldowns[skillId] = Math.max(0, this.cooldowns[skillId] - deltaTime);
    }
    for (const item of this.feedback) item.life -= deltaTime;
    this.feedback = this.feedback.filter((item) => item.life > 0);
  }

  openPanel() {
    this.panelOpen = true;
  }

  closePanel() {
    this.panelOpen = false;
  }

  moveSelection(player, direction) {
    const count = this.getClass(player).skills.length;
    this.selectedIndex = (this.selectedIndex + direction + count) % count;
  }

  getSelectedSkill(player) {
    return this.getClass(player).skills[this.selectedIndex];
  }

  getSkillLevel(player, skill) {
    return player.skillLevels[skill.id] ?? 0;
  }

  getLevelData(player, skill) {
    const level = this.getSkillLevel(player, skill);
    return level > 0 ? skill.levels[level - 1] : skill.levels[0];
  }

  getUpgradeCost(player, skill) {
    const currentLevel = this.getSkillLevel(player, skill);
    if (currentLevel >= skill.maxLevel) return 0;
    return skill.levels[currentLevel].upgradeCost;
  }

  getStatus(player, skill) {
    const level = this.getSkillLevel(player, skill);
    if (player.level < skill.requiredLevel) return "locked";
    if (level >= skill.maxLevel) return "max";
    if (level === 0) return "available";
    return "learned";
  }

  upgradeSelected(player) {
    const skill = this.getSelectedSkill(player);
    const currentLevel = this.getSkillLevel(player, skill);
    if (player.level < skill.requiredLevel) {
      this.addFeedback(`Cần cấp ${skill.requiredLevel} để mở ${skill.name}`, "warning");
      return false;
    }
    if (currentLevel >= skill.maxLevel) {
      this.addFeedback(`${skill.name} đã đạt cấp tối đa`, "warning");
      return false;
    }
    const cost = this.getUpgradeCost(player, skill);
    if (player.skillPoints < cost) {
      this.addFeedback(`Thiếu ${cost} điểm kỹ năng`, "warning");
      return false;
    }
    player.skillPoints -= cost;
    player.skillLevels[skill.id] = currentLevel + 1;
    this.addFeedback(`${skill.name} đạt cấp ${currentLevel + 1}`, "success");
    return true;
  }

  tryActivate(player, enemies, skill, combat, aimPoint, obstacles = []) {
    const classData = this.getClass(player);
    if (!classData.skills.some((ownedSkill) => ownedSkill.id === skill?.id)) {
      this.addFeedback("Kỹ năng không thuộc hệ phái hiện tại", "warning");
      return false;
    }
    const level = this.getSkillLevel(player, skill);
    if (player.level < skill.requiredLevel || level <= 0) {
      this.addFeedback(`${skill.name} chưa được học`, "warning");
      return false;
    }
    const remaining = this.getCooldown(skill.id);
    if (remaining > 0) {
      this.addFeedback(`${skill.name} còn hồi ${remaining.toFixed(1)}s`, "warning");
      return false;
    }
    const levelData = skill.levels[level - 1];
    if (player.mp < levelData.mpCost) {
      this.addFeedback(`Không đủ MP để dùng ${skill.name}`, "warning");
      return false;
    }

    const validation = combat.validateSkillCast(player, enemies, skill, levelData, aimPoint, obstacles);
    if (!validation.valid) {
      this.addFeedback(validation.message, "warning");
      return false;
    }

    player.mp -= levelData.mpCost;
    this.cooldowns[skill.id] = levelData.cooldown;
    const hitCount = combat.executeSkill(player, enemies, skill, levelData, aimPoint, validation.context);
    if (skill.targetMode === "self") {
      this.addFeedback(`${skill.name} đã được triển khai`, "success");
    } else if (hitCount < 0) {
      this.addFeedback(`${skill.name} đã được thi triển`, "success");
    } else {
      this.addFeedback(
        hitCount > 0 ? `${skill.name} trúng ${hitCount} mục tiêu` : `${skill.name} không trúng mục tiêu`,
        hitCount > 0 ? "success" : "neutral",
      );
    }
    return true;
  }

  getCooldown(skillId) {
    return this.cooldowns[skillId] ?? 0;
  }

  addFeedback(text, kind) {
    this.feedback.push({ text, kind, life: 1.8, duration: 1.8 });
    if (this.feedback.length > 3) this.feedback.shift();
  }
}
