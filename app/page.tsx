import Link from "next/link";
import { getPublishedPosts } from "@/lib/posts";
import { SITE_DESCRIPTION } from "@/lib/site";

type Props = {
  searchParams: Promise<{ tag?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const { tag: activeTag } = await searchParams;
  const posts = await getPublishedPosts();
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();
  const visiblePosts = activeTag ? posts.filter((p) => p.tags.includes(activeTag)) : posts;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <section className="mb-10">
        <p className="text-sm font-medium text-accent mb-2">정부지원금 · 장학금 · 생활비 절약 정보</p>
        <h1 className="text-2xl font-bold mb-3 text-ink">{SITE_DESCRIPTION}</h1>
        <p className="text-sm text-ink-soft">
          매일 새로운 지원제도 정보를 정리해서 올립니다. 구체적인 금액이 담긴 글은 국세청·정부24
          등 공식 자료를 근거로 출처와 함께 작성합니다.
        </p>
      </section>

      <section className="mb-12 rounded-2xl border border-line bg-accent-soft p-6">
        <h2 className="text-lg font-bold mb-2 text-ink">우리집이 받을 수 있는 지원금, 확인해보세요</h2>
        <p className="text-sm text-ink-soft mb-4">
          나이·가구원수·소득만 입력하면 해당 가능성이 있는 대표 지원제도를 알려드립니다.
        </p>
        <Link
          href="/tools/subsidy-calculator"
          className="inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          지원금 계산기 열기 →
        </Link>
      </section>

      {allTags.length > 0 && (
        <section className="mb-8">
          <p className="text-xs font-medium text-ink-soft mb-2">주제별로 찾아보기</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className={`rounded-full border px-3 py-1 text-xs ${
                !activeTag
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-surface text-ink-soft hover:border-accent"
              }`}
            >
              전체
            </Link>
            {allTags.map((t) => (
              <Link
                key={t}
                href={`/?tag=${encodeURIComponent(t)}`}
                className={`rounded-full border px-3 py-1 text-xs ${
                  activeTag === t
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-surface text-ink-soft hover:border-accent"
                }`}
              >
                #{t}
              </Link>
            ))}
          </div>
        </section>
      )}

      <h2 className="text-lg font-bold mb-4 text-ink">
        {activeTag ? `#${activeTag} 관련 글` : "전체 글"} ({visiblePosts.length})
      </h2>
      {visiblePosts.length === 0 ? (
        <p className="text-ink-soft text-sm">
          {activeTag ? "이 주제로 작성된 글이 아직 없습니다." : "아직 게시된 글이 없습니다. 매일 아침 새 글이 자동으로 추가됩니다."}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {visiblePosts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/posts/${post.slug}`}
                className="block group rounded-xl border border-line bg-surface p-5 transition hover:border-accent hover:shadow-sm"
              >
                <h3 className="font-semibold text-ink group-hover:text-accent">{post.title}</h3>
                <p className="text-sm text-ink-soft mt-1.5">{post.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <time className="text-xs text-ink-soft">{post.date}</time>
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
