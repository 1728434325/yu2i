export interface SpeechLines {
  welcome: string[];
  click: string[];
  hover: string[];
  article: string[];
  page: string[];
  idle: string[];
  morning: string[];
  afternoon: string[];
  evening: string[];
}

export const speechLines: SpeechLines = {
  welcome: [
    "回来了呀。今天想先看哪一篇？",
    "我在的。站里没出什么事，放心。",
    "欢迎回来，茶已经泡好了——比喻而已。",
  ],
  click: [
    "修好了，别担心。",
    "这次也是同一个原因，我记得很清楚。",
    "磁盘还够用，但别太放心。",
    "日志我看过了，问题不在那儿。",
    "备份做了吗？我只是随口一问。",
    "别看我看得太久，文章在那边。",
  ],
  hover: [
    "嗯？",
    "在的。",
    "需要找什么吗？",
  ],
  article: [
    "这篇写得认真，慢慢看。",
    "看到不懂的地方，可以回来问我。",
    "读完了记得关灯——比喻而已。",
  ],
  page: [
    "换了一页，我跟着你。",
    "这里也收拾过了。",
  ],
  idle: [
    "安静一会儿也好。",
    "我先不出声了，你慢慢看。",
  ],
  morning: ["早上好。今天先做哪件事？"],
  afternoon: ["下午了，记得起来走两步。"],
  evening: ["晚上了。别熬太晚，我是随口一说。"],
};

export function greetingForHour(hour: number): string[] {
  if (hour < 11) return speechLines.morning;
  if (hour < 18) return speechLines.afternoon;
  return speechLines.evening;
}
