import fs from "node:fs";
import path from "node:path";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export type PostSource = { title: string; url: string };

export type PostMeta = {
  title: string;
  description: string;
  date: string;
  tags: string[];
  status: "draft" | "published";
  sources: PostSource[];
};

export type PostSummary = PostMeta & { slug: string };

export function getAllSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export async function getPostMeta(slug: string): Promise<PostMeta> {
  const mod = await import(`@/content/posts/${slug}.mdx`);
  return mod.postMeta as PostMeta;
}

export async function getAllPosts(): Promise<PostSummary[]> {
  const slugs = getAllSlugs();
  const posts = await Promise.all(
    slugs.map(async (slug) => ({ slug, ...(await getPostMeta(slug)) }))
  );
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPublishedPosts(): Promise<PostSummary[]> {
  const posts = await getAllPosts();
  return posts.filter((p) => p.status === "published");
}
