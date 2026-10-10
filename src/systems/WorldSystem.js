import { hash2D } from "../core/MathUtils.js";

export class WorldSystem {
  constructor(config) {
    this.config = config;
    this.decorations = this.createDecorations();
    this.trainingObjects = config.trainingObjects.map((item) => ({ ...item }));
    this.specialObjects = [{ ...config.meditationArea }, ...config.activityStations.map((item) => ({ ...item }))];
  }

  createDecorations() {
    const decorations = [];
    for (let y = 120; y < this.config.height - 120; y += 150) {
      for (let x = 120; x < this.config.width - 120; x += 160) {
        const noise = hash2D(x, y);
        const centralCourtyard = x > 980 && x < 2620 && y > 500 && y < 1900;
        const area = this.config.trainingArea;
        const trainingArea = x > area.x - 100
          && x < area.x + area.width + 80
          && y > area.y - 90
          && y < area.y + area.height + 90;
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

  render(ctx) {
    const { width, height } = this.config;
    const ground = ctx.createLinearGradient(0, 0, 0, height);
    ground.addColorStop(0, "#5c8068");
    ground.addColorStop(0.5, "#789076");
    ground.addColorStop(1, "#4d725e");
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, width, height);

    this.drawGroundTexture(ctx);
    this.drawMountains(ctx);
    this.drawPaths(ctx);
    this.drawCourtyard(ctx);
    this.drawTrainingArea(ctx);
    this.drawBuildings(ctx);
    this.drawPond(ctx);
    this.drawActivityStations(ctx);

    for (const decoration of this.decorations) {
      if (decoration.type === "pine") this.drawPine(ctx, decoration);
      if (decoration.type === "rock") this.drawRock(ctx, decoration);
      if (decoration.type === "grass") this.drawGrass(ctx, decoration);
    }

    this.drawBoundary(ctx);
  }

  drawActivityStations(ctx) {
    for (const station of this.config.activityStations) {
      ctx.save(); ctx.translate(station.x, station.y);
      ctx.fillStyle = "rgb(6 17 14 / 30%)"; ctx.beginPath(); ctx.ellipse(0, 18, 48, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = station.type === "alchemy" ? "#557d68" : station.type === "forge" ? "#845849" : "#c9b47a";
      ctx.beginPath(); ctx.roundRect(-36, -40, 72, 62, 12); ctx.fill();
      ctx.strokeStyle = "#e4ca73"; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = "#f3d873"; ctx.font = "700 28px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText("◆", 0, -76);
      ctx.fillStyle = "#fff0bd"; ctx.strokeStyle = "rgb(5 14 11 / 90%)"; ctx.lineWidth = 5; ctx.font = "700 19px Georgia, serif"; ctx.strokeText(station.name, 0, -54); ctx.fillText(station.name, 0, -54); ctx.restore();
    }
  }

  drawGroundTexture(ctx) {
    ctx.fillStyle = "rgb(219 226 180 / 9%)";
    for (let y = 0; y < this.config.height; y += 64) {
      for (let x = 0; x < this.config.width; x += 64) {
        if (hash2D(x, y) > 0.55) ctx.fillRect(x + 7, y + 18, 34, 4);
      }
    }
  }

  drawMountains(ctx) {
    ctx.fillStyle = "#31574e";
    ctx.beginPath();
    ctx.moveTo(0, 410);
    for (let x = 0; x <= this.config.width; x += 300) {
      ctx.lineTo(x + 150, 90 + hash2D(x, 5) * 180);
      ctx.lineTo(x + 300, 390);
    }
    ctx.lineTo(this.config.width, 0);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.fillStyle = "rgb(220 236 216 / 34%)";
    ctx.fillRect(0, 330, this.config.width, 120);
  }

  drawPaths(ctx) {
    ctx.strokeStyle = "#b6aa83";
    ctx.lineWidth = 210;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(1800, 410);
    ctx.lineTo(1800, 2290);
    ctx.moveTo(620, 1230);
    ctx.lineTo(3260, 1230);
    ctx.moveTo(3060, 1230);
    ctx.lineTo(3060, 2050);
    ctx.stroke();
    ctx.strokeStyle = "rgb(240 226 182 / 22%)";
    ctx.lineWidth = 8;
    ctx.setLineDash([28, 34]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawCourtyard(ctx) {
    ctx.fillStyle = "#aaa184";
    ctx.fillRect(1250, 710, 1100, 1040);
    ctx.strokeStyle = "rgb(77 72 59 / 20%)";
    ctx.lineWidth = 3;
    for (let x = 1250; x <= 2350; x += 92) {
      ctx.beginPath();
      ctx.moveTo(x, 710);
      ctx.lineTo(x, 1750);
      ctx.stroke();
    }
    for (let y = 710; y <= 1750; y += 72) {
      ctx.beginPath();
      ctx.moveTo(1250, y);
      ctx.lineTo(2350, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#688276";
    ctx.beginPath();
    ctx.arc(1800, 1230, 190, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d8c88d";
    ctx.lineWidth = 18;
    ctx.stroke();
    ctx.fillStyle = "#d7d1b0";
    ctx.beginPath();
    ctx.arc(1800, 1230, 25, 0, Math.PI * 2);
    ctx.fill();
    this.drawMeditationDais(ctx);
  }

  drawMeditationDais(ctx) {
    const area = this.config.meditationArea;
    ctx.save();
    ctx.translate(area.x, area.y);
    ctx.strokeStyle = "rgb(202 221 166 / 72%)";
    ctx.lineWidth = 7;
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, 52 + ring * 34, ring * 0.7, Math.PI * 1.45 + ring * 0.7);
      ctx.stroke();
    }
    ctx.fillStyle = "#e8dfad";
    ctx.font = "600 18px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("TỤ LINH ĐÀI", 0, 8);
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
    ctx.fillStyle = "#7c866d";
    ctx.beginPath();
    ctx.roundRect(area.x, area.y, area.width, area.height, 70);
    ctx.fill();
    ctx.strokeStyle = "rgb(226 216 174 / 65%)";
    ctx.lineWidth = 12;
    ctx.setLineDash([24, 18]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgb(22 57 45 / 75%)";
    ctx.beginPath();
    ctx.roundRect(area.x + 208, area.y + 18, 304, 46, 14);
    ctx.fill();
    ctx.fillStyle = "#efe2ba";
    ctx.font = "600 22px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("BÃI LUYỆN CĂN BẢN", area.x + area.width / 2, area.y + 49);

    for (const trainingObject of this.trainingObjects) {
      this.drawTrainingDummy(ctx, trainingObject.x, trainingObject.y);
    }
  }

  drawTrainingDummy(ctx, x, y) {
    ctx.fillStyle = "rgb(7 18 14 / 22%)";
    ctx.beginPath();
    ctx.ellipse(x, y + 18, 48, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6d4b2f";
    ctx.fillRect(x - 10, y - 88, 20, 112);
    ctx.fillRect(x - 50, y - 57, 100, 17);
    ctx.fillStyle = "#9a7550";
    ctx.beginPath();
    ctx.arc(x, y - 102, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c9ae73";
    ctx.fillRect(x - 19, y - 27, 38, 8);
  }

  drawPavilion(ctx, x, y) {
    ctx.fillStyle = "#8e3f32";
    ctx.fillRect(x - 105, y + 55, 18, 130);
    ctx.fillRect(x + 87, y + 55, 18, 130);
    ctx.fillStyle = "#2b493e";
    ctx.beginPath();
    ctx.moveTo(x - 145, y + 65);
    ctx.quadraticCurveTo(x, y - 25, x + 145, y + 65);
    ctx.quadraticCurveTo(x, y + 35, x - 145, y + 65);
    ctx.fill();
    ctx.fillStyle = "#d6c88f";
    ctx.fillRect(x - 118, y + 174, 236, 16);
  }

  drawHall(ctx, x, y, width, height) {
    ctx.fillStyle = "#e6dcc0";
    ctx.fillRect(x, y + 75, width, height - 75);
    ctx.fillStyle = "#8e3f32";
    for (let pillar = x + 38; pillar < x + width; pillar += 76) {
      ctx.fillRect(pillar, y + 76, 18, height - 65);
    }
    ctx.fillStyle = "#243d36";
    ctx.beginPath();
    ctx.moveTo(x - 55, y + 82);
    ctx.quadraticCurveTo(x + width / 2, y - 55, x + width + 55, y + 82);
    ctx.quadraticCurveTo(x + width / 2, y + 40, x - 55, y + 82);
    ctx.fill();
    ctx.fillStyle = "#d1b15f";
    ctx.fillRect(x + width / 2 - 58, y + 30, 116, 34);
  }

  drawGate(ctx, x, y) {
    ctx.fillStyle = "#8e3f32";
    ctx.fillRect(x - 132, y - 120, 28, 215);
    ctx.fillRect(x + 104, y - 120, 28, 215);
    ctx.fillStyle = "#243d36";
    ctx.fillRect(x - 185, y - 145, 370, 40);
    ctx.fillStyle = "#d1b15f";
    ctx.fillRect(x - 76, y - 112, 152, 48);
    ctx.fillStyle = "#3c3324";
    ctx.font = "bold 24px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("NGOẠI MÔN", x, y - 79);
  }

  drawPond(ctx) {
    ctx.fillStyle = "#527f7a";
    ctx.beginPath();
    ctx.ellipse(530, 1760, 300, 190, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#9ea77e";
    ctx.lineWidth = 28;
    ctx.stroke();
    ctx.fillStyle = "#9bbd8b";
    for (let index = 0; index < 8; index += 1) {
      const angle = index * 2.2;
      ctx.beginPath();
      ctx.arc(530 + Math.cos(angle) * 190, 1760 + Math.sin(angle) * 100, 22, 0, Math.PI * 1.7);
      ctx.lineTo(530 + Math.cos(angle) * 190, 1760 + Math.sin(angle) * 100);
      ctx.fill();
    }
  }

  drawPine(ctx, item) {
    const { x, y, scale } = item;
    ctx.fillStyle = "#503d2c";
    ctx.fillRect(x - 8 * scale, y - 30 * scale, 16 * scale, 62 * scale);
    ctx.fillStyle = "#244f42";
    for (let layer = 0; layer < 3; layer += 1) {
      const offset = layer * 34 * scale;
      ctx.beginPath();
      ctx.moveTo(x, y - 155 * scale + offset);
      ctx.lineTo(x - (62 - layer * 9) * scale, y - 35 * scale + offset);
      ctx.lineTo(x + (62 - layer * 9) * scale, y - 35 * scale + offset);
      ctx.fill();
    }
  }

  drawRock(ctx, item) {
    ctx.fillStyle = "#68766c";
    ctx.beginPath();
    ctx.ellipse(item.x, item.y, 34 * item.scale, 23 * item.scale, -0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  drawGrass(ctx, item) {
    ctx.strokeStyle = "#315f48";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(item.x, item.y);
    ctx.lineTo(item.x - 11, item.y - 25 * item.scale);
    ctx.moveTo(item.x, item.y);
    ctx.lineTo(item.x + 4, item.y - 30 * item.scale);
    ctx.moveTo(item.x, item.y);
    ctx.lineTo(item.x + 14, item.y - 20 * item.scale);
    ctx.stroke();
  }

  drawBoundary(ctx) {
    const bounds = this.config.bounds;
    ctx.strokeStyle = "rgb(226 216 174 / 65%)";
    ctx.lineWidth = 14;
    ctx.strokeRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  }
}
