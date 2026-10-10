export class CraftingSystem {
  constructor(config, itemConfig, inventory, attributes) { this.config = config; this.itemConfig = itemConfig; this.inventory = inventory; this.attributes = attributes; this.panelOpen = false; this.station = null; this.selectedIndex = 0; this.crafting = null; this.message = ""; }
  open(station) { this.panelOpen = true; this.station = station; this.selectedIndex = 0; this.crafting = null; this.message = ""; }
  close() { if (this.crafting) return false; this.panelOpen = false; return true; }
  getRecipes() { return this.config.recipes.filter((recipe) => recipe.station === this.station); }
  getSelectedRecipe() { return this.getRecipes()[this.selectedIndex] ?? null; }
  getUpgradeInfo(player) { const slot = Object.keys(player.equipment).find((key) => player.equipment[key]); if (!slot) return null; const item = this.itemConfig.items[player.equipment[slot]]; const level = player.equipmentUpgrades?.[item.id] ?? 0; const stat = slot === "weapon" ? "physicalAttack" : slot === "accessory" ? "maxMp" : slot === "boots" ? "defense" : "maxHp"; return { slot, item, level, stat, gain: this.config.upgradeStatPerLevel[stat] ?? 0 }; }
  moveSelection(direction) { if (this.crafting) return; const count = Math.max(1, this.getRecipes().length); this.selectedIndex = (this.selectedIndex + direction + count) % count; }
  getFailures(player, recipe) {
    const failures = []; const requirements = recipe.requirements ?? {};
    if (requirements.level && player.level < requirements.level) failures.push(`Cần cấp ${requirements.level}`);
    if (requirements.realmId && !this.inventory.meetsRealm(player.realmId, requirements.realmId)) failures.push(`Cần cảnh giới ${requirements.realmId}`);
    for (const ingredient of recipe.ingredients ?? []) if (this.inventory.countItem(player, ingredient.itemId) < ingredient.quantity) failures.push(`Thiếu ${this.itemConfig.items[ingredient.itemId]?.name ?? ingredient.itemId} (${ingredient.quantity})`);
    if ((recipe.coinCost ?? 0) > player.coins) failures.push(`Thiếu ${recipe.coinCost - player.coins} linh tệ`);
    if (recipe.action === "upgrade") { const info = this.getUpgradeInfo(player); if (!info) failures.push("Chưa trang bị vật phẩm"); else if (info.level >= this.config.maxUpgradeLevel) failures.push("Đã đạt cấp cường hóa tối đa"); }
    else if (!this.inventory.canAddItem(player, recipe.output.itemId, recipe.output.quantity)) failures.push("Túi đồ không đủ chỗ");
    return failures;
  }
  confirm(player) { const recipe = this.getSelectedRecipe(); if (!recipe || this.crafting) return false; const failures = this.getFailures(player, recipe); if (failures.length) { this.message = failures.join(" · "); return false; } this.crafting = { recipeId: recipe.id, elapsed: 0 }; this.message = "Đang chế tác..."; return true; }
  update(deltaTime, player) { if (!this.crafting) return false; this.crafting.elapsed += deltaTime; if (this.crafting.elapsed < this.config.craftDuration) return false; const recipe = this.config.recipes.find((entry) => entry.id === this.crafting.recipeId); this.crafting = null; const failures = recipe ? this.getFailures(player, recipe) : ["Công thức không hợp lệ"]; if (failures.length) { this.message = failures.join(" · "); return false; } for (const ingredient of recipe.ingredients ?? []) this.inventory.removeItemById(player, ingredient.itemId, ingredient.quantity); player.coins -= recipe.coinCost ?? 0; if (recipe.action === "upgrade") { const info = this.getUpgradeInfo(player); player.equipmentUpgrades[info.item.id] = info.level + 1; this.attributes.recalculate(player); this.message = `Cường hóa thành công +${info.level + 1}.`; } else { this.inventory.addItem(player, recipe.output.itemId, recipe.output.quantity); this.message = `Chế tác thành công ${this.itemConfig.items[recipe.output.itemId].name}.`; } return true; }
}
