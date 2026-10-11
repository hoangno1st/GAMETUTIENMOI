import { clamp, damp } from "./MathUtils.js";

export class Camera {
  constructor(viewWidth, viewHeight, worldWidth, worldHeight, followSharpness = 8) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.followSharpness = followSharpness;
    this.x = 0;
    this.y = 0;
    this.shakeTime = 0; this.shakeDuration = 0; this.shakeStrength = 0; this.renderX = 0; this.renderY = 0;
  }

  snapTo(target) {
    const desired = this.getDesiredPosition(target);
    this.x = desired.x;
    this.y = desired.y;
  }

  update(target, deltaTime) {
    const desired = this.getDesiredPosition(target);
    this.x = damp(this.x, desired.x, this.followSharpness, deltaTime);
    this.y = damp(this.y, desired.y, this.followSharpness, deltaTime);
    this.shakeTime = Math.max(0, this.shakeTime - deltaTime);
    const strength = this.shakeTime > 0 ? this.shakeStrength * (this.shakeTime / this.shakeDuration) : 0;
    this.renderX = clamp(this.x + (Math.random() * 2 - 1) * strength, 0, Math.max(0, this.worldWidth - this.viewWidth));
    this.renderY = clamp(this.y + (Math.random() * 2 - 1) * strength, 0, Math.max(0, this.worldHeight - this.viewHeight));
  }

  shake(strength = 8, duration = 0.18) { this.shakeStrength = strength; this.shakeDuration = duration; this.shakeTime = duration; }

  getDesiredPosition(target) {
    return {
      x: clamp(target.x - this.viewWidth / 2, 0, Math.max(0, this.worldWidth - this.viewWidth)),
      y: clamp(target.y - this.viewHeight / 2, 0, Math.max(0, this.worldHeight - this.viewHeight)),
    };
  }
}
