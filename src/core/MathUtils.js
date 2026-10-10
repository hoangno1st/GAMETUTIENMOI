export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function damp(current, target, sharpness, deltaTime) {
  return lerp(current, target, 1 - Math.exp(-sharpness * deltaTime));
}

export function normalize(x, y) {
  const length = Math.hypot(x, y);
  return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

export function hash2D(x, y) {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  value = (value ^ (value >>> 13)) >>> 0;
  return (Math.imul(value, 1274126177) >>> 0) / 4294967295;
}
