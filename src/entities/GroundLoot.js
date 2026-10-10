export class GroundLoot {
  constructor({ id, itemId, quantity, coins, x, y, lifetime, itemConfig }) {
    this.id = id;
    this.type = "loot";
    this.itemId = itemId ?? null;
    this.quantity = quantity ?? 0;
    this.coins = coins ?? 0;
    this.x = x;
    this.y = y;
    this.lifetime = lifetime;
    this.age = 0;
    this.expired = false;
    this.pickupBlockedRemaining = 0;
    const item = this.itemId ? itemConfig.items[this.itemId] : null;
    this.name = item?.name ?? `${this.coins} linh tệ`;
    this.rarity = item?.rarity ?? "common";
    this.interactionLabel = "Nhặt";
    this.itemConfig = itemConfig;
  }

  update(deltaTime) {
    this.age += deltaTime;
    this.pickupBlockedRemaining = Math.max(0, this.pickupBlockedRemaining - deltaTime);
    if (this.age >= this.lifetime) this.expired = true;
  }

  render(ctx) {
    const rarity = this.itemConfig.rarities[this.rarity] ?? this.itemConfig.rarities.common;
    const bob = Math.sin(this.age * 3.4 + this.x) * 5;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.globalAlpha = this.lifetime - this.age < 10 ? Math.max(0.25, (this.lifetime - this.age) / 10) : 1;
    ctx.fillStyle = "rgb(4 12 9 / 42%)";
    ctx.beginPath();
    ctx.ellipse(0, 13, 27, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = rarity.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = this.coins > 0 ? "#e0bd58" : rarity.color;
    if (this.coins > 0) {
      ctx.beginPath();
      ctx.arc(0, -3, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff0a2";
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-12, -12, 24, 24);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
