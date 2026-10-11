import { hash2D } from "../core/MathUtils.js";

export class WorldSystem {
  constructor(config, mapData = null) {
    this.config = config;
    this.mapData = mapData ? { ...mapData } : null;
    this.theme = config.theme ?? "sect";
    this.decorations = this.createDecorations();
    this.obstacles = (mapData?.obstacles ?? []).map((item) => ({ ...item }));
    this.trainingObjects = config.trainingObjects.map((item) => ({ ...item }));
    this.specialObjects = [
      { ...config.meditationArea },
      ...config.activityStations.map((item) => ({ ...item })),
      ...(mapData?.resources ?? []).map((item) => ({ ...item })),
      ...(mapData?.exits ?? []).map((item) => ({ ...item, type: "map-exit", name: item.label, interactionLabel: "Đi tới" })),
    ];
    this.specialObjects.push(...(mapData?.pointsOfInterest ?? []).map((item) => ({ ...item })));
    if (this.mapData) this.mapData.resources = this.specialObjects.filter((item) => item.type === "resource");
  }

  createDecorations() {
    const theme = this.theme;
    if (theme === "forest") return this.createForestDecorations();
    if (theme === "stones") return this.createStonesDecorations();
    if (theme === "mountain") return this.createMountainDecorations();
    if (theme === "valley") return this.createValleyDecorations();
    if (theme === "abyss") return this.createAbyssDecorations();
    return this.createSectDecorations();
  }

  createSectDecorations() {
    const decorations = [];
    for (let y = 120; y < this.config.height - 120; y += 150) {
      for (let x = 120; x < this.config.width - 120; x += 160) {
        const noise = hash2D(x, y);
        const centralCourtyard = x > 980 && x < 2620 && y > 500 && y < 1900;
        const area = this.config.trainingArea;
        const trainingArea = x > area.x - 100 && x < area.x + area.width + 80 && y > area.y - 90 && y < area.y + area.height + 90;
        if (!centralCourtyard && !trainingArea && noise > 0.42) {
          decorations.push({
            type: noise > 0.76 ? "pine" : noise > 0.61 ? "rock" : "grass",
            x: x + (hash2D(y, x) - 0.5) * 90,
            y: y + (noise - 0.5) * 70,
            scale: 0.75 + hash2D(x + 9, y + 3) * 0.55,
          });
        }
      }
    }
    return decorations.sort((a, b) => a.y - b.y);
  }

  createForestDecorations() {
    const decorations = [];
    const { width, height } = this.config;
    const pathY = 1200;
    for (let y = 180; y < height - 150; y += 95) {
      for (let x = 180; x < width - 150; x += 110) {
        const noise = hash2D(x, y);
        const nearPath = Math.abs(y - pathY) < 130;
        const onObstacle = this.isOnObstacle(x + (noise - 0.5) * 60, y + (noise - 0.5) * 40);
        if (onObstacle) continue;
        const dx = x + (hash2D(y, x) - 0.5) * 70;
        const dy = y + (noise - 0.5) * 50;
        if (nearPath) {
          if (noise > 0.78) decorations.push({ type: "herb-patch", x: dx, y: dy, scale: 0.7 + noise * 0.4 });
          else if (noise > 0.65) decorations.push({ type: "fern", x: dx, y: dy, scale: 0.6 + noise * 0.5 });
          else if (noise > 0.55) decorations.push({ type: "grass", x: dx, y: dy, scale: 0.8 + noise * 0.3 });
        } else {
          if (noise > 0.3) decorations.push({ type: noise > 0.72 ? "dense-tree" : noise > 0.52 ? "pine" : "bush", x: dx, y: dy, scale: 0.7 + hash2D(x + 7, y + 3) * 0.6 });
        }
      }
    }
    return decorations.sort((a, b) => a.y - b.y);
  }

  createStonesDecorations() {
    const decorations = [];
    const { width, height } = this.config;
    for (let y = 180; y < height - 150; y += 130) {
      for (let x = 180; x < width - 150; x += 140) {
        const noise = hash2D(x, y);
        if (this.isOnObstacle(x, y)) continue;
        const dx = x + (hash2D(y, x) - 0.5) * 80;
        const dy = y + (noise - 0.5) * 60;
        if (noise > 0.7) decorations.push({ type: "boulder", x: dx, y: dy, scale: 0.8 + noise * 0.5 });
        else if (noise > 0.55) decorations.push({ type: "ore-vein", x: dx, y: dy, scale: 0.6 + noise * 0.4 });
        else if (noise > 0.4) decorations.push({ type: "rock", x: dx, y: dy, scale: 0.7 + hash2D(x + 5, y + 1) * 0.5 });
        else if (noise > 0.28) decorations.push({ type: "dry-grass", x: dx, y: dy, scale: 0.5 + noise * 0.6 });
      }
    }
    return decorations.sort((a, b) => a.y - b.y);
  }

  createMountainDecorations() {
    const decorations = [];
    const { width, height } = this.config;
    for (let y = 200; y < height - 150; y += 120) {
      for (let x = 200; x < width - 150; x += 130) {
        const noise = hash2D(x, y);
        if (this.isOnObstacle(x, y)) continue;
        const dx = x + (hash2D(y, x) - 0.5) * 70;
        const dy = y + (noise - 0.5) * 50;
        if (noise > 0.72) decorations.push({ type: "dead-tree", x: dx, y: dy, scale: 0.7 + noise * 0.5 });
        else if (noise > 0.58) decorations.push({ type: "boulder", x: dx, y: dy, scale: 0.6 + noise * 0.4 });
        else if (noise > 0.42) decorations.push({ type: "rubble", x: dx, y: dy, scale: 0.5 + noise * 0.5 });
        else if (noise > 0.3) decorations.push({ type: "dry-grass", x: dx, y: dy, scale: 0.4 + noise * 0.5 });
      }
    }
    return decorations.sort((a, b) => a.y - b.y);
  }

  createValleyDecorations() {
    const decorations = [];
    const { width, height } = this.config;
    for (let y = 180; y < height - 150; y += 110) {
      for (let x = 180; x < width - 150; x += 120) {
        const noise = hash2D(x, y);
        if (this.isOnObstacle(x, y)) continue;
        const dx = x + (hash2D(y, x) - 0.5) * 70;
        const dy = y + (noise - 0.5) * 50;
        if (noise > 0.74) decorations.push({ type: "twisted-tree", x: dx, y: dy, scale: 0.7 + noise * 0.5 });
        else if (noise > 0.6) decorations.push({ type: "glowing-mushroom", x: dx, y: dy, scale: 0.5 + noise * 0.4 });
        else if (noise > 0.45) decorations.push({ type: "mist-fern", x: dx, y: dy, scale: 0.6 + noise * 0.4 });
        else if (noise > 0.32) decorations.push({ type: "ruin-stone", x: dx, y: dy, scale: 0.5 + noise * 0.4 });
      }
    }
    return decorations.sort((a, b) => a.y - b.y);
  }

  createAbyssDecorations() {
    const decorations = [];
    const { width, height } = this.config;
    for (let y = 180; y < height - 150; y += 115) {
      for (let x = 180; x < width - 150; x += 125) {
        const noise = hash2D(x, y);
        if (this.isOnObstacle(x, y)) continue;
        const dx = x + (hash2D(y, x) - 0.5) * 70;
        const dy = y + (noise - 0.5) * 50;
        if (noise > 0.74) decorations.push({ type: "charred-spire", x: dx, y: dy, scale: 0.7 + noise * 0.5 });
        else if (noise > 0.6) decorations.push({ type: "ember-vent", x: dx, y: dy, scale: 0.5 + noise * 0.4 });
        else if (noise > 0.45) decorations.push({ type: "volcanic-rock", x: dx, y: dy, scale: 0.6 + noise * 0.4 });
        else if (noise > 0.32) decorations.push({ type: "ash-patch", x: dx, y: dy, scale: 0.5 + noise * 0.5 });
      }
    }
    return decorations.sort((a, b) => a.y - b.y);
  }

  drawAbyssGround(ctx) {
    const { width, height } = this.config;
    ctx.strokeStyle = "#5a2a14"; ctx.lineWidth = 130; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(120, 1200); ctx.bezierCurveTo(900, 1000, 2600, 1400, width - 120, 1200); ctx.stroke();
    ctx.strokeStyle = "rgb(220 120 40 / 12%)"; ctx.lineWidth = 4; ctx.setLineDash([18, 22]); ctx.stroke(); ctx.setLineDash([]);

    for (let y = 400; y < height - 200; y += 450) {
      ctx.fillStyle = `rgb(200 80 20 / ${4 + hash2D(y, 55) * 4}%)`;
      ctx.fillRect(0, y, width, 140);
    }

    ctx.fillStyle = "rgb(220 100 30 / 10%)";
    for (let x = 500; x < width - 300; x += 400) {
      const n = hash2D(x, 777);
      ctx.beginPath(); ctx.ellipse(x + n * 80, 600 + n * 800, 180, 130, n, 0, Math.PI * 2); ctx.fill();
    }
  }

  isOnObstacle(x, y) {
    for (const o of this.mapData?.obstacles ?? []) {
      if (x > o.x - 40 && x < o.x + o.width + 40 && y > o.y - 40 && y < o.y + o.height + 40) return true;
    }
    return false;
  }

  render(ctx) {
    const { width, height } = this.config;
    this.drawGround(ctx, width, height);
    this.drawGroundTexture(ctx);
    this.drawMountainBackdrop(ctx);

    if (this.theme === "sect") {
      this.drawPaths(ctx);
      this.drawCourtyard(ctx);
      this.drawTrainingArea(ctx);
      this.drawBuildings(ctx);
      this.drawPond(ctx);
      this.drawActivityStations(ctx);
    } else if (this.theme === "forest") {
      this.drawForestGround(ctx);
    } else if (this.theme === "stones") {
      this.drawStonesGround(ctx);
    } else if (this.theme === "mountain") {
      this.drawMountainGround(ctx);
    } else if (this.theme === "valley") {
      this.drawValleyGround(ctx);
    } else if (this.theme === "abyss") {
      this.drawAbyssGround(ctx);
    }

    this.drawObstacles(ctx);
    this.drawJourneyPathForNonSect(ctx);

    for (const decoration of this.decorations) {
      this.drawDecoration(ctx, decoration);
    }

    this.drawResources(ctx);
    this.drawExits(ctx);
    this.drawPois(ctx);
    this.drawBoundary(ctx);
  }

  drawGround(ctx, width, height) {
    const colors = this.config.colors ?? {};
    const base = colors.ground ?? "#789076";
    if (this.theme === "abyss") {
      const grad = ctx.createRadialGradient(width / 2, height / 2, 200, width / 2, height / 2, width * 0.7);
      grad.addColorStop(0, "#4a2010");
      grad.addColorStop(0.5, base);
      grad.addColorStop(1, "#1a0c08");
      ctx.fillStyle = grad;
    } else if (this.theme === "valley") {
      const grad = ctx.createRadialGradient(width / 2, height / 2, 200, width / 2, height / 2, width * 0.7);
      grad.addColorStop(0, "#3a4650");
      grad.addColorStop(0.6, base);
      grad.addColorStop(1, "#1e272c");
      ctx.fillStyle = grad;
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, base);
      grad.addColorStop(0.5, base);
      grad.addColorStop(1, "#334f43");
      ctx.fillStyle = grad;
    }
    ctx.fillRect(0, 0, width, height);
  }

  drawGroundTexture(ctx) {
    const theme = this.theme;
    if (theme === "forest") {
      ctx.fillStyle = "rgb(120 170 100 / 8%)";
      for (let y = 0; y < this.config.height; y += 48) {
        for (let x = 0; x < this.config.width; x += 48) {
          if (hash2D(x + 1, y + 1) > 0.5) ctx.fillRect(x + 5, y + 12, 28, 6);
        }
      }
    } else if (theme === "stones") {
      ctx.fillStyle = "rgb(180 170 130 / 7%)";
      for (let y = 0; y < this.config.height; y += 72) {
        for (let x = 0; x < this.config.width; x += 72) {
          if (hash2D(x, y) > 0.45) { ctx.fillRect(x + 4, y + 10, 42, 5); ctx.fillRect(x + 20, y + 30, 30, 4); }
        }
      }
    } else if (theme === "mountain") {
      ctx.fillStyle = "rgb(140 140 120 / 6%)";
      for (let y = 0; y < this.config.height; y += 64) {
        for (let x = 0; x < this.config.width; x += 64) {
          if (hash2D(x, y) > 0.5) ctx.fillRect(x + 8, y + 15, 36, 4);
        }
      }
    } else if (theme === "abyss") {
      ctx.fillStyle = "rgb(200 100 40 / 6%)";
      for (let y = 0; y < this.config.height; y += 52) {
        for (let x = 0; x < this.config.width; x += 52) {
          if (hash2D(x + 7, y + 7) > 0.5) ctx.fillRect(x + 4, y + 8, 32, 5);
        }
      }
    } else if (theme === "valley") {
      ctx.fillStyle = "rgb(130 110 170 / 6%)";
      for (let y = 0; y < this.config.height; y += 56) {
        for (let x = 0; x < this.config.width; x += 56) {
          if (hash2D(x + 3, y + 3) > 0.52) ctx.fillRect(x + 6, y + 10, 30, 5);
        }
      }
    } else {
      ctx.fillStyle = "rgb(219 226 180 / 9%)";
      for (let y = 0; y < this.config.height; y += 64) {
        for (let x = 0; x < this.config.width; x += 64) {
          if (hash2D(x, y) > 0.55) ctx.fillRect(x + 7, y + 18, 34, 4);
        }
      }
    }
  }

  drawMountainBackdrop(ctx) {
    const { width } = this.config;
    const theme = this.theme;
    if (theme === "abyss") {
      ctx.fillStyle = "#1a0a06";
      ctx.beginPath(); ctx.moveTo(0, 350);
      for (let x = 0; x <= width; x += 200) { ctx.lineTo(x + 100, 120 + hash2D(x, 88) * 140); ctx.lineTo(x + 200, 330 + hash2D(x + 50, 88) * 30); }
      ctx.lineTo(width, 0); ctx.lineTo(0, 0); ctx.fill();
      ctx.fillStyle = "rgb(200 80 20 / 10%)"; ctx.fillRect(0, 280, width, 100);
    } else if (theme === "valley") {
      ctx.fillStyle = "#252e35";
      ctx.beginPath(); ctx.moveTo(0, 350);
      for (let x = 0; x <= width; x += 200) { ctx.lineTo(x + 100, 100 + hash2D(x, 77) * 160); ctx.lineTo(x + 200, 320 + hash2D(x + 50, 77) * 40); }
      ctx.lineTo(width, 0); ctx.lineTo(0, 0); ctx.fill();
      ctx.fillStyle = "rgb(100 80 140 / 12%)"; ctx.fillRect(0, 280, width, 100);
    } else if (theme === "mountain") {
      ctx.fillStyle = "#3a423f";
      ctx.beginPath(); ctx.moveTo(0, 380);
      for (let x = 0; x <= width; x += 250) { ctx.lineTo(x + 125, 60 + hash2D(x, 9) * 200); ctx.lineTo(x + 250, 350); }
      ctx.lineTo(width, 0); ctx.lineTo(0, 0); ctx.fill();
      ctx.fillStyle = "#4a524e";
      ctx.beginPath(); ctx.moveTo(0, 440);
      for (let x = 0; x <= width; x += 350) { ctx.lineTo(x + 175, 250 + hash2D(x + 11, 3) * 120); ctx.lineTo(x + 350, 420); }
      ctx.lineTo(width, 0); ctx.lineTo(0, 0); ctx.fill();
      ctx.fillStyle = "rgb(200 190 160 / 18%)"; ctx.fillRect(0, 360, width, 100);
    } else if (theme === "stones") {
      ctx.fillStyle = "#4e5248";
      ctx.beginPath(); ctx.moveTo(0, 400);
      for (let x = 0; x <= width; x += 300) { ctx.lineTo(x + 150, 120 + hash2D(x, 5) * 170); ctx.lineTo(x + 300, 380); }
      ctx.lineTo(width, 0); ctx.lineTo(0, 0); ctx.fill();
      ctx.fillStyle = "rgb(210 200 160 / 22%)"; ctx.fillRect(0, 330, width, 110);
    } else {
      ctx.fillStyle = "#31574e";
      ctx.beginPath(); ctx.moveTo(0, 410);
      for (let x = 0; x <= width; x += 300) { ctx.lineTo(x + 150, 90 + hash2D(x, 5) * 180); ctx.lineTo(x + 300, 390); }
      ctx.lineTo(width, 0); ctx.lineTo(0, 0); ctx.fill();
      ctx.fillStyle = "rgb(220 236 216 / 34%)"; ctx.fillRect(0, 330, width, 120);
    }
  }

  drawForestGround(ctx) {
    const { width } = this.config;
    ctx.strokeStyle = "#6b8e5e"; ctx.lineWidth = 160; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(120, 1200); ctx.bezierCurveTo(900, 1050, 2700, 1350, width - 120, 1200); ctx.stroke();
    ctx.strokeStyle = "rgb(200 220 160 / 18%)"; ctx.lineWidth = 6; ctx.setLineDash([20, 24]); ctx.stroke(); ctx.setLineDash([]);

    for (let x = 300; x < width - 200; x += 420) {
      const y = 1200 + Math.sin(x * 0.003) * 100;
      ctx.fillStyle = "rgb(80 120 60 / 25%)";
      ctx.beginPath(); ctx.ellipse(x, y - 160, 180, 120, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 200, y + 180, 160, 100, 0, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = "rgb(100 160 80 / 12%)";
    ctx.beginPath(); ctx.ellipse(1780, 720, 250, 140, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2940, 760, 200, 120, -0.1, 0, Math.PI * 2); ctx.fill();
  }

  drawStonesGround(ctx) {
    const { width, height } = this.config;
    ctx.strokeStyle = "#8a8470"; ctx.lineWidth = 140; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(120, 1200); ctx.bezierCurveTo(1000, 1000, 2600, 1400, width - 120, 1200); ctx.stroke();
    ctx.strokeStyle = "rgb(200 190 140 / 15%)"; ctx.lineWidth = 5; ctx.setLineDash([16, 20]); ctx.stroke(); ctx.setLineDash([]);

    for (let x = 400; x < width - 300; x += 500) {
      const n = hash2D(x, 1234);
      ctx.fillStyle = "rgb(110 105 90 / 30%)";
      ctx.beginPath();
      ctx.moveTo(x, 350 + n * 80);
      ctx.lineTo(x + 80, 480 + n * 60);
      ctx.lineTo(x + 40, 600 + n * 40);
      ctx.lineTo(x - 30, 520 + n * 50);
      ctx.closePath(); ctx.fill();
    }

    ctx.strokeStyle = "rgb(200 185 140 / 20%)"; ctx.lineWidth = 12;
    for (let x = 600; x < width - 400; x += 550) {
      ctx.beginPath(); ctx.moveTo(x, 380); ctx.lineTo(x + 60, 550); ctx.lineTo(x - 20, 680); ctx.stroke();
    }

    ctx.fillStyle = "rgb(160 150 120 / 15%)";
    ctx.beginPath(); ctx.ellipse(1870, 650, 200, 100, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3010, 1740, 180, 90, 0, 0, Math.PI * 2); ctx.fill();
  }

  drawMountainGround(ctx) {
    const { width, height } = this.config;
    ctx.strokeStyle = "#5e6360"; ctx.lineWidth = 120; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(120, 1200);
    ctx.bezierCurveTo(600, 900, 1200, 1400, 1800, 1100);
    ctx.bezierCurveTo(2400, 800, 3000, 1300, width - 120, 1200);
    ctx.stroke();
    ctx.strokeStyle = "rgb(180 170 140 / 14%)"; ctx.lineWidth = 4; ctx.setLineDash([14, 18]); ctx.stroke(); ctx.setLineDash([]);

    ctx.fillStyle = "#4a4d4b"; ctx.fillRect(1420, 240, 80, 360);
    ctx.fillStyle = "#5a5d5a"; ctx.fillRect(1380, 225, 200, 40);
    ctx.fillStyle = "#4a4d4b"; ctx.fillRect(2020, 1780, 100, 380);
    ctx.fillStyle = "#5a5d5a"; ctx.fillRect(1980, 1760, 180, 40);

    ctx.fillStyle = "rgb(90 85 75 / 25%)";
    ctx.beginPath(); ctx.ellipse(1920, 720, 150, 80, 0, 0, Math.PI * 2); ctx.fill();
  }

  drawValleyGround(ctx) {
    const { width, height } = this.config;
    ctx.strokeStyle = "#404850"; ctx.lineWidth = 130; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(120, 1200); ctx.bezierCurveTo(900, 1000, 2600, 1400, width - 120, 1200); ctx.stroke();
    ctx.strokeStyle = "rgb(140 120 180 / 12%)"; ctx.lineWidth = 4; ctx.setLineDash([18, 22]); ctx.stroke(); ctx.setLineDash([]);

    for (let y = 300; y < height - 200; y += 380) {
      ctx.fillStyle = `rgb(120 100 160 / ${5 + hash2D(y, 42) * 4}%)`;
      ctx.fillRect(0, y, width, 120);
    }

    ctx.fillStyle = "rgb(100 80 140 / 8%)";
    for (let x = 400; x < width - 300; x += 350) {
      const n = hash2D(x, 999);
      ctx.beginPath(); ctx.ellipse(x + n * 100, 500 + n * 900, 200, 150, n, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawJourneyPathForNonSect(ctx) {
    if (this.theme === "sect") return;
    for (const exit of this.mapData?.exits ?? []) {
      const ex = exit.x; const ey = exit.y;
      ctx.save(); ctx.translate(ex, ey - 100);
      ctx.fillStyle = "rgb(225 210 150 / 60%)";
      ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(15, 20); ctx.lineTo(-15, 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#f0e2b7"; ctx.font = "600 14px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("▼", 0, -35);
      ctx.restore();
    }
  }

  drawDecoration(ctx, item) {
    switch (item.type) {
      case "pine": this.drawPine(ctx, item); break;
      case "rock": this.drawRock(ctx, item); break;
      case "grass": this.drawGrass(ctx, item); break;
      case "dense-tree": this.drawDenseTree(ctx, item); break;
      case "bush": this.drawBush(ctx, item); break;
      case "herb-patch": this.drawHerbPatch(ctx, item); break;
      case "fern": this.drawFern(ctx, item); break;
      case "boulder": this.drawBoulder(ctx, item); break;
      case "ore-vein": this.drawOreVein(ctx, item); break;
      case "dry-grass": this.drawDryGrass(ctx, item); break;
      case "dead-tree": this.drawDeadTree(ctx, item); break;
      case "rubble": this.drawRubble(ctx, item); break;
      case "twisted-tree": this.drawTwistedTree(ctx, item); break;
      case "glowing-mushroom": this.drawGlowingMushroom(ctx, item); break;
      case "mist-fern": this.drawMistFern(ctx, item); break;
      case "ruin-stone": this.drawRuinStone(ctx, item); break;
      case "charred-spire": this.drawCharredSpire(ctx, item); break;
      case "ember-vent": this.drawEmberVent(ctx, item); break;
      case "volcanic-rock": this.drawVolcanicRock(ctx, item); break;
      case "ash-patch": this.drawAshPatch(ctx, item); break;
      default: break;
    }
  }

  drawResources(ctx) {
    for (const resource of this.specialObjects.filter((item) => item.type === "resource" && !item.defeated)) {
      ctx.save(); ctx.translate(resource.x, resource.y);
      const color = resource.materialId === "mistleaf-herb" ? "#8fca78" : resource.materialId === "beast-core" ? "#bd806b" : resource.materialId === "lava-crystal" ? "#d47030" : resource.materialId === "dragon-scale-shard" ? "#c44828" : "#82b5c5";
      ctx.fillStyle = "rgb(6 17 14 / 25%)";
      ctx.beginPath(); ctx.ellipse(0, 16, 32, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#e7d78e"; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = "#fff0bd"; ctx.font = "600 16px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText(`✦ ${resource.name}`, 0, -42);
      ctx.restore();
    }
  }

  drawExits(ctx) {
    for (const exit of this.mapData?.exits ?? []) {
      ctx.save(); ctx.translate(exit.x, exit.y);
      const accent = this.config.colors?.accent ?? "#e4ca73";

      ctx.fillStyle = "rgb(7 20 16 / 88%)";
      ctx.beginPath(); ctx.roundRect(-118, -78, 236, 156, 20); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 8; ctx.stroke();

      ctx.fillStyle = "#ffe39a"; ctx.font = "700 25px Georgia, serif"; ctx.textAlign = "center";
      ctx.fillText("⇄ LỐI ĐI", 0, -18);
      ctx.font = "600 15px Georgia, serif"; ctx.fillText(exit.label, 0, 20);
      ctx.fillStyle = "#b9d8c5"; ctx.font = "14px system-ui, sans-serif"; ctx.fillText("E · Xem điểm đến", 0, 50);
      ctx.restore();
    }
  }

  drawPois(ctx) {
    for (const point of this.specialObjects.filter((item) => item.type === "poi")) {
      ctx.save(); ctx.translate(point.x, point.y);
      ctx.fillStyle = "rgb(6 17 14 / 25%)";
      ctx.beginPath(); ctx.ellipse(0, 16, 28, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = point.discovered ? "#7ba58e" : "#d0b865";
      ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#10251d"; ctx.font = "700 20px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText(point.icon ?? "◇", 0, 7);
      ctx.fillStyle = "#f3e8ba"; ctx.strokeStyle = "rgb(5 14 11 / 90%)"; ctx.lineWidth = 4; ctx.font = "600 17px Georgia, serif";
      ctx.strokeText(point.name, 0, -38); ctx.fillText(point.name, 0, -38);
      ctx.restore();
    }
  }

  drawObstacles(ctx) {
    for (const item of this.obstacles) {
      const theme = this.theme;
      if (item.kind === "pond" || item.kind === "marsh") {
        ctx.fillStyle = item.kind === "marsh" ? "#3a5858" : "#4c7472";
        ctx.beginPath(); ctx.roundRect(item.x, item.y, item.width, item.height, 36); ctx.fill();
        if (item.kind === "marsh") {
          ctx.fillStyle = "rgb(80 120 100 / 30%)";
          for (let dx = 20; dx < item.width - 20; dx += 60) {
            ctx.beginPath(); ctx.ellipse(item.x + dx, item.y + item.height / 2 + hash2D(dx, item.y) * 40, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.strokeStyle = "rgb(225 214 170 / 25%)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(item.x, item.y, item.width, item.height, 36); ctx.stroke();
      } else if (item.kind === "trees") {
        ctx.fillStyle = "#1e4030"; ctx.beginPath(); ctx.roundRect(item.x, item.y, item.width, item.height, 40); ctx.fill();
        ctx.fillStyle = "#2a5240";
        for (let dx = 30; dx < item.width - 30; dx += 55) {
          for (let dy = 30; dy < item.height - 30; dy += 55) {
            ctx.beginPath(); ctx.arc(item.x + dx + hash2D(dx, dy) * 20, item.y + dy + hash2D(dy, dx) * 15, 22, 0, Math.PI * 2); ctx.fill();
          }
        }
      } else if (item.kind === "cliff") {
        ctx.fillStyle = "#5a5e55";
        ctx.beginPath(); ctx.roundRect(item.x, item.y, item.width, item.height, 20); ctx.fill();
        ctx.fillStyle = "#6e7268";
        ctx.fillRect(item.x + 10, item.y + 10, item.width - 20, 30);
        ctx.strokeStyle = "rgb(200 190 150 / 20%)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(item.x, item.y, item.width, item.height, 20); ctx.stroke();
      } else if (item.kind === "chasm") {
        ctx.fillStyle = "#1a1e1f"; ctx.beginPath(); ctx.roundRect(item.x, item.y, item.width, item.height, 30); ctx.fill();
        ctx.strokeStyle = "rgb(100 95 80 / 40%)"; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(item.x + 8, item.y + 8, item.width - 16, item.height - 16, 24); ctx.stroke();
      } else if (item.kind === "ruin") {
        ctx.fillStyle = "#3d3f3a"; ctx.beginPath(); ctx.roundRect(item.x, item.y, item.width, item.height, 18); ctx.fill();
        ctx.fillStyle = "#4e504a";
        for (let dx = 20; dx < item.width - 30; dx += 70) {
          ctx.fillRect(item.x + dx, item.y + 15, 25, item.height * 0.6);
        }
        ctx.strokeStyle = "rgb(180 170 130 / 20%)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(item.x, item.y, item.width, item.height, 18); ctx.stroke();
      } else if (item.kind === "lava") {
        ctx.fillStyle = "#8a3010"; ctx.beginPath(); ctx.roundRect(item.x, item.y, item.width, item.height, 36); ctx.fill();
        ctx.fillStyle = "#c45820";
        for (let dx = 30; dx < item.width - 30; dx += 70) {
          ctx.beginPath(); ctx.ellipse(item.x + dx, item.y + item.height / 2 + hash2D(dx, item.y) * 40, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = "rgb(255 160 40 / 20%)"; ctx.beginPath(); ctx.roundRect(item.x + 10, item.y + 10, item.width - 20, item.height - 20, 28); ctx.fill();
        ctx.strokeStyle = "rgb(220 100 30 / 40%)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(item.x, item.y, item.width, item.height, 36); ctx.stroke();
      } else if (item.kind === "volcanic-ridge") {
        ctx.fillStyle = "#3a2015"; ctx.beginPath(); ctx.roundRect(item.x, item.y, item.width, item.height, 20); ctx.fill();
        ctx.fillStyle = "#4a2a1c";
        for (let dx = 25; dx < item.width - 30; dx += 65) {
          ctx.fillRect(item.x + dx, item.y + 12, 20, item.height * 0.65);
        }
        ctx.strokeStyle = "rgb(200 100 40 / 25%)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(item.x, item.y, item.width, item.height, 20); ctx.stroke();
      } else {
        ctx.fillStyle = "#5f625b"; ctx.beginPath(); ctx.roundRect(item.x, item.y, item.width, item.height, 36); ctx.fill();
        ctx.strokeStyle = "rgb(225 214 170 / 25%)"; ctx.lineWidth = 6; ctx.stroke();
      }
    }
  }

  drawActivityStations(ctx) {
    for (const station of this.config.activityStations) {
      ctx.save(); ctx.translate(station.x, station.y);
      ctx.fillStyle = "rgb(6 17 14 / 30%)"; ctx.beginPath(); ctx.ellipse(0, 18, 48, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = station.type === "alchemy" ? "#557d68" : station.type === "forge" ? "#845849" : "#c9b47a";
      ctx.beginPath(); ctx.roundRect(-36, -40, 72, 62, 12); ctx.fill();
      ctx.strokeStyle = "#e4ca73"; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = "#f3d873"; ctx.font = "700 28px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText("◆", 0, -76);
      ctx.fillStyle = "#fff0bd"; ctx.strokeStyle = "rgb(5 14 11 / 90%)"; ctx.lineWidth = 5; ctx.font = "700 19px Georgia, serif";
      ctx.strokeText(station.name, 0, -54); ctx.fillText(station.name, 0, -54);
      ctx.restore();
    }
  }

  // --- Sect-specific ---
  drawPaths(ctx) {
    ctx.strokeStyle = "#b6aa83"; ctx.lineWidth = 210; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(1800, 410); ctx.lineTo(1800, 2290);
    ctx.moveTo(620, 1230); ctx.lineTo(3260, 1230);
    ctx.moveTo(3060, 1230); ctx.lineTo(3060, 2050); ctx.stroke();
    ctx.strokeStyle = "rgb(240 226 182 / 22%)"; ctx.lineWidth = 8; ctx.setLineDash([28, 34]); ctx.stroke(); ctx.setLineDash([]);
  }

  drawCourtyard(ctx) {
    ctx.fillStyle = "#aaa184"; ctx.fillRect(1250, 710, 1100, 1040);
    ctx.strokeStyle = "rgb(77 72 59 / 20%)"; ctx.lineWidth = 3;
    for (let x = 1250; x <= 2350; x += 92) { ctx.beginPath(); ctx.moveTo(x, 710); ctx.lineTo(x, 1750); ctx.stroke(); }
    for (let y = 710; y <= 1750; y += 72) { ctx.beginPath(); ctx.moveTo(1250, y); ctx.lineTo(2350, y); ctx.stroke(); }
    ctx.fillStyle = "#688276"; ctx.beginPath(); ctx.arc(1800, 1230, 190, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#d8c88d"; ctx.lineWidth = 18; ctx.stroke();
    ctx.fillStyle = "#d7d1b0"; ctx.beginPath(); ctx.arc(1800, 1230, 25, 0, Math.PI * 2); ctx.fill();
    this.drawMeditationDais(ctx);
  }

  drawMeditationDais(ctx) {
    const area = this.config.meditationArea;
    ctx.save(); ctx.translate(area.x, area.y);
    ctx.strokeStyle = "rgb(202 221 166 / 72%)"; ctx.lineWidth = 7;
    for (let ring = 0; ring < 3; ring += 1) { ctx.beginPath(); ctx.arc(0, 0, 52 + ring * 34, ring * 0.7, Math.PI * 1.45 + ring * 0.7); ctx.stroke(); }
    ctx.fillStyle = "#e8dfad"; ctx.font = "600 18px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText("TỤ LINH ĐÀI", 0, 8);
    ctx.restore();
  }

  drawBuildings(ctx) {
    this.drawHall(ctx, 1490, 465, 620, 260);
    this.drawHall(ctx, 760, 930, 390, 260);
    this.drawHall(ctx, 2450, 930, 390, 260);
    this.drawGate(ctx, 1800, 1940);
    this.drawPavilion(ctx, 2850, 620);
  }

  drawTrainingArea(ctx) {
    const area = this.config.trainingArea;
    ctx.fillStyle = "#7c866d"; ctx.beginPath(); ctx.roundRect(area.x, area.y, area.width, area.height, 70); ctx.fill();
    ctx.strokeStyle = "rgb(226 216 174 / 65%)"; ctx.lineWidth = 12; ctx.setLineDash([24, 18]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgb(22 57 45 / 75%)"; ctx.beginPath(); ctx.roundRect(area.x + 208, area.y + 18, 304, 46, 14); ctx.fill();
    ctx.fillStyle = "#efe2ba"; ctx.font = "600 22px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText("BÃI LUYỆN CĂN BẢN", area.x + area.width / 2, area.y + 49);
    for (const t of this.trainingObjects) this.drawTrainingDummy(ctx, t.x, t.y);
  }

  drawTrainingDummy(ctx, x, y) {
    ctx.fillStyle = "rgb(7 18 14 / 22%)"; ctx.beginPath(); ctx.ellipse(x, y + 18, 48, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6d4b2f"; ctx.fillRect(x - 10, y - 88, 20, 112); ctx.fillRect(x - 50, y - 57, 100, 17);
    ctx.fillStyle = "#9a7550"; ctx.beginPath(); ctx.arc(x, y - 102, 25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c9ae73"; ctx.fillRect(x - 19, y - 27, 38, 8);
  }

  drawPavilion(ctx, x, y) {
    ctx.fillStyle = "#8e3f32"; ctx.fillRect(x - 105, y + 55, 18, 130); ctx.fillRect(x + 87, y + 55, 18, 130);
    ctx.fillStyle = "#2b493e"; ctx.beginPath(); ctx.moveTo(x - 145, y + 65); ctx.quadraticCurveTo(x, y - 25, x + 145, y + 65); ctx.quadraticCurveTo(x, y + 35, x - 145, y + 65); ctx.fill();
    ctx.fillStyle = "#d6c88f"; ctx.fillRect(x - 118, y + 174, 236, 16);
  }

  drawHall(ctx, x, y, width, height) {
    ctx.fillStyle = "#e6dcc0"; ctx.fillRect(x, y + 75, width, height - 75);
    ctx.fillStyle = "#8e3f32"; for (let p = x + 38; p < x + width; p += 76) ctx.fillRect(p, y + 76, 18, height - 65);
    ctx.fillStyle = "#243d36"; ctx.beginPath(); ctx.moveTo(x - 55, y + 82); ctx.quadraticCurveTo(x + width / 2, y - 55, x + width + 55, y + 82); ctx.quadraticCurveTo(x + width / 2, y + 40, x - 55, y + 82); ctx.fill();
    ctx.fillStyle = "#d1b15f"; ctx.fillRect(x + width / 2 - 58, y + 30, 116, 34);
  }

  drawGate(ctx, x, y) {
    ctx.fillStyle = "#8e3f32"; ctx.fillRect(x - 132, y - 120, 28, 215); ctx.fillRect(x + 104, y - 120, 28, 215);
    ctx.fillStyle = "#243d36"; ctx.fillRect(x - 185, y - 145, 370, 40);
    ctx.fillStyle = "#d1b15f"; ctx.fillRect(x - 76, y - 112, 152, 48);
    ctx.fillStyle = "#3c3324"; ctx.font = "bold 24px Georgia"; ctx.textAlign = "center"; ctx.fillText("VIỆN SƠ TU", x, y - 79);
  }

  drawPond(ctx) {
    ctx.fillStyle = "#527f7a"; ctx.beginPath(); ctx.ellipse(530, 1760, 300, 190, -0.12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#9ea77e"; ctx.lineWidth = 28; ctx.stroke();
    ctx.fillStyle = "#9bbd8b";
    for (let i = 0; i < 8; i += 1) { const a = i * 2.2; ctx.beginPath(); ctx.arc(530 + Math.cos(a) * 190, 1760 + Math.sin(a) * 100, 22, 0, Math.PI * 1.7); ctx.lineTo(530 + Math.cos(a) * 190, 1760 + Math.sin(a) * 100); ctx.fill(); }
  }

  // --- Decoration drawing ---
  drawPine(ctx, item) {
    const { x, y, scale } = item;
    ctx.fillStyle = "#503d2c"; ctx.fillRect(x - 8 * scale, y - 30 * scale, 16 * scale, 62 * scale);
    ctx.fillStyle = this.theme === "forest" ? "#1c5038" : "#244f42";
    for (let l = 0; l < 3; l += 1) {
      const o = l * 34 * scale;
      ctx.beginPath(); ctx.moveTo(x, y - 155 * scale + o); ctx.lineTo(x - (62 - l * 9) * scale, y - 35 * scale + o); ctx.lineTo(x + (62 - l * 9) * scale, y - 35 * scale + o); ctx.fill();
    }
  }

  drawRock(ctx, item) {
    ctx.fillStyle = this.theme === "stones" ? "#6e7468" : this.theme === "mountain" ? "#5c615a" : "#68766c";
    ctx.beginPath(); ctx.ellipse(item.x, item.y, 34 * item.scale, 23 * item.scale, -0.25, 0, Math.PI * 2); ctx.fill();
  }

  drawGrass(ctx, item) {
    ctx.strokeStyle = this.theme === "forest" ? "#2a6840" : "#315f48"; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(item.x, item.y); ctx.lineTo(item.x - 11, item.y - 25 * item.scale);
    ctx.moveTo(item.x, item.y); ctx.lineTo(item.x + 4, item.y - 30 * item.scale);
    ctx.moveTo(item.x, item.y); ctx.lineTo(item.x + 14, item.y - 20 * item.scale);
    ctx.stroke();
  }

  drawDenseTree(ctx, item) {
    const { x, y, scale } = item;
    ctx.fillStyle = "#3a2a1c"; ctx.fillRect(x - 10 * scale, y - 20 * scale, 20 * scale, 55 * scale);
    ctx.fillStyle = "#1a4a30";
    ctx.beginPath(); ctx.arc(x, y - 55 * scale, 48 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#235a3c";
    ctx.beginPath(); ctx.arc(x - 20 * scale, y - 40 * scale, 32 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 22 * scale, y - 42 * scale, 30 * scale, 0, Math.PI * 2); ctx.fill();
  }

  drawBush(ctx, item) {
    const { x, y, scale } = item;
    ctx.fillStyle = "#2a5a38";
    ctx.beginPath(); ctx.ellipse(x, y - 8 * scale, 28 * scale, 20 * scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#347a48";
    ctx.beginPath(); ctx.arc(x - 10 * scale, y - 12 * scale, 14 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 12 * scale, y - 10 * scale, 12 * scale, 0, Math.PI * 2); ctx.fill();
  }

  drawHerbPatch(ctx, item) {
    const { x, y, scale } = item;
    ctx.fillStyle = "#3a7a45";
    for (let i = 0; i < 5; i += 1) {
      const angle = i * 1.26;
      const r = 14 * scale;
      ctx.beginPath(); ctx.ellipse(x + Math.cos(angle) * r, y + Math.sin(angle) * r * 0.5, 8 * scale, 5 * scale, angle, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#90c468";
    ctx.beginPath(); ctx.arc(x, y - 4 * scale, 4 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 8 * scale, y + 2 * scale, 3 * scale, 0, Math.PI * 2); ctx.fill();
  }

  drawFern(ctx, item) {
    const { x, y, scale } = item;
    ctx.strokeStyle = "#357a4a"; ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + i * 12 * scale, y - 20 * scale, x + i * 18 * scale, y - 35 * scale); ctx.stroke();
    }
  }

  drawBoulder(ctx, item) {
    const { x, y, scale } = item;
    ctx.fillStyle = "rgb(6 17 14 / 18%)"; ctx.beginPath(); ctx.ellipse(x, y + 10 * scale, 36 * scale, 12 * scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6a6e62";
    ctx.beginPath(); ctx.moveTo(x - 30 * scale, y + 5 * scale); ctx.lineTo(x - 20 * scale, y - 30 * scale); ctx.lineTo(x + 10 * scale, y - 35 * scale); ctx.lineTo(x + 32 * scale, y - 10 * scale); ctx.lineTo(x + 28 * scale, y + 8 * scale); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#7a7e72"; ctx.beginPath(); ctx.moveTo(x - 15 * scale, y - 25 * scale); ctx.lineTo(x + 5 * scale, y - 32 * scale); ctx.lineTo(x + 20 * scale, y - 18 * scale); ctx.lineTo(x - 5 * scale, y - 15 * scale); ctx.closePath(); ctx.fill();
  }

  drawOreVein(ctx, item) {
    const { x, y, scale } = item;
    ctx.fillStyle = "#5a5e52"; ctx.beginPath(); ctx.ellipse(x, y, 26 * scale, 18 * scale, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8ab0c0";
    ctx.beginPath(); ctx.arc(x - 6 * scale, y - 4 * scale, 6 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 8 * scale, y + 2 * scale, 5 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2 * scale, y - 10 * scale, 4 * scale, 0, Math.PI * 2); ctx.fill();
  }

  drawDryGrass(ctx, item) {
    ctx.strokeStyle = this.theme === "mountain" ? "#6a6555" : "#7a7560"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(item.x, item.y); ctx.lineTo(item.x - 8, item.y - 18 * item.scale);
    ctx.moveTo(item.x, item.y); ctx.lineTo(item.x + 5, item.y - 22 * item.scale);
    ctx.moveTo(item.x, item.y); ctx.lineTo(item.x + 12, item.y - 15 * item.scale);
    ctx.stroke();
  }

  drawDeadTree(ctx, item) {
    const { x, y, scale } = item;
    ctx.fillStyle = "#4a3e30"; ctx.fillRect(x - 8 * scale, y - 25 * scale, 16 * scale, 58 * scale);
    ctx.strokeStyle = "#4a3e30"; ctx.lineWidth = 6 * scale;
    ctx.beginPath(); ctx.moveTo(x, y - 25 * scale); ctx.lineTo(x - 25 * scale, y - 65 * scale); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 20 * scale); ctx.lineTo(x + 22 * scale, y - 55 * scale); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 25 * scale, y - 65 * scale); ctx.lineTo(x - 35 * scale, y - 80 * scale); ctx.stroke();
  }

  drawRubble(ctx, item) {
    const { x, y, scale } = item;
    ctx.fillStyle = "#5a5852";
    ctx.fillRect(x - 12 * scale, y - 6 * scale, 18 * scale, 10 * scale);
    ctx.fillRect(x + 4 * scale, y - 10 * scale, 14 * scale, 8 * scale);
    ctx.fillStyle = "#6a6862"; ctx.fillRect(x - 8 * scale, y + 2 * scale, 22 * scale, 6 * scale);
  }

  drawTwistedTree(ctx, item) {
    const { x, y, scale } = item;
    ctx.strokeStyle = "#3a3040"; ctx.lineWidth = 10 * scale; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y + 15 * scale); ctx.quadraticCurveTo(x - 15 * scale, y - 20 * scale, x + 5 * scale, y - 60 * scale); ctx.stroke();
    ctx.fillStyle = "#3a2848";
    ctx.beginPath(); ctx.arc(x + 5 * scale, y - 60 * scale, 30 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4a3858";
    ctx.beginPath(); ctx.arc(x - 12 * scale, y - 50 * scale, 20 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 20 * scale, y - 52 * scale, 18 * scale, 0, Math.PI * 2); ctx.fill();
  }

  drawGlowingMushroom(ctx, item) {
    const { x, y, scale } = item;
    ctx.fillStyle = "#4a4050"; ctx.fillRect(x - 3 * scale, y - 10 * scale, 6 * scale, 16 * scale);
    ctx.fillStyle = "#7060a0";
    ctx.beginPath(); ctx.ellipse(x, y - 14 * scale, 14 * scale, 10 * scale, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "rgb(140 120 200 / 20%)";
    ctx.beginPath(); ctx.arc(x, y - 12 * scale, 20 * scale, 0, Math.PI * 2); ctx.fill();
  }

  drawMistFern(ctx, item) {
    const { x, y, scale } = item;
    ctx.strokeStyle = "#4a6070"; ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + i * 10 * scale, y - 18 * scale, x + i * 16 * scale, y - 30 * scale); ctx.stroke();
    }
    ctx.fillStyle = "rgb(80 100 140 / 15%)"; ctx.beginPath(); ctx.ellipse(x, y - 15 * scale, 24 * scale, 16 * scale, 0, 0, Math.PI * 2); ctx.fill();
  }

  drawRuinStone(ctx, item) {
    const { x, y, scale } = item;
    ctx.fillStyle = "#3e3c38";
    ctx.fillRect(x - 10 * scale, y - 18 * scale, 16 * scale, 24 * scale);
    ctx.fillStyle = "#4a4844";
    ctx.fillRect(x + 4 * scale, y - 12 * scale, 12 * scale, 18 * scale);
    ctx.fillStyle = "rgb(140 120 100 / 20%)";
    ctx.fillRect(x - 8 * scale, y - 16 * scale, 6 * scale, 3 * scale);
  }

  drawCharredSpire(ctx, item) {
    const { x, y, scale } = item;
    ctx.fillStyle = "#2a1810"; ctx.fillRect(x - 7 * scale, y - 30 * scale, 14 * scale, 60 * scale);
    ctx.fillStyle = "#3a2418";
    ctx.beginPath(); ctx.moveTo(x, y - 70 * scale); ctx.lineTo(x - 18 * scale, y - 25 * scale); ctx.lineTo(x + 18 * scale, y - 25 * scale); ctx.fill();
    ctx.fillStyle = "rgb(220 100 30 / 30%)";
    ctx.beginPath(); ctx.arc(x, y - 35 * scale, 6 * scale, 0, Math.PI * 2); ctx.fill();
  }

  drawEmberVent(ctx, item) {
    const { x, y, scale } = item;
    ctx.fillStyle = "#3a2015"; ctx.beginPath(); ctx.ellipse(x, y, 18 * scale, 12 * scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c45020"; ctx.beginPath(); ctx.ellipse(x, y, 10 * scale, 6 * scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgb(255 160 40 / 15%)"; ctx.beginPath(); ctx.arc(x, y - 4 * scale, 22 * scale, 0, Math.PI * 2); ctx.fill();
  }

  drawVolcanicRock(ctx, item) {
    const { x, y, scale } = item;
    ctx.fillStyle = "#4a2a1a";
    ctx.beginPath(); ctx.moveTo(x - 22 * scale, y + 5 * scale); ctx.lineTo(x - 14 * scale, y - 20 * scale); ctx.lineTo(x + 8 * scale, y - 24 * scale); ctx.lineTo(x + 24 * scale, y - 6 * scale); ctx.lineTo(x + 20 * scale, y + 8 * scale); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#5a3a28"; ctx.beginPath(); ctx.moveTo(x - 10 * scale, y - 16 * scale); ctx.lineTo(x + 4 * scale, y - 22 * scale); ctx.lineTo(x + 14 * scale, y - 12 * scale); ctx.lineTo(x - 2 * scale, y - 10 * scale); ctx.closePath(); ctx.fill();
  }

  drawAshPatch(ctx, item) {
    ctx.fillStyle = "rgb(80 60 50 / 30%)";
    ctx.beginPath(); ctx.ellipse(item.x, item.y, 20 * item.scale, 12 * item.scale, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgb(120 90 70 / 20%)";
    ctx.beginPath(); ctx.ellipse(item.x + 6, item.y - 3, 10 * item.scale, 6 * item.scale, -0.2, 0, Math.PI * 2); ctx.fill();
  }

  drawBoundary(ctx) {
    const bounds = this.config.bounds;
    ctx.strokeStyle = "rgb(226 216 174 / 65%)"; ctx.lineWidth = 14;
    ctx.strokeRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  }
}
