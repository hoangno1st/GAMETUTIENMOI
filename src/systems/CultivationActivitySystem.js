export class CultivationActivitySystem {
  constructor(config) { this.config = config; this.panelOpen = false; this.selectedIndex = 0; this.mode = null; this.progress = 0; this.practiceCooldown = 0; this.practiceCompletions = 0; this.message = ""; }
  initializePlayer(player) { const state = player.activityState ?? {}; this.practiceCooldown = Math.max(0, Number(state.practiceCooldown) || 0); this.practiceCompletions = Math.max(0, Number.isInteger(state.practiceCompletions) ? state.practiceCompletions : 0); this.progress = 0; }
  getPersistentState() { return { practiceCooldown: this.practiceCooldown, practiceCompletions: this.practiceCompletions, progress: this.mode === "practice" ? this.progress : 0 }; }
  open() { this.panelOpen = true; this.mode = null; this.progress = 0; this.message = ""; }
  close() { this.panelOpen = false; this.mode = null; this.progress = 0; }
  moveSelection(direction) { if (!this.mode) this.selectedIndex = (this.selectedIndex + direction + 2) % 2; }
  confirm(player) {
    if (this.mode) { this.mode = null; this.progress = 0; return false; }
    if (this.selectedIndex === 0) { this.mode = "meditate"; this.message = "Đang điều tức hồi phục khí huyết và linh lực."; return true; }
    if (this.practiceCooldown > 0) { this.message = `Cần chờ ${Math.ceil(this.practiceCooldown)} giây.`; return false; }
    this.mode = "practice"; this.progress = 0; this.message = "Đang vận hành công pháp..."; return true;
  }
  update(deltaTime, player, progression) {
    this.practiceCooldown = Math.max(0, this.practiceCooldown - deltaTime);
    if (!this.panelOpen || !this.mode) return false;
    if (this.mode === "meditate") { player.hp = Math.min(player.maxHp, player.hp + this.config.meditation.hpPerSecond * deltaTime); player.mp = Math.min(player.maxMp, player.mp + this.config.meditation.mpPerSecond * deltaTime); return false; }
    this.progress += deltaTime;
    if (this.progress >= this.config.practice.duration) { progression.grantExperience(player, this.config.practice.expReward, player.x, player.y - 70); this.practiceCompletions += 1; this.practiceCooldown = this.config.practice.cooldown; this.mode = null; this.progress = 0; this.message = `Tu luyện hoàn tất: +${this.config.practice.expReward} EXP.`; return true; }
    return false;
  }
}
