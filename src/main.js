import { Game } from "./core/Game.js";

function installCanvasCompatibility() {
  const prototype = CanvasRenderingContext2D.prototype;
  if (typeof prototype.roundRect === "function") return;

  prototype.roundRect = function roundRect(x, y, width, height, radii = 0) {
    const requestedRadius = Array.isArray(radii) ? radii[0] : radii;
    const radius = Math.max(
      0,
      Math.min(Number(requestedRadius) || 0, Math.abs(width) / 2, Math.abs(height) / 2),
    );
    const right = x + width;
    const bottom = y + height;
    this.moveTo(x + radius, y);
    this.lineTo(right - radius, y);
    this.quadraticCurveTo(right, y, right, y + radius);
    this.lineTo(right, bottom - radius);
    this.quadraticCurveTo(right, bottom, right - radius, bottom);
    this.lineTo(x + radius, bottom);
    this.quadraticCurveTo(x, bottom, x, bottom - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
    return this;
  };
}

installCanvasCompatibility();

const canvas = document.querySelector("#game-canvas");
const loading = document.querySelector("#loading");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Không tìm thấy canvas của trò chơi.");
}

let game;
try {
  game = new Game(canvas);
  game.start();
  canvas.focus();

  requestAnimationFrame(() => loading?.classList.add("is-hidden"));
  window.setTimeout(() => {
    if (loading?.dataset.error !== "true") loading?.remove();
  }, 400);
} catch (error) {
  console.error("Game startup failed:", error);
  if (loading) {
    loading.classList.add("has-error");
    loading.dataset.error = "true";
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    title.textContent = "Game không thể khởi động";
    detail.textContent = error?.message || "Hãy mở F12 → Console và gửi dòng lỗi màu đỏ.";
    loading.replaceChildren(title, detail);
  }
}

// Exposed only for convenient inspection while developing in the browser console.
window.game = game;
