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
    this.projectiles = [];
    this.pendingStrikes = [];
    this.pendingProjectiles = [];
    this.healingZones = [];
    this.floatingTexts = [];
    this.respawnRemaining = 0;
    this.maxEffects = 48;
    this.maxFloatingTexts = 32;
    this.onEvent = null;
  }

  update(deltaTime, player, enemies = [], obstacles = []) {
    if (this.effects.length > this.maxEffects) this.effects.splice(0, this.effects.length - this.maxEffects);
    this.basicCooldownRemaining = Math.max(0, this.basicCooldownRemaining - deltaTime);
    player.updateCombatTimers(deltaTime);
    this.updateProjectiles(deltaTime, enemies, obstacles);
    this.updatePendingStrikes(deltaTime, player, enemies);
    this.updatePendingProjectiles(deltaTime, obstacles);
    this.updateHealingZones(deltaTime, player);

    if (player.derivedStats.mpRegenPerSecond > 0 && !player.defeated && player.mp < player.maxMp) {
      player.mp = Math.min(player.maxMp, player.mp + player.derivedStats.mpRegenPerSecond * deltaTime);
    }

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

  tryBasicAttack(player, enemies, aimPoint = null) {
    if (player.defeated || this.basicCooldownRemaining > 0) return false;
    const attack = this.basicAttackConfig;
    this.basicCooldownDuration = attack.cooldown / player.derivedStats.attackSpeedMultiplier;
    this.basicCooldownRemaining = this.basicCooldownDuration;
    player.attackAnimationRemaining = 0.22;
    const facing = this.getAimDirection(player, aimPoint);
    const target = attack.projectile ? null : this.findNearestTarget(player, enemies, attack.range, attack.facingDot);

    if (attack.projectile) {
      const damage = this.calculateDamage(player, attack);
      this.spawnProjectile(player, facing, attack, damage, "#a8d4f0", "spirit-bolt");
    } else {
      this.effects.push({
        kind: "basic",
        x: player.x,
        y: player.y,
        direction: facing,
        life: 0.22,
        duration: 0.22,
      });
    }

    if (target) this.damageEnemy(target, this.calculateDamage(player, attack), player, attack.knockback);
    this.onEvent?.("basic", player.x, player.y);
    return true;
  }

  validateSkillCast(player, enemies, skill, levelData, aimPoint, obstacles = []) {
    if (skill.targetMode === "self" && levelData.healAmount > 0 && player.hp >= player.maxHp) {
      return { valid: false, message: "HP đã đầy, chưa cần triển khai Thanh Tâm Trận" };
    }
    if (skill.targetMode === "targeted-delay") {
      if (!aimPoint || !Number.isFinite(aimPoint.x) || !Number.isFinite(aimPoint.y)) {
        return { valid: false, message: `${skill.name}: cần trỏ chuột vào một mục tiêu` };
      }
      const radius = skill.targeting?.acquireRadius ?? 80;
      const target = enemies
        .filter((enemy) => !enemy.defeated)
        .map((enemy) => ({ enemy, cursorDistance: Math.hypot(enemy.x - aimPoint.x, enemy.y - aimPoint.y) }))
        .filter((entry) => entry.cursorDistance <= radius)
        .sort((a, b) => a.cursorDistance - b.cursorDistance)[0]?.enemy;
      if (!target) return { valid: false, message: `${skill.name}: hãy trỏ chuột gần một yêu thú` };
      if (Math.hypot(target.x - player.x, target.y - player.y) > levelData.range + target.collisionRadius) {
        return { valid: false, message: `${skill.name}: mục tiêu ngoài tầm ${levelData.range}` };
      }
      if (this.lineBlocked(player.x, player.y, target.x, target.y, obstacles)) {
        return { valid: false, message: `${skill.name}: địa hình đang che khuất mục tiêu` };
      }
      return { valid: true, context: { target } };
    }
    return { valid: true, context: null };
  }

  executeSkill(player, enemies, skill, levelData, aimPoint = null, context = null) {
    player.attackAnimationRemaining = 0.38;
    const facing = this.getAimDirection(player, aimPoint);

    if (skill.targetMode === "self" && levelData.healAmount > 0) {
      this.effects.push({
        kind: "skill",
        effectName: skill.effect,
        x: player.x,
        y: player.y,
        owner: player,
        direction: facing,
        radius: levelData.range,
        life: levelData.effectDuration,
        duration: levelData.effectDuration,
      });
      this.healingZones.push({ player, remaining: levelData.effectDuration, duration: levelData.effectDuration, healRemaining: levelData.healAmount, tick: 0, radius: levelData.range });
      this.onEvent?.("skill", player.x, player.y);
      return -1;
    }

    const damage = this.calculateDamage(player, levelData, true);
    if (skill.targetMode === "projectile") {
      this.spawnProjectile(player, facing, levelData, damage, "#f0a050", skill.effect);
      this.onEvent?.("skill", player.x, player.y);
      return -1;
    }
    if (skill.targetMode === "projectile-sequence") {
      const count = levelData.projectileCount ?? 5;
      for (let index = 0; index < count; index += 1) {
        const centered = index - (count - 1) / 2;
        this.pendingProjectiles.push({ delay: index * levelData.sequenceInterval, player, direction: this.rotateVector(facing, centered * levelData.spread / Math.max(1, count - 1)), data: levelData, damage, color: this.phaseColor(index), effectName: skill.effect });
      }
      this.effects.push({ kind: "skill", effectName: skill.effect, x: player.x, y: player.y, direction: facing, life: 0.55, duration: 0.55 });
      this.onEvent?.("skill", player.x, player.y);
      return -1;
    }
    if (skill.targetMode === "targeted-delay" && context?.target) {
      const target = context.target;
      this.pendingStrikes.push({ x: target.x, y: target.y, remaining: levelData.effectDuration, duration: levelData.effectDuration, radius: levelData.impactRadius, damage, knockback: levelData.knockback, maxTargets: skill.targeting?.maxTargets ?? 1 });
      this.effects.push({ kind: "target-marker", effectName: skill.effect, x: target.x, y: target.y, radius: levelData.impactRadius, life: levelData.effectDuration, duration: levelData.effectDuration });
      this.onEvent?.("skill", player.x, player.y);
      return -1;
    }

    this.effects.push({
      kind: "skill",
      effectName: skill.effect,
      x: player.x,
      y: player.y,
      direction: facing,
      life: 0.48,
      duration: 0.48,
    });

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
    this.onEvent?.("skill", player.x, player.y);
    return hitCount;
  }

  calculateDamage(player, data, isSkill = false) {
    const spiritScaling = data.spiritScaling ?? (data.projectile ? 0.55 : 0);
    const base = data.damage
      + player.derivedStats.physicalAttack * (data.attackScaling ?? 0)
      + (player.derivedStats.spiritualPower ?? player.baseStats.spirit) * spiritScaling;
    const classMultiplier = spiritScaling > 0
      ? player.derivedStats.spiritDamageMultiplier ?? 1
      : player.derivedStats.swordDamageMultiplier ?? 1;
    return Math.round(base * classMultiplier * (isSkill ? player.derivedStats.skillDamageMultiplier : 1));
  }

  getAimDirection(player, aimPoint) {
    if (!aimPoint) return player.getFacingVector();
    const direction = normalize(aimPoint.x - player.x, aimPoint.y - player.y);
    return direction.x === 0 && direction.y === 0 ? player.getFacingVector() : direction;
  }

  spawnProjectile(player, direction, data, damage, color, effectName) {
    this.projectiles.push({ x: player.x, y: player.y - 18, direction, speed: data.projectileSpeed ?? 760, remainingRange: data.range, radius: data.projectileRadius ?? 13, damage, knockback: data.knockback ?? 0, player, color, effectName });
    if (this.projectiles.length > 24) this.projectiles.shift();
  }

  updateProjectiles(deltaTime, enemies, obstacles) {
    for (const projectile of this.projectiles) {
      const distance = Math.min(projectile.remainingRange, projectile.speed * deltaTime);
      projectile.x += projectile.direction.x * distance;
      projectile.y += projectile.direction.y * distance;
      projectile.remainingRange -= distance;
      if (this.pointBlocked(projectile.x, projectile.y, projectile.radius, obstacles)) { projectile.expired = true; continue; }
      const target = enemies.find((enemy) => !enemy.defeated && Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) <= enemy.collisionRadius + projectile.radius);
      if (target) {
        this.damageEnemy(target, projectile.damage, projectile.player, projectile.knockback);
        this.effects.push({ kind: "impact", x: projectile.x, y: projectile.y, color: projectile.color, life: 0.28, duration: 0.28 });
        projectile.expired = true;
      }
      if (projectile.remainingRange <= 0) projectile.expired = true;
    }
    this.projectiles = this.projectiles.filter((projectile) => !projectile.expired);
  }

  updatePendingProjectiles(deltaTime) {
    for (const pending of this.pendingProjectiles) {
      pending.delay -= deltaTime;
      if (pending.delay <= 0) { this.spawnProjectile(pending.player, pending.direction, pending.data, pending.damage, pending.color, pending.effectName); pending.fired = true; }
    }
    this.pendingProjectiles = this.pendingProjectiles.filter((pending) => !pending.fired);
  }

  updatePendingStrikes(deltaTime, player, enemies) {
    for (const strike of this.pendingStrikes) {
      strike.remaining -= deltaTime;
      if (strike.remaining > 0) continue;
      const targets = enemies.filter((enemy) => !enemy.defeated && Math.hypot(enemy.x - strike.x, enemy.y - strike.y) <= strike.radius + enemy.collisionRadius).slice(0, strike.maxTargets);
      for (const enemy of targets) this.damageEnemy(enemy, strike.damage, player, strike.knockback);
      this.effects.push({ kind: "thunder-impact", x: strike.x, y: strike.y, radius: strike.radius, life: 0.42, duration: 0.42 });
      strike.resolved = true;
    }
    this.pendingStrikes = this.pendingStrikes.filter((strike) => !strike.resolved);
  }

  updateHealingZones(deltaTime, player) {
    for (const zone of this.healingZones) {
      zone.remaining -= deltaTime; zone.tick -= deltaTime;
      if (zone.tick <= 0 && zone.healRemaining > 0 && !player.defeated) {
        const ticksLeft = Math.max(1, Math.ceil(zone.remaining));
        const amount = Math.min(zone.healRemaining, Math.max(1, Math.ceil(zone.healRemaining / ticksLeft)), player.maxHp - player.hp);
        if (amount > 0) { player.hp += amount; zone.healRemaining -= amount; this.floatingTexts.push({ x: player.x, y: player.y - 80, amount, color: "#8fe2b2", life: 0.85, duration: 0.85, isHeal: true }); }
        zone.tick = 1;
      }
    }
    this.healingZones = this.healingZones.filter((zone) => zone.remaining > 0);
  }

  pointBlocked(x, y, radius, obstacles) {
    return obstacles.some((item) => x + radius > item.x && x - radius < item.x + item.width && y + radius > item.y && y - radius < item.y + item.height);
  }

  lineBlocked(x1, y1, x2, y2, obstacles) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 24));
    for (let step = 1; step < steps; step += 1) if (this.pointBlocked(x1 + (x2 - x1) * step / steps, y1 + (y2 - y1) * step / steps, 5, obstacles)) return true;
    return false;
  }

  rotateVector(vector, angle) { const cos = Math.cos(angle); const sin = Math.sin(angle); return { x: vector.x * cos - vector.y * sin, y: vector.x * sin + vector.y * cos }; }
  phaseColor(index) { return ["#e88d62", "#d9c66a", "#7ed59b", "#72bfe5", "#b697e8"][index % 5]; }

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
    this.addDamageNumber(enemy.x, enemy.y - 75, enemy.lastDamageTaken ?? damage, "#fff0a8");
    this.effects.push({ kind: "hit", x: enemy.x, y: enemy.y - 25, life: 0.2, duration: 0.2 });
    this.onEvent?.("hit", enemy.x, enemy.y);
    if (wasDefeated) {
      this.progression.grantExperience(player, enemy.expReward, enemy.x, enemy.y - 45);
      this.onEnemyDefeated?.(enemy);
      this.effects.push({ kind: "defeat", x: enemy.x, y: enemy.y, life: 0.55, duration: 0.55 });
      this.onEvent?.("defeat", enemy.x, enemy.y);
    }
  }

  resolveEnemyAttack(enemy, player) {
    if (enemy.defeated || player.defeated) return;
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (distance > enemy.attackRange + player.collisionRadius + enemy.collisionRadius) return;
    const mitigatedDamage = Math.min(
      Math.max(1, Math.round(enemy.damage - player.derivedStats.defense * 0.35)),
      Math.max(1, Math.ceil(player.maxHp * 0.34)),
    );
    if (!player.takeDamage(mitigatedDamage)) return;
    this.addDamageNumber(player.x, player.y - 85, mitigatedDamage, "#ff8f7e");
    this.effects.push({ kind: "player-hit", x: player.x, y: player.y - 20, life: 0.3, duration: 0.3 });
    this.onEvent?.("player-hit", player.x, player.y);
    if (player.defeated) {
      this.respawnRemaining = this.respawnConfig.delay;
      this.effects.push({ kind: "player-defeat", x: player.x, y: player.y, life: 1, duration: 1 });
      this.onEvent?.("player-defeat", player.x, player.y);
    }
  }

  addDamageNumber(x, y, amount, color) {
    this.floatingTexts.push({ x, y, amount, color, life: 0.85, duration: 0.85 });
    if (this.floatingTexts.length > this.maxFloatingTexts) this.floatingTexts.splice(0, this.floatingTexts.length - this.maxFloatingTexts);
  }

  renderWorld(ctx) {
    for (const projectile of this.projectiles) this.drawProjectile(ctx, projectile);
    for (const effect of this.effects) this.drawEffect(ctx, effect);
    for (const text of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, text.life * 2.5);
      ctx.textAlign = "center";
      ctx.font = "700 25px system-ui, sans-serif";
      ctx.strokeStyle = "rgb(4 12 9 / 90%)";
      ctx.lineWidth = 5;
      const prefix = text.isHeal ? "+" : "-";
      ctx.strokeText(`${prefix}${text.amount}`, text.x, text.y);
      ctx.fillStyle = text.color;
      ctx.fillText(`${prefix}${text.amount}`, text.x, text.y);
      ctx.restore();
    }
  }

  drawEffect(ctx, effect) {
    const progress = 1 - effect.life / effect.duration;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.translate(effect.owner?.x ?? effect.x, effect.owner?.y ?? effect.y);

    if (effect.kind === "target-marker") {
      const pulse = 0.78 + Math.sin(progress * Math.PI * 8) * 0.08;
      ctx.strokeStyle = "#d9b5ff"; ctx.lineWidth = 7; ctx.setLineDash([14, 9]);
      ctx.beginPath(); ctx.arc(0, 0, effect.radius * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = "rgb(192 160 240 / 18%)"; ctx.beginPath(); ctx.arc(0, 0, effect.radius, 0, Math.PI * 2); ctx.fill();
    } else if (effect.kind === "thunder-impact") {
      ctx.strokeStyle = "#efe3ff"; ctx.lineWidth = 10; ctx.shadowColor = "#b68cff"; ctx.shadowBlur = 30;
      for (let i = 0; i < 5; i++) { const angle = i * Math.PI * 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * effect.radius, Math.sin(angle) * effect.radius); ctx.lineTo(0, 0); ctx.stroke(); }
    } else if (effect.kind === "impact") {
      ctx.strokeStyle = effect.color; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, 18 + progress * 30, 0, Math.PI * 2); ctx.stroke();
    } else if (effect.kind === "projectile") {
      const angle = Math.atan2(effect.direction.y, effect.direction.x);
      ctx.rotate(angle);
      const dist = progress * effect.range * 0.8;
      ctx.fillStyle = effect.color ?? "#a8d4f0";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(dist, 0, 10 - progress * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = effect.color ?? "#a8d4f0";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(dist - 18, 0);
      ctx.lineTo(dist, 0);
      ctx.stroke();
    } else if (effect.kind === "basic" || effect.kind === "skill") {
      const angle = Math.atan2(effect.direction.y, effect.direction.x);
      ctx.rotate(angle);
      const skillStyle = this.getSkillEffectStyle(effect.effectName);
      const radius = effect.kind === "skill" ? skillStyle.radius : 135;
      ctx.strokeStyle = effect.kind === "skill" ? skillStyle.color : "#f3dc9a";
      ctx.lineWidth = effect.kind === "skill" ? skillStyle.lineWidth : 11;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = effect.kind === "skill" ? 28 : 14;

      if (effect.effectName === "spirit-ward") {
        ctx.rotate(-angle);
        ctx.strokeStyle = skillStyle.color;
        ctx.lineWidth = skillStyle.lineWidth;
        const wardRadius = effect.radius ?? (60 + progress * 50);
        ctx.beginPath();
        ctx.arc(0, 0, wardRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha *= 0.4;
        ctx.fillStyle = skillStyle.color;
        ctx.beginPath();
        ctx.arc(0, 0, wardRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (effect.effectName === "spirit-fire") {
        const dist = progress * skillStyle.radius * 0.7;
        ctx.fillStyle = skillStyle.color;
        ctx.shadowColor = "#ff6a30";
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.arc(dist, 0, 14 - progress * 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (effect.effectName === "thunder-seal") {
        ctx.rotate(-angle);
        ctx.strokeStyle = skillStyle.color;
        ctx.lineWidth = skillStyle.lineWidth;
        ctx.shadowBlur = 32;
        const sealRadius = skillStyle.radius * (0.5 + progress * 0.5);
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI * 2 / 6) * i + progress * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * sealRadius, Math.sin(a) * sealRadius);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, sealRadius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      } else {
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

  drawProjectile(ctx, projectile) {
    ctx.save(); ctx.translate(projectile.x, projectile.y);
    ctx.fillStyle = projectile.color; ctx.shadowColor = projectile.color; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(0, 0, projectile.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgb(255 255 235 / 85%)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, projectile.radius * 0.55, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  getSkillEffectStyle(effectName) {
    const styles = {
      "wind-arc": { radius: 235, color: "#7fe4d2", lineWidth: 20 },
      "echo-step": { radius: 185, color: "#a99cf2", lineWidth: 14 },
      "sky-radiance": { radius: 335, color: "#f0d070", lineWidth: 11 },
      "spirit-fire": { radius: 320, color: "#f0a050", lineWidth: 14 },
      "spirit-ward": { radius: 90, color: "#70e8a8", lineWidth: 10 },
      "thunder-seal": { radius: 280, color: "#c0a0f0", lineWidth: 12 },
      "five-phase-chain": { radius: 220, color: "#89d8ba", lineWidth: 12 },
    };
    return styles[effectName] ?? styles["wind-arc"];
  }
}
