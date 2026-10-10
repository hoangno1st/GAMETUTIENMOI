export class NPC {
  constructor({ id, name, title, x, y, color, dialogue, questGiver = false }) {
    this.id = id;
    this.type = "npc";
    this.name = name;
    this.title = title;
    this.x = x;
    this.y = y;
    this.color = color;
    this.dialogue = dialogue;
    this.questGiver = questGiver;
    this.interactionLabel = "Trò chuyện";
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = "rgb(6 17 14 / 28%)";
    ctx.beginPath();
    ctx.ellipse(0, 12, 40, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(-29, -55);
    ctx.quadraticCurveTo(-46, -5, -37, 22);
    ctx.quadraticCurveTo(0, 43, 37, 22);
    ctx.quadraticCurveTo(46, -5, 29, -55);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#e8bf99";
    ctx.beginPath();
    ctx.arc(0, -72, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#18251f";
    ctx.beginPath();
    ctx.arc(0, -80, 25, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -98, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.font = "600 21px Georgia, serif";
    ctx.fillStyle = "#fff3cf";
    ctx.strokeStyle = "rgb(5 14 11 / 90%)";
    ctx.lineWidth = 5;
    ctx.strokeText(this.name, 0, -122);
    ctx.fillText(this.name, 0, -122);
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillStyle = "#b9d2c4";
    ctx.fillText(this.title, 0, -101);
    if (this.questGiver || this.questMarker) {
      ctx.fillStyle = "#ebc760";
      ctx.font = "700 40px Georgia, serif";
      ctx.strokeText("!", 0, -154);
      ctx.fillText("!", 0, -154);
    }
    ctx.restore();
  }
}
