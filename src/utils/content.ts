import type { CollectionEntry } from "astro:content";

export function sortPosts(posts: CollectionEntry<"posts">[]) {
  return posts
    .filter((p) => import.meta.env.DEV || !p.data.draft)
    .sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function postHref(entry: CollectionEntry<"posts">) {
  return `/posts/${entry.id}/`;
}
