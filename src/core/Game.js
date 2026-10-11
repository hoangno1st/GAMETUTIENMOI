import { GameConfig } from "../config/GameConfig.js";
import { CultivationConfig } from "../config/CultivationConfig.js";
import { ClassConfig } from "../config/ClassConfig.js";
import { ItemConfig } from "../config/ItemConfig.js";
import { createCultivatorSprites } from "../assets/ProceduralSprites.js";
import { NPC } from "../entities/NPC.js";
import { Player } from "../entities/Player.js";
import { Renderer } from "../systems/Renderer.js";
import { CombatSystem } from "../systems/CombatSystem.js";
import { UISystem } from "../systems/UISystem.js";
import { WorldSystem } from "../systems/WorldSystem.js";
import { InteractionSystem } from "../systems/InteractionSystem.js";
import { SaveSystem } from "../systems/SaveSystem.js";
import { ProgressionSystem } from "../systems/ProgressionSystem.js";
import { AttributeSystem } from "../systems/AttributeSystem.js";
import { SkillSystem } from "../systems/SkillSystem.js";
import { InventorySystem } from "../systems/InventorySystem.js";
import { LootSystem } from "../systems/LootSystem.js";
import { Camera } from "./Camera.js";
import { Input } from "./Input.js";
import { QuestConfig } from "../config/QuestConfig.js";
import { QuestSystem } from "../systems/QuestSystem.js";
import { CraftingConfig } from "../config/CraftingConfig.js";
import { CultivationActivitySystem } from "../systems/CultivationActivitySystem.js";
import { CraftingSystem } from "../systems/CraftingSystem.js";
import { CompanionConfig } from "../config/CompanionConfig.js";
import { CompanionSystem } from "../systems/CompanionSystem.js";
import { MapConfig } from "../config/MapConfig.js";
import { MapSystem } from "../systems/MapSystem.js";
import { EnemyConfig } from "../config/EnemyConfig.js";
import { MapEnemySystem } from "../systems/MapEnemySystem.js";
import { ExplorationSystem } from "../systems/ExplorationSystem.js";
import { AudioSystem } from "../systems/AudioSystem.js";
import { ContentRegistry } from "../config/ContentRegistry.js";
import { validateContent, reportContentValidation } from "../systems/ContentValidator.js";
import { AdminPanel } from "../systems/AdminPanel.js";

function getLocalStorageSafely() {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn("Local save storage is unavailable; continuing without persistence.", error);
    return null;
  }
}

export class Game {
  constructor(canvas) {
    this.config = GameConfig;
    this.developmentMode = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
    this.contentValidation = this.developmentMode
      ? reportContentValidation(validateContent(ContentRegistry, {
        realmIds: new Set(CultivationConfig.realms.map((realm) => realm.id)),
        companions: CompanionConfig.companions,
        recipes: CraftingConfig.recipes,
      }))
      : null;
    if (this.contentValidation && !this.contentValidation.valid) throw new Error("Dữ liệu nội dung không hợp lệ; xem Console để biết đường dẫn lỗi.");
    this.canvas = canvas;
    this.input = new Input(window, canvas, GameConfig.input);
    this.renderer = new Renderer(
      canvas,
      GameConfig.resolution.width,
      GameConfig.resolution.height,
    );
    this.saveSystem = new SaveSystem(getLocalStorageSafely(), GameConfig.save);
    this.settings = this.saveSystem.loadSettings();
    this.audioSystem = new AudioSystem(this.settings);

    this.classSelectionActive = false;
    this.classSelectionIndex = 0;
    this.classIds = Object.keys(ClassConfig.classes);
    this.creationName = "";

    const hasSave = this.saveSystem.hasValidCharacterSave();
    if (!hasSave) {
      this.classSelectionActive = true;
      this.setupCharacterCreation();
      this.previousTime = 0;
      this.fps = 60;
      this.frameCount = 0;
      this.fpsElapsed = 0;
      this.isRunning = false;
      this.frame = this.frame.bind(this);
      this.onPageHide = () => {};
      return;
    }

    this.initializeGame(ClassConfig.defaultClassId);
  }

  initializeGame(classId, newCharacterName = null) {
    this.classSelectionActive = false;
    this.teardownCharacterCreation();
    this.mapSystem = new MapSystem(MapConfig, ItemConfig.realmOrder);
    this.enemySpawnSystem = new MapEnemySystem(EnemyConfig);
    this.explorationSystem = new ExplorationSystem(GameConfig.npcs.interactionRange);
    this.world = new WorldSystem(this.mapSystem.currentMap.world, this.mapSystem.currentMap);
    this.explorationSystem.loadMap(this.world.specialObjects);
    this.attributeSystem = new AttributeSystem(ClassConfig, ItemConfig);
    this.progression = new ProgressionSystem(CultivationConfig, this.attributeSystem);
    this.skillSystem = new SkillSystem(ClassConfig);
    this.inventorySystem = new InventorySystem(ItemConfig, this.attributeSystem);
    this.questSystem = new QuestSystem(QuestConfig);
    this.activitySystem = new CultivationActivitySystem(CraftingConfig);
    this.craftingSystem = new CraftingSystem(CraftingConfig, ItemConfig, this.inventorySystem, this.attributeSystem);
    this.companionSystem = new CompanionSystem();
    this.inventorySystem.onItemAdded = (itemId, quantity) => this.questSystem.onCollect(itemId, quantity);
    this.ui = new UISystem(GameConfig, CultivationConfig, ClassConfig, ItemConfig);
    this.selectedClassId = classId;
    this.player = new Player(
      GameConfig.player,
      createCultivatorSprites(GameConfig.sprites.sourceSize),
      GameConfig.world,
      GameConfig.sprites.playerRenderSize,
      GameConfig.ui.showPlayerWorldHealthBar,
      CultivationConfig,
      ClassConfig,
      ItemConfig,
      classId,
    );
    this.inventorySystem.onUse = () => this.audioSystem.play("heal");
    this.ui.showDebug = this.settings.showDebug;
    this.progression.onEvent = (kind) => { this.audioSystem.play(kind === "breakthrough" ? "breakthrough" : "quest"); if (kind === "breakthrough") this.camera?.shake(11, 0.32); };
    this.restoreCharacter();
    if (newCharacterName !== null) this.player.name = newCharacterName;
    this.world = new WorldSystem(this.mapSystem.currentMap.world, this.mapSystem.currentMap);
    this.audioSystem.desiredTheme = this.mapSystem.currentMap.world.theme;
    this.explorationSystem.loadMap(this.world.specialObjects);
    this.player.worldConfig = this.mapSystem.currentMap.world;
    if (this.player.collidesWithObstacle(this.world.obstacles)) {
      const fallbackEntry = this.mapSystem.currentMap.entries.start ?? Object.values(this.mapSystem.currentMap.entries)[0];
      this.player.x = fallbackEntry.x; this.player.y = fallbackEntry.y; this.player.spawnX = fallbackEntry.x; this.player.spawnY = fallbackEntry.y;
    }
    this.npcs = this.createNpcs();
    this.enemies = this.createEnemies();
    this.lootSystem = new LootSystem(ItemConfig, this.inventorySystem);
    this.lootSystem.onPickup = () => this.audioSystem.play("pickup");
    this.interaction = new InteractionSystem(GameConfig.npcs.interactionRange);
    this.combat = new CombatSystem(
      this.skillSystem.getClass(this.player).basicAttack,
      GameConfig.player.respawn,
      this.progression,
      (enemy) => {
        this.lootSystem.spawnDrops(enemy);
        this.questSystem.onDefeat(enemy);
        if (this.companionSystem.activeId) {
          this.companionSystem.grantExp(Math.ceil(enemy.expReward * this.companionSystem.config.expShareRatio));
        }
      },
    );
    this.combat.maxEffects = GameConfig.feedback.maxCombatEffects;
    this.combat.maxFloatingTexts = GameConfig.feedback.maxFloatingTexts;
    this.combat.onEvent = (kind) => { this.audioSystem.play(kind === "player-hit" || kind === "player-defeat" ? "hit" : kind); if (kind === "player-defeat" || kind === "defeat") this.camera?.shake(kind === "player-defeat" ? 10 : 5, 0.2); };
    this.camera = new Camera(
      GameConfig.resolution.width,
      GameConfig.resolution.height,
      GameConfig.world.width,
      GameConfig.world.height,
      GameConfig.camera.followSharpness,
    );
    this.camera.snapTo(this.player);

    this.resetConfirmOpen = false;
    if (!this.previousTime) this.previousTime = 0;
    if (!this.fps) this.fps = 60;
    this.frameCount = this.frameCount ?? 0;
    this.fpsElapsed = this.fpsElapsed ?? 0;
    this.isRunning = this.isRunning ?? false;
    this.autosaveElapsed = 0;
    if (!this._frameBound) { this.frame = this.frame.bind(this); this._frameBound = true; }
    if (this.onPageHide) window.removeEventListener("pagehide", this.onPageHide);
    this.onPageHide = () => this.saveProgress();
    window.addEventListener("pagehide", this.onPageHide);
    if (newCharacterName !== null) this.saveProgress();
    if (this.developmentMode && !this.adminPanel) {
      this.adminPanel = new AdminPanel(this);
      window.addEventListener("keydown", (e) => {
        if (e.code === "F10" && this.developmentMode && !this.classSelectionActive) { e.preventDefault(); this.adminPanel.toggle(); }
      });
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    if (!this._frameBound) { this.frame = this.frame.bind(this); this._frameBound = true; }
    requestAnimationFrame(this.frame);
  }

  setupCharacterCreation() {
    const screen = document.querySelector("#character-creation");
    if (!screen) return;
    this.creationScreen = screen;
    this.creationNameInput = screen.querySelector("#character-name");
    this.creationError = screen.querySelector("#character-name-error");
    this.creationConfirm = screen.querySelector("#confirm-character");
    this.creationCards = [...screen.querySelectorAll("[data-class-id]")];

    for (const card of this.creationCards) {
      const classData = ClassConfig.classes[card.dataset.classId];
      const weapon = ItemConfig.items[classData.starterWeaponId];
      card.querySelector("[data-role='style']").textContent = classData.combatStyle;
      card.querySelector("[data-role='stats']").textContent = `HP ${classData.initialStats.maxHp} · MP ${classData.initialStats.maxMp} · Công ${classData.initialStats.attack} · Thủ ${classData.initialStats.defense} · Thần ${classData.initialStats.spirit}`;
      card.querySelector("[data-role='weapon']").textContent = `Vũ khí: ${weapon?.name ?? "Chưa xác định"}`;
      card.querySelector("[data-role='skills']").textContent = `Bộ kỹ năng: ${classData.skills.map((skill) => skill.name).join(" · ")}`;
      card.addEventListener("click", () => this.selectCreationClass(card.dataset.classId));
    }

    this.creationNameInput.addEventListener("keydown", (e) => e.stopPropagation());
    this.creationNameInput.addEventListener("keyup", (e) => e.stopPropagation());
    this.creationNameInput.addEventListener("input", () => this.validateCreationForm());
    screen.querySelector("#back-character").addEventListener("click", () => {
      this.creationNameInput.value = "";
      this.classSelectionIndex = 0;
      this.selectCreationClass(this.classIds[0]);
      this.validateCreationForm();
      this.creationNameInput.focus();
    });
    screen.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const validation = this.validateCharacterName(this.creationNameInput.value);
      if (!validation.valid) return this.validateCreationForm();
      this.initializeGame(this.classIds[this.classSelectionIndex], validation.name);
    });
    screen.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); event.stopPropagation();
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        this.classSelectionIndex = (this.classSelectionIndex + direction + this.classIds.length) % this.classIds.length;
        this.selectCreationClass(this.classIds[this.classSelectionIndex]);
      } else if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation();
        screen.querySelector("#back-character").click();
      } else if (event.key === "Enter" && event.target !== this.creationNameInput) {
        event.stopPropagation();
      }
    });
    screen.hidden = false;
    this.selectCreationClass(this.classIds[0]);
    this.validateCreationForm();
    requestAnimationFrame(() => this.creationNameInput.focus());
  }

  teardownCharacterCreation() {
    if (this.creationScreen) this.creationScreen.hidden = true;
    this.input.clear();
  }

  selectCreationClass(classId) {
    const index = this.classIds.indexOf(classId);
    if (index < 0) return;
    this.classSelectionIndex = index;
    for (const card of this.creationCards ?? []) {
      const selected = card.dataset.classId === classId;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-pressed", String(selected));
      card.querySelector("[data-role='selection']").textContent = selected ? "✓ Đang chọn" : "Chọn môn phái";
    }
    this.validateCreationForm();
  }

  validateCharacterName(value) {
    const name = value.trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > 20) return { valid: false, name, error: "Tên phải có từ 2 đến 20 ký tự." };
    if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(name)) return { valid: false, name, error: "Tên chỉ dùng chữ cái, khoảng trắng, dấu chấm, nháy hoặc gạch nối." };
    return { valid: true, name, error: "" };
  }

  validateCreationForm() {
    if (!this.creationNameInput) return false;
    const result = this.validateCharacterName(this.creationNameInput.value);
    this.creationError.textContent = this.creationNameInput.value.length ? result.error : "Nhập tên để tiếp tục.";
    this.creationNameInput.setAttribute("aria-invalid", String(!result.valid));
    this.creationConfirm.disabled = !result.valid || this.classSelectionIndex < 0;
    return result.valid;
  }

  updateClassSelection() {
    this.input.clear();
  }

  renderClassSelection() {
    const ctx = this.renderer.context;
    ctx.clearRect(0, 0, this.renderer.width, this.renderer.height);
    ctx.fillStyle = "rgb(5 14 11)";
    ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#e8c96f";
    ctx.font = "600 42px Georgia, serif";
    ctx.fillText("Khởi tạo linh mạch", 960, 300);
    ctx.fillStyle = "#9fc5ad";
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText("Tân đệ tử đang ghi danh tại Tĩnh Lam Môn", 960, 350);
    ctx.restore();
  }

  frame(timestamp) {
    if (!this.isRunning) return;

    if (this.previousTime === 0) this.previousTime = timestamp;
    const rawDeltaTime = (timestamp - this.previousTime) / 1000;
    const deltaTime = Math.min(rawDeltaTime, 0.05);
    this.previousTime = timestamp;

    this.update(deltaTime);
    this.render();
    this.updateFps(rawDeltaTime);
    requestAnimationFrame(this.frame);
  }

  update(deltaTime) {
    if (this.classSelectionActive) {
      this.updateClassSelection();
      return;
    }
    if (this.adminPanel?.open) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      this.camera.update(this.player, deltaTime);
      return;
    }
    const interactPressed = this.input.consumeAction("interact");
    const escapePressed = this.input.consumeAction("closePanel");
    const basicAttackPressed = this.input.consumeBasicAttack();
    const pointerClick = this.input.consumePointerClick();
    const skillRequests = new Map();
    for (const skill of this.skillSystem.getClass(this.player).skills) {
      skillRequests.set(skill.id, this.input.consumeAction(skill.inputAction));
    }
    const cultivationPressed = this.input.consumeAction("cultivationPanel");
    const skillPanelPressed = this.input.consumeAction("skillPanel");
    const inventoryPressed = this.input.consumeAction("inventoryPanel");
    const breakthroughPressed = this.input.consumeAction("breakthrough");
    const panelPreviousPressed = this.input.consumeAction("panelPrevious");
    const panelNextPressed = this.input.consumeAction("panelNext");
    const panelDecreasePressed = this.input.consumeAction("panelDecrease");
    const panelIncreasePressed = this.input.consumeAction("panelIncrease");
    const panelConfirmPressed = this.input.consumeAction("panelConfirm");
    const panelSectionPressed = this.input.consumeAction("panelSection");
    const unequipPressed = this.input.consumeAction("inventoryUnequip");
    const discardPressed = this.input.consumeAction("inventoryDiscard");
    const debugResetPressed = this.input.consumeAction("debugAttributeReset");
    const questPanelPressed = this.input.consumeAction("questPanel");
    const questAbandonPressed = this.input.consumeAction("questAbandon");
    const companionPanelPressed = this.input.consumeAction("companionPanel");
    const companionAssistPressed = this.input.consumeAction("companionAssist");
    const treasureActivatePressed = this.input.consumeAction("treasureActivate");
    const debugResetSavePressed = this.input.consumeAction("debugResetSave");
    const worldMapPressed = this.input.consumeAction("worldMap");
    const audioPanelPressed = this.input.consumeAction("audioPanel");
    const debugOverlayPressed = this.input.consumeAction("debugOverlay");
    if (debugOverlayPressed) { this.ui.showDebug = !this.ui.showDebug; this.settings.showDebug = this.ui.showDebug; this.saveSystem.saveSettings({ ...this.audioSystem.getPersistentState(), showDebug: this.ui.showDebug }); }

    if (this.resetConfirmOpen) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      if (panelConfirmPressed) {
        this.saveSystem.clear();
        window.removeEventListener("pagehide", this.onPageHide);
        this.onPageHide = () => {};
        window.location.reload();
        return;
      }
      if (escapePressed) this.resetConfirmOpen = false;
      this.camera.update(this.player, deltaTime);
      return;
    }
    if (debugResetSavePressed) {
      this.resetConfirmOpen = true;
      this.camera.update(this.player, deltaTime);
      return;
    }

    this.combat.update(deltaTime, this.player, this.enemies, this.world.obstacles);
    this.progression.update(deltaTime);
    this.skillSystem.update(deltaTime);
    this.inventorySystem.update(deltaTime);
    this.questSystem.update(deltaTime);
    this.questSystem.updateArea(this.player, this.mapSystem.currentMapId);
    this.mapSystem.update(deltaTime);
    if (this.activitySystem.update(deltaTime, this.player, this.progression)) this.saveProgress();
    if (this.craftingSystem.update(deltaTime, this.player)) { this.audioSystem.play("craft"); this.saveProgress(); }
    const isBlocked = this.audioSystem.panelOpen || this.craftingSystem.panelOpen || this.activitySystem.panelOpen || this.interaction.isDialogueOpen || this.questSystem.panelOpen || this.inventorySystem.panelOpen || this.skillSystem.panelOpen || this.progression.panelOpen || this.companionSystem.panelOpen;
    this.companionSystem.update(deltaTime, this.player, this.enemies, this.combat, isBlocked);
    const pointerAction = this.ui.getPointerAction(pointerClick);

    if (this.audioSystem.panelOpen) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      if (escapePressed || audioPanelPressed) this.audioSystem.togglePanel();
      else { if (panelPreviousPressed) this.audioSystem.moveSelection(-1); if (panelNextPressed) this.audioSystem.moveSelection(1); if (panelDecreasePressed) this.audioSystem.adjust(-1); if (panelIncreasePressed) this.audioSystem.adjust(1); if (panelConfirmPressed) this.audioSystem.adjust(this.audioSystem.selected === 2 ? 1 : 0); this.saveSystem.saveSettings({ ...this.audioSystem.getPersistentState(), showDebug: this.ui.showDebug }); }
    } else if (this.craftingSystem.panelOpen) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      if (escapePressed) this.craftingSystem.close();
      else { if (panelPreviousPressed) this.craftingSystem.moveSelection(-1); if (panelNextPressed) this.craftingSystem.moveSelection(1); if (panelConfirmPressed) { const started = this.craftingSystem.confirm(this.player); this.audioSystem.play(started ? "craft" : "fail"); } }
    } else if (this.activitySystem.panelOpen) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      if (escapePressed) this.activitySystem.close();
      else { if (panelPreviousPressed) this.activitySystem.moveSelection(-1); if (panelNextPressed) this.activitySystem.moveSelection(1); if (panelConfirmPressed) this.activitySystem.confirm(this.player); }
    } else if (this.interaction.isDialogueOpen) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      if (interactPressed && this.mapSystem.pendingExit) { const transition = this.mapSystem.transition(this.player); this.interaction.closeDialogue(); if (transition) this.loadMap(transition.map, transition.entry); }
      else if (interactPressed || escapePressed) { this.mapSystem.cancel(); this.interaction.closeDialogue(); }
    } else if (this.mapSystem.worldMapOpen) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      if (escapePressed || worldMapPressed) this.mapSystem.toggleWorldMap();
    } else if (this.questSystem.panelOpen) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      if (escapePressed || questPanelPressed) this.questSystem.closePanel();
      else if (questAbandonPressed && this.questSystem.abandonTracked()) this.saveProgress();
    } else if (this.inventorySystem.panelOpen) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      if (this.inventorySystem.discardPending) {
        if (escapePressed) this.inventorySystem.cancelDiscard();
        else if (panelConfirmPressed || pointerAction?.type === "confirmDiscard") {
          if (this.inventorySystem.confirmDiscard(this.player)) this.saveProgress();
        } else if (pointerAction?.type === "cancelDiscard") this.inventorySystem.cancelDiscard();
      } else if (escapePressed || inventoryPressed || pointerAction?.type === "openInventory") {
        this.inventorySystem.closePanel();
      } else {
        if (panelSectionPressed) this.inventorySystem.toggleSection();
        if (panelPreviousPressed) this.inventorySystem.moveSelection(this.player, -1);
        if (panelNextPressed) this.inventorySystem.moveSelection(this.player, 1);
        if (pointerAction?.type === "selectInventory") this.inventorySystem.selectInventory(pointerAction.index, this.player);
        if (pointerAction?.type === "selectEquipment") this.inventorySystem.selectEquipment(pointerAction.index);
        const useRequested = panelConfirmPressed || pointerAction?.type === "useSelected";
        const unequipRequested = unequipPressed || pointerAction?.type === "unequipSelected";
        const discardRequested = discardPressed || pointerAction?.type === "discardSelected";
        if (useRequested && this.inventorySystem.section === "inventory") {
          if (this.inventorySystem.useOrEquipSelected(this.player)) this.saveProgress();
        }
        if ((useRequested && this.inventorySystem.section === "equipment") || unequipRequested) {
          if (this.inventorySystem.unequipSelected(this.player)) this.saveProgress();
        }
        if (discardRequested && this.inventorySystem.section === "inventory") this.inventorySystem.requestDiscard(this.player);
      }
    } else if (this.skillSystem.panelOpen) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      if (escapePressed || skillPanelPressed) this.skillSystem.closePanel();
      else {
        if (panelPreviousPressed) this.skillSystem.moveSelection(this.player, -1);
        if (panelNextPressed) this.skillSystem.moveSelection(this.player, 1);
        if (panelConfirmPressed && this.skillSystem.upgradeSelected(this.player)) this.saveProgress();
      }
    } else if (this.progression.panelOpen) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      if (escapePressed || cultivationPressed) {
        this.attributeSystem.clearPending();
        this.progression.closePanel();
      }
      else if (breakthroughPressed && this.progression.breakthroughMode) {
        if (this.progression.attemptBreakthrough(this.player)) this.saveProgress();
      } else if (!this.progression.breakthroughMode) {
        if (panelPreviousPressed) this.attributeSystem.moveSelection(-1);
        if (panelNextPressed) this.attributeSystem.moveSelection(1);
        if (panelDecreasePressed) this.attributeSystem.adjustPending(this.player, -1);
        if (panelIncreasePressed) this.attributeSystem.adjustPending(this.player, 1);
        if (panelConfirmPressed && this.attributeSystem.confirm(this.player)) this.saveProgress();
        if (debugResetPressed) {
          this.attributeSystem.resetForDebug(this.player);
          this.saveProgress();
        }
      }
    } else if (this.companionSystem.panelOpen) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      if (escapePressed || companionPanelPressed) this.companionSystem.closePanel();
      else if (companionAssistPressed) { this.companionSystem.toggleAssist(); this.saveProgress(); }
    } else if (worldMapPressed && !this.player.defeated) {
      this.player.update(deltaTime, { x: 0, y: 0 }); this.mapSystem.toggleWorldMap();
    } else if (audioPanelPressed) {
      this.player.update(deltaTime, { x: 0, y: 0 }); this.audioSystem.togglePanel();
    } else if (questPanelPressed && !this.player.defeated) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      this.questSystem.togglePanel();
    } else if (cultivationPressed && !this.player.defeated) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      this.attributeSystem.clearPending();
      this.progression.openPanel(false);
    } else if (skillPanelPressed && !this.player.defeated) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      this.skillSystem.openPanel();
    } else if (companionPanelPressed && !this.player.defeated) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      this.companionSystem.togglePanel();
    } else if ((inventoryPressed || pointerAction?.type === "openInventory") && !this.player.defeated) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      this.inventorySystem.openPanel();
    } else {
      if (escapePressed && this.explorationSystem.gathering) this.explorationSystem.cancelGathering("Đã hủy thu thập.");
      const movement = this.player.defeated || this.explorationSystem.gathering ? { x: 0, y: 0 } : this.input.getMovementAxis();
      this.player.update(deltaTime, movement, this.world.obstacles);
      if (this.explorationSystem.update(deltaTime, this.player, this.inventorySystem)) this.saveProgress();
      for (const enemy of this.enemies) enemy.update(deltaTime, this.player, this.combat);
      this.lootSystem.update(deltaTime, this.player, !this.player.defeated);

      if (this.player.defeated) {
        this.interaction.update(this.player, []);
      } else {
        for (const npc of this.npcs) npc.questMarker = Boolean(this.questSystem.getNpcQuestAction(npc.id, this.player));
        this.interaction.update(this.player, [
          ...this.npcs,
          ...this.enemies,
          ...this.world.trainingObjects,
          ...this.world.specialObjects,
          ...this.lootSystem.groundLoot,
        ]);
        if (interactPressed) {
          if (this.interaction.nearbyTarget?.type === "loot") {
            if (this.lootSystem.pickup(this.player, this.interaction.nearbyTarget)) this.saveProgress();
          } else if (this.interaction.nearbyTarget?.type === "breakthrough") {
            this.progression.openPanel(true);
          } else if (this.interaction.nearbyTarget?.type === "meditation") {
            this.activitySystem.open();
          } else if (["alchemy", "forge"].includes(this.interaction.nearbyTarget?.type)) {
            this.craftingSystem.open(this.interaction.nearbyTarget.type);
          } else if (this.interaction.nearbyTarget?.type === "map-exit") {
            if (this.enemies.some((enemy) => enemy.state === "chase" && !enemy.defeated)) this.interaction.dialogue = { speaker: "Không thể rời bản đồ", title: "Đang giao chiến", text: "Hãy thoát khỏi phạm vi truy đuổi của yêu thú trước khi lên đường." };
            else this.interaction.dialogue = this.mapSystem.prepare(this.interaction.nearbyTarget, this.player);
          } else if (this.interaction.nearbyTarget?.type === "resource") {
            this.explorationSystem.startGathering(this.interaction.nearbyTarget);
          } else if (this.interaction.nearbyTarget?.type === "poi") {
            this.interaction.dialogue = this.explorationSystem.discover(this.interaction.nearbyTarget);
            this.saveProgress();
          } else {
            const npc = this.interaction.nearbyTarget;
            if (npc?.type === "npc") {
              this.questSystem.onTalk(npc.id);
              const questDialogue = this.questSystem.interactNpc(npc, this.player, this.inventorySystem, this.progression, this.companionSystem);
              if (questDialogue) {
                this.interaction.dialogue = questDialogue;
                this.audioSystem.play("quest");
                this.saveProgress();
              } else {
                this.interaction.interact();
              }
            } else {
              this.interaction.interact();
            }
          }
        }
        if (basicAttackPressed && !this.explorationSystem.gathering) {
          const aimPoint = this.input.getWorldMousePos(this.camera);
          this.faceMouseCursor();
          this.combat.tryBasicAttack(this.player, this.enemies, aimPoint);
        }
        const skills = this.skillSystem.getClass(this.player).skills;
        skills.forEach((skill) => {
          if (skillRequests.get(skill.id) && !this.explorationSystem.gathering) {
            const aimPoint = this.input.getWorldMousePos(this.camera);
            this.faceMouseCursor();
            const activated = this.skillSystem.tryActivate(this.player, this.enemies, skill, this.combat, aimPoint, this.world.obstacles);
            if (activated && skill.effect === "sky-radiance") this.camera.shake(8, 0.18);
          }
        });
        if (treasureActivatePressed) {
          const effect = this.companionSystem.activateTreasure(this.player, ItemConfig);
          if (effect) {
            for (const enemy of this.enemies) {
              if (!enemy.defeated && Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y) <= effect.range) {
                const wasDefeated = enemy.takeDamage(effect.damage, { x: 0, y: 0 }, 0);
                this.combat.addDamageNumber(enemy.x, enemy.y - 60, effect.damage, "#75aee8");
                this.combat.effects.push({ kind: "hit", x: enemy.x, y: enemy.y - 25, life: 0.2, duration: 0.2 });
                if (wasDefeated) {
                  this.combat.progression.grantExperience(this.player, enemy.expReward, enemy.x, enemy.y - 45);
                  this.combat.onEnemyDefeated?.(enemy);
                  this.combat.effects.push({ kind: "defeat", x: enemy.x, y: enemy.y, life: 0.55, duration: 0.55 });
                }
              }
            }
            this.companionSystem.treasureEffects.push({ x: effect.x, y: effect.y, range: effect.range, life: 0.5, duration: 0.5 });
            this.saveProgress();
          }
        }
        if (companionAssistPressed && this.companionSystem.activeId) { this.companionSystem.toggleAssist(); this.saveProgress(); }
      }
    }
    this.camera.update(this.player, deltaTime);
    this.updateAutosave(deltaTime);
  }

  render() {
    if (this.classSelectionActive) {
      this.renderClassSelection();
      return;
    }
    if (this.resetConfirmOpen) {
      const ctx = this.renderer.context;
      ctx.clearRect(0, 0, this.renderer.width, this.renderer.height);
      ctx.fillStyle = "rgb(5 14 11)";
      ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);
      ctx.save(); ctx.textAlign = "center";
      ctx.fillStyle = "#e5a08a"; ctx.font = "600 36px Georgia, serif";
      ctx.fillText("Xóa toàn bộ dữ liệu lưu?", 960, 440);
      ctx.fillStyle = "#d8e6d8"; ctx.font = "22px system-ui, sans-serif";
      ctx.fillText("Hành động này không thể hoàn tác. Nhân vật sẽ bắt đầu lại từ đầu.", 960, 500);
      ctx.fillStyle = "#e9cd78"; ctx.font = "600 24px system-ui, sans-serif";
      ctx.fillText("ENTER · Xác nhận xóa          ESC · Hủy", 960, 580);
      ctx.fillStyle = "#6b7d74"; ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("(F9 để mở lại dialog này)", 960, 640);
      ctx.restore();
      return;
    }
    this.renderer.render(
      this.world,
      this.player,
      this.npcs,
      this.enemies,
      this.camera,
      this.ui,
      this.interaction,
      this.combat,
      this.progression,
      this.attributeSystem,
      this.skillSystem,
      this.inventorySystem,
      this.questSystem,
      this.activitySystem,
      this.craftingSystem,
      this.lootSystem,
      this.companionSystem,
      ItemConfig,
      this.mapSystem,
      this.explorationSystem,
      this.audioSystem,
      this.fps,
    );
  }

  createNpcs() {
    return this.mapSystem.currentMap.npcSpawns.map((npcConfig) => new NPC(npcConfig));
  }

  loadMap(map, entry) {
    this.world = new WorldSystem(map.world, map);
    this.audioSystem.setMapTheme(map.world.theme);
    this.audioSystem.play("map");
    this.explorationSystem.loadMap(this.world.specialObjects);
    this.player.worldConfig = map.world;
    this.player.x = entry.x; this.player.y = entry.y;
    this.player.spawnX = entry.x; this.player.spawnY = entry.y;
    this.npcs = this.createNpcs(); this.enemies = this.createEnemies();
    if (this.lootSystem) this.lootSystem.groundLoot = [];
    if (this.combat) {
      this.combat.effects = []; this.combat.floatingTexts = []; this.combat.projectiles = [];
      this.combat.pendingStrikes = []; this.combat.pendingProjectiles = []; this.combat.healingZones = [];
    }
    if (this.interaction) { this.interaction.nearbyTarget = null; this.interaction.closeDialogue(); }
    if (this.camera) { this.camera.worldWidth = map.world.width; this.camera.worldHeight = map.world.height; this.camera.snapTo(this.player); }
    if (this.questSystem) this.questSystem.onVisit(map.id);
    this.saveProgress();
  }

  createEnemies() {
    return this.enemySpawnSystem.loadMap(this.mapSystem.currentMapId, this.player);
  }

  restoreCharacter() {
    const fallback = this.player.getPersistentState();
    const savedCharacter = this.saveSystem.loadCharacter(fallback, {
      maxHp: GameConfig.player.maxHp,
      maxMp: GameConfig.player.maxMp,
      maxStatValue: 1000000,
      worldBounds: GameConfig.world.bounds,
      cultivationConfig: CultivationConfig,
      classConfig: ClassConfig,
      itemConfig: ItemConfig,
      questConfig: QuestConfig,
      craftingConfig: CraftingConfig,
      companionConfig: CompanionConfig,
      mapConfig: MapConfig,
    });
    this.player.applyPersistentState(savedCharacter);
    this.mapSystem.initializePlayer(this.player);
    this.explorationSystem.initialize(this.player.mapState?.exploration);
    const loadedMap = this.mapSystem.currentMap;
    const savedPosition = this.mapSystem.positions[this.mapSystem.currentMapId];
    const defaultEntry = loadedMap.entries.start ?? Object.values(loadedMap.entries)[0];
    const position = savedPosition ?? (this.mapSystem.currentMapId === MapConfig.defaultMapId ? { x: this.player.x, y: this.player.y } : defaultEntry);
    this.player.worldConfig = loadedMap.world; this.player.x = position.x; this.player.y = position.y; this.player.spawnX = position.x; this.player.spawnY = position.y;
    this.progression.normalizeRealm(this.player);
    this.skillSystem.initializePlayer(this.player);
    this.inventorySystem.initializePlayer(this.player);
    this.questSystem.initializePlayer(this.player);
    this.activitySystem.initializePlayer(this.player);
    this.companionSystem.initializePlayer(this.player);
    this.attributeSystem.recalculate(this.player);
    this.progression.processLevelUps(this.player, true);
  }

  faceMouseCursor() {
    const world = this.input.getWorldMousePos(this.camera);
    const dx = world.x - this.player.x;
    const dy = world.y - this.player.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      this.player.facing = dx >= 0 ? "east" : "west";
    } else {
      this.player.facing = dy >= 0 ? "south" : "north";
    }
  }

  saveProgress() {
    if (this.player.defeated) return false;
    this.player.questState = this.questSystem.getPersistentState();
    this.player.activityState = this.activitySystem.getPersistentState();
    this.player.companionState = this.companionSystem.getPersistentState();
    this.player.mapState = { ...this.mapSystem.getPersistentState(this.player), exploration: this.explorationSystem.getPersistentState() };
    return this.saveSystem.saveCharacter(this.player.getPersistentState());
  }

  updateAutosave(deltaTime) {
    this.autosaveElapsed += deltaTime;
    if (this.autosaveElapsed < GameConfig.save.autosaveInterval) return;
    this.autosaveElapsed = 0;
    this.saveProgress();
  }

  updateFps(deltaTime) {
    this.frameCount += 1;
    this.fpsElapsed += deltaTime;
    if (this.fpsElapsed >= 0.4) {
      this.fps = this.frameCount / this.fpsElapsed;
      this.frameCount = 0;
      this.fpsElapsed = 0;
    }
  }
}
