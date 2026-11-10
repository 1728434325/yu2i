import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { sortPosts } from "../utils/content";

export async function GET(context: APIContext) {
  const posts = sortPosts(await getCollection("posts"));
  return rss({
    title: "羽川翼 · yu2i",
    description: "一个人与一台服务器的小小世界。",
    site: context.site ?? "http://175.178.200.224:2778",
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.published,
      description: post.data.description,
      link: `/posts/${post.id}/`,
    })),
  });
}
