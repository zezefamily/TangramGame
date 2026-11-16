export const chapters = [
  {
    start: 1,
    end: 5,
    name: "我会拼啦",
    icon: "🌱",
    description: "先补一两块，找到成功的感觉",
  },
  {
    start: 6,
    end: 12,
    name: "转个方向",
    icon: "🌼",
    description: "从多块选择，到第一次旋转",
  },
  {
    start: 13,
    end: 25,
    name: "小小能手",
    icon: "🦋",
    description: "四五块组合，再学会翻面",
  },
  {
    start: 26,
    end: 45,
    name: "自己想一想",
    icon: "🌳",
    description: "提示退场，逐步拼完整七块",
  },
  {
    start: 46,
    end: 70,
    name: "有点难了",
    icon: "⛰️",
    description: "复杂剪影，需要换个思路",
  },
  {
    start: 71,
    end: 100,
    name: "七巧大师",
    icon: "🚀",
    description: "耐心推理，挑战最后的谜题",
  },
];
export function lessonFor(id: number, mode: string) {
  const count =
    mode === "challenge"
      ? 7
      : id <= 3
        ? 1
        : id <= 7
          ? 2
          : id <= 12
            ? 3
            : id <= 18
              ? 4
              : id <= 25
                ? 5
                : id <= 35
                  ? 6
                  : 7;
  const order =
    id === 1
      ? [0]
      : id === 2
        ? [1]
        : id === 3
          ? [3]
          : id >= 19
            ? [0, 3, 4, 2, 5, 1, 6]
            : [0, 3, 5, 2, 6, 1, 4];
  const movable = count === 7 ? [0, 1, 2, 3, 4, 5, 6] : order.slice(0, count);
  const rotation = mode === "challenge" || id >= 8;
  const flipping = mode === "challenge" || id >= 22;
  return {
    count,
    movable,
    rotation,
    flipping,
    chapter: chapters.findIndex((c) => id >= c.start && id <= c.end),
    instruction:
      count === 1
        ? "把这一块，拖进空白处"
        : !rotation
          ? `选一块，填满空白处`
          : !flipping
            ? "试着转一转，再放进去"
            : count < 7
              ? "转一转，翻一翻，拼完整"
              : "看着轮廓，自己拼出来",
    skill: !rotation ? "拖一拖" : !flipping ? "转一转" : "翻一翻",
  };
}
