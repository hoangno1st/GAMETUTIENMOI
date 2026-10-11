import { GroundLoot } from "../entities/GroundLoot.js";

export class LootSystem {
  constructor(config, inventorySystem) {
    this.config = config;
    this.inventorySystem = inventorySystem;
    this.groundLoot = [];
    this.nextId = 1;
    this.onPickup = null;
  }

  update(deltaTime, player, allowPickup = true) {
    for (const loot of this.groundLoot) loot.update(deltaTime);
    this.groundLoot = this.groundLoot.filter((loot) => !loot.expired);
    if (player.defeated || !allowPickup) return;
    const pickupRange = this.config.inventory.autoPickupRange;
    for (const loot of [...this.groundLoot]) {
      if (loot.pickupBlockedRemaining <= 0 && Math.hypot(player.x - loot.x, player.y - loot.y) <= pickupRange) {
        if (!this.pickup(player, loot)) loot.pickupBlockedRemaining = 1.2;
      }
    }
  }

  spawnDrops(enemy) {
    const table = this.config.dropTables[enemy.lootTableId] ?? [];
    for (const drop of table) {
      if (Math.random() > drop.chance) continue;
      const quantity = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
      this.spawn({
        itemId: drop.itemId,
        coins: drop.kind === "coins" ? quantity : 0,
        quantity: drop.kind === "coins" ? 0 : quantity,
        x: enemy.x + (Math.random() - 0.5) * 70,
        y: enemy.y + (Math.random() - 0.5) * 50,
      });
    }
  }

  spawn(data) {
    if (this.groundLoot.length >= this.config.inventory.maxGroundLoot) return false;
    this.groundLoot.push(new GroundLoot({
      id: `loot-${this.nextId++}`,
      ...data,
      lifetime: this.config.inventory.groundLifetime,
      itemConfig: this.config,
    }));
    return true;
  }

  pickup(player, loot) {
    let pickedUp = false;
    if (loot.coins > 0) {
      player.coins += loot.coins;
      this.inventorySystem.addMessage(`Nhặt ${loot.coins} linh tệ.`, "success");
      pickedUp = true;
    } else if (loot.itemId) {
      pickedUp = this.inventorySystem.addItem(player, loot.itemId, loot.quantity);
    }
    if (pickedUp) { this.groundLoot = this.groundLoot.filter((entry) => entry !== loot); this.onPickup?.(loot); }
    return pickedUp;
  }
}
