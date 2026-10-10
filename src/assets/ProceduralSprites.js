function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

export function createCultivatorSprite(size = 182) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const scale = size / 182;
  ctx.scale(scale, scale);

  // Soft grounding shadow, kept inside the 182 × 182 source asset.
  ctx.fillStyle = "rgb(6 18 15 / 30%)";
  ctx.beginPath();
  ctx.ellipse(91, 158, 45, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Flowing outer robe.
  const robe = ctx.createLinearGradient(55, 72, 126, 151);
  robe.addColorStop(0, "#dcebdc");
  robe.addColorStop(0.55, "#96bdaa");
  robe.addColorStop(1, "#426d62");
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(73, 66);
  ctx.quadraticCurveTo(52, 79, 48, 139);
  ctx.quadraticCurveTo(67, 157, 91, 155);
  ctx.quadraticCurveTo(116, 157, 134, 139);
  ctx.quadraticCurveTo(128, 79, 109, 66);
  ctx.closePath();
  ctx.fill();

  // Sleeves.
  ctx.fillStyle = "#b9d2c4";
  ctx.beginPath();
  ctx.moveTo(66, 77);
  ctx.quadraticCurveTo(42, 86, 33, 121);
  ctx.quadraticCurveTo(44, 129, 57, 118);
  ctx.lineTo(77, 91);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(116, 77);
  ctx.quadraticCurveTo(140, 86, 149, 121);
  ctx.quadraticCurveTo(138, 129, 125, 118);
  ctx.lineTo(105, 91);
  ctx.closePath();
  ctx.fill();

  // Inner robe and sash.
  ctx.fillStyle = "#edf2dd";
  ctx.beginPath();
  ctx.moveTo(80, 70);
  ctx.lineTo(91, 105);
  ctx.lineTo(103, 70);
  ctx.lineTo(111, 142);
  ctx.lineTo(72, 142);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#34594f";
  roundedRect(ctx, 62, 103, 58, 10, 5);
  ctx.fill();
  ctx.fillStyle = "#d8b968";
  ctx.beginPath();
  ctx.arc(91, 108, 6, 0, Math.PI * 2);
  ctx.fill();

  // Head, hair, and jade pin.
  ctx.fillStyle = "#e8bf99";
  ctx.beginPath();
  ctx.ellipse(91, 53, 25, 29, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#172420";
  ctx.beginPath();
  ctx.arc(91, 44, 27, Math.PI, Math.PI * 2);
  ctx.quadraticCurveTo(119, 47, 112, 71);
  ctx.lineTo(105, 61);
  ctx.quadraticCurveTo(90, 48, 69, 61);
  ctx.lineTo(66, 70);
  ctx.quadraticCurveTo(61, 45, 65, 41);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(91, 23, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#76cdb5";
  roundedRect(ctx, 75, 20, 32, 5, 3);
  ctx.fill();

  // Calm expression.
  ctx.strokeStyle = "#4d362e";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(78, 51);
  ctx.lineTo(85, 52);
  ctx.moveTo(98, 52);
  ctx.lineTo(105, 51);
  ctx.moveTo(87, 65);
  ctx.quadraticCurveTo(91, 68, 96, 65);
  ctx.stroke();

  // Boots.
  ctx.fillStyle = "#203c35";
  roundedRect(ctx, 63, 143, 25, 12, 5);
  ctx.fill();
  roundedRect(ctx, 95, 143, 25, 12, 5);
  ctx.fill();

  return canvas;
}

function cloneSprite(source) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext("2d").drawImage(source, 0, 0);
  return canvas;
}

export function createCultivatorSprites(size = 182) {
  const south = createCultivatorSprite(size);
  const north = cloneSprite(south);
  const northContext = north.getContext("2d");
  const scale = size / 182;
  northContext.save();
  northContext.scale(scale, scale);
  northContext.fillStyle = "#172420";
  northContext.beginPath();
  northContext.ellipse(91, 54, 27, 31, 0, 0, Math.PI * 2);
  northContext.fill();
  northContext.fillStyle = "#2b4c42";
  northContext.beginPath();
  northContext.moveTo(69, 73);
  northContext.lineTo(91, 95);
  northContext.lineTo(113, 73);
  northContext.lineTo(104, 109);
  northContext.lineTo(78, 109);
  northContext.closePath();
  northContext.fill();
  northContext.restore();

  return Object.freeze({
    north,
    south,
    east: south,
    west: south,
  });
}
