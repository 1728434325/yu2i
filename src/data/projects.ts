export interface Project {
  name: string;
  summary: string;
  status: "进行中" | "已完成" | "暂停";
  stack: string[];
  href?: string;
}

export const projects: Project[] = [
  {
    name: "yu2i.site",
    summary: "这个站。Astro 7 静态构建，无数据库、无后端，搜索索引在构建时生成。",
    status: "进行中",
    stack: ["Astro", "Tailwind", "Pagefind"],
  },
  {
    name: "port-check",
    summary: "一个端口可达性排查单生成器，把 curl 的结果整理成能贴进工单的表格。",
    status: "已完成",
    stack: ["Canvas", "原生 JS"],
    href: "/lab/port-check/",
  },
  {
    name: "邻居与灵感",
    summary: "每小时从公开博客目录里挑一个站做对比，只记录结构化差异，不转载正文。",
    status: "暂停",
    stack: ["Python", "cron"],
  },
];
