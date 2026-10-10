export class InventorySystem {
  constructor(config, attributeSystem) {
    this.config = config;
    this.attributeSystem = attributeSystem;
    this.panelOpen = false;
    this.section = "inventory";
    this.selectedInventoryIndex = 0;
    this.selectedEquipmentIndex = 0;
    this.discardPending = null;
    this.messages = [];
  }

  initializePlayer(player) {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!player.equipment || typeof player.equipment !== "object") {
      player.equipment = { ...this.config.startingEquipment };
    }
    if (!Number.isInteger(player.coins) || player.coins < 0) player.coins = 0;
    this.attributeSystem.recalculate(player);
  }

  update(deltaTime) {
    for (const message of this.messages) message.life -= deltaTime;
    this.messages = this.messages.filter((message) => message.life > 0);
  }

  addMessage(text, kind = "info") {
    this.messages.unshift({ text, kind, life: 2.2 });
    this.messages = this.messages.slice(0, 3);
  }

  openPanel() {
    this.panelOpen = true;
    this.discardPending = null;
  }

  closePanel() {
    this.panelOpen = false;
    this.discardPending = null;
  }

  toggleSection() {
    this.section = this.section === "inventory" ? "equipment" : "inventory";
    this.discardPending = null;
  }

  moveSelection(player, direction) {
    this.discardPending = null;
    if (this.section === "inventory") {
      const count = Math.max(1, player.inventory.length);
      this.selectedInventoryIndex = (this.selectedInventoryIndex + direction + count) % count;
    } else {
      const count = this.config.equipmentSlots.length;
      this.selectedEquipmentIndex = (this.selectedEquipmentIndex + direction + count) % count;
    }
  }

  selectInventory(index, player) {
    if (index < 0 || index >= player.inventory.length) return false;
    this.section = "inventory";
    this.selectedInventoryIndex = index;
    this.discardPending = null;
    return true;
  }

  selectEquipment(index) {
    if (index < 0 || index >= this.config.equipmentSlots.length) return false;
    this.section = "equipment";
    this.selectedEquipmentIndex = index;
    this.discardPending = null;
    return true;
  }

  getSelectedEntry(player) {
    return player.inventory[this.selectedInventoryIndex] ?? null;
  }

  getSelectedEquipmentSlot() {
    return this.config.equipmentSlots[this.selectedEquipmentIndex]?.id ?? null;
  }

  getItem(itemId) {
    return this.config.items[itemId] ?? null;
  }

  getUsedSlots(player) {
    return player.inventory.length;
  }

  canAddItem(player, itemId, quantity) {
    const item = this.getItem(itemId);
    if (!item || !Number.isInteger(quantity) || quantity <= 0) return false;
    let remaining = quantity;
    for (const entry of player.inventory) {
      if (entry.itemId !== itemId) continue;
      remaining -= Math.max(0, item.stackLimit - entry.quantity);
      if (remaining <= 0) return true;
    }
    const newSlots = Math.ceil(remaining / item.stackLimit);
    return player.inventory.length + newSlots <= this.config.inventory.slotLimit;
  }

  countItem(player, itemId) {
    return player.inventory.filter((entry) => entry.itemId === itemId).reduce((sum, entry) => sum + entry.quantity, 0);
  }

  removeItemById(player, itemId, quantity) {
    if (this.countItem(player, itemId) < quantity) return false;
    let remaining = quantity;
    for (let index = player.inventory.length - 1; index >= 0 && remaining > 0; index -= 1) {
      const entry = player.inventory[index];
      if (entry.itemId !== itemId) continue;
      const removed = Math.min(remaining, entry.quantity);
      entry.quantity -= removed; remaining -= removed;
      if (entry.quantity <= 0) player.inventory.splice(index, 1);
    }
    return true;
  }

  addItem(player, itemId, quantity, showMessage = true) {
    const item = this.getItem(itemId);
    if (!item || !this.canAddItem(player, itemId, quantity)) {
      if (item) this.addMessage("Túi đồ đã đầy — vật phẩm vẫn nằm trên mặt đất.", "warning");
      return false;
    }
    let remaining = quantity;
    for (const entry of player.inventory) {
      if (entry.itemId !== itemId || entry.quantity >= item.stackLimit) continue;
      const moved = Math.min(remaining, item.stackLimit - entry.quantity);
      entry.quantity += moved;
      remaining -= moved;
    }
    while (remaining > 0) {
      const moved = Math.min(remaining, item.stackLimit);
      player.inventory.push({ itemId, quantity: moved });
      remaining -= moved;
    }
    this.onItemAdded?.(itemId, quantity);
    if (showMessage) this.addMessage(`Nhặt ${item.name}${quantity > 1 ? ` ×${quantity}` : ""}.`, "success");
    return true;
  }

  removeItem(player, index, quantity = 1) {
    const entry = player.inventory[index];
    if (!entry || quantity <= 0) return false;
    entry.quantity -= quantity;
    if (entry.quantity <= 0) player.inventory.splice(index, 1);
    this.selectedInventoryIndex = Math.max(0, Math.min(this.selectedInventoryIndex, player.inventory.length - 1));
    return true;
  }

  useOrEquipSelected(player) {
    const entry = this.getSelectedEntry(player);
    const item = entry ? this.getItem(entry.itemId) : null;
    if (!item) return false;
    if (item.type === "consumable") return this.useConsumable(player, this.selectedInventoryIndex, item);
    if (item.type === "equipment") return this.equip(player, this.selectedInventoryIndex, item);
    this.addMessage("Vật phẩm này chưa thể sử dụng.", "warning");
    return false;
  }

  useConsumable(player, index, item) {
    const effect = item.effect;
    if (effect.kind === "restoreHp") {
      if (player.hp >= player.maxHp) {
        this.addMessage("Khí huyết đã đầy.", "warning");
        return false;
      }
      player.hp = Math.min(player.maxHp, player.hp + effect.amount);
    } else if (effect.kind === "restoreMp") {
      if (player.mp >= player.maxMp) {
        this.addMessage("Linh lực đã đầy.", "warning");
        return false;
      }
      player.mp = Math.min(player.maxMp, player.mp + effect.amount);
    } else return false;
    this.removeItem(player, index, 1);
    this.addMessage(`Dùng ${item.name}.`, "success");
    return true;
  }

  getRequirementFailures(player, item) {
    const failures = [];
    const requirements = item.requirements ?? {};
    if (requirements.level && player.level < requirements.level) failures.push(`cần cấp ${requirements.level}`);
    if (requirements.realmId && !this.meetsRealm(player.realmId, requirements.realmId)) {
      failures.push(`cần cảnh giới ${requirements.realmId}`);
    }
    return failures;
  }

  meetsRealm(currentRealmId, requiredRealmId) {
    const order = this.config.realmOrder;
    const current = order.indexOf(currentRealmId);
    const required = order.indexOf(requiredRealmId);
    return required < 0 || current >= required;
  }

  equip(player, inventoryIndex, item) {
    const failures = this.getRequirementFailures(player, item);
    if (failures.length > 0) {
      this.addMessage(`Không thể trang bị: ${failures.join(", ")}.`, "warning");
      return false;
    }
    const oldItemId = player.equipment[item.equipmentSlot] ?? null;
    this.removeItem(player, inventoryIndex, 1);
    player.equipment[item.equipmentSlot] = item.id;
    if (oldItemId) this.addItem(player, oldItemId, 1, false);
    this.attributeSystem.recalculate(player);
    this.addMessage(`Đã trang bị ${item.name}.`, "success");
    return true;
  }

  unequipSelected(player) {
    const slot = this.getSelectedEquipmentSlot();
    const itemId = slot ? player.equipment[slot] : null;
    const item = this.getItem(itemId);
    if (!slot || !item) {
      this.addMessage("Ô trang bị đang trống.", "warning");
      return false;
    }
    if (!this.canAddItem(player, itemId, 1)) {
      this.addMessage("Túi đồ đã đầy — không thể tháo trang bị.", "warning");
      return false;
    }
    player.equipment[slot] = null;
    this.addItem(player, itemId, 1, false);
    this.attributeSystem.recalculate(player);
    this.addMessage(`Đã tháo ${item.name}.`, "success");
    return true;
  }

  requestDiscard(player) {
    const entry = this.getSelectedEntry(player);
    if (!entry) return false;
    this.discardPending = { index: this.selectedInventoryIndex, itemId: entry.itemId };
    return true;
  }

  confirmDiscard(player) {
    if (!this.discardPending) return false;
    const { index, itemId } = this.discardPending;
    const entry = player.inventory[index];
    if (!entry || entry.itemId !== itemId) {
      this.discardPending = null;
      return false;
    }
    const item = this.getItem(itemId);
    player.inventory.splice(index, 1);
    this.selectedInventoryIndex = Math.max(0, Math.min(index, player.inventory.length - 1));
    this.discardPending = null;
    this.addMessage(`Đã bỏ ${item?.name ?? "vật phẩm"}.`, "info");
    return true;
  }

  cancelDiscard() {
    this.discardPending = null;
  }

  getEquipmentBonuses(player, equipment = player.equipment) {
    const totals = { physicalAttack: 0, defense: 0, maxHp: 0, maxMp: 0, movementSpeedPercent: 0, skillDamagePercent: 0 };
    for (const slot of this.config.equipmentSlots) {
      const item = this.getItem(equipment?.[slot.id]);
      if (!item) continue;
      for (const stat of Object.keys(totals)) totals[stat] += item.stats?.[stat] ?? 0;
    }
    return totals;
  }

  getComparison(player, item) {
    if (!item || item.type !== "equipment") return null;
    const current = this.getItem(player.equipment[item.equipmentSlot]);
    const keys = Object.keys(this.config.statLabels);
    return keys.map((stat) => ({
      stat,
      incoming: item.stats?.[stat] ?? 0,
      current: current?.stats?.[stat] ?? 0,
    })).filter((row) => row.incoming !== 0 || row.current !== 0);
  }
}
