export interface Friend {
  name: string;
  url: string;
  avatar?: string;
  description: string;
}

export const friends: Friend[] = [
  { name: "Fuwari", url: "https://fuwari.vercel.app", description: "Astro 静态博客模板，内容管线的参考。" },
  { name: "Astro Paper", url: "https://astro-paper.pages.dev", description: "极简排版与可访问性的参考。" },
  { name: "Firefly", url: "https://firefly.cuteleaf.cn", description: "二次元 Astro 主题，动效配置的思路来源。" },
  { name: "开往", url: "https://www.travellings.cn", description: "独立博客随机跳转。" },
];
