export const QuestConfig = Object.freeze({
  areas: Object.freeze([
    Object.freeze({ id: "ngoai-mon", name: "Ngoại Môn", minX: 72, maxX: 2300, minY: 72, maxY: 2328 }),
    Object.freeze({ id: "rung-linh-thao", name: "Rừng Linh Thảo", minX: 2300, maxX: 3000, minY: 72, maxY: 1350 }),
    Object.freeze({ id: "bai-da-linh-khi", name: "Bãi Đá Linh Khí", minX: 2300, maxX: 3528, minY: 1350, maxY: 2328 }),
  ]),
  quests: Object.freeze([
    Object.freeze({
      id: "main-first-steps", type: "main", giverNpcId: "steward-diep-lam", turnInNpcId: "disciple-ta-minh",
      title: "Bước đầu ngoại môn", description: "Đến chào hỏi Tạ Minh để nhận chỉ dẫn nhập môn.",
      objectives: Object.freeze([{ id: "talk-ta-minh", type: "talk", targetId: "disciple-ta-minh", amount: 1, label: "Nói chuyện với Tạ Minh" }]),
      rewards: Object.freeze({ exp: 20, coins: 12 }),
    }),
    Object.freeze({
      id: "side-herb-clearing", type: "side", giverNpcId: "disciple-ta-minh", turnInNpcId: "disciple-ta-minh",
      title: "Dọn sạch linh thảo yêu", description: "Đánh bại những linh thảo yêu quanh khu rừng phía đông.",
      prerequisites: Object.freeze({ completedQuestId: "main-first-steps", level: 1 }),
      objectives: Object.freeze([{ id: "defeat-herb", type: "defeat", targetId: "herbSpirit", amount: 2, label: "Đánh bại Linh Thảo Yêu" }]),
      rewards: Object.freeze({ exp: 35, coins: 25, items: Object.freeze([{ itemId: "mistleaf-herb", quantity: 2 }]) }),
    }),
    Object.freeze({
      id: "main-stone-basin", type: "main", giverNpcId: "steward-diep-lam", turnInNpcId: "steward-diep-lam",
      title: "Bãi đá linh khí", description: "Thăm Bãi Đá Linh Khí để khảo sát mạch linh khí.",
      prerequisites: Object.freeze({ completedQuestId: "side-herb-clearing" }),
      objectives: Object.freeze([{ id: "visit-basin", type: "visit", targetId: "bai-da-linh-khi", amount: 1, label: "Đến Bãi Đá Linh Khí" }]),
      rewards: Object.freeze({ exp: 45, coins: 40 }),
    }),
    Object.freeze({
      id: "side-rescue-fox", type: "side", giverNpcId: "disciple-ta-minh", turnInNpcId: "disciple-ta-minh",
      title: "Cứu linh hồ nhỏ", description: "Đánh bại sơn miêu để giải cứu chú hồ ly nhỏ bị mắc kẹt.",
      prerequisites: Object.freeze({ completedQuestId: "side-herb-clearing", level: 2 }),
      objectives: Object.freeze([{ id: "defeat-cats", type: "defeat", targetId: "mountainCat", amount: 2, label: "Đánh bại Sơn Miêu" }]),
      rewards: Object.freeze({ exp: 40, coins: 30, companion: "linh-ho-tieu-bach" }),
    }),
    Object.freeze({
      id: "side-treasure-trial", type: "side", giverNpcId: "steward-diep-lam", turnInNpcId: "steward-diep-lam",
      title: "Thử luyện pháp bảo", description: "Thu thập nguyên liệu để nhận pháp bảo đầu tiên từ chấp sự.",
      prerequisites: Object.freeze({ completedQuestId: "side-rescue-fox", level: 3 }),
      objectives: Object.freeze([
        { id: "collect-cores", type: "collect", targetId: "beast-core", amount: 2, label: "Thu thập Yêu Thú Tinh Hạch" },
        { id: "collect-fragments", type: "collect", targetId: "spirit-fragment", amount: 3, label: "Thu thập Linh Thạch Vụn" },
      ]),
      rewards: Object.freeze({ exp: 50, coins: 35, items: Object.freeze([{ itemId: "thanh-van-linh-boi", quantity: 1 }]) }),
    }),
  ]),
});
