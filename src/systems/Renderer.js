export class Renderer {
  constructor(canvas, width, height) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = "high";
  }

  render(world, player, npcs, enemies, camera, ui, interaction, combat, progression, attributes, skills, inventory, quests, activities, crafting, loot, companion, itemConfig, maps, exploration, audio, fps) {
    const ctx = this.context;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.translate(-Math.round(camera.renderX ?? camera.x), -Math.round(camera.renderY ?? camera.y));
    world.render(ctx);
    const visible = (object, margin = 180) => object.x >= camera.x - margin && object.x <= camera.x + this.width + margin && object.y >= camera.y - margin && object.y <= camera.y + this.height + margin;
    for (const groundLoot of loot.groundLoot) if (visible(groundLoot)) groundLoot.render(ctx);
    const actors = [...npcs, ...enemies, player].filter((actor) => visible(actor, 220)).sort((a, b) => a.y - b.y);
    for (const actor of actors) {
      if (actor.type === "enemy") actor.render(ctx, player);
      else actor.render(ctx);
    }
    companion.render(ctx, player, itemConfig);
    combat.renderWorld(ctx);
    progression.renderWorld(ctx);
    ctx.restore();

    this.drawAtmosphere(ctx);
    maps.debugCounts = { enemies: enemies.filter((enemy) => !enemy.defeated).length, loot: loot.groundLoot.length, effects: combat.effects.length + progression.effects.length };
    ui.render(ctx, player, interaction, combat, progression, attributes, skills, inventory, quests, activities, crafting, companion, maps, exploration, audio, fps);
  }

  drawAtmosphere(ctx) {
    const vignette = ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      this.height * 0.2,
      this.width / 2,
      this.height / 2,
      this.width * 0.7,
    );
    vignette.addColorStop(0, "rgb(255 248 215 / 0%)");
    vignette.addColorStop(0.72, "rgb(11 35 27 / 4%)");
    vignette.addColorStop(1, "rgb(4 12 10 / 36%)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}
