export class ProgressionSystem {
  constructor(config, attributeSystem) {
    this.config = config;
    this.attributeSystem = attributeSystem;
    this.panelOpen = false;
    this.breakthroughMode = false;
    this.breakthroughMessage = "";
    this.effects = [];
    this.floatingTexts = [];
    this.notifications = [];
  }

  getRequiredExperience(level) {
    if (level >= this.config.maxLevel) return 0;
    const experience = this.config.experience;
    return Math.floor(
      experience.base * Math.pow(level, experience.exponent)
      + experience.linearGrowth * (level - 1),
    );
  }

  grantExperience(player, amount, x, y) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    player.exp += Math.floor(amount);
    this.floatingTexts.push({ text: `+${Math.floor(amount)} EXP`, x, y, life: 1.1, duration: 1.1 });
    this.processLevelUps(player);
  }

  processLevelUps(player, silent = false) {
    while (player.level < this.config.maxLevel) {
      const required = this.getRequiredExperience(player.level);
      if (player.exp < required) break;
      player.exp -= required;
      this.applyLevelUp(player, silent);
    }
  }

  applyLevelUp(player, silent = false) {
    const growth = this.config.growthPerLevel;
    player.level += 1;
    player.baseMaxHp += growth.maxHp;
    player.baseMaxMp += growth.maxMp;
    player.baseStats.attack += growth.attack;
    player.baseStats.defense += growth.defense;
    player.baseStats.spirit += growth.spirit;
    player.baseStats.agility += growth.agility;
    this.attributeSystem.recalculate(player);

    const levelUp = this.config.levelUp;
    player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * levelUp.hpRestoreRatio));
    player.mp = Math.min(player.maxMp, player.mp + Math.round(player.maxMp * levelUp.mpRestoreRatio));
    player.attributePoints += levelUp.attributePointsPerLevel;
    if (levelUp.skillPointLevels.includes(player.level)) player.skillPoints += 1;

    if (!silent) {
      this.effects.push({ kind: "level-up", x: player.x, y: player.y, life: 1, duration: 1 });
      this.addNotification(`Đột phá tu vi: Cấp ${player.level}`, "level");
    }
  }

  openPanel(breakthroughMode = false) {
    this.panelOpen = true;
    this.breakthroughMode = breakthroughMode;
    this.breakthroughMessage = "";
  }

  closePanel() {
    this.panelOpen = false;
    this.breakthroughMode = false;
    this.breakthroughMessage = "";
  }

  togglePanel() {
    if (this.panelOpen) this.closePanel();
    else this.openPanel(false);
  }

  attemptBreakthrough(player) {
    const info = this.getBreakthroughInfo(player);
    if (!info.nextStep) {
      this.breakthroughMessage = "Bạn đã đạt cảnh giới cao nhất của nguyên mẫu hiện tại.";
      return false;
    }
    if (info.missing.length > 0) {
      this.breakthroughMessage = `Còn thiếu: ${info.missing.join(" · ")}`;
      this.addNotification("Điều kiện đột phá chưa đủ", "warning");
      return false;
    }

    player.realmId = info.nextStep.realm.id;
    player.realmStageId = info.nextStep.stage.id;
    player.realmSubLevel = info.nextStep.subLevel;
    this.syncRealmLabel(player);
    this.breakthroughMessage = `Đột phá thành công: ${player.realm}`;
    this.effects.push({ kind: "breakthrough", x: player.x, y: player.y, life: 1.35, duration: 1.35 });
    this.addNotification(`Cảnh giới mới: ${player.realm}`, "breakthrough");
    return true;
  }

  getBreakthroughInfo(player) {
    const nextStep = this.getNextStep(player);
    if (!nextStep) return { nextStep: null, missing: [], requiredStats: {} };

    const requiredLevel = nextStep.requiredLevel;
    const requiredStats = this.getRequiredStats(requiredLevel);
    const missing = [];
    if (player.level < requiredLevel) missing.push(`Cấp ${requiredLevel}`);
    for (const [stat, requiredValue] of Object.entries(requiredStats)) {
      if (player.baseStats[stat] < requiredValue) {
        missing.push(`${this.getStatLabel(stat)} ${requiredValue}`);
      }
    }
    return { nextStep, requiredLevel, requiredStats, missing };
  }

  getNextStep(player) {
    const realmIndex = this.config.realms.findIndex((realm) => realm.id === player.realmId);
    if (realmIndex < 0) return null;
    const realm = this.config.realms[realmIndex];
    const stageIndex = realm.stages.findIndex((stage) => stage.id === player.realmStageId);
    if (stageIndex < 0) return null;
    const stage = realm.stages[stageIndex];

    if (player.realmSubLevel < stage.subLevels) {
      const subLevel = player.realmSubLevel + 1;
      return {
        realm,
        stage,
        subLevel,
        requiredLevel: stage.entryLevel + subLevel - 1,
      };
    }

    if (stageIndex + 1 < realm.stages.length) {
      const nextStage = realm.stages[stageIndex + 1];
      return { realm, stage: nextStage, subLevel: 1, requiredLevel: nextStage.entryLevel };
    }

    if (realmIndex + 1 < this.config.realms.length) {
      const nextRealm = this.config.realms[realmIndex + 1];
      const nextStage = nextRealm.stages[0];
      return { realm: nextRealm, stage: nextStage, subLevel: 1, requiredLevel: nextStage.entryLevel };
    }
    return null;
  }

  getRequiredStats(requiredLevel) {
    const initial = this.config.initialStats;
    const growth = this.config.growthPerLevel;
    const factor = this.config.breakthrough.statRequirementFactor;
    return {
      attack: initial.attack + Math.floor((requiredLevel - 1) * growth.attack * factor),
      defense: initial.defense + Math.floor((requiredLevel - 1) * growth.defense * factor),
      spirit: initial.spirit + Math.floor((requiredLevel - 1) * growth.spirit * factor),
    };
  }

  normalizeRealm(player) {
    let realm = this.config.realms.find((entry) => entry.id === player.realmId);
    if (!realm) realm = this.config.realms[0];
    let stage = realm.stages.find((entry) => entry.id === player.realmStageId);
    if (!stage) stage = realm.stages[0];
    player.realmId = realm.id;
    player.realmStageId = stage.id;
    player.realmSubLevel = Math.max(1, Math.min(stage.subLevels, player.realmSubLevel));
    this.syncRealmLabel(player);
  }

  syncRealmLabel(player) {
    const realm = this.config.realms.find((entry) => entry.id === player.realmId);
    const stage = realm?.stages.find((entry) => entry.id === player.realmStageId);
    if (!realm || !stage) return;
    player.realm = `${realm.name} · ${stage.name} · ${this.getSubLevelLabel(player.realmSubLevel)}`;
  }

  getSubLevelLabel(subLevel) {
    return ["Nhất Trọng", "Nhị Trọng", "Tam Trọng"][subLevel - 1] ?? `${subLevel} Trọng`;
  }

  getStatLabel(stat) {
    const labels = { attack: "Công", defense: "Thủ", spirit: "Thần", agility: "Thân pháp" };
    return labels[stat] ?? stat;
  }

  addNotification(text, kind) {
    this.notifications.push({ text, kind, life: 2.8, duration: 2.8 });
    if (this.notifications.length > 4) this.notifications.shift();
  }

  update(deltaTime) {
    for (const effect of this.effects) effect.life -= deltaTime;
    this.effects = this.effects.filter((effect) => effect.life > 0);
    for (const text of this.floatingTexts) {
      text.life -= deltaTime;
      text.y -= 36 * deltaTime;
    }
    this.floatingTexts = this.floatingTexts.filter((text) => text.life > 0);
    for (const notification of this.notifications) notification.life -= deltaTime;
    this.notifications = this.notifications.filter((notification) => notification.life > 0);
  }

  renderWorld(ctx) {
    for (const effect of this.effects) {
      const progress = 1 - effect.life / effect.duration;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.translate(effect.x, effect.y);
      ctx.strokeStyle = effect.kind === "breakthrough" ? "#e8c96f" : "#8ce8c0";
      ctx.lineWidth = effect.kind === "breakthrough" ? 12 : 8;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 24;
      const radius = 45 + progress * (effect.kind === "breakthrough" ? 190 : 110);
      ctx.beginPath();
      ctx.arc(0, -20, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const text of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, text.life * 2.5);
      ctx.textAlign = "center";
      ctx.font = "700 22px system-ui, sans-serif";
      ctx.strokeStyle = "rgb(4 12 9 / 90%)";
      ctx.lineWidth = 5;
      ctx.strokeText(text.text, text.x, text.y);
      ctx.fillStyle = "#8fe2b2";
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
    }
  }
}
