import { CompanionConfig } from "../config/CompanionConfig.js";

export class CompanionSystem {
  constructor() {
    this.config = CompanionConfig;
    this.owned = {};
    this.activeId = null;
    this.assistEnabled = true;
    this.panelOpen = false;
    this.attackCooldown = 0;
    this.x = 0;
    this.y = 0;
    this.facing = "south";
    this.walkTime = 0;
    this.isMoving = false;
    this.treasureCooldown = 0;
    this.treasureEffects = [];
    this.treasureX = 0;
    this.treasureY = 0;
    this.treasureTime = 0;
  }

  initializePlayer(player) {
    const saved = player.companionState ?? {};
    this.owned = {};
    for (const [id, state] of Object.entries(saved.owned ?? {})) {
      const def = this.config.companions[id];
      if (!def) continue;
      this.owned[id] = {
        level: Math.max(1, Math.min(def.maxLevel, Number.isInteger(state.level) ? state.level : 1)),
        exp: Math.max(0, Number.isInteger(state.exp) ? state.exp : 0),
      };
    }
    this.activeId = this.owned[saved.activeId] ? saved.activeId : (Object.keys(this.owned)[0] ?? null);
    this.assistEnabled = saved.assistEnabled !== false;
    if (this.activeId) {
      this.x = player.x - 70;
      this.y = player.y + 40;
    }
    this.treasureCooldown = Math.max(0, Number.isFinite(saved.treasureCooldown) ? saved.treasureCooldown : 0);
    this.treasureX = player.x + 60;
    this.treasureY = player.y - 30;
  }

  getPersistentState() {
    return {
      owned: structuredClone(this.owned),
      activeId: this.activeId,
      assistEnabled: this.assistEnabled,
      treasureCooldown: this.treasureCooldown,
    };
  }

  getActive() {
    if (!this.activeId) return null;
    return this.config.companions[this.activeId] ?? null;
  }

  getActiveState() {
    if (!this.activeId) return null;
    return this.owned[this.activeId] ?? null;
  }

  getMaxHp() {
    const def = this.getActive();
    const state = this.getActiveState();
    if (!def || !state) return 0;
    return def.baseHp + (state.level - 1) * def.hpPerLevel;
  }

  getDamage() {
    const def = this.getActive();
    const state = this.getActiveState();
    if (!def || !state) return 0;
    return def.baseDamage + (state.level - 1) * def.damagePerLevel;
  }

  getRequiredExp() {
    const def = this.getActive();
    const state = this.getActiveState();
    if (!def || !state || state.level >= def.maxLevel) return 0;
    return def.expPerLevel * state.level;
  }

  unlock(companionId) {
    if (this.owned[companionId]) return false;
    const def = this.config.companions[companionId];
    if (!def) return false;
    this.owned[companionId] = { level: 1, exp: 0 };
    if (!this.activeId) this.activeId = companionId;
    return true;
  }

  hasCompanion(companionId) {
    return Boolean(this.owned[companionId]);
  }

  grantExp(amount) {
    const state = this.getActiveState();
    const def = this.getActive();
    if (!state || !def || state.level >= def.maxLevel) return;
    state.exp += amount;
    const required = def.expPerLevel * state.level;
    while (state.exp >= required && state.level < def.maxLevel) {
      state.exp -= def.expPerLevel * state.level;
      state.level += 1;
    }
    if (state.level >= def.maxLevel) state.exp = 0;
  }

  update(deltaTime, player, enemies, combat, isBlocked) {
    this.treasureCooldown = Math.max(0, this.treasureCooldown - deltaTime);
    this.treasureTime += deltaTime;

    for (const effect of this.treasureEffects) effect.life -= deltaTime;
    this.treasureEffects = this.treasureEffects.filter((e) => e.life > 0);

    this.updateTreasureFollow(deltaTime, player);

    if (!this.activeId) return;
    const def = this.getActive();
    if (!def) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);

    const dx = player.x - 70 - this.x;
    const dy = player.y + 40 - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > def.followDistance) {
      const speed = def.followSpeed * deltaTime;
      const move = Math.min(speed, dist - def.followDistance * 0.5);
      this.x += (dx / dist) * move;
      this.y += (dy / dist) * move;
      this.isMoving = true;
      this.walkTime += deltaTime * 8;
      if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? "east" : "west";
      else this.facing = dy > 0 ? "south" : "north";
    } else {
      this.isMoving = false;
    }

    if (dist > 600) {
      this.x = player.x - 70;
      this.y = player.y + 40;
    }

    if (!this.assistEnabled || isBlocked || player.defeated || this.attackCooldown > 0) return;

    let nearest = null;
    let nearestDist = this.config.combatAssistRange;
    for (const enemy of enemies) {
      if (enemy.defeated) continue;
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d < nearestDist && enemy.state === "chase") {
        nearest = enemy;
        nearestDist = d;
      }
    }

    if (nearest) {
      this.attackCooldown = def.attackCooldown;
      const damage = this.getDamage();
      combat.addDamageNumber(nearest.x, nearest.y - 60, damage, "#f5e6cc");
      combat.effects.push({ kind: "hit", x: nearest.x, y: nearest.y - 25, life: 0.2, duration: 0.2 });
      const wasDefeated = nearest.takeDamage(damage, { x: 0, y: 0 }, 0);
      if (wasDefeated) {
        combat.effects.push({ kind: "defeat", x: nearest.x, y: nearest.y, life: 0.55, duration: 0.55 });
        combat.progression.grantExperience(player, nearest.expReward, nearest.x, nearest.y - 45);
        combat.onEnemyDefeated?.(nearest);
      }
      this.facing = nearest.x > this.x ? "east" : "west";
    }
  }

  activateTreasure(player, itemConfig) {
    const itemId = player.equipment?.treasure;
    if (!itemId) return false;
    const item = itemConfig.items[itemId];
    if (!item?.activeEffect || this.treasureCooldown > 0) return false;
    const effect = item.activeEffect;
    if (player.mp < (effect.mpCost ?? 0)) return false;
    player.mp -= effect.mpCost ?? 0;
    this.treasureCooldown = effect.cooldown;
    return { ...effect, x: player.x, y: player.y };
  }

  updateTreasureFollow(deltaTime, player) {
    const targetX = player.x + 60;
    const targetY = player.y - 30;
    const dx = targetX - this.treasureX;
    const dy = targetY - this.treasureY;
    const dist = Math.hypot(dx, dy);
    if (dist > 400) {
      this.treasureX = targetX;
      this.treasureY = targetY;
    } else if (dist > 20) {
      const speed = 360 * deltaTime;
      const move = Math.min(speed, dist - 10);
      this.treasureX += (dx / dist) * move;
      this.treasureY += (dy / dist) * move;
    }
  }

  hasTreasureEquipped(player) {
    return Boolean(player.equipment?.treasure);
  }

  togglePanel() { this.panelOpen = !this.panelOpen; }
  closePanel() { this.panelOpen = false; }
  toggleAssist() { this.assistEnabled = !this.assistEnabled; }

  render(ctx, player, itemConfig) {
    this.renderTreasure(ctx, player, itemConfig);

    if (!this.activeId) return;
    const def = this.getActive();
    if (!def) return;

    const bob = this.isMoving ? Math.sin(this.walkTime) * 3 : Math.sin(this.walkTime * 0.3 + 1) * 1.5;
    ctx.save();
    ctx.translate(this.x, this.y + bob);

    ctx.fillStyle = "rgb(6 17 14 / 20%)";
    ctx.beginPath();
    ctx.ellipse(0, 12, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const flip = this.facing === "west" ? -1 : 1;
    ctx.scale(flip, 1);

    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(10, -6, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(12, -7, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(-5, -4);
    ctx.lineTo(-10, -16);
    ctx.lineTo(0, -8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, -4);
    ctx.lineTo(6, -16);
    ctx.lineTo(10, -6);
    ctx.fill();

    ctx.fillStyle = def.accentColor;
    ctx.beginPath();
    ctx.ellipse(-14, 2, 10, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    this.renderTreasureEffects(ctx);
  }

  renderTreasure(ctx, player, itemConfig) {
    if (!this.hasTreasureEquipped(player) || !itemConfig) return;
    const itemId = player.equipment.treasure;
    const item = itemConfig.items[itemId];
    if (!item) return;

    const bob = Math.sin(this.treasureTime * 2.5) * 4;
    const rotation = Math.sin(this.treasureTime * 1.2) * 0.15;
    const glowPulse = 0.3 + Math.sin(this.treasureTime * 3) * 0.15;

    ctx.save();
    ctx.translate(this.treasureX, this.treasureY + bob);
    ctx.rotate(rotation);

    ctx.shadowColor = "#75aee8";
    ctx.shadowBlur = 12 + glowPulse * 10;

    ctx.fillStyle = "#4a8ec7";
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(10, -4);
    ctx.lineTo(10, 6);
    ctx.lineTo(0, 14);
    ctx.lineTo(-10, 6);
    ctx.lineTo(-10, -4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#8cc4f0";
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(5, -4);
    ctx.lineTo(0, 4);
    ctx.lineTo(-5, -4);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#a0d4ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(10, -4);
    ctx.lineTo(10, 6);
    ctx.lineTo(0, 14);
    ctx.lineTo(-10, 6);
    ctx.lineTo(-10, -4);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgb(6 17 14 / 15%)";
    ctx.beginPath();
    ctx.ellipse(this.treasureX, this.treasureY + 18, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderTreasureEffects(ctx) {
    for (const effect of this.treasureEffects) {
      const progress = 1 - effect.life / effect.duration;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.strokeStyle = "#75aee8";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 30 + progress * effect.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
