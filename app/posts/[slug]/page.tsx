import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPosts, getPostMeta } from "@/lib/posts";
import HelpContacts from "@/components/HelpContacts";
import { categoryOf } from "@/lib/categories";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const meta = await getPostMeta(slug);
    if (meta.status !== "published") return {};
    return { title: meta.title, description: meta.description };
  } catch {
    return {};
  }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;

  let mod: { default: React.ComponentType; postMeta: Awaited<ReturnType<typeof getPostMeta>> };
  try {
    mod = await import(`@/content/posts/${slug}.mdx`);
  } catch {
    notFound();
  }

  const meta = mod.postMeta;
  if (meta.status !== "published") {
    notFound();
  }
  const Post = mod.default;
  const category = categoryOf(meta.tags ?? []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    datePublished: meta.date,
  };

  return (
    <article className="mx-auto max-w-2xl px-4 py-12 prose prose-neutral prose-a:text-accent">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/"
        className="not-prose inline-block text-sm text-ink-soft hover:text-accent mb-4"
      >
        ← 전체 글 목록
      </Link>
      <div className="not-prose mb-6 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-accent-soft to-accent2-soft px-5 py-4">
        <span className="text-4xl" aria-hidden>
          {category?.icon ?? "💰"}
        </span>
        <span className="text-sm font-semibold text-accent-dark">
          {category?.label ?? "정부지원금"}
        </span>
      </div>
      <h1>{meta.title}</h1>
      <div className="not-prose flex flex-wrap items-center gap-2 -mt-4 mb-6">
        <time className="text-sm text-ink-soft">{meta.date}</time>
        {meta.tags?.map((tag) => (
          <span key={tag} className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
            #{tag}
          </span>
        ))}
      </div>
      {meta.sources?.length > 0 && (
        <div className="not-prose flex flex-wrap gap-3 mb-8">
          {meta.sources.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              {source.title} 신청·확인 바로가기 →
            </a>
          ))}
        </div>
      )}
      <Post />
      {meta.sources?.length > 0 && (
        <>
          <hr />
          <h2>참고 자료</h2>
          <ul>
            {meta.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer nofollow">
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      <HelpContacts />
    </article>
  );
}
