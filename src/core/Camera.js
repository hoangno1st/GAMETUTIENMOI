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
  }

  getDesiredPosition(target) {
    return {
      x: clamp(target.x - this.viewWidth / 2, 0, this.worldWidth - this.viewWidth),
      y: clamp(target.y - this.viewHeight / 2, 0, this.worldHeight - this.viewHeight),
    };
  }
}
