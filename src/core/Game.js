import { GameConfig } from "../config/GameConfig.js";
import { CultivationConfig } from "../config/CultivationConfig.js";
import { ClassConfig } from "../config/ClassConfig.js";
import { ItemConfig } from "../config/ItemConfig.js";
import { createCultivatorSprites } from "../assets/ProceduralSprites.js";
import { Enemy } from "../entities/Enemy.js";
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
    this.input = new Input(window, canvas, GameConfig.input);
    this.renderer = new Renderer(
      canvas,
      GameConfig.resolution.width,
      GameConfig.resolution.height,
    );
    this.world = new WorldSystem(GameConfig.world);
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
    this.player = new Player(
      GameConfig.player,
      createCultivatorSprites(GameConfig.sprites.sourceSize),
      GameConfig.world,
      GameConfig.sprites.playerRenderSize,
      GameConfig.ui.showPlayerWorldHealthBar,
      CultivationConfig,
      ClassConfig,
      ItemConfig,
    );
    this.saveSystem = new SaveSystem(getLocalStorageSafely(), GameConfig.save);
    this.restoreCharacter();
    this.npcs = this.createNpcs();
    this.enemies = this.createEnemies();
    this.lootSystem = new LootSystem(ItemConfig, this.inventorySystem);
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
    this.camera = new Camera(
      GameConfig.resolution.width,
      GameConfig.resolution.height,
      GameConfig.world.width,
      GameConfig.world.height,
      GameConfig.camera.followSharpness,
    );
    this.camera.snapTo(this.player);

    this.resetConfirmOpen = false;
    this.previousTime = 0;
    this.fps = 60;
    this.frameCount = 0;
    this.fpsElapsed = 0;
    this.isRunning = false;
    this.autosaveElapsed = 0;
    this.frame = this.frame.bind(this);
    this.onPageHide = () => this.saveProgress();
    window.addEventListener("pagehide", this.onPageHide);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    requestAnimationFrame(this.frame);
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

    if (this.resetConfirmOpen) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      if (panelConfirmPressed) {
        this.saveSystem.clear();
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

    this.combat.update(deltaTime, this.player);
    this.progression.update(deltaTime);
    this.skillSystem.update(deltaTime);
    this.inventorySystem.update(deltaTime);
    this.questSystem.update(deltaTime);
    this.questSystem.updateArea(this.player);
    if (this.activitySystem.update(deltaTime, this.player, this.progression)) this.saveProgress();
    if (this.craftingSystem.update(deltaTime, this.player)) this.saveProgress();
    const isBlocked = this.craftingSystem.panelOpen || this.activitySystem.panelOpen || this.interaction.isDialogueOpen || this.questSystem.panelOpen || this.inventorySystem.panelOpen || this.skillSystem.panelOpen || this.progression.panelOpen || this.companionSystem.panelOpen;
    this.companionSystem.update(deltaTime, this.player, this.enemies, this.combat, isBlocked);
    const pointerAction = this.ui.getPointerAction(pointerClick);

    if (this.craftingSystem.panelOpen) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      if (escapePressed) this.craftingSystem.close();
      else { if (panelPreviousPressed) this.craftingSystem.moveSelection(-1); if (panelNextPressed) this.craftingSystem.moveSelection(1); if (panelConfirmPressed) this.craftingSystem.confirm(this.player); }
    } else if (this.activitySystem.panelOpen) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      if (escapePressed) this.activitySystem.close();
      else { if (panelPreviousPressed) this.activitySystem.moveSelection(-1); if (panelNextPressed) this.activitySystem.moveSelection(1); if (panelConfirmPressed) this.activitySystem.confirm(this.player); }
    } else if (this.interaction.isDialogueOpen) {
      this.player.update(deltaTime, { x: 0, y: 0 });
      if (interactPressed || escapePressed) this.interaction.closeDialogue();
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
      const movement = this.player.defeated ? { x: 0, y: 0 } : this.input.getMovementAxis();
      this.player.update(deltaTime, movement);
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
          } else {
            const npc = this.interaction.nearbyTarget;
            if (npc?.type === "npc") {
              this.questSystem.onTalk(npc.id);
              const questDialogue = this.questSystem.interactNpc(npc, this.player, this.inventorySystem, this.progression, this.companionSystem);
              if (questDialogue) {
                this.interaction.dialogue = questDialogue;
                this.saveProgress();
              } else {
                this.interaction.interact();
              }
            } else {
              this.interaction.interact();
            }
          }
        }
        if (basicAttackPressed) this.combat.tryBasicAttack(this.player, this.enemies);
        const skills = this.skillSystem.getClass(this.player).skills;
        skills.forEach((skill) => {
          if (skillRequests.get(skill.id)) {
            this.skillSystem.tryActivate(this.player, this.enemies, skill, this.combat);
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
      this.fps,
    );
  }

  createNpcs() {
    return GameConfig.npcs.spawns.map((npcConfig) => new NPC(npcConfig));
  }

  createEnemies() {
    return GameConfig.enemySpawns.map((spawn) => {
      const enemyType = GameConfig.enemyTypes[spawn.enemyType];
      const area = QuestConfig.areas.find((entry) => entry.id === spawn.areaId) ?? QuestConfig.areas[0];
      return new Enemy({
        id: spawn.id,
        enemyType: spawn.enemyType,
        name: enemyType.name,
        species: enemyType.species,
        x: spawn.x,
        y: spawn.y,
        speed: enemyType.movementSpeed,
        maxHp: enemyType.maxHp,
        damage: enemyType.damage,
        attackRange: enemyType.attackRange,
        attackCooldown: enemyType.attackCooldown,
        attackWindup: enemyType.attackWindup,
        expReward: enemyType.expReward,
        lootTableId: enemyType.lootTableId,
        respawnDelay: enemyType.respawnDelay,
        collisionRadius: enemyType.collisionRadius,
        territory: { x: area.minX, y: area.minY, width: area.maxX - area.minX, height: area.maxY - area.minY },
        color: spawn.color,
        detectionRange: enemyType.aggroRange,
        leashRange: enemyType.returnDistance,
      });
    });
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
    });
    this.player.applyPersistentState(savedCharacter);
    this.progression.normalizeRealm(this.player);
    this.skillSystem.initializePlayer(this.player);
    this.inventorySystem.initializePlayer(this.player);
    this.questSystem.initializePlayer(this.player);
    this.activitySystem.initializePlayer(this.player);
    this.companionSystem.initializePlayer(this.player);
    this.attributeSystem.recalculate(this.player);
    this.progression.processLevelUps(this.player, true);
  }

  saveProgress() {
    if (this.player.defeated) return false;
    this.player.questState = this.questSystem.getPersistentState();
    this.player.activityState = this.activitySystem.getPersistentState();
    this.player.companionState = this.companionSystem.getPersistentState();
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
