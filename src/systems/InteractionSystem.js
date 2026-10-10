export class InteractionSystem {
  constructor(range) {
    this.range = range;
    this.nearbyTarget = null;
    this.dialogue = null;
  }

  update(player, interactables) {
    let nearest = null;
    let nearestDistance = this.range;

    for (const target of interactables) {
      if (target.defeated) continue;
      const distance = Math.hypot(target.x - player.x, target.y - player.y);
      if (distance < nearestDistance) {
        nearest = target;
        nearestDistance = distance;
      }
    }

    this.nearbyTarget = nearest;
  }

  interact() {
    const target = this.nearbyTarget;
    if (!target) return;

    if (target.type === "npc") {
      this.dialogue = {
        speaker: target.name,
        title: target.title,
        text: target.dialogue,
      };
    } else if (target.type === "training") {
      this.dialogue = {
        speaker: target.name,
        title: "Dụng cụ luyện tập",
        text: "Thân cọc còn in những vết kiếm nông. Đây là nơi đệ tử ngoại môn rèn bộ pháp và kiếm thức căn bản.",
      };
    } else if (target.type === "enemy") {
      this.dialogue = {
        speaker: target.name,
        title: "Sinh vật cấp thấp",
        text: target.species === "herb-spirit"
          ? "Một cụm linh thảo hấp thu linh khí mà thành. Nó chậm chạp, tò mò và chưa tỏ vẻ nguy hiểm."
          : "Một sơn miêu nhỏ sống quanh bãi luyện. Nó rất nhanh nhưng cơ thể khá yếu.",
      };
    }
  }

  closeDialogue() {
    this.dialogue = null;
  }

  get isDialogueOpen() {
    return this.dialogue !== null;
  }
}
