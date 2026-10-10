import { normalize } from "../core/MathUtils.js";

export class CombatSystem {
  constructor(basicAttackConfig, respawnConfig, progression, onEnemyDefeated = null) {
    this.basicAttackConfig = basicAttackConfig;
    this.respawnConfig = respawnConfig;
    this.progression = progression;
    this.onEnemyDefeated = onEnemyDefeated;
    this.basicCooldownRemaining = 0;
    this.basicCooldownDuration = basicAttackConfig.cooldown;
    this.effects = [];
    this.floatingTexts = [];
    this.respawnRemaining = 0;
  }

  update(deltaTime, player) {
    this.basicCooldownRemaining = Math.max(0, this.basicCooldownRemaining - deltaTime);
    player.updateCombatTimers(deltaTime);

    for (const effect of this.effects) effect.life -= deltaTime;
    this.effects = this.effects.filter((effect) => effect.life > 0);
    for (const text of this.floatingTexts) {
      text.life -= deltaTime;
      text.y -= 42 * deltaTime;
    }
    this.floatingTexts = this.floatingTexts.filter((text) => text.life > 0);

    if (player.defeated) {
      if (this.respawnRemaining <= 0) this.respawnRemaining = this.respawnConfig.delay;
      this.respawnRemaining -= deltaTime;
      if (this.respawnRemaining <= 0) {
        player.respawn(this.respawnConfig.hpRatio, this.respawnConfig.mpRatio);
        this.respawnRemaining = 0;
        this.effects.push({ kind: "respawn", x: player.x, y: player.y, life: 0.8, duration: 0.8 });
      }
    }
  }

  tryBasicAttack(player, enemies) {
    if (player.defeated || this.basicCooldownRemaining > 0) return false;
    const attack = this.basicAttackConfig;
    this.basicCooldownDuration = attack.cooldown / player.derivedStats.attackSpeedMultiplier;
    this.basicCooldownRemaining = this.basicCooldownDuration;
    const facing = player.getFacingVector();
    const target = this.findNearestTarget(player, enemies, attack.range, attack.facingDot);
    this.effects.push({
      kind: "basic",
      x: player.x,
      y: player.y,
      direction: facing,
      life: 0.22,
      duration: 0.22,
    });
    const damage = Math.round(
      (attack.damage + player.derivedStats.physicalAttack * attack.attackScaling)
      * player.derivedStats.swordDamageMultiplier,
    );
    if (target) this.damageEnemy(target, damage, player, attack.knockback);
    return true;
  }

  executeSkill(player, enemies, skill, levelData) {
    const facing = player.getFacingVector();
    this.effects.push({
      kind: "skill",
      effectName: skill.effect,
      x: player.x,
      y: player.y,
      direction: facing,
      life: 0.48,
      duration: 0.48,
    });

    const damage = Math.round(
      (levelData.damage + player.derivedStats.physicalAttack * levelData.attackScaling)
      * player.derivedStats.skillDamageMultiplier
      * player.derivedStats.swordDamageMultiplier,
    );
    let hitCount = 0;
    const validTargets = enemies.filter((enemy) => (
      this.isValidTarget(player, enemy, levelData.range, levelData.facingDot)
    ));
    const targets = skill.targetMode === "nearest"
      ? [this.findNearestTarget(player, validTargets, levelData.range, levelData.facingDot)].filter(Boolean)
      : validTargets;
    for (const enemy of targets) {
      this.damageEnemy(enemy, damage, player, levelData.knockback);
      hitCount += 1;
    }
    return hitCount;
  }

  findNearestTarget(player, enemies, range, facingDot) {
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const enemy of enemies) {
      if (!this.isValidTarget(player, enemy, range, facingDot)) continue;
      const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  isValidTarget(player, enemy, range, facingDot) {
    if (enemy.defeated) return false;
    const offsetX = enemy.x - player.x;
    const offsetY = enemy.y - player.y;
    const distance = Math.hypot(offsetX, offsetY);
    if (distance > range + enemy.collisionRadius) return false;
    const direction = normalize(offsetX, offsetY);
    const facing = player.getFacingVector();
    return direction.x * facing.x + direction.y * facing.y >= facingDot;
  }

  damageEnemy(enemy, damage, player, knockback) {
    const direction = normalize(enemy.x - player.x, enemy.y - player.y);
    const wasDefeated = enemy.takeDamage(damage, direction, knockback);
    this.addDamageNumber(enemy.x, enemy.y - 75, damage, "#fff0a8");
    this.effects.push({ kind: "hit", x: enemy.x, y: enemy.y - 25, life: 0.2, duration: 0.2 });
    if (wasDefeated) {
      this.progression.grantExperience(player, enemy.expReward, enemy.x, enemy.y - 45);
      this.onEnemyDefeated?.(enemy);
      this.effects.push({ kind: "defeat", x: enemy.x, y: enemy.y, life: 0.55, duration: 0.55 });
    }
  }

  resolveEnemyAttack(enemy, player) {
    if (enemy.defeated || player.defeated) return;
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (distance > enemy.attackRange + player.collisionRadius + enemy.collisionRadius) return;
    const mitigatedDamage = Math.max(1, Math.round(enemy.damage - player.derivedStats.defense * 0.35));
    if (!player.takeDamage(mitigatedDamage)) return;
    this.addDamageNumber(player.x, player.y - 85, mitigatedDamage, "#ff8f7e");
    this.effects.push({ kind: "player-hit", x: player.x, y: player.y - 20, life: 0.3, duration: 0.3 });
    if (player.defeated) {
      this.respawnRemaining = this.respawnConfig.delay;
      this.effects.push({ kind: "player-defeat", x: player.x, y: player.y, life: 1, duration: 1 });
    }
  }

  addDamageNumber(x, y, amount, color) {
    this.floatingTexts.push({ x, y, amount, color, life: 0.85, duration: 0.85 });
  }

  renderWorld(ctx) {
    for (const effect of this.effects) this.drawEffect(ctx, effect);
    for (const text of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, text.life * 2.5);
      ctx.textAlign = "center";
      ctx.font = "700 25px system-ui, sans-serif";
      ctx.strokeStyle = "rgb(4 12 9 / 90%)";
      ctx.lineWidth = 5;
      ctx.strokeText(`-${text.amount}`, text.x, text.y);
      ctx.fillStyle = text.color;
      ctx.fillText(`-${text.amount}`, text.x, text.y);
      ctx.restore();
    }
  }

  drawEffect(ctx, effect) {
    const progress = 1 - effect.life / effect.duration;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.translate(effect.x, effect.y);

    if (effect.kind === "basic" || effect.kind === "skill") {
      const angle = Math.atan2(effect.direction.y, effect.direction.x);
      ctx.rotate(angle);
      const skillStyle = this.getSkillEffectStyle(effect.effectName);
      const radius = effect.kind === "skill" ? skillStyle.radius : 135;
      ctx.strokeStyle = effect.kind === "skill" ? skillStyle.color : "#f3dc9a";
      ctx.lineWidth = effect.kind === "skill" ? skillStyle.lineWidth : 11;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = effect.kind === "skill" ? 28 : 14;
      ctx.beginPath();
      ctx.arc(0, 0, radius * (0.72 + progress * 0.28), -0.72, 0.72);
      ctx.stroke();
      if (effect.kind === "skill") {
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(42, effect.effectName === "echo-step" ? -12 : 0);
        ctx.lineTo(radius, 0);
        ctx.stroke();
      }
    } else {
      const radius = 22 + progress * (effect.kind === "respawn" ? 110 : 48);
      ctx.strokeStyle = effect.kind === "player-hit" || effect.kind === "player-defeat" ? "#f17b69" : "#b4f0ce";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  getSkillEffectStyle(effectName) {
    const styles = {
      "wind-arc": { radius: 235, color: "#7fe4d2", lineWidth: 20 },
      "echo-step": { radius: 185, color: "#a99cf2", lineWidth: 14 },
      "sky-radiance": { radius: 335, color: "#f0d070", lineWidth: 11 },
    };
    return styles[effectName] ?? styles["wind-arc"];
  }
}
