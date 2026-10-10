export class QuestSystem {
  constructor(config) {
    this.config = config;
    this.definitions = new Map(config.quests.map((quest) => [quest.id, quest]));
    this.accepted = {};
    this.completed = {};
    this.trackedQuestId = null;
    this.currentAreaId = "ngoai-mon";
    this.areaNotice = null;
    this.panelOpen = false;
  }

  initializePlayer(player) {
    const saved = player.questState ?? {};
    this.accepted = this.sanitizeMap(saved.accepted);
    this.completed = this.sanitizeCompleted(saved.completed);
    this.trackedQuestId = this.definitions.has(saved.trackedQuestId) ? saved.trackedQuestId : null;
    this.currentAreaId = this.config.areas.some((area) => area.id === saved.currentAreaId) ? saved.currentAreaId : "ngoai-mon";
    if (this.trackedQuestId && !this.accepted[this.trackedQuestId]) this.trackedQuestId = null;
    player.questState = this.getPersistentState();
  }

  sanitizeMap(source) {
    if (!source || typeof source !== "object") return {};
    const result = {};
    for (const [questId, state] of Object.entries(source)) {
      const definition = this.definitions.get(questId);
      if (!definition || !state || typeof state !== "object") continue;
      const progress = {};
      for (const objective of definition.objectives) progress[objective.id] = Math.max(0, Math.min(objective.amount, Number.isInteger(state.progress?.[objective.id]) ? state.progress[objective.id] : 0));
      result[questId] = { progress };
    }
    return result;
  }

  sanitizeCompleted(source) {
    if (!source || typeof source !== "object") return {};
    const result = {};
    for (const [questId, value] of Object.entries(source)) {
      if (this.definitions.has(questId) && value) result[questId] = true;
    }
    return result;
  }

  getPersistentState() {
    return { accepted: structuredClone(this.accepted), completed: { ...this.completed }, trackedQuestId: this.trackedQuestId, currentAreaId: this.currentAreaId };
  }

  getDefinition(questId) { return this.definitions.get(questId) ?? null; }
  getState(questId) { return this.accepted[questId] ?? null; }
  isComplete(questId) { return Boolean(this.completed[questId]); }
  isObjectiveComplete(quest, objective) { return (this.accepted[quest.id]?.progress?.[objective.id] ?? 0) >= objective.amount; }
  isQuestComplete(quest) { return quest.objectives.every((objective) => this.isObjectiveComplete(quest, objective)); }

  meetsPrerequisites(quest, player) {
    const requirements = quest.prerequisites ?? {};
    if (requirements.level && player.level < requirements.level) return false;
    if (requirements.realmId && player.realmId !== requirements.realmId) return false;
    if (requirements.completedQuestId && !this.isComplete(requirements.completedQuestId)) return false;
    for (const itemRequirement of requirements.items ?? []) {
      const quantity = player.inventory.filter((entry) => entry.itemId === itemRequirement.itemId).reduce((sum, entry) => sum + entry.quantity, 0);
      if (quantity < itemRequirement.quantity) return false;
    }
    return true;
  }

  canOffer(quest, player) { return !this.accepted[quest.id] && !this.completed[quest.id] && this.meetsPrerequisites(quest, player); }
  getNpcQuestAction(npcId, player) {
    for (const quest of this.config.quests) {
      if (quest.giverNpcId === npcId && this.canOffer(quest, player)) return { type: "offer", quest };
      if (quest.turnInNpcId === npcId && this.accepted[quest.id] && this.isQuestComplete(quest)) return { type: "turnIn", quest };
    }
    return null;
  }

  interactNpc(npc, player, inventory, progression, companionSystem = null) {
    const action = this.getNpcQuestAction(npc.id, player);
    if (!action) return null;
    const quest = action.quest;
    if (action.type === "offer") {
      this.accepted[quest.id] = { progress: Object.fromEntries(quest.objectives.map((objective) => [objective.id, 0])) };
      if (!this.trackedQuestId) this.trackedQuestId = quest.id;
      return { speaker: npc.name, title: quest.title, text: `${quest.description}  [Đã nhận nhiệm vụ]`, questAction: action.type };
    }
    if (action.type === "turnIn") {
      if (quest.rewards.exp) progression.grantExperience(player, quest.rewards.exp, player.x, player.y - 70);
      if (quest.rewards.coins) player.coins += quest.rewards.coins;
      for (const reward of quest.rewards.items ?? []) inventory.addItem(player, reward.itemId, reward.quantity);
      let companionText = "";
      if (quest.rewards.companion && companionSystem && !companionSystem.hasCompanion(quest.rewards.companion)) {
        companionSystem.unlock(quest.rewards.companion);
        const def = companionSystem.config.companions[quest.rewards.companion];
        companionText = def ? ` Nhận linh thú: ${def.name}!` : "";
      }
      delete this.accepted[quest.id];
      this.completed[quest.id] = true;
      if (this.trackedQuestId === quest.id) this.trackedQuestId = null;
      return { speaker: npc.name, title: quest.title, text: `Nhiệm vụ hoàn thành. Phần thưởng: ${quest.rewards.exp ?? 0} EXP, ${quest.rewards.coins ?? 0} linh tệ.${companionText}`, questAction: action.type };
    }
    return null;
  }

  increment(type, targetId, amount = 1) {
    for (const quest of this.config.quests) {
      const state = this.accepted[quest.id];
      if (!state) continue;
      for (const objective of quest.objectives) {
        if (objective.type !== type || objective.targetId !== targetId) continue;
        state.progress[objective.id] = Math.min(objective.amount, state.progress[objective.id] + amount);
      }
    }
  }

  onTalk(npcId) { this.increment("talk", npcId); }
  onDefeat(enemy) { this.increment("defeat", enemy.enemyType ?? enemy.typeId ?? enemy.species); }
  onCollect(itemId, quantity) { this.increment("collect", itemId, quantity); }
  onDeliver(itemId, quantity) { this.increment("deliver", itemId, quantity); }
  onVisit(areaId) { this.increment("visit", areaId); }

  updateArea(player) {
    const next = this.config.areas.find((area) => player.x >= area.minX && player.x <= area.maxX && player.y >= area.minY && player.y <= area.maxY);
    if (!next || next.id === this.currentAreaId) return;
    this.currentAreaId = next.id;
    this.areaNotice = { text: next.name, life: 2.4 };
    this.onVisit(next.id);
  }

  update(deltaTime) { if (this.areaNotice) { this.areaNotice.life -= deltaTime; if (this.areaNotice.life <= 0) this.areaNotice = null; } }
  togglePanel() { this.panelOpen = !this.panelOpen; }
  closePanel() { this.panelOpen = false; }
  abandonTracked() {
    if (!this.trackedQuestId || !this.accepted[this.trackedQuestId]) return false;
    delete this.accepted[this.trackedQuestId];
    this.trackedQuestId = null;
    return true;
  }
}
