import { clamp, normalize } from "../core/MathUtils.js";

export class Enemy {
  constructor({
    id,
    enemyType,
    level = 1,
    zoneId = null,
    name,
    species,
    x,
    y,
    speed,
    maxHp,
    damage,
    defense = 0,
    attackRange,
    attackCooldown,
    attackWindup,
    expReward,
    lootTableId,
    respawnDelay,
    collisionRadius,
    territory,
    color,
    detectionRange,
    leashRange,
  }) {
    this.id = id;
    this.enemyType = enemyType;
    this.level = level;
    this.zoneId = zoneId;
    this.type = "enemy";
    this.name = name;
    this.species = species;
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.speed = speed;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.damage = damage;
    this.defense = defense;
    this.attackRange = attackRange;
    this.attackCooldown = attackCooldown;
    this.attackWindup = attackWindup;
    this.expReward = expReward;
    this.lootTableId = lootTableId;
    this.respawnDelay = respawnDelay;
    this.collisionRadius = collisionRadius;
    this.territory = territory;
    this.color = color;
    this.detectionRange = detectionRange;
    this.leashRange = leashRange;
    this.interactionLabel = "Quan sát";
    this.state = "idle";
    this.wanderTimer = 0;
    this.targetX = x;
    this.targetY = y;
    this.animationTime = Math.random() * 10;
    this.attackCooldownRemaining = 0;
    this.attackWindupRemaining = 0;
    this.hitFlashRemaining = 0;
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.defeated = false;
    this.respawnRemaining = 0;
    this.lastDamageTaken = 0;
  }

  update(deltaTime, player, combat) {
    this.animationTime += deltaTime;
    this.attackCooldownRemaining = Math.max(0, this.attackCooldownRemaining - deltaTime);
    this.hitFlashRemaining = Math.max(0, this.hitFlashRemaining - deltaTime);

    if (this.defeated) {
      this.respawnRemaining -= deltaTime;
      if (this.respawnRemaining <= 0 && Math.hypot(player.x - this.spawnX, player.y - this.spawnY) > 280) this.respawn();
      return;
    }

    this.applyKnockback(deltaTime);
    const playerDistance = Math.hypot(player.x - this.x, player.y - this.y);
    const homeDistance = Math.hypot(this.x - this.spawnX, this.y - this.spawnY);

    if (this.attackWindupRemaining > 0) {
      this.attackWindupRemaining -= deltaTime;
      if (this.attackWindupRemaining <= 0) {
        this.attackCooldownRemaining = this.attackCooldown;
        combat.resolveEnemyAttack(this, player);
      }
      return;
    }

    if (player.defeated || homeDistance > this.leashRange) this.state = "return";
    else if (playerDistance <= this.detectionRange) this.state = "chase";
    else if (this.state === "chase") this.state = "return";

    if (this.state === "chase") {
      const strikeDistance = this.attackRange + player.collisionRadius;
      if (playerDistance <= strikeDistance) {
        if (this.attackCooldownRemaining <= 0) this.attackWindupRemaining = this.attackWindup;
        return;
      }
      this.moveToward(player.x, player.y, deltaTime, 1);
      return;
    }

    if (this.state === "return") {
      this.moveToward(this.spawnX, this.spawnY, deltaTime, 1.15);
      if (homeDistance < 22) {
        this.state = "idle";
        this.wanderTimer = 0;
      }
      return;
    }

    this.wanderTimer -= deltaTime;
    const targetDistance = Math.hypot(this.targetX - this.x, this.targetY - this.y);
    if (this.wanderTimer <= 0 || targetDistance < 12) {
      this.chooseWanderTarget();
    }
    this.moveToward(this.targetX, this.targetY, deltaTime, 0.32);
    this.x = clamp(this.x, this.territory.x, this.territory.x + this.territory.width);
    this.y = clamp(this.y, this.territory.y, this.territory.y + this.territory.height);
  }

  chooseWanderTarget() {
    this.targetX = this.territory.x + 50 + Math.random() * (this.territory.width - 100);
    this.targetY = this.territory.y + 50 + Math.random() * (this.territory.height - 100);
    this.wanderTimer = 2.5 + Math.random() * 3.5;
  }

  moveToward(targetX, targetY, deltaTime, speedMultiplier) {
    const direction = normalize(targetX - this.x, targetY - this.y);
    this.x += direction.x * this.speed * speedMultiplier * deltaTime;
    this.y += direction.y * this.speed * speedMultiplier * deltaTime;
  }

  applyKnockback(deltaTime) {
    this.x += this.knockbackX * deltaTime;
    this.y += this.knockbackY * deltaTime;
    const decay = Math.exp(-11 * deltaTime);
    this.knockbackX *= decay;
    this.knockbackY *= decay;
  }

  takeDamage(amount, direction, knockback) {
    if (this.defeated) return false;
    const mitigated = Math.max(1, Math.round(amount - this.defense * 0.45));
    this.lastDamageTaken = mitigated;
    this.hp = Math.max(0, this.hp - mitigated);
    this.hitFlashRemaining = 0.13;
    this.knockbackX += direction.x * knockback;
    this.knockbackY += direction.y * knockback;
    this.state = "chase";
    this.attackWindupRemaining = 0;

    if (this.hp === 0) {
      this.defeated = true;
      this.respawnRemaining = this.respawnDelay;
      this.state = "defeated";
      return true;
    }
    return false;
  }

  respawn() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.hp = this.maxHp;
    this.defeated = false;
    this.state = "idle";
    this.wanderTimer = 0;
    this.attackCooldownRemaining = 1;
    this.knockbackX = 0;
    this.knockbackY = 0;
  }

  render(ctx, player) {
    if (this.defeated) return;
    const bob = Math.sin(this.animationTime * 4) * 3;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.fillStyle = "rgb(6 17 14 / 24%)";
    ctx.beginPath();
    ctx.ellipse(0, 18, 40, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.attackWindupRemaining > 0) this.drawAttackTelegraph(ctx);

    if (this.species === "herb-spirit") this.drawHerbSpirit(ctx);
    else this.drawMountainCat(ctx);

    const nearby = Math.hypot(player.x - this.x, player.y - this.y) <= 560;
    if (nearby || this.state === "chase" || this.hitFlashRemaining > 0) this.drawHealthBar(ctx, player);
    ctx.restore();
  }

  drawHerbSpirit(ctx) {
    ctx.fillStyle = this.hitFlashRemaining > 0 ? "#fff5d7" : this.color;
    ctx.beginPath();
    ctx.ellipse(0, -17, 35, 47, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9bd57b";
    ctx.beginPath();
    ctx.ellipse(-18, -61, 13, 31, -0.7, 0, Math.PI * 2);
    ctx.ellipse(18, -61, 13, 31, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#183c2e";
    ctx.beginPath();
    ctx.arc(-11, -24, 4, 0, Math.PI * 2);
    ctx.arc(11, -24, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMountainCat(ctx) {
    const bodyColor = this.hitFlashRemaining > 0 ? "#fff5d7" : this.color;
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, -12, 48, 31, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(32, -35, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(18, -53);
    ctx.lineTo(22, -78);
    ctx.lineTo(35, -56);
    ctx.moveTo(38, -56);
    ctx.lineTo(54, -73);
    ctx.lineTo(53, -47);
    ctx.fill();
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-43, -14);
    ctx.quadraticCurveTo(-78, -35, -61, -60);
    ctx.stroke();
    ctx.fillStyle = "#f0d783";
    ctx.beginPath();
    ctx.arc(39, -38, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHealthBar(ctx, player) {
    const width = 124;
    ctx.textAlign = "center";
    ctx.font = "600 18px system-ui, sans-serif";
    ctx.fillStyle = "#fff0ce";
    ctx.strokeStyle = "rgb(5 14 11 / 90%)";
    ctx.lineWidth = 5;
    const difference = this.level - player.level;
    const warning = difference >= 6 ? " ⚠ NGUY HIỂM" : difference >= 3 ? " ▲ MẠNH" : "";
    ctx.fillStyle = difference >= 6 ? "#ff937f" : difference >= 3 ? "#f0cf72" : "#fff0ce";
    const label = `${this.name} · Lv.${this.level}${warning}`;
    ctx.strokeText(label, 0, -116);
    ctx.fillText(label, 0, -116);
    ctx.fillStyle = "rgb(7 15 13 / 88%)";
    ctx.fillRect(-width / 2, -103, width, 13);
    ctx.fillStyle = "#b95443";
    ctx.fillRect(-width / 2 + 2, -101, (width - 4) * (this.hp / this.maxHp), 9);
  }

  drawAttackTelegraph(ctx) {
    const progress = 1 - this.attackWindupRemaining / this.attackWindup;
    ctx.strokeStyle = `rgb(212 91 65 / ${0.35 + progress * 0.55})`;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, this.attackRange + 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.fillStyle = `rgb(212 91 65 / ${0.08 + progress * 0.14})`;
    ctx.beginPath();
    ctx.arc(0, 0, this.attackRange + 12, 0, Math.PI * 2);
    ctx.fill();
  }
}
