export class ExplorationSystem {
  constructor(interactionRange = 150) {
    this.interactionRange = interactionRange;
    this.nodeReadyAt = {};
    this.discoveredPois = {};
    this.currentObjects = [];
    this.gathering = null;
    this.message = "";
    this.messageTime = 0;
  }

  initialize(saved = {}) {
    this.nodeReadyAt = {};
    for (const [id, readyAt] of Object.entries(saved.nodeReadyAt ?? {})) {
      if (Number.isFinite(readyAt) && readyAt > 0) this.nodeReadyAt[id] = readyAt;
    }
    this.discoveredPois = {};
    for (const id of Object.keys(saved.discoveredPois ?? {})) this.discoveredPois[id] = true;
  }

  loadMap(objects) {
    this.cancelGathering();
    this.currentObjects = objects;
    for (const object of objects) {
      if (object.type === "resource") { object.spawnX = object.x; object.spawnY = object.y; }
    }
    this.refreshNodes();
    for (const object of objects) {
      if (object.type === "poi") object.discovered = Boolean(this.discoveredPois[object.id]);
    }
  }

  refreshNodes() {
    const now = Date.now();
    for (const node of this.currentObjects.filter((object) => object.type === "resource")) {
      const readyAt = this.nodeReadyAt[node.id] ?? 0;
      node.defeated = readyAt > now;
      node.x = node.defeated ? -9999 : node.spawnX;
      node.y = node.defeated ? -9999 : node.spawnY;
      if (!node.defeated && readyAt) delete this.nodeReadyAt[node.id];
    }
  }

  startGathering(node) {
    if (!node || node.type !== "resource" || node.defeated || this.gathering) return false;
    this.gathering = { node, elapsed: 0, duration: Math.max(0.4, node.gatherDuration ?? 1.5) };
    this.message = `Đang ${node.interactionLabel.toLowerCase()} ${node.name}…`;
    this.messageTime = 2;
    return true;
  }

  discover(poi) {
    if (!poi || poi.type !== "poi") return null;
    const firstVisit = !this.discoveredPois[poi.id];
    this.discoveredPois[poi.id] = true;
    poi.discovered = true;
    return {
      speaker: `${poi.icon ?? "◇"} ${poi.name}`,
      title: firstVisit ? "Điểm khám phá mới" : "Dấu tích đã khám phá",
      text: poi.lore,
    };
  }

  update(deltaTime, player, inventory) {
    this.messageTime = Math.max(0, this.messageTime - deltaTime);
    this.refreshNodes();
    if (!this.gathering) return false;
    const { node } = this.gathering;
    if (node.defeated || Math.hypot(player.x - node.x, player.y - node.y) > this.interactionRange + 30) {
      this.cancelGathering("Đã hủy thu thập vì rời khỏi điểm tài nguyên.");
      return false;
    }
    this.gathering.elapsed += deltaTime;
    if (this.gathering.elapsed < this.gathering.duration) return false;
    const quantity = Math.max(1, node.quantity ?? 1);
    if (!inventory.canAddItem(player, node.materialId, quantity)) {
      inventory.addMessage("Túi đồ đã đầy — tài nguyên vẫn còn tại chỗ.", "warning");
      this.cancelGathering("Không đủ chỗ trong túi đồ.");
      return false;
    }
    inventory.addItem(player, node.materialId, quantity);
    this.nodeReadyAt[node.id] = Date.now() + Math.max(1, node.respawnDelay ?? 60) * 1000;
    node.defeated = true;
    this.gathering = null;
    this.message = `${node.name} sẽ hồi phục sau ${node.respawnDelay ?? 60} giây.`;
    this.messageTime = 3;
    return true;
  }

  cancelGathering(message = "") {
    this.gathering = null;
    if (message) { this.message = message; this.messageTime = 2; }
  }

  getPersistentState() {
    return { nodeReadyAt: { ...this.nodeReadyAt }, discoveredPois: { ...this.discoveredPois } };
  }
}
