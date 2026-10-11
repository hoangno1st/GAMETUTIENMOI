import { MapConfig } from "../config/MapConfig.js";
import { EnemyConfig } from "../config/EnemyConfig.js";
import { ItemConfig } from "../config/ItemConfig.js";
import { ClassConfig } from "../config/ClassConfig.js";
import { QuestConfig } from "../config/QuestConfig.js";
import { CultivationConfig } from "../config/CultivationConfig.js";
import { Enemy } from "../entities/Enemy.js";

const TABS = ["character", "map", "enemies", "quests", "items", "cultivation", "save"];
const TAB_LABELS = { character: "Nhân vật", map: "Bản đồ", enemies: "Quái vật", quests: "Nhiệm vụ", items: "Vật phẩm", cultivation: "Tu luyện", save: "Save/Debug" };

export class AdminPanel {
  constructor(game) {
    this.game = game;
    this.open = false;
    this.activeTab = "character";
    this.container = null;
    this.adminSpawnedEnemies = new Set();
    this.build();
  }

  build() {
    const el = document.createElement("div");
    el.id = "admin-panel";
    el.hidden = true;
    el.innerHTML = `
      <style>${AdminPanel.css()}</style>
      <div class="adm-backdrop"></div>
      <div class="adm-window">
        <header class="adm-header">
          <span class="adm-badge">⚙ DEVELOPMENT TOOLS</span>
          <span class="adm-close" title="Đóng (F10 / ESC)">✕</span>
        </header>
        <nav class="adm-tabs"></nav>
        <div class="adm-body"></div>
      </div>
    `;
    document.body.appendChild(el);
    this.container = el;
    el.querySelector(".adm-close").addEventListener("click", () => this.toggle());
    el.querySelector(".adm-backdrop").addEventListener("click", () => this.toggle());
    el.addEventListener("mousedown", (e) => e.stopPropagation());
    el.addEventListener("pointerdown", (e) => e.stopPropagation());
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); this.toggle(); } });
    const nav = el.querySelector(".adm-tabs");
    for (const tab of TABS) {
      const btn = document.createElement("button");
      btn.textContent = TAB_LABELS[tab];
      btn.dataset.tab = tab;
      btn.addEventListener("click", () => this.switchTab(tab));
      nav.appendChild(btn);
    }
  }

  toggle() {
    this.open = !this.open;
    this.container.hidden = !this.open;
    if (this.open) {
      this.render();
    } else {
      this.game.input.clear();
    }
  }

  switchTab(tab) {
    this.activeTab = tab;
    this.render();
  }

  render() {
    if (!this.open) return;
    const nav = this.container.querySelector(".adm-tabs");
    for (const btn of nav.children) btn.classList.toggle("active", btn.dataset.tab === this.activeTab);
    const body = this.container.querySelector(".adm-body");
    body.innerHTML = "";
    const fn = {
      character: () => this.renderCharacter(body),
      map: () => this.renderMap(body),
      enemies: () => this.renderEnemies(body),
      quests: () => this.renderQuests(body),
      items: () => this.renderItems(body),
      cultivation: () => this.renderCultivation(body),
      save: () => this.renderSave(body),
    };
    fn[this.activeTab]?.();
  }

  // --- CHARACTER ---
  renderCharacter(body) {
    const g = this.game;
    const p = g.player;
    const className = ClassConfig.classes[p.classId]?.name ?? p.classId;
    body.innerHTML = `
      <div class="adm-section">
        <h3>Thông tin nhân vật</h3>
        <table class="adm-info"><tbody>
          <tr><td>Tên</td><td>${p.name}</td></tr>
          <tr><td>Lớp</td><td>${className}</td></tr>
          <tr><td>Cấp</td><td>${p.level}</td></tr>
          <tr><td>Cảnh giới</td><td>${p.realm}</td></tr>
          <tr><td>HP</td><td>${p.hp} / ${p.maxHp}</td></tr>
          <tr><td>MP</td><td>${Math.floor(p.mp)} / ${p.maxMp}</td></tr>
          <tr><td>EXP</td><td>${p.exp} / ${g.progression.getRequiredExperience(p.level) || "MAX"}</td></tr>
          <tr><td>Điểm thuộc tính</td><td>${p.attributePoints}</td></tr>
          <tr><td>Điểm kỹ năng</td><td>${p.skillPoints}</td></tr>
          <tr><td>Tiền</td><td>${p.coins}</td></tr>
          <tr><td>Bản đồ</td><td>${g.mapSystem.currentMap.name}</td></tr>
          <tr><td>Tọa độ</td><td>${Math.round(p.x)}, ${Math.round(p.y)}</td></tr>
          <tr><td>Thuộc tính</td><td>STR ${p.attributes.str} · CON ${p.attributes.con} · AGI ${p.attributes.agi} · SPR ${p.attributes.spr}</td></tr>
        </tbody></table>
      </div>
      <div class="adm-section">
        <h3>Hành động kiểm thử</h3>
        <div class="adm-row">
          <label>Đặt cấp: <input type="number" id="adm-set-level" min="1" max="${CultivationConfig.maxLevel}" value="${p.level}" class="adm-num"></label>
          <button id="adm-apply-level">Áp dụng</button>
        </div>
        <div class="adm-row">
          <label>Thêm EXP: <input type="number" id="adm-add-exp" value="100" min="1" class="adm-num"></label>
          <button id="adm-apply-exp">Thêm</button>
          <button id="adm-remove-exp">Trừ</button>
        </div>
        <div class="adm-row">
          <button id="adm-add-ap">+5 Điểm thuộc tính</button>
          <button id="adm-add-sp">+1 Điểm kỹ năng</button>
        </div>
        <div class="adm-row">
          <button id="adm-full-hp">Hồi đầy HP</button>
          <button id="adm-full-mp">Hồi đầy MP</button>
          <button id="adm-set-hp1">HP = 1</button>
          <button id="adm-kill">Đánh bại</button>
          <button id="adm-revive">Hồi sinh</button>
        </div>
        <div class="adm-row">
          <label>Đổi lớp:</label>
          ${Object.entries(ClassConfig.classes).map(([id, cls]) =>
            `<button class="adm-class-switch" data-class="${id}" ${id === p.classId ? 'disabled' : ''}>${cls.name}</button>`
          ).join("")}
          <span class="adm-warn">⚠ Lưu ý: thay đổi class sẽ reset kỹ năng</span>
        </div>
      </div>
    `;
    body.querySelector("#adm-apply-level").addEventListener("click", () => {
      const target = parseInt(body.querySelector("#adm-set-level").value);
      if (!Number.isInteger(target) || target < 1 || target > CultivationConfig.maxLevel) return;
      this.setLevel(target);
      this.render();
    });
    body.querySelector("#adm-apply-exp").addEventListener("click", () => {
      const amount = parseInt(body.querySelector("#adm-add-exp").value);
      if (amount > 0) { g.progression.grantExperience(p, amount, p.x, p.y - 60); g.saveProgress(); this.render(); }
    });
    body.querySelector("#adm-remove-exp").addEventListener("click", () => {
      const amount = parseInt(body.querySelector("#adm-add-exp").value);
      if (amount > 0) { p.exp = Math.max(0, p.exp - amount); g.saveProgress(); this.render(); }
    });
    body.querySelector("#adm-add-ap").addEventListener("click", () => { p.attributePoints += 5; g.saveProgress(); this.render(); });
    body.querySelector("#adm-add-sp").addEventListener("click", () => { p.skillPoints += 1; g.saveProgress(); this.render(); });
    body.querySelector("#adm-full-hp").addEventListener("click", () => { p.hp = p.maxHp; this.render(); });
    body.querySelector("#adm-full-mp").addEventListener("click", () => { p.mp = p.maxMp; this.render(); });
    body.querySelector("#adm-set-hp1").addEventListener("click", () => { p.hp = 1; p.healthBarRemaining = 3; this.render(); });
    body.querySelector("#adm-kill").addEventListener("click", () => { p.hp = 0; p.defeated = true; this.render(); });
    body.querySelector("#adm-revive").addEventListener("click", () => { p.respawn(1, 1); this.render(); });
    for (const btn of body.querySelectorAll(".adm-class-switch")) {
      btn.addEventListener("click", () => {
        if (!confirm(`Đổi class sang ${ClassConfig.classes[btn.dataset.class].name}? Kỹ năng sẽ được khởi tạo lại.`)) return;
        this.switchClass(btn.dataset.class);
        this.render();
      });
    }
  }

  setLevel(target) {
    const g = this.game;
    const p = g.player;
    if (target === p.level) return;
    if (target > p.level) {
      while (p.level < target && p.level < CultivationConfig.maxLevel) {
        g.progression.applyLevelUp(p, true);
      }
    } else {
      const classData = ClassConfig.classes[p.classId];
      const initialStats = classData.initialStats;
      const growth = classData.growthPerLevel ?? CultivationConfig.growthPerLevel;
      p.level = target;
      p.baseMaxHp = initialStats.maxHp + (target - 1) * growth.maxHp;
      p.baseMaxMp = initialStats.maxMp + (target - 1) * growth.maxMp;
      p.baseStats.attack = initialStats.attack + (target - 1) * growth.attack;
      p.baseStats.defense = initialStats.defense + (target - 1) * growth.defense;
      p.baseStats.spirit = initialStats.spirit + (target - 1) * growth.spirit;
      p.baseStats.agility = initialStats.agility + (target - 1) * growth.agility;
      g.attributeSystem.recalculate(p);
      p.hp = Math.min(p.hp, p.maxHp);
      p.mp = Math.min(p.mp, p.maxMp);
    }
    p.exp = 0;
    g.attributeSystem.recalculate(p);
    g.saveProgress();
  }

  switchClass(classId) {
    const g = this.game;
    const p = g.player;
    p.classId = classId;
    const classData = ClassConfig.classes[classId];
    p.skillLevels = {};
    for (const skill of classData.skills) p.skillLevels[skill.id] = skill.initialLevel;
    g.skillSystem.initializePlayer(p);
    g.combat.basicAttack = g.skillSystem.getClass(p).basicAttack;
    const weapon = ItemConfig.startingEquipment[classId]?.weapon;
    if (weapon) p.equipment.weapon = weapon;
    g.attributeSystem.recalculate(p);
    p.hp = Math.min(p.hp, p.maxHp);
    p.mp = Math.min(p.mp, p.maxMp);
    g.saveProgress();
  }

  // --- MAP ---
  renderMap(body) {
    const g = this.game;
    const maps = MapConfig.order.map((id) => MapConfig.maps[id]);
    body.innerHTML = `
      <div class="adm-section">
        <h3>Danh sách bản đồ</h3>
        <table class="adm-info"><thead><tr><th>Tên</th><th>Cấp</th><th>Cảnh giới</th><th>Quái hiện tại</th><th></th></tr></thead><tbody>
          ${maps.map((m) => {
            const isCurrent = m.id === g.mapSystem.currentMapId;
            const enemyCount = isCurrent ? g.enemies.filter((e) => !e.defeated).length : "-";
            return `<tr class="${isCurrent ? "adm-current" : ""}">
              <td>${m.name}</td><td>${m.recommendedLevel}</td><td>${m.requiredRealmId}</td><td>${enemyCount}</td>
              <td>${isCurrent ? '<span class="adm-here">Đang ở đây</span>' : `<button class="adm-tp" data-map="${m.id}">Dịch chuyển</button>`}</td>
            </tr>`;
          }).join("")}
        </tbody></table>
      </div>
      <div class="adm-section">
        <h3>Thông tin bản đồ hiện tại</h3>
        <p>Lối ra: ${g.mapSystem.currentMap.exits.map((e) => e.label).join(", ") || "Không có"}</p>
        <p>Vùng spawn: ${(EnemyConfig.maps[g.mapSystem.currentMapId]?.regions ?? []).map((r) => `${r.id} (${r.enemyType} Lv${r.minLevel}-${r.maxLevel})`).join(", ") || "Không có"}</p>
      </div>
    `;
    for (const btn of body.querySelectorAll(".adm-tp")) {
      btn.addEventListener("click", () => {
        const mapId = btn.dataset.map;
        const map = MapConfig.maps[mapId];
        if (!map) return;
        const entry = map.entries.start ?? map.entries.west ?? Object.values(map.entries)[0];
        g.mapSystem.currentMapId = mapId;
        g.mapSystem.discovered[mapId] = true;
        g.loadMap(map, entry);
        g.camera.snapTo(g.player);
        this.render();
      });
    }
  }

  // --- ENEMIES ---
  renderEnemies(body) {
    const g = this.game;
    const archetypes = Object.values(EnemyConfig.archetypes);
    body.innerHTML = `
      <div class="adm-section">
        <h3>Spawn quái vật</h3>
        <div class="adm-row">
          <select id="adm-enemy-type">${archetypes.map((a) => `<option value="${a.id}">${a.name} (${a.id}, Lv${a.levelRange[0]}-${a.levelRange[1]})</option>`).join("")}</select>
          <label>Cấp: <input type="number" id="adm-enemy-level" min="1" max="36" value="1" class="adm-num"></label>
          <button id="adm-spawn-enemy">Spawn gần player</button>
        </div>
        <div class="adm-row">
          <label><input type="checkbox" id="adm-enemy-reward"> Cho phép phần thưởng (EXP, quest, loot)</label>
        </div>
      </div>
      <div class="adm-section">
        <h3>Quái vật hiện tại (${g.enemies.filter((e) => !e.defeated).length} sống / ${g.enemies.length} tổng)</h3>
        <div class="adm-row">
          <button id="adm-kill-all">Giết tất cả quái</button>
          <button id="adm-clear-admin">Xóa quái admin-spawn</button>
          <button id="adm-respawn-all">Respawn tất cả</button>
        </div>
        <div class="adm-enemy-list">${g.enemies.filter((e) => !e.defeated).map((e, i) =>
          `<span class="adm-enemy-tag ${this.adminSpawnedEnemies.has(e) ? 'adm-admin-tag' : ''}">${e.name} Lv${e.level} ${this.adminSpawnedEnemies.has(e) ? '[ADMIN]' : ''}</span>`
        ).join("")}</div>
      </div>
    `;
    body.querySelector("#adm-spawn-enemy").addEventListener("click", () => {
      const typeId = body.querySelector("#adm-enemy-type").value;
      const archetype = EnemyConfig.archetypes[typeId];
      if (!archetype) return;
      const level = Math.max(archetype.levelRange[0], Math.min(archetype.levelRange[1], parseInt(body.querySelector("#adm-enemy-level").value) || 1));
      const allowReward = body.querySelector("#adm-enemy-reward").checked;
      const scale = EnemyConfig.scaling;
      const angle = Math.random() * Math.PI * 2;
      const dist = 200;
      const enemy = new Enemy({
        id: `admin-${Date.now()}`, enemyType: typeId, level, zoneId: "admin",
        name: `[ADM] ${archetype.name}`, species: archetype.species,
        x: g.player.x + Math.cos(angle) * dist, y: g.player.y + Math.sin(angle) * dist,
        speed: archetype.baseSpeed + Math.min(scale.speedBonusCap, (level - 1) * scale.speedPerLevel),
        maxHp: Math.round(archetype.baseHp * (1 + (level - 1) * scale.hpPerLevel)),
        damage: Math.round(archetype.baseAttack * (1 + (level - 1) * scale.attackPerLevel)),
        defense: Math.round(archetype.baseDefense + (level - 1) * scale.defensePerLevel),
        attackRange: archetype.attackRange, attackCooldown: archetype.attackCooldown, attackWindup: archetype.attackWindup,
        expReward: allowReward ? Math.round(archetype.baseExp * (1 + (level - 1) * scale.expPerLevel)) : 0,
        lootTableId: allowReward ? archetype.lootTableId : null,
        respawnDelay: 9999, collisionRadius: archetype.collisionRadius,
        territory: { x: g.player.x - 400, y: g.player.y - 400, width: 800, height: 800 },
        color: archetype.color, detectionRange: archetype.aggroRange, leashRange: archetype.leashRange,
      });
      if (!allowReward) {
        const origOnDefeat = g.combat.onEnemyDefeated;
        const wrapped = g.combat.onEnemyDefeated;
        // Admin enemy without rewards: skip quest credit by not calling onDefeat
      }
      g.enemies.push(enemy);
      this.adminSpawnedEnemies.add(enemy);
      this.render();
    });
    body.querySelector("#adm-kill-all").addEventListener("click", () => {
      for (const e of g.enemies) if (!e.defeated) { e.hp = 0; e.defeated = true; }
      this.render();
    });
    body.querySelector("#adm-clear-admin").addEventListener("click", () => {
      g.enemies = g.enemies.filter((e) => !this.adminSpawnedEnemies.has(e));
      this.adminSpawnedEnemies.clear();
      this.render();
    });
    body.querySelector("#adm-respawn-all").addEventListener("click", () => {
      for (const e of g.enemies) { e.hp = e.maxHp; e.defeated = false; e.state = "idle"; }
      this.render();
    });
  }

  // --- QUESTS ---
  renderQuests(body) {
    const g = this.game;
    const quests = QuestConfig.quests;
    body.innerHTML = `
      <div class="adm-section">
        <h3>Nhiệm vụ (${quests.length})</h3>
        <div class="adm-quest-list">
          ${quests.map((q) => {
            const state = g.questSystem.getState(q.id);
            const completed = g.questSystem.isComplete(q.id);
            const status = completed ? "✅ Hoàn thành" : state ? "📋 Đang nhận" : "⬜ Chưa nhận";
            return `<div class="adm-quest-item">
              <div class="adm-quest-header">
                <strong>${q.title}</strong> <em>(${q.id})</em> <span class="adm-status">${status}</span>
              </div>
              <div class="adm-quest-detail">
                <small>Loại: ${q.type} | NPC: ${q.giverNpcId} → ${q.turnInNpcId}</small>
                ${q.prerequisites ? `<small>Yêu cầu: Lv${q.prerequisites.level ?? "?"}, Quest: ${q.prerequisites.completedQuestId ?? "không"}</small>` : ""}
                <div>${q.objectives.map((obj) => {
                  const progress = state?.progress?.[obj.id] ?? 0;
                  return `<span class="adm-obj">${obj.label}: ${progress}/${obj.amount}</span>`;
                }).join(" ")}</div>
                <div class="adm-row">
                  ${!completed && !state ? `<button class="adm-q-accept" data-q="${q.id}">Nhận</button>` : ""}
                  ${state && !completed ? `<button class="adm-q-complete-obj" data-q="${q.id}">Hoàn thành mục tiêu</button>` : ""}
                  ${state && !completed ? `<button class="adm-q-turn-in" data-q="${q.id}">Nộp (không thưởng)</button>` : ""}
                  ${(state || completed) ? `<button class="adm-q-reset" data-q="${q.id}">Reset</button>` : ""}
                </div>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>
    `;
    for (const btn of body.querySelectorAll(".adm-q-accept")) {
      btn.addEventListener("click", () => {
        const q = g.questSystem.getDefinition(btn.dataset.q);
        if (!q) return;
        g.questSystem.accepted[q.id] = { progress: Object.fromEntries(q.objectives.map((o) => [o.id, 0])) };
        if (!g.questSystem.trackedQuestId) g.questSystem.trackedQuestId = q.id;
        g.saveProgress();
        this.render();
      });
    }
    for (const btn of body.querySelectorAll(".adm-q-complete-obj")) {
      btn.addEventListener("click", () => {
        const q = g.questSystem.getDefinition(btn.dataset.q);
        const state = g.questSystem.getState(btn.dataset.q);
        if (!q || !state) return;
        for (const obj of q.objectives) state.progress[obj.id] = obj.amount;
        g.saveProgress();
        this.render();
      });
    }
    for (const btn of body.querySelectorAll(".adm-q-turn-in")) {
      btn.addEventListener("click", () => {
        const qId = btn.dataset.q;
        delete g.questSystem.accepted[qId];
        g.questSystem.completed[qId] = true;
        if (g.questSystem.trackedQuestId === qId) g.questSystem.trackedQuestId = null;
        g.saveProgress();
        this.render();
      });
    }
    for (const btn of body.querySelectorAll(".adm-q-reset")) {
      btn.addEventListener("click", () => {
        if (!confirm(`Reset quest "${btn.dataset.q}"? Trạng thái sẽ quay về chưa nhận.`)) return;
        delete g.questSystem.accepted[btn.dataset.q];
        delete g.questSystem.completed[btn.dataset.q];
        if (g.questSystem.trackedQuestId === btn.dataset.q) g.questSystem.trackedQuestId = null;
        g.saveProgress();
        this.render();
      });
    }
  }

  // --- ITEMS ---
  renderItems(body) {
    const g = this.game;
    const p = g.player;
    const allItems = Object.values(ItemConfig.items);
    body.innerHTML = `
      <div class="adm-section">
        <h3>Thêm vật phẩm</h3>
        <div class="adm-row">
          <input type="text" id="adm-item-search" placeholder="Tìm kiếm ID hoặc tên..." class="adm-search">
          <label>Số lượng: <input type="number" id="adm-item-qty" value="1" min="1" max="99" class="adm-num"></label>
          <label><input type="checkbox" id="adm-ignore-limit"> Bỏ qua giới hạn túi đồ</label>
        </div>
        <div id="adm-item-results" class="adm-item-grid"></div>
      </div>
      <div class="adm-section">
        <h3>Tiền và nguyên liệu</h3>
        <div class="adm-row">
          <label>Tiền: <input type="number" id="adm-coins" value="100" min="1" class="adm-num"></label>
          <button id="adm-add-coins">Thêm</button>
          <button id="adm-remove-coins">Trừ</button>
          <span>Hiện có: ${p.coins}</span>
        </div>
      </div>
      <div class="adm-section">
        <h3>Túi đồ (${p.inventory.length}/${ItemConfig.inventory.slotLimit})</h3>
        <div class="adm-inv-list">${p.inventory.map((entry, i) => {
          const item = ItemConfig.items[entry.itemId];
          return `<span class="adm-inv-tag">${item?.name ?? entry.itemId} x${entry.quantity}</span>`;
        }).join("") || "<em>Trống</em>"}</div>
      </div>
      <div class="adm-section">
        <h3>Trang bị</h3>
        <table class="adm-info"><tbody>${ItemConfig.equipmentSlots.map((slot) => {
          const equipped = p.equipment[slot.id];
          const item = equipped ? ItemConfig.items[equipped] : null;
          return `<tr><td>${slot.name}</td><td>${item ? item.name : "Trống"}</td><td>${equipped ? `<button class="adm-unequip" data-slot="${slot.id}">Tháo</button>` : ""}</td></tr>`;
        }).join("")}</tbody></table>
      </div>
    `;
    const searchInput = body.querySelector("#adm-item-search");
    const resultsDiv = body.querySelector("#adm-item-results");
    const renderResults = () => {
      const query = searchInput.value.toLowerCase().trim();
      const filtered = query ? allItems.filter((item) => item.id.includes(query) || item.name.toLowerCase().includes(query)).slice(0, 30) : allItems.slice(0, 30);
      resultsDiv.innerHTML = filtered.map((item) =>
        `<button class="adm-item-btn" data-item="${item.id}" title="${item.description ?? ""}">${item.name} <small>(${item.type})</small></button>`
      ).join("");
      for (const btn of resultsDiv.querySelectorAll(".adm-item-btn")) {
        btn.addEventListener("click", () => {
          const qty = parseInt(body.querySelector("#adm-item-qty").value) || 1;
          const ignoreLimit = body.querySelector("#adm-ignore-limit").checked;
          this.addItem(btn.dataset.item, qty, ignoreLimit);
          this.render();
        });
      }
    };
    searchInput.addEventListener("input", renderResults);
    renderResults();
    body.querySelector("#adm-add-coins").addEventListener("click", () => {
      const amount = parseInt(body.querySelector("#adm-coins").value) || 0;
      if (amount > 0) { p.coins += amount; g.saveProgress(); this.render(); }
    });
    body.querySelector("#adm-remove-coins").addEventListener("click", () => {
      const amount = parseInt(body.querySelector("#adm-coins").value) || 0;
      if (amount > 0) { p.coins = Math.max(0, p.coins - amount); g.saveProgress(); this.render(); }
    });
    for (const btn of body.querySelectorAll(".adm-unequip")) {
      btn.addEventListener("click", () => {
        const slot = btn.dataset.slot;
        const itemId = p.equipment[slot];
        if (itemId) {
          g.inventorySystem.addItem(p, itemId, 1);
          p.equipment[slot] = null;
          g.attributeSystem.recalculate(p);
          g.saveProgress();
        }
        this.render();
      });
    }
  }

  addItem(itemId, quantity, ignoreLimit) {
    const g = this.game;
    const p = g.player;
    const item = ItemConfig.items[itemId];
    if (!item) return;
    if (item.type === "equipment" && !ignoreLimit && p.inventory.length >= ItemConfig.inventory.slotLimit) return;
    g.inventorySystem.addItem(p, itemId, quantity);
    g.attributeSystem.recalculate(p);
    g.saveProgress();
  }

  // --- CULTIVATION ---
  renderCultivation(body) {
    const g = this.game;
    const p = g.player;
    const info = g.progression.getBreakthroughInfo(p);
    const classData = ClassConfig.classes[p.classId];
    body.innerHTML = `
      <div class="adm-section">
        <h3>Đột phá cảnh giới</h3>
        <p>Hiện tại: <strong>${p.realm}</strong></p>
        ${info.nextStep ? `
          <p>Bước tiếp: ${info.nextStep.realm.name} · ${info.nextStep.stage.name} · ${g.progression.getSubLevelLabel(info.nextStep.subLevel)}</p>
          <p>Yêu cầu: Cấp ${info.requiredLevel}${info.missing.length ? ` | Thiếu: ${info.missing.join(", ")}` : " | ✅ Đủ điều kiện"}</p>
          <div class="adm-row">
            <button id="adm-try-break">Thử đột phá (kiểm tra điều kiện)</button>
            <button id="adm-force-break">Ép đột phá (bỏ qua điều kiện)</button>
          </div>
        ` : "<p>Đã đạt cảnh giới tối đa.</p>"}
      </div>
      <div class="adm-section">
        <h3>Kỹ năng lớp ${classData.name}</h3>
        <table class="adm-info"><thead><tr><th>Tên</th><th>Cấp</th><th>Yêu cầu</th><th>Hồi chiêu</th><th>MP</th><th></th></tr></thead><tbody>
          ${classData.skills.map((skill) => {
            const level = p.skillLevels[skill.id] ?? 0;
            const cd = g.skillSystem.getCooldown(skill.id);
            const levelData = level > 0 ? skill.levels[level - 1] : skill.levels[0];
            return `<tr>
              <td>${skill.name}</td><td>${level}/${skill.maxLevel}</td><td>Lv${skill.requiredLevel}</td>
              <td>${cd > 0 ? cd.toFixed(1) + "s" : "Sẵn sàng"}</td><td>${levelData.mpCost}</td>
              <td><button class="adm-reset-cd" data-skill="${skill.id}">Reset CD</button></td>
            </tr>`;
          }).join("")}
        </tbody></table>
        <div class="adm-row">
          <button id="adm-reset-all-cd">Reset tất cả CD</button>
          <button id="adm-grant-ap5">+5 Điểm thuộc tính</button>
          <button id="adm-grant-sp1">+1 Điểm kỹ năng</button>
        </div>
      </div>
    `;
    body.querySelector("#adm-try-break")?.addEventListener("click", () => {
      g.progression.attemptBreakthrough(p);
      g.saveProgress();
      this.render();
    });
    body.querySelector("#adm-force-break")?.addEventListener("click", () => {
      if (!info.nextStep) return;
      p.realmId = info.nextStep.realm.id;
      p.realmStageId = info.nextStep.stage.id;
      p.realmSubLevel = info.nextStep.subLevel;
      g.progression.syncRealmLabel(p);
      g.saveProgress();
      this.render();
    });
    for (const btn of body.querySelectorAll(".adm-reset-cd")) {
      btn.addEventListener("click", () => { g.skillSystem.cooldowns[btn.dataset.skill] = 0; this.render(); });
    }
    body.querySelector("#adm-reset-all-cd")?.addEventListener("click", () => {
      for (const key of Object.keys(g.skillSystem.cooldowns)) g.skillSystem.cooldowns[key] = 0;
      this.render();
    });
    body.querySelector("#adm-grant-ap5")?.addEventListener("click", () => { p.attributePoints += 5; g.saveProgress(); this.render(); });
    body.querySelector("#adm-grant-sp1")?.addEventListener("click", () => { p.skillPoints += 1; g.saveProgress(); this.render(); });
  }

  // --- SAVE/DEBUG ---
  renderSave(body) {
    const g = this.game;
    const p = g.player;
    body.innerHTML = `
      <div class="adm-section">
        <h3>Save System</h3>
        <table class="adm-info"><tbody>
          <tr><td>Phiên bản save</td><td>${g.config.save.version}</td></tr>
          <tr><td>Save hợp lệ</td><td>${g.saveSystem.hasValidCharacterSave() ? "✅ Có" : "❌ Không"}</td></tr>
          <tr><td>Autosave interval</td><td>${g.config.save.autosaveInterval}s</td></tr>
        </tbody></table>
        <div class="adm-row">
          <button id="adm-save-now">Lưu ngay</button>
          <button id="adm-reload-save">Tải lại save</button>
          <button id="adm-reset-save" class="adm-danger">Xóa save (Reset game)</button>
        </div>
      </div>
      <div class="adm-section">
        <h3>Thông tin debug</h3>
        <table class="adm-info"><tbody>
          <tr><td>FPS</td><td>${Math.round(g.fps)}</td></tr>
          <tr><td>Quái vật (sống/tổng)</td><td>${g.enemies.filter((e) => !e.defeated).length} / ${g.enemies.length}</td></tr>
          <tr><td>Projectiles</td><td>${g.combat.projectiles?.length ?? 0}</td></tr>
          <tr><td>Combat effects</td><td>${g.combat.effects?.length ?? 0}</td></tr>
          <tr><td>Ground loot</td><td>${g.lootSystem.groundLoot?.length ?? 0}</td></tr>
          <tr><td>NPCs</td><td>${g.npcs.length}</td></tr>
          <tr><td>Bản đồ hiện tại</td><td>${g.mapSystem.currentMapId}</td></tr>
          <tr><td>Bản đồ đã khám phá</td><td>${Object.keys(g.mapSystem.discovered).join(", ")}</td></tr>
        </tbody></table>
      </div>
    `;
    body.querySelector("#adm-save-now").addEventListener("click", () => {
      g.saveProgress();
      alert("Đã lưu thành công.");
    });
    body.querySelector("#adm-reload-save").addEventListener("click", () => {
      if (!confirm("Tải lại save? Thay đổi chưa lưu sẽ mất.")) return;
      window.location.reload();
    });
    body.querySelector("#adm-reset-save").addEventListener("click", () => {
      if (!confirm("XÓA TOÀN BỘ SAVE? Hành động không thể hoàn tác!")) return;
      if (!confirm("Xác nhận lần 2: Bạn chắc chắn muốn xóa save?")) return;
      g.saveSystem.clear();
      window.removeEventListener("pagehide", g.onPageHide);
      g.onPageHide = () => {};
      window.location.reload();
    });
  }

  static css() {
    return `
#admin-panel { position: fixed; inset: 0; z-index: 10000; font-family: system-ui, sans-serif; font-size: 14px; color: #e8e0d0; }
.adm-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.7); }
.adm-window { position: absolute; top: 20px; left: 20px; right: 20px; bottom: 20px; background: #1a1e1a; border: 2px solid #d4a030; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
.adm-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 18px; background: #252a22; border-bottom: 1px solid #3a3a2a; }
.adm-badge { color: #e8c040; font-weight: 700; font-size: 16px; letter-spacing: 1px; }
.adm-close { cursor: pointer; font-size: 22px; color: #aaa; padding: 4px 8px; }
.adm-close:hover { color: #fff; }
.adm-tabs { display: flex; gap: 2px; padding: 6px 12px; background: #1e221e; border-bottom: 1px solid #3a3a2a; flex-wrap: wrap; }
.adm-tabs button { padding: 6px 14px; background: #2a2e28; border: 1px solid #3a3e38; border-radius: 6px 6px 0 0; color: #b0a890; cursor: pointer; font-size: 13px; }
.adm-tabs button.active { background: #3a4038; color: #e8d898; border-bottom-color: #3a4038; }
.adm-tabs button:hover { background: #343a32; }
.adm-body { flex: 1; overflow-y: auto; padding: 16px; }
.adm-section { margin-bottom: 20px; padding: 14px; background: #222622; border: 1px solid #333830; border-radius: 8px; }
.adm-section h3 { margin: 0 0 10px; color: #d4a830; font-size: 15px; }
.adm-info { width: 100%; border-collapse: collapse; }
.adm-info th, .adm-info td { padding: 5px 10px; text-align: left; border-bottom: 1px solid #2a2e28; font-size: 13px; }
.adm-info th { color: #b0a880; }
.adm-current { background: #2a3828; }
.adm-here { color: #80c870; font-weight: 600; }
.adm-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 8px 0; }
.adm-num { width: 70px; padding: 4px 6px; background: #2a2e28; border: 1px solid #4a4e48; color: #e8e0d0; border-radius: 4px; }
.adm-search { width: 260px; padding: 5px 8px; background: #2a2e28; border: 1px solid #4a4e48; color: #e8e0d0; border-radius: 4px; }
button { padding: 5px 12px; background: #3a4838; border: 1px solid #5a6858; color: #d0e0c8; border-radius: 5px; cursor: pointer; font-size: 12px; }
button:hover { background: #4a5848; }
button:disabled { opacity: 0.4; cursor: default; }
.adm-danger { background: #5a2828; border-color: #8a3838; color: #e8a0a0; }
.adm-danger:hover { background: #6a3232; }
.adm-warn { color: #c8a040; font-size: 12px; }
.adm-status { font-size: 12px; margin-left: 8px; }
.adm-quest-item { padding: 8px; margin: 4px 0; background: #262a26; border-radius: 6px; }
.adm-quest-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.adm-quest-detail { margin-top: 6px; font-size: 12px; }
.adm-quest-detail small { display: block; color: #8a8870; }
.adm-obj { display: inline-block; padding: 2px 6px; background: #2e322e; border-radius: 3px; margin: 2px; font-size: 12px; }
.adm-item-grid { display: flex; flex-wrap: wrap; gap: 4px; max-height: 200px; overflow-y: auto; margin-top: 8px; }
.adm-item-btn { font-size: 11px; padding: 4px 8px; }
.adm-inv-list { display: flex; flex-wrap: wrap; gap: 4px; }
.adm-inv-tag { padding: 3px 8px; background: #2e3228; border-radius: 4px; font-size: 12px; }
.adm-enemy-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.adm-enemy-tag { padding: 3px 8px; background: #2e2828; border-radius: 4px; font-size: 12px; }
.adm-admin-tag { background: #3a2a18; border: 1px solid #6a4a20; }
.adm-quest-list { max-height: 500px; overflow-y: auto; }
    `;
  }
}
