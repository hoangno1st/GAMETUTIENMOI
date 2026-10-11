const npc = (definition) => Object.freeze({
  interactionRange: 165,
  serviceType: "dialogue",
  questIds: Object.freeze([]),
  availability: null,
  ...definition,
  questIds: Object.freeze(definition.questIds ?? []),
});

export const NpcConfig = Object.freeze({
  definitions: Object.freeze({
    "disciple-ta-minh": npc({
      id: "disciple-ta-minh", name: "Dư Hoài", title: "Đệ tử dẫn mạch", color: "#6e93a0",
      dialogue: "Sáng sớm, Tàn Tinh trong núi lắng xuống rõ nhất. Người mới hãy theo đường đông, tập cảm nhận nhịp linh mạch trước khi xuất môn.",
      serviceType: "quest", questIds: ["main-first-steps", "side-herb-clearing", "side-rescue-fox"],
    }),
    "steward-diep-lam": npc({
      id: "steward-diep-lam", name: "Mộc Nghi", title: "Chấp sự tuần mạch", color: "#8b667f",
      dialogue: "Tĩnh Lam Môn coi trọng căn cơ hơn tốc độ. Hãy quen với Viện Sơ Tu; khi nhịp thở ổn định, ta sẽ giao việc tuần mạch.",
      serviceType: "quest", questIds: ["main-first-steps", "side-treasure-trial", "main-explore-forest"],
    }),
    "herbalist-lien-hoa": npc({
      id: "herbalist-lien-hoa", name: "Kỷ Nhu", title: "Dược sư Tức Diệp", color: "#6aab78",
      dialogue: "Lá Tức Diệp giữ được nhịp linh mạch, nhưng Tức Diệp Tinh đang hút cạn rừng phía tây. Muốn đi sâu, hãy dọn chúng trước.",
      serviceType: "quest", questIds: ["main-explore-forest", "side-forest-herbs", "side-forest-patrol", "main-stone-basin"],
    }),
    "miner-bach-thach": npc({
      id: "miner-bach-thach", name: "Sầm Thước", title: "Khoáng sư dò mạch", color: "#a09070",
      dialogue: "Thạch Mạch Hoang còn nhiều vụn Tàn Tinh, nhưng Mạch Nham Khôi đã chiếm các vỉa sâu. Muốn khai thác phải dọn đường trước.",
      serviceType: "quest", questIds: ["main-stone-basin", "side-stones-clearing", "side-stones-mining", "main-mountain-pass"],
    }),
    "scout-phong-van": npc({
      id: "scout-phong-van", name: "Lục Kỳ", title: "Trinh sát cổ đạo", color: "#7a8882",
      dialogue: "Bầy Phong Nha Lang ngửi thấy linh khí Tàn Tinh nên càng hung hãn. Ai muốn qua cổ đạo phải giúp dẹp chúng trước.",
      serviceType: "quest", questIds: ["main-mountain-pass", "side-mountain-wolves", "side-mountain-cores", "main-valley-descent"],
    }),
    "hermit-u-minh": npc({
      id: "hermit-u-minh", name: "Ôn Trầm", title: "Người giữ phong ấn", color: "#7a6d90",
      dialogue: "Phong ấn dưới Cốc Vọng U đang rạn. Vọng U Ảnh sinh từ ký ức lạc trong sương, chớ để chúng tụ thành linh triều.",
      serviceType: "quest", questIds: ["main-valley-descent", "side-valley-wraiths", "side-valley-relics", "main-abyss-descent"],
    }),
    "forgemaster-hoa-lien": npc({
      id: "forgemaster-hoa-lien", name: "Hỏa Liên", title: "Luyện khí sư cổ", color: "#c47030",
      dialogue: "Long hỏa dưới địa uyên là ngọn lửa cuối cùng của rồng cổ. Nham Hỏa Xà và Tro Nham Khôi hút linh hỏa, còn Long Ảnh… là thứ ta sợ nhất.",
      serviceType: "quest", questIds: ["main-abyss-descent", "side-abyss-serpents", "side-abyss-drake"],
    }),
  }),
  placements: Object.freeze({
    "thanh-van-ngoai-mon": Object.freeze([
      Object.freeze({ npcId: "disciple-ta-minh", x: 1590, y: 1480 }),
      Object.freeze({ npcId: "steward-diep-lam", x: 2040, y: 1480 }),
    ]),
    "rung-linh-thao": Object.freeze([Object.freeze({ npcId: "herbalist-lien-hoa", x: 1580, y: 1300 })]),
    "bai-da-linh-khi": Object.freeze([Object.freeze({ npcId: "miner-bach-thach", x: 1600, y: 1350 })]),
    "hac-phong-son-dao": Object.freeze([Object.freeze({ npcId: "scout-phong-van", x: 1550, y: 1280 })]),
    "u-minh-coc": Object.freeze([Object.freeze({ npcId: "hermit-u-minh", x: 1600, y: 1320 })]),
    "long-hoa-dia-uyen": Object.freeze([Object.freeze({ npcId: "forgemaster-hoa-lien", x: 1580, y: 1300 })]),
  }),
});

export function getNpcSpawnsForMap(mapId) {
  return Object.freeze((NpcConfig.placements[mapId] ?? []).map((placement) => {
    const definition = NpcConfig.definitions[placement.npcId];
    return Object.freeze({ ...definition, ...placement, id: placement.npcId, questGiver: definition?.serviceType === "quest" });
  }));
}
