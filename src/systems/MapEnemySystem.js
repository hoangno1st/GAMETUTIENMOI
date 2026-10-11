import { Enemy } from "../entities/Enemy.js";

export class MapEnemySystem {
  constructor(config) { this.config = config; this.currentMapId = null; this.enemies = []; }
  loadMap(mapId, player) {
    this.unload(); this.currentMapId = mapId; const mapData = this.config.maps[mapId]; if (!mapData) return this.enemies;
    for (const zone of mapData.regions) {
      const archetype = this.config.archetypes[zone.enemyType]; if (!archetype) continue;
      const count = Math.min(zone.maxActive, zone.points.length, this.config.performanceCapPerMap - this.enemies.length);
      for (let index = 0; index < count; index += 1) {
        const point = zone.points[index]; if (Math.hypot(point.x - player.x, point.y - player.y) < this.config.minimumSpawnDistanceFromPlayer) continue;
        const levelProgress = count <= 1 ? 0 : index / (count - 1);
        const level = zone.minLevel + Math.round((zone.maxLevel - zone.minLevel) * levelProgress);
        const scale = this.config.scaling;
        this.enemies.push(new Enemy({ id: `${mapId}:${zone.id}:${index}`, enemyType: zone.enemyType, level, zoneId: zone.id, name: archetype.name, species: archetype.species, x: point.x, y: point.y, speed: archetype.baseSpeed + Math.min(scale.speedBonusCap, (level - 1) * scale.speedPerLevel), maxHp: Math.round(archetype.baseHp * (1 + (level - 1) * scale.hpPerLevel)), damage: Math.round(archetype.baseAttack * (1 + (level - 1) * scale.attackPerLevel)), defense: Math.round(archetype.baseDefense + (level - 1) * scale.defensePerLevel), attackRange: archetype.attackRange, attackCooldown: archetype.attackCooldown, attackWindup: archetype.attackWindup, expReward: Math.round(archetype.baseExp * (1 + (level - 1) * scale.expPerLevel)), lootTableId: archetype.lootTableId, respawnDelay: zone.respawnDelay, collisionRadius: archetype.collisionRadius, territory: { ...zone.bounds }, color: archetype.color, detectionRange: archetype.aggroRange, leashRange: archetype.leashRange }));
      }
    }
    return this.enemies;
  }
  unload() { this.enemies.length = 0; this.currentMapId = null; }
  get activeCount() { return this.enemies.filter((enemy) => !enemy.defeated).length; }
}
