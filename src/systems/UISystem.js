export class UISystem {
  constructor(config, cultivationConfig, classConfig, itemConfig) {
    this.config = config;
    this.cultivationConfig = cultivationConfig;
    this.classConfig = classConfig;
    this.itemConfig = itemConfig;
    this.pointerAreas = [];
  }

  render(ctx, player, interaction, combat, progression, attributes, skills, inventory, quests, activities, crafting, companion, fps) {
    this.pointerAreas = [];
    const resolution = this.config.resolution;
    const scale = this.config.ui.scale;
    ctx.save();
    ctx.translate(resolution.width / 2, resolution.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-resolution.width / 2, -resolution.height / 2);
    this.drawLocation(ctx);
    this.drawCharacterPanel(ctx, player, progression);
    this.drawInventoryHudButton(ctx, player, inventory);
    this.drawQuestHud(ctx, quests);
    this.drawCompanionHud(ctx, companion, player);
    if (this.config.ui.showCoordinates || this.config.ui.showFps) {
      this.drawCoordinates(ctx, player, fps);
    }
    this.drawCombatBar(ctx, player, combat, skills);
    if (player.defeated) this.drawDefeatOverlay(ctx, combat);
    else if (companion.panelOpen) this.drawCompanionPanel(ctx, player, companion);
    else if (crafting.panelOpen) this.drawCraftingPanel(ctx, player, crafting, inventory);
    else if (activities.panelOpen) this.drawActivityPanel(ctx, player, activities);
    else if (interaction.isDialogueOpen) this.drawDialogue(ctx, interaction.dialogue);
    else if (inventory.panelOpen) this.drawInventoryPanel(ctx, player, inventory);
    else if (quests.panelOpen) this.drawQuestPanel(ctx, quests);
    else if (skills.panelOpen) this.drawSkillPanel(ctx, player, skills);
    else if (progression.panelOpen) this.drawCultivationPanel(ctx, player, progression, attributes);
    else if (interaction.nearbyTarget) this.drawInteractionPrompt(ctx, interaction.nearbyTarget);
    else this.drawControls(ctx);
    this.drawNotifications(ctx, progression.notifications);
    this.drawSkillFeedback(ctx, skills.feedback);
    this.drawInventoryMessages(ctx, inventory.messages);
    ctx.restore();
  }

  drawActivityPanel(ctx, player, system) {
    const x = 500; const y = 260; const width = 920; const height = 510;
    ctx.save(); ctx.fillStyle = "rgb(5 17 13 / 96%)"; ctx.beginPath(); ctx.roundRect(x, y, width, height, 24); ctx.fill(); ctx.strokeStyle = "#cdb368"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#f1e3b8"; ctx.font = "600 34px Georgia, serif"; ctx.fillText("Tụ Linh · Tĩnh Tọa", x + 42, y + 58);
    const actions = ["Điều tức — hồi HP/MP liên tục", `Tu luyện — ${system.config.practice.duration}s, +${system.config.practice.expReward} EXP`];
    actions.forEach((text, index) => { ctx.fillStyle = index === system.selectedIndex ? "#e9cd78" : "#c9d7ce"; ctx.font = "22px system-ui, sans-serif"; ctx.fillText(`${index === system.selectedIndex ? "▶" : "  "} ${text}`, x + 64, y + 135 + index * 58); });
    const ratio = system.mode === "practice" ? system.progress / system.config.practice.duration : system.mode === "meditate" ? ((player.hp / player.maxHp + player.mp / player.maxMp) / 2) : 0;
    this.drawBar(ctx, x + 64, y + 280, width - 128, 34, ratio, "#4e9b75", system.mode === "practice" ? `Tu luyện ${Math.round(ratio * 100)}%` : system.mode === "meditate" ? `HP ${Math.round(player.hp)}/${player.maxHp} · MP ${Math.round(player.mp)}/${player.maxMp}` : "Chưa bắt đầu");
    ctx.fillStyle = "#e0b989"; ctx.font = "18px system-ui, sans-serif"; ctx.fillText(system.message || `Hồi tu luyện: ${Math.ceil(system.practiceCooldown)}s`, x + 64, y + 365);
    ctx.fillStyle = "#a9c8b4"; ctx.fillText(`Số lần hoàn thành đã lưu: ${system.practiceCompletions}`, x + 64, y + 405);
    ctx.fillStyle = "#c9b776"; ctx.fillText("↑↓ · Chọn   Enter · Bắt đầu/Dừng   ESC · Đóng", x + 64, y + height - 36); ctx.restore();
  }

  drawCraftingPanel(ctx, player, system, inventory) {
    const x = 390; const y = 170; const width = 1140; const height = 730; const recipes = system.getRecipes(); const selected = system.getSelectedRecipe();
    ctx.save(); ctx.fillStyle = "rgb(5 17 13 / 97%)"; ctx.beginPath(); ctx.roundRect(x, y, width, height, 24); ctx.fill(); ctx.strokeStyle = "#cdb368"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#f1e3b8"; ctx.font = "600 34px Georgia, serif"; ctx.fillText(system.station === "alchemy" ? "Đan Lô" : "Linh Hỏa Lô", x + 42, y + 58);
    recipes.forEach((recipe, index) => { ctx.fillStyle = index === system.selectedIndex ? "#e9cd78" : "#c9d7ce"; ctx.font = "20px system-ui, sans-serif"; ctx.fillText(`${index === system.selectedIndex ? "▶" : "  "} ${recipe.name}`, x + 48, y + 120 + index * 44); });
    if (selected) { let dy = y + 120; const dx = x + 560; ctx.fillStyle = "#f0dfaa"; ctx.font = "600 24px Georgia, serif"; ctx.fillText(selected.name, dx, dy); dy += 48; ctx.fillStyle = "#d7e2d9"; ctx.font = "18px system-ui, sans-serif"; for (const ingredient of selected.ingredients ?? []) { const owned = inventory.countItem(player, ingredient.itemId); ctx.fillStyle = owned >= ingredient.quantity ? "#9ed0ad" : "#e59a88"; ctx.fillText(`${this.itemConfig.items[ingredient.itemId]?.name}: ${owned}/${ingredient.quantity}`, dx, dy); dy += 31; } ctx.fillStyle = player.coins >= (selected.coinCost ?? 0) ? "#e2c976" : "#e59a88"; ctx.fillText(`Chi phí: ${selected.coinCost ?? 0} linh tệ`, dx, dy); dy += 34; if (selected.action === "upgrade") { const info = system.getUpgradeInfo(player); if (info) { ctx.fillStyle = "#a9c8b4"; ctx.fillText(`${info.item.name}: +${info.level} → +${Math.min(system.config.maxUpgradeLevel, info.level + 1)}`, dx, dy); dy += 30; ctx.fillText(`${this.itemConfig.statLabels[info.stat]}: +${info.gain} mỗi cấp (tối đa +${system.config.maxUpgradeLevel})`, dx, dy); dy += 34; } } const failures = system.getFailures(player, selected); ctx.fillStyle = failures.length ? "#e59a88" : "#8fd1ac"; this.drawWrappedText(ctx, failures.join(" · ") || "Đủ điều kiện chế tác", dx, dy, 500, 28); }
    if (system.crafting) { const ratio = system.crafting.elapsed / system.config.craftDuration; this.drawBar(ctx, x + 60, y + height - 130, width - 120, 32, ratio, "#b7873c", `Đang chế tác ${Math.round(ratio * 100)}%`); }
    ctx.fillStyle = "#e0b989"; ctx.font = "18px system-ui, sans-serif"; ctx.fillText(system.message, x + 60, y + height - 70); ctx.fillStyle = "#c9b776"; ctx.fillText("↑↓ · Chọn   Enter · Xác nhận   ESC · Đóng", x + 650, y + height - 30); ctx.restore();
  }

  drawQuestHud(ctx, quests) {
    const quest = quests.trackedQuestId ? quests.getDefinition(quests.trackedQuestId) : null;
    if (!quest) return;
    const state = quests.getState(quest.id);
    ctx.save();
    ctx.fillStyle = "rgb(7 20 16 / 84%)";
    ctx.beginPath(); ctx.roundRect(1550, 238, 336, 150, 14); ctx.fill();
    ctx.fillStyle = "#e9cd78"; ctx.font = "600 18px Georgia, serif"; ctx.fillText(`H · ${quest.title}`, 1570, 268);
    ctx.fillStyle = "#d8e6d8"; ctx.font = "15px system-ui, sans-serif";
    quest.objectives.forEach((objective, index) => {
      const value = state?.progress?.[objective.id] ?? 0;
      ctx.fillText(`${value >= objective.amount ? "✓" : "•"} ${objective.label}: ${value}/${objective.amount}`, 1570, 296 + index * 24);
    });
    if (quests.areaNotice) { ctx.fillStyle = "#f0df9b"; ctx.font = "700 28px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText(quests.areaNotice.text, 960, 180); }
    ctx.restore();
  }

  drawQuestPanel(ctx, quests) {
    const x = 330; const y = 150; const width = 1260; const height = 780;
    ctx.save(); ctx.fillStyle = "rgb(5 17 13 / 96%)"; ctx.beginPath(); ctx.roundRect(x, y, width, height, 24); ctx.fill();
    ctx.strokeStyle = "#cdb368"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#f1e3b8"; ctx.font = "600 34px Georgia, serif"; ctx.fillText("Nhật ký nhiệm vụ", x + 42, y + 58);
    let lineY = y + 110;
    for (const quest of quests.config.quests) {
      const state = quests.getState(quest.id); const done = quests.isComplete(quest.id); const active = Boolean(state);
      if (!active && !done) continue;
      ctx.fillStyle = done ? "#8fc7a3" : "#e9cd78"; ctx.font = "600 23px Georgia, serif"; ctx.fillText(`${done ? "✓" : "◆"} ${quest.title}`, x + 48, lineY); lineY += 30;
      ctx.fillStyle = "#d8e6d8"; ctx.font = "17px system-ui, sans-serif"; ctx.fillText(quest.description, x + 72, lineY); lineY += 28;
      for (const objective of quest.objectives) { const value = state?.progress?.[objective.id] ?? objective.amount; ctx.fillText(`  ${value >= objective.amount ? "✓" : "□"} ${objective.label}: ${value}/${objective.amount}`, x + 72, lineY); lineY += 24; }
      ctx.fillStyle = "#b9d2c4"; ctx.fillText(`Phần thưởng: ${quest.rewards.exp ?? 0} EXP · ${quest.rewards.coins ?? 0} linh tệ`, x + 72, lineY); lineY += 42;
      if (lineY > y + height - 60) break;
    }
    ctx.fillStyle = "#c9b776"; ctx.font = "17px system-ui, sans-serif"; ctx.fillText("H hoặc ESC · Đóng nhật ký", x + width - 270, y + height - 28); ctx.restore();
  }

  drawCompanionHud(ctx, companion, player) {
    const def = companion.getActive();
    if (!def) return;
    const state = companion.getActiveState();
    const x = 34; const y = 336; const width = 260; const height = 100;
    ctx.save();
    ctx.fillStyle = "rgb(7 20 16 / 80%)";
    ctx.beginPath(); ctx.roundRect(x, y, width, height, 14); ctx.fill();
    ctx.fillStyle = "#f0dfaa"; ctx.font = "600 17px Georgia, serif";
    ctx.fillText(`G · ${def.name}`, x + 16, y + 24);
    ctx.fillStyle = companion.assistEnabled ? "#8fd1ac" : "#e5a08a"; ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(companion.assistEnabled ? "Hỗ trợ: BẬT" : "Hỗ trợ: TẮT", x + 160, y + 24);
    ctx.fillStyle = "#c9d7ce"; ctx.font = "15px system-ui, sans-serif";
    ctx.fillText(`Lv.${state.level} ${def.species}`, x + 16, y + 48);
    const requiredExp = companion.getRequiredExp();
    const expRatio = requiredExp > 0 ? state.exp / requiredExp : 1;
    this.drawBar(ctx, x + 16, y + 60, width - 32, 18, expRatio, "#b58c43", requiredExp > 0 ? `EXP ${state.exp}/${requiredExp}` : "MAX");

    const treasureItem = this.itemConfig.items[player.equipment?.treasure];
    if (treasureItem?.activeEffect) {
      const cd = companion.treasureCooldown;
      ctx.fillStyle = cd > 0 ? "#8c918d" : "#e9cd78"; ctx.font = "600 14px system-ui, sans-serif";
      ctx.fillText(`F · ${treasureItem.activeEffect.name}${cd > 0 ? ` (${cd.toFixed(1)}s)` : ""}`, x + 16, y + 96);
    }
    ctx.restore();
  }

  drawCompanionPanel(ctx, player, companion) {
    const def = companion.getActive();
    const state = companion.getActiveState();
    const x = 550; const y = 250; const width = 820; const height = 480;
    ctx.save();
    ctx.fillStyle = "rgb(5 17 13 / 96%)"; ctx.beginPath(); ctx.roundRect(x, y, width, height, 24); ctx.fill();
    ctx.strokeStyle = "#cdb368"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#f1e3b8"; ctx.font = "600 34px Georgia, serif"; ctx.fillText("Linh Thú", x + 42, y + 58);

    if (!def || !state) {
      ctx.fillStyle = "#a9c8b4"; ctx.font = "20px system-ui, sans-serif";
      ctx.fillText("Chưa có linh thú đồng hành. Hoàn thành nhiệm vụ để nhận.", x + 42, y + 130);
    } else {
      ctx.fillStyle = "#e9cd78"; ctx.font = "600 26px Georgia, serif"; ctx.fillText(def.name, x + 42, y + 110);
      ctx.fillStyle = "#c9d7ce"; ctx.font = "20px system-ui, sans-serif";
      ctx.fillText(`${def.species} · Cấp ${state.level}/${def.maxLevel}`, x + 42, y + 144);
      ctx.fillText(`HP: ${companion.getMaxHp()}   Sát thương: ${companion.getDamage()}   Tầm đánh: ${def.attackRange}`, x + 42, y + 184);
      ctx.fillText(`Hồi chiêu: ${def.attackCooldown}s`, x + 42, y + 216);
      const requiredExp = companion.getRequiredExp();
      this.drawBar(ctx, x + 42, y + 240, width - 84, 28, requiredExp > 0 ? state.exp / requiredExp : 1, "#b58c43", requiredExp > 0 ? `EXP ${state.exp}/${requiredExp}` : "Đã đạt cấp tối đa");
      ctx.fillStyle = "#d8e6d8"; ctx.font = "18px Georgia, serif";
      this.drawWrappedText(ctx, def.description, x + 42, y + 310, width - 84, 28);
      ctx.fillStyle = companion.assistEnabled ? "#8fd1ac" : "#e5a08a"; ctx.font = "600 20px system-ui, sans-serif";
      ctx.fillText(`Hỗ trợ chiến đấu: ${companion.assistEnabled ? "BẬT" : "TẮT"}`, x + 42, y + 390);
    }

    ctx.fillStyle = "#c9b776"; ctx.font = "17px system-ui, sans-serif";
    ctx.fillText("T · Bật/tắt hỗ trợ   G hoặc ESC · Đóng", x + 42, y + height - 30);
    ctx.restore();
  }

  drawLocation(ctx) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "rgb(7 20 16 / 72%)";
    ctx.beginPath();
    ctx.roundRect(626, 36, 668, 92, 20);
    ctx.fill();
    ctx.strokeStyle = "rgb(218 190 112 / 58%)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#f1e6c6";
    ctx.font = "600 32px Georgia, serif";
    ctx.fillText(this.config.world.locationName, 960, 80);
    ctx.fillStyle = "#a9c8b4";
    ctx.font = "18px Georgia, serif";
    ctx.fillText("SƠN MÔN TĨNH LẶNG · LINH KHÍ ÔN HÒA", 960, 108);
    ctx.restore();
  }

  drawCharacterPanel(ctx, player, progression) {
    const x = 34;
    const y = 34;
    ctx.save();
    ctx.fillStyle = "rgb(7 20 16 / 82%)";
    ctx.beginPath();
    ctx.roundRect(x, y, 500, 284, 22);
    ctx.fill();
    ctx.strokeStyle = "rgb(218 190 112 / 58%)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#f1e6c6";
    ctx.font = "600 31px Georgia, serif";
    ctx.fillText(player.name, x + 28, y + 45);
    ctx.fillStyle = "#d5bd79";
    ctx.font = "20px Georgia, serif";
    ctx.fillText(`Cấp ${player.level}  ·  ${player.realm}`, x + 28, y + 76);

    this.drawBar(ctx, x + 28, y + 103, 444, 39, player.hp / player.maxHp, "#a6423b", `HP  ${player.hp} / ${player.maxHp}`);
    this.drawBar(ctx, x + 28, y + 156, 444, 39, player.mp / player.maxMp, "#397aa5", `MP  ${player.mp} / ${player.maxMp}`);
    const requiredExp = progression.getRequiredExperience(player.level);
    const expRatio = requiredExp > 0 ? player.exp / requiredExp : 1;
    const expLabel = requiredExp > 0 ? `EXP  ${player.exp} / ${requiredExp}` : "EXP  CẤP TỐI ĐA";
    this.drawBar(ctx, x + 28, y + 209, 444, 27, expRatio, "#b58c43", expLabel);
    ctx.fillStyle = "#9fc5ad";
    ctx.font = "16px system-ui, sans-serif";
    const className = this.classConfig.classes[player.classId]?.name ?? player.classId;
    ctx.fillText(`${className}   |   C · Thuộc tính ${player.attributePoints}   |   L · Kỹ năng ${player.skillPoints}`, x + 28, y + 263);
    ctx.restore();
  }

  drawBar(ctx, x, y, width, height, ratio, color, label) {
    ctx.fillStyle = "rgb(2 8 7 / 76%)";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 9);
    ctx.fill();
    const inset = 4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + inset, y + inset, (width - inset * 2) * Math.max(0, Math.min(1, ratio)), height - inset * 2, 6);
    ctx.fill();
    ctx.fillStyle = "#fff8e6";
    ctx.font = "600 17px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + width / 2, y + height / 2);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  drawCoordinates(ctx, player, fps) {
    ctx.save();
    ctx.textAlign = "right";
    ctx.fillStyle = "rgb(7 20 16 / 76%)";
    ctx.beginPath();
    ctx.roundRect(1550, 34, 336, 112, 18);
    ctx.fill();
    ctx.fillStyle = "#dce8d8";
    ctx.font = "20px ui-monospace, SFMono-Regular, Consolas, monospace";
    if (this.config.ui.showCoordinates) {
      ctx.fillText(`X ${Math.round(player.x)}   Y ${Math.round(player.y)}`, 1858, 78);
    }
    if (this.config.ui.showFps) {
      ctx.fillStyle = "#8fd1ac";
      ctx.fillText(`FPS ${Math.round(fps)}`, 1858, 116);
    }
    ctx.restore();
  }

  drawInventoryHudButton(ctx, player, inventorySystem) {
    const x = 1550;
    const y = 164;
    const width = 336;
    const height = 58;
    ctx.save();
    ctx.fillStyle = inventorySystem.panelOpen ? "rgb(53 93 72 / 94%)" : "rgb(7 20 16 / 82%)";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 16);
    ctx.fill();
    ctx.strokeStyle = "rgb(218 190 112 / 58%)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#f0e2b7";
    ctx.font = "600 19px system-ui, sans-serif";
    ctx.fillText(`I · Túi đồ  ${inventorySystem.getUsedSlots(player)} / ${this.itemConfig.inventory.slotLimit}`, x + 20, y + 36);
    ctx.textAlign = "right";
    ctx.fillStyle = "#e0bd58";
    ctx.fillText(`${player.coins} linh tệ`, x + width - 20, y + 36);
    ctx.restore();
    this.addPointerArea(x, y, width, height, { type: "openInventory" });
  }

  addPointerArea(x, y, width, height, action) {
    this.pointerAreas.push({ x, y, width, height, action });
  }

  getPointerAction(pointer) {
    if (!pointer) return null;
    const scale = this.config.ui.scale;
    const centerX = this.config.resolution.width / 2;
    const centerY = this.config.resolution.height / 2;
    const x = (pointer.x - centerX) / scale + centerX;
    const y = (pointer.y - centerY) / scale + centerY;
    for (let index = this.pointerAreas.length - 1; index >= 0; index -= 1) {
      const area = this.pointerAreas[index];
      if (x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height) {
        return area.action;
      }
    }
    return null;
  }

  drawControls(ctx) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "rgb(7 20 16 / 68%)";
    ctx.beginPath();
    ctx.roundRect(610, 1010, 700, 38, 14);
    ctx.fill();
    ctx.fillStyle = "#e2d8b9";
    ctx.font = "17px system-ui, sans-serif";
    ctx.fillText("WASD · Di chuyển   C · Thuộc tính   L · Kỹ năng   I · Túi đồ   G · Linh thú   F · Pháp bảo", 960, 1036);
    ctx.restore();
  }

  drawInteractionPrompt(ctx, target) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "rgb(7 20 16 / 88%)";
    ctx.beginPath();
    ctx.roundRect(686, 966, 548, 82, 18);
    ctx.fill();
    ctx.strokeStyle = "rgb(218 190 112 / 70%)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#f2e5bc";
    ctx.font = "600 24px system-ui, sans-serif";
    ctx.fillText(`E  —  ${target.interactionLabel}`, 960, 1001);
    ctx.fillStyle = "#9fc5ad";
    ctx.font = "18px Georgia, serif";
    ctx.fillText(target.name, 960, 1031);
    ctx.restore();
  }

  drawCombatBar(ctx, player, combat, skillSystem) {
    this.drawSkillButton(ctx, {
      x: 590,
      y: 866,
      width: 165,
      height: 88,
      key: "J / LMB",
      label: "Kiếm thức",
      color: "#b99b59",
      remaining: combat.basicCooldownRemaining,
      duration: combat.basicCooldownDuration,
    });
    const skills = skillSystem.getClass(player).skills;
    skills.forEach((skill, index) => {
      const level = skillSystem.getSkillLevel(player, skill);
      const levelData = skillSystem.getLevelData(player, skill);
      const usable = player.level >= skill.requiredLevel && level > 0;
      this.drawSkillButton(ctx, {
        x: 775 + index * 185,
        y: 866,
        width: 165,
        height: 88,
        key: skill.keyLabel,
        label: skill.name,
        color: usable && player.mp >= levelData.mpCost ? "#4c9f91" : "#5c6060",
        remaining: skillSystem.getCooldown(skill.id),
        duration: levelData.cooldown,
        cost: usable ? `${levelData.mpCost} MP` : `Cấp ${skill.requiredLevel}`,
      });
    });
  }

  drawSkillButton(ctx, button) {
    ctx.save();
    ctx.fillStyle = "rgb(6 18 14 / 88%)";
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.width, button.height, 16);
    ctx.fill();
    ctx.strokeStyle = button.color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = button.color;
    ctx.beginPath();
    ctx.roundRect(button.x + 10, button.y + 10, 48, 30, 8);
    ctx.fill();
    ctx.fillStyle = "#fff8e5";
    ctx.textAlign = "center";
    ctx.font = "700 15px system-ui, sans-serif";
    ctx.fillText(button.key, button.x + 34, button.y + 31);
    ctx.font = "600 16px Georgia, serif";
    ctx.fillText(button.label, button.x + button.width / 2, button.y + 61);
    if (button.cost) {
      ctx.fillStyle = "#a8c9dc";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText(button.cost, button.x + button.width - 42, button.y + 29);
    }

    if (button.remaining > 0) {
      const ratio = button.remaining / button.duration;
      ctx.fillStyle = "rgb(2 8 6 / 68%)";
      ctx.beginPath();
      ctx.roundRect(button.x, button.y, button.width, button.height * ratio, 16);
      ctx.fill();
      ctx.fillStyle = "#f5edcf";
      ctx.font = "700 24px system-ui, sans-serif";
      ctx.fillText(button.remaining.toFixed(1), button.x + button.width / 2, button.y + 39);
    }
    ctx.restore();
  }

  drawDefeatOverlay(ctx, combat) {
    ctx.save();
    ctx.fillStyle = "rgb(8 12 11 / 56%)";
    ctx.fillRect(0, 0, this.config.resolution.width, this.config.resolution.height);
    ctx.textAlign = "center";
    ctx.fillStyle = "#eadbb4";
    ctx.font = "600 50px Georgia, serif";
    ctx.fillText("Tâm mạch bất ổn", 960, 480);
    ctx.fillStyle = "#a9c5b4";
    ctx.font = "24px system-ui, sans-serif";
    ctx.fillText("Hộ sơn trận đang đưa bạn về nơi an toàn…", 960, 530);
    ctx.fillStyle = "#d5bd79";
    ctx.font = "700 27px system-ui, sans-serif";
    ctx.fillText(`${Math.max(0, combat.respawnRemaining).toFixed(1)}s`, 960, 575);
    ctx.restore();
  }

  drawCultivationPanel(ctx, player, progression, attributeSystem) {
    if (!progression.breakthroughMode) {
      this.drawAttributePanel(ctx, player, progression, attributeSystem);
      return;
    }
    const x = 1280;
    const y = 168;
    const width = 580;
    const height = 720;
    ctx.save();
    ctx.fillStyle = "rgb(7 22 17 / 96%)";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 26);
    ctx.fill();
    ctx.strokeStyle = "#c8ad65";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#f0e2b7";
    ctx.font = "600 35px Georgia, serif";
    ctx.fillText("Đạo Cơ", x + 38, y + 54);
    ctx.fillStyle = "#8cc5a8";
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText(player.realm, x + 38, y + 88);

    const requiredExp = progression.getRequiredExperience(player.level);
    ctx.fillStyle = "#e7eadf";
    ctx.font = "21px system-ui, sans-serif";
    ctx.fillText(`Cấp: ${player.level} / ${this.cultivationConfig.maxLevel}`, x + 38, y + 134);
    ctx.fillText(`EXP: ${requiredExp > 0 ? `${player.exp} / ${requiredExp}` : "Tối đa"}`, x + 38, y + 168);
    ctx.fillStyle = "#d7bd70";
    ctx.fillText(`Điểm thuộc tính: ${player.attributePoints}`, x + 38, y + 210);
    ctx.fillText(`Điểm kỹ năng: ${player.skillPoints}`, x + 304, y + 210);

    ctx.strokeStyle = "rgb(200 173 101 / 32%)";
    ctx.beginPath();
    ctx.moveTo(x + 38, y + 238);
    ctx.lineTo(x + width - 38, y + 238);
    ctx.stroke();

    ctx.fillStyle = "#f0e2b7";
    ctx.font = "600 23px Georgia, serif";
    ctx.fillText("Căn cơ", x + 38, y + 278);
    ctx.fillStyle = "#dce8df";
    ctx.font = "20px system-ui, sans-serif";
    const stats = player.baseStats;
    ctx.fillText(`Công: ${this.formatStat(stats.attack)}`, x + 38, y + 316);
    ctx.fillText(`Thủ: ${this.formatStat(stats.defense)}`, x + 280, y + 316);
    ctx.fillText(`Thần: ${this.formatStat(stats.spirit)}`, x + 38, y + 350);
    ctx.fillText(`Thân pháp: ${this.formatStat(stats.agility)}`, x + 280, y + 350);
    ctx.fillText(`Sinh mệnh tối đa: ${player.maxHp}`, x + 38, y + 384);
    ctx.fillText(`Linh lực tối đa: ${player.maxMp}`, x + 280, y + 384);

    ctx.strokeStyle = "rgb(200 173 101 / 32%)";
    ctx.beginPath();
    ctx.moveTo(x + 38, y + 412);
    ctx.lineTo(x + width - 38, y + 412);
    ctx.stroke();

    ctx.fillStyle = "#f0e2b7";
    ctx.font = "600 23px Georgia, serif";
    ctx.fillText("Đột phá cảnh giới", x + 38, y + 452);
    this.drawBreakthroughRequirements(ctx, player, progression, x + 38, y + 490);

    ctx.textAlign = "right";
    ctx.fillStyle = "#a9c5b4";
    ctx.font = "17px system-ui, sans-serif";
    ctx.fillText("C hoặc ESC · Đóng", x + width - 34, y + height - 25);
    ctx.restore();
  }

  drawAttributePanel(ctx, player, progression, attributeSystem) {
    const x = 1190;
    const y = 145;
    const width = 670;
    const height = 760;
    const classData = attributeSystem.getClass(player);
    const previewAttributes = attributeSystem.getPreviewAttributes(player);
    const previewDerived = attributeSystem.getDerivedStats(player, previewAttributes);
    const selected = attributeSystem.getSelectedAttribute();

    ctx.save();
    ctx.fillStyle = "rgb(7 22 17 / 96%)";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 26);
    ctx.fill();
    ctx.strokeStyle = "#c8ad65";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#f0e2b7";
    ctx.font = "600 34px Georgia, serif";
    ctx.fillText(`Thuộc Tính · ${classData.name}`, x + 34, y + 50);
    ctx.fillStyle = "#8cc5a8";
    ctx.font = "17px system-ui, sans-serif";
    const requiredExp = progression.getRequiredExperience(player.level);
    const expText = requiredExp > 0 ? `${player.exp}/${requiredExp} EXP` : "EXP tối đa";
    ctx.fillText(`${player.realm} · Cấp ${player.level} · ${expText}`, x + 34, y + 82);
    ctx.fillText(classData.passive.name + ": " + classData.passive.description, x + 34, y + 108);
    ctx.fillStyle = "#d7bd70";
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText(`Điểm còn lại sau dự kiến: ${attributeSystem.getRemainingPoints(player)}`, x + 34, y + 140);

    ctx.fillStyle = "#f0e2b7";
    ctx.font = "600 21px Georgia, serif";
    ctx.fillText("Thuộc tính cơ bản", x + 34, y + 178);
    this.classConfig.attributes.order.forEach((attribute, index) => {
      const rowY = y + 214 + index * 48;
      const isSelected = selected === attribute;
      if (isSelected) {
        ctx.fillStyle = "rgb(81 129 104 / 48%)";
        ctx.beginPath();
        ctx.roundRect(x + 25, rowY - 29, width - 50, 39, 10);
        ctx.fill();
      }
      ctx.fillStyle = isSelected ? "#fff0bd" : "#dce8df";
      ctx.font = "20px system-ui, sans-serif";
      const pending = attributeSystem.pending[attribute];
      const pendingLabel = pending > 0 ? `  (+${pending})` : "";
      ctx.fillText(`${this.classConfig.attributes.labels[attribute]}: ${player.attributes[attribute]}${pendingLabel}`, x + 40, rowY);
      ctx.textAlign = "right";
      ctx.fillText("←  −     +  →", x + width - 40, rowY);
      ctx.textAlign = "left";
    });

    ctx.fillStyle = "#f0e2b7";
    ctx.font = "600 21px Georgia, serif";
    ctx.fillText("Chỉ số chiến đấu dự kiến", x + 34, y + 408);
    const derivedRows = [
      ["Công vật lý", player.derivedStats.physicalAttack, previewDerived.physicalAttack],
      ["Phòng thủ", player.derivedStats.defense, previewDerived.defense],
      ["HP tối đa", player.derivedStats.maxHp, previewDerived.maxHp],
      ["MP tối đa", player.derivedStats.maxMp, previewDerived.maxMp],
      ["Tốc độ di chuyển", player.derivedStats.movementSpeed, previewDerived.movementSpeed],
      ["Tốc độ đánh", player.derivedStats.attackSpeedMultiplier, previewDerived.attackSpeedMultiplier],
      ["Sát thương kỹ năng", player.derivedStats.skillDamageMultiplier, previewDerived.skillDamageMultiplier],
    ];
    ctx.font = "18px system-ui, sans-serif";
    derivedRows.forEach(([label, current, preview], index) => {
      const rowX = index % 2 === 0 ? x + 34 : x + 340;
      const rowY = y + 446 + Math.floor(index / 2) * 34;
      const changed = Math.abs(current - preview) > 0.001;
      ctx.fillStyle = changed ? "#8fe0b4" : "#cbd8d0";
      ctx.fillText(`${label}: ${this.formatStat(current)}${changed ? ` → ${this.formatStat(preview)}` : ""}`, rowX, rowY);
    });

    ctx.fillStyle = "#9db7a8";
    ctx.font = "17px system-ui, sans-serif";
    ctx.fillText(`Nền lớp: Công ${this.formatStat(player.baseStats.attack)} · Thủ ${this.formatStat(player.baseStats.defense)} · Thần ${this.formatStat(player.baseStats.spirit)} · Thân ${this.formatStat(player.baseStats.agility)}`, x + 34, y + 588);
    ctx.fillStyle = "#d8bf73";
    ctx.fillText("↑↓ Chọn   ←→ Điều chỉnh   ENTER Xác nhận", x + 34, y + 636);
    ctx.fillStyle = "#e19b86";
    ctx.fillText("BACKSPACE · [TEST/DEBUG] Hoàn trả toàn bộ điểm đã cộng", x + 34, y + 674);
    ctx.fillStyle = "#a9c5b4";
    ctx.fillText("C hoặc ESC · Đóng và hủy điểm chưa xác nhận", x + 34, y + 718);
    ctx.restore();
  }

  drawSkillPanel(ctx, player, skillSystem) {
    const x = 1140;
    const y = 130;
    const width = 720;
    const height = 790;
    const classData = skillSystem.getClass(player);
    ctx.save();
    ctx.fillStyle = "rgb(7 22 17 / 96%)";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 26);
    ctx.fill();
    ctx.strokeStyle = "#8bbda5";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#f0e2b7";
    ctx.font = "600 34px Georgia, serif";
    ctx.fillText(`Kiếm Kỹ · ${classData.name}`, x + 34, y + 50);
    ctx.fillStyle = "#d7bd70";
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText(`Điểm kỹ năng chưa dùng: ${player.skillPoints}`, x + 34, y + 86);
    ctx.fillStyle = "#91bea6";
    ctx.font = "17px system-ui, sans-serif";
    ctx.fillText(`${classData.passive.name}: ${classData.passive.description}`, x + 34, y + 116);

    classData.skills.forEach((skill, index) => {
      const rowY = y + 155 + index * 178;
      const selected = skillSystem.selectedIndex === index;
      const level = skillSystem.getSkillLevel(player, skill);
      const data = skillSystem.getLevelData(player, skill);
      const status = skillSystem.getStatus(player, skill);
      if (selected) {
        ctx.fillStyle = "rgb(71 119 96 / 48%)";
        ctx.beginPath();
        ctx.roundRect(x + 22, rowY - 26, width - 44, 158, 15);
        ctx.fill();
      }
      ctx.fillStyle = status === "locked" ? "#777f79" : status === "max" ? "#e7ca73" : "#e9eedf";
      ctx.font = "600 23px Georgia, serif";
      ctx.fillText(`${skill.keyLabel} · ${skill.name}  [${level}/${skill.maxLevel}]`, x + 38, rowY);
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillStyle = status === "locked" ? "#8c918d" : "#bcd0c3";
      ctx.fillText(skill.description, x + 38, rowY + 30);
      ctx.fillText(`Yêu cầu cấp ${skill.requiredLevel} · Hồi ${data.cooldown}s · ${data.mpCost} MP · Tầm ${data.range}`, x + 38, rowY + 60);
      ctx.fillText(`Sát thương gốc ${data.damage} · Hiệu ứng ${skill.effect}`, x + 38, rowY + 88);
      const cost = skillSystem.getUpgradeCost(player, skill);
      const statusText = status === "locked"
        ? `KHÓA — cần cấp ${skill.requiredLevel}`
        : status === "max"
          ? "ĐÃ ĐẠT CẤP TỐI ĐA"
          : `ENTER · ${level === 0 ? "Học" : "Nâng cấp"} (${cost} điểm)`;
      ctx.fillStyle = status === "locked" ? "#d08c7c" : status === "max" ? "#e7ca73" : "#8fe0b4";
      ctx.fillText(statusText, x + 38, rowY + 116);
    });

    ctx.fillStyle = "#a9c5b4";
    ctx.font = "17px system-ui, sans-serif";
    ctx.fillText("↑↓ Chọn · ENTER Học/Nâng cấp · L hoặc ESC Đóng", x + 34, y + height - 28);
    ctx.restore();
  }

  drawInventoryPanel(ctx, player, inventorySystem) {
    const x = 120;
    const y = 110;
    const width = 1680;
    const height = 820;
    ctx.save();
    ctx.fillStyle = "rgb(5 17 13 / 97%)";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 28);
    ctx.fill();
    ctx.strokeStyle = "#c8ad65";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#f0e2b7";
    ctx.font = "600 35px Georgia, serif";
    ctx.fillText("Hành Nang & Trang Bị", x + 38, y + 54);
    ctx.fillStyle = "#91bea6";
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText(`Sức chứa ${inventorySystem.getUsedSlots(player)} / ${this.itemConfig.inventory.slotLimit} ô`, x + 38, y + 88);
    ctx.fillStyle = "#e0bd58";
    ctx.fillText(`${player.coins} linh tệ`, x + 310, y + 88);

    this.drawEquipmentColumn(ctx, player, inventorySystem, x + 38, y + 126);
    this.drawInventoryGrid(ctx, player, inventorySystem, x + 515, y + 126);
    this.drawItemDetails(ctx, player, inventorySystem, x + 1115, y + 126);

    ctx.fillStyle = "#a9c5b4";
    ctx.font = "17px system-ui, sans-serif";
    ctx.fillText("TAB · Đổi khu vực   ↑↓ · Chọn   ENTER · Dùng/Trang bị/Tháo   DELETE · Bỏ   I hoặc ESC · Đóng", x + 38, y + height - 25);
    if (inventorySystem.discardPending) this.drawDiscardConfirmation(ctx, player, inventorySystem);
    ctx.restore();
  }

  drawEquipmentColumn(ctx, player, inventorySystem, x, y) {
    ctx.fillStyle = inventorySystem.section === "equipment" ? "#f0e2b7" : "#9db7a8";
    ctx.font = "600 24px Georgia, serif";
    ctx.fillText("Trang bị", x, y);
    this.itemConfig.equipmentSlots.forEach((slot, index) => {
      const rowY = y + 26 + index * 105;
      const selected = inventorySystem.section === "equipment" && inventorySystem.selectedEquipmentIndex === index;
      const item = this.itemConfig.items[player.equipment[slot.id]];
      const rarity = item ? this.itemConfig.rarities[item.rarity] : null;
      ctx.fillStyle = selected ? "rgb(73 121 96 / 62%)" : "rgb(18 38 30 / 84%)";
      ctx.beginPath();
      ctx.roundRect(x, rowY, 425, 82, 13);
      ctx.fill();
      ctx.strokeStyle = selected ? "#e2c873" : rarity?.color ?? "#53665c";
      ctx.lineWidth = selected ? 3 : 2;
      ctx.stroke();
      ctx.fillStyle = "#91bea6";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText(slot.name.toUpperCase(), x + 18, rowY + 25);
      ctx.fillStyle = item ? rarity.color : "#77847c";
      ctx.font = "600 19px Georgia, serif";
      ctx.fillText(item?.name ?? "— Trống —", x + 18, rowY + 55);
      if (item) {
        ctx.fillStyle = rarity.color;
        ctx.font = "14px system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(rarity.name, x + 405, rowY + 25);
        ctx.textAlign = "left";
      }
      this.addPointerArea(x, rowY, 425, 82, { type: "selectEquipment", index });
    });
  }

  drawInventoryGrid(ctx, player, inventorySystem, x, y) {
    ctx.fillStyle = inventorySystem.section === "inventory" ? "#f0e2b7" : "#9db7a8";
    ctx.font = "600 24px Georgia, serif";
    ctx.fillText("Túi đồ", x, y);
    const columns = 5;
    const cellWidth = 104;
    const cellHeight = 94;
    for (let index = 0; index < this.itemConfig.inventory.slotLimit; index += 1) {
      const cellX = x + (index % columns) * (cellWidth + 8);
      const cellY = y + 26 + Math.floor(index / columns) * (cellHeight + 8);
      const entry = player.inventory[index];
      const item = entry ? this.itemConfig.items[entry.itemId] : null;
      const rarity = item ? this.itemConfig.rarities[item.rarity] : null;
      const selected = inventorySystem.section === "inventory" && inventorySystem.selectedInventoryIndex === index;
      ctx.fillStyle = selected ? "rgb(73 121 96 / 66%)" : "rgb(14 32 25 / 84%)";
      ctx.beginPath();
      ctx.roundRect(cellX, cellY, cellWidth, cellHeight, 11);
      ctx.fill();
      ctx.strokeStyle = selected ? "#e2c873" : rarity?.color ?? "#35483f";
      ctx.lineWidth = selected ? 3 : 1.5;
      ctx.stroke();
      ctx.fillStyle = item ? rarity.color : "#4d5e55";
      ctx.font = "700 22px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(item ? item.name.charAt(0) : `${index + 1}`, cellX + cellWidth / 2, cellY + 39);
      if (item) {
        ctx.fillStyle = "#dce8df";
        ctx.font = "13px system-ui, sans-serif";
        const shortName = item.name.length > 12 ? `${item.name.slice(0, 11)}…` : item.name;
        ctx.fillText(shortName, cellX + cellWidth / 2, cellY + 67);
        if (entry.quantity > 1) {
          ctx.textAlign = "right";
          ctx.fillStyle = "#fff0bd";
          ctx.fillText(`×${entry.quantity}`, cellX + cellWidth - 8, cellY + 87);
        }
      }
      ctx.textAlign = "left";
      this.addPointerArea(cellX, cellY, cellWidth, cellHeight, { type: "selectInventory", index });
    }
  }

  drawItemDetails(ctx, player, inventorySystem, x, y) {
    const width = 500;
    const height = 610;
    ctx.fillStyle = "rgb(12 31 24 / 82%)";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 18);
    ctx.fill();
    let item = null;
    if (inventorySystem.section === "inventory") {
      const entry = inventorySystem.getSelectedEntry(player);
      item = entry ? this.itemConfig.items[entry.itemId] : null;
    } else {
      item = this.itemConfig.items[player.equipment[inventorySystem.getSelectedEquipmentSlot()]] ?? null;
    }
    ctx.fillStyle = "#f0e2b7";
    ctx.font = "600 24px Georgia, serif";
    ctx.fillText("Chi tiết", x + 26, y + 40);
    if (!item) {
      ctx.fillStyle = "#788d80";
      ctx.font = "18px system-ui, sans-serif";
      ctx.fillText("Chưa chọn vật phẩm.", x + 26, y + 82);
      return;
    }
    const rarity = this.itemConfig.rarities[item.rarity];
    ctx.fillStyle = rarity.color;
    ctx.font = "600 27px Georgia, serif";
    ctx.fillText(item.name, x + 26, y + 82);
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(`${rarity.name} · ${this.getItemTypeLabel(item)}`, x + 26, y + 111);
    ctx.fillStyle = "#dce8df";
    ctx.font = "18px Georgia, serif";
    this.drawWrappedText(ctx, item.description, x + 26, y + 150, width - 52, 27);

    let cursorY = y + 230;
    if (item.requirements) {
      ctx.fillStyle = "#d7bd70";
      ctx.font = "17px system-ui, sans-serif";
      const requirements = [`Cấp ${item.requirements.level ?? 1}`];
      if (item.requirements.realmId) requirements.push(`Cảnh giới ${item.requirements.realmId}`);
      ctx.fillText(`Yêu cầu: ${requirements.join(" · ")}`, x + 26, cursorY);
      cursorY += 34;
    }
    if (item.stats) {
      ctx.fillStyle = "#f0e2b7";
      ctx.font = "600 19px Georgia, serif";
      ctx.fillText("Chỉ số", x + 26, cursorY);
      cursorY += 30;
      for (const [stat, value] of Object.entries(item.stats)) {
        ctx.fillStyle = "#8fe0b4";
        ctx.font = "17px system-ui, sans-serif";
        ctx.fillText(`+ ${this.itemConfig.statLabels[stat]}: ${this.formatItemStat(stat, value)}`, x + 34, cursorY);
        cursorY += 28;
      }
    }
    if (inventorySystem.section === "inventory" && item.type === "equipment") {
      cursorY += 12;
      ctx.fillStyle = "#f0e2b7";
      ctx.font = "600 19px Georgia, serif";
      ctx.fillText("So sánh với trang bị hiện tại", x + 26, cursorY);
      cursorY += 30;
      const comparison = inventorySystem.getComparison(player, item) ?? [];
      for (const row of comparison) {
        const difference = row.incoming - row.current;
        ctx.fillStyle = difference > 0 ? "#8fe0b4" : difference < 0 ? "#e5a08a" : "#b7c5bc";
        ctx.font = "16px system-ui, sans-serif";
        const sign = difference > 0 ? "+" : "";
        ctx.fillText(`${this.itemConfig.statLabels[row.stat]}: ${sign}${this.formatItemStat(row.stat, difference)}`, x + 34, cursorY);
        cursorY += 25;
      }
    }

    const buttonY = y + height - 66;
    if (inventorySystem.section === "inventory") {
      this.drawPanelButton(ctx, x + 22, buttonY, 270, 44, item.type === "equipment" ? "Trang bị" : item.type === "consumable" ? "Sử dụng" : "Không thể dùng", { type: "useSelected" }, item.type !== "material");
      this.drawPanelButton(ctx, x + 306, buttonY, 172, 44, "Bỏ vật phẩm", { type: "discardSelected" }, true, "danger");
    } else {
      this.drawPanelButton(ctx, x + 22, buttonY, 456, 44, "Tháo trang bị", { type: "unequipSelected" }, true);
    }
  }

  drawPanelButton(ctx, x, y, width, height, label, action, enabled, style = "normal") {
    ctx.fillStyle = !enabled ? "#38463f" : style === "danger" ? "#7b4039" : "#376b56";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 10);
    ctx.fill();
    ctx.fillStyle = enabled ? "#fff0d0" : "#819087";
    ctx.font = "600 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + width / 2, y + 28);
    ctx.textAlign = "left";
    if (enabled) this.addPointerArea(x, y, width, height, action);
  }

  drawDiscardConfirmation(ctx, player, inventorySystem) {
    const entry = inventorySystem.getSelectedEntry(player);
    const item = entry ? this.itemConfig.items[entry.itemId] : null;
    const x = 610;
    const y = 400;
    const width = 700;
    const height = 240;
    ctx.fillStyle = "rgb(3 10 8 / 78%)";
    ctx.fillRect(120, 110, 1680, 820);
    ctx.fillStyle = "#10271e";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 22);
    ctx.fill();
    ctx.strokeStyle = "#d38b78";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#f0e2b7";
    ctx.font = "600 27px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(`Bỏ toàn bộ ${item?.name ?? "vật phẩm"}?`, x + width / 2, y + 62);
    ctx.fillStyle = "#b9c9bf";
    ctx.font = "17px system-ui, sans-serif";
    ctx.fillText("Hành động này chỉ thực hiện sau khi bạn xác nhận.", x + width / 2, y + 101);
    ctx.textAlign = "left";
    this.drawPanelButton(ctx, x + 70, y + 148, 250, 48, "ENTER · Xác nhận", { type: "confirmDiscard" }, true, "danger");
    this.drawPanelButton(ctx, x + 380, y + 148, 250, 48, "ESC · Hủy", { type: "cancelDiscard" }, true);
  }

  getItemTypeLabel(item) {
    if (item.type === "equipment") return "Trang bị";
    if (item.type === "consumable") return "Đan dược";
    return "Nguyên liệu";
  }

  formatItemStat(stat, value) {
    if (stat.endsWith("Percent")) return `${Math.round(value * 100)}%`;
    return this.formatStat(value);
  }

  drawInventoryMessages(ctx, messages) {
    if (messages.length === 0) return;
    ctx.save();
    ctx.textAlign = "center";
    messages.forEach((message, index) => {
      ctx.globalAlpha = Math.min(1, message.life * 2);
      ctx.fillStyle = "rgb(5 16 12 / 88%)";
      ctx.beginPath();
      ctx.roundRect(690, 710 - index * 42, 540, 36, 11);
      ctx.fill();
      ctx.fillStyle = message.kind === "warning" ? "#e7a18b" : message.kind === "success" ? "#8fe0b4" : "#d7d6c5";
      ctx.font = "17px system-ui, sans-serif";
      ctx.fillText(message.text, 960, 734 - index * 42);
    });
    ctx.restore();
  }

  drawSkillFeedback(ctx, feedback) {
    if (feedback.length === 0) return;
    ctx.save();
    ctx.textAlign = "center";
    feedback.forEach((item, index) => {
      ctx.globalAlpha = Math.min(1, item.life * 2);
      ctx.fillStyle = "rgb(5 16 12 / 82%)";
      ctx.beginPath();
      ctx.roundRect(690, 770 - index * 44, 540, 36, 11);
      ctx.fill();
      ctx.fillStyle = item.kind === "warning" ? "#e7a18b" : item.kind === "success" ? "#8fe0b4" : "#d7d6c5";
      ctx.font = "17px system-ui, sans-serif";
      ctx.fillText(item.text, 960, 794 - index * 44);
    });
    ctx.restore();
  }

  drawBreakthroughRequirements(ctx, player, progression, x, y) {
    const info = progression.getBreakthroughInfo(player);
    ctx.textAlign = "left";
    ctx.font = "19px system-ui, sans-serif";
    if (!info.nextStep) {
      ctx.fillStyle = "#8fe0b4";
      ctx.fillText("Đã đạt cảnh giới cao nhất hiện có.", x, y);
      return;
    }

    const target = info.nextStep;
    const targetName = `${target.realm.name} · ${target.stage.name} · ${progression.getSubLevelLabel(target.subLevel)}`;
    ctx.fillStyle = "#cbdad0";
    ctx.fillText(`Mục tiêu: ${targetName}`, x, y);
    const requirements = [
      ["Cấp", player.level, info.requiredLevel],
      ["Công", player.baseStats.attack, info.requiredStats.attack],
      ["Thủ", player.baseStats.defense, info.requiredStats.defense],
      ["Thần", player.baseStats.spirit, info.requiredStats.spirit],
    ];
    requirements.forEach(([label, current, required], index) => {
      ctx.fillStyle = current >= required ? "#83d5a5" : "#e49a85";
      ctx.fillText(`${current >= required ? "✓" : "○"} ${label}: ${this.formatStat(current)} / ${required}`, x, y + 36 + index * 30);
    });

    ctx.fillStyle = progression.breakthroughMode ? "#d8bf73" : "#9db7a8";
    const instruction = progression.breakthroughMode
      ? "B · Thử đột phá (thành công khi đủ điều kiện)"
      : "Đến Tụ Linh Đài và nhấn E để đột phá";
    ctx.fillText(instruction, x, y + 172);
    if (progression.breakthroughMessage) {
      ctx.fillStyle = progression.breakthroughMessage.startsWith("Còn thiếu") ? "#e49a85" : "#8fe0b4";
      ctx.font = "17px system-ui, sans-serif";
      this.drawWrappedText(ctx, progression.breakthroughMessage, x, y + 207, 500, 25);
    }
  }

  drawNotifications(ctx, notifications) {
    ctx.save();
    ctx.textAlign = "center";
    notifications.forEach((notification, index) => {
      const alpha = Math.min(1, notification.life * 2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgb(7 20 16 / 86%)";
      ctx.beginPath();
      ctx.roundRect(650, 150 + index * 52, 620, 42, 13);
      ctx.fill();
      ctx.fillStyle = notification.kind === "warning" ? "#e5a08a" : "#e8d17f";
      ctx.font = "600 20px Georgia, serif";
      ctx.fillText(notification.text, 960, 178 + index * 52);
    });
    ctx.restore();
  }

  formatStat(value) {
    return Number.isInteger(value) ? value : value.toFixed(1);
  }

  drawDialogue(ctx, dialogue) {
    ctx.save();
    ctx.fillStyle = "rgb(2 10 8 / 48%)";
    ctx.fillRect(0, 0, this.config.resolution.width, this.config.resolution.height);

    const x = 280;
    const y = 720;
    const width = 1360;
    const height = 286;
    ctx.fillStyle = "rgb(8 24 19 / 96%)";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 26);
    ctx.fill();
    ctx.strokeStyle = "#cdb368";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#f1e3b8";
    ctx.font = "600 34px Georgia, serif";
    ctx.fillText(dialogue.speaker, x + 48, y + 62);
    ctx.fillStyle = "#87b9a0";
    ctx.font = "19px system-ui, sans-serif";
    ctx.fillText(dialogue.title, x + 48, y + 94);

    ctx.fillStyle = "#e9efe5";
    ctx.font = "24px Georgia, serif";
    this.drawWrappedText(ctx, dialogue.text, x + 48, y + 145, width - 96, 36);

    ctx.textAlign = "right";
    ctx.fillStyle = "#c9b776";
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText("E hoặc ESC  ·  Đóng", x + width - 42, y + height - 28);
    ctx.restore();
  }

  drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let currentY = y;
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, currentY);
        line = word;
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) ctx.fillText(line, x, currentY);
  }
}
