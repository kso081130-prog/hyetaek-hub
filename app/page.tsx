import Link from "next/link";
import { getPublishedPosts } from "@/lib/posts";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { CATEGORIES, categoryOf } from "@/lib/categories";

type Props = {
  searchParams: Promise<{ tag?: string; category?: string; q?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const { tag: activeTag, category: activeCategory, q } = await searchParams;
  const posts = await getPublishedPosts();
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();

  const categoryCounts = CATEGORIES.map((c) => ({
    ...c,
    count: posts.filter((p) => categoryOf(p.tags)?.id === c.id).length,
  })).filter((c) => c.count > 0);

  let visiblePosts = posts;
  let filterLabel = "";
  if (q) {
    const needle = q.toLowerCase();
    visiblePosts = posts.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        p.tags.some((t) => t.toLowerCase().includes(needle))
    );
    filterLabel = `"${q}" 검색 결과`;
  } else if (activeCategory) {
    visiblePosts = posts.filter((p) => categoryOf(p.tags)?.id === activeCategory);
    filterLabel = CATEGORIES.find((c) => c.id === activeCategory)?.label ?? activeCategory;
  } else if (activeTag) {
    visiblePosts = posts.filter((p) => p.tags.includes(activeTag));
    filterLabel = `#${activeTag}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <section className="mb-10 rounded-3xl border border-line bg-gradient-to-br from-accent-soft via-surface to-accent2-soft p-8">
        <p className="text-sm font-bold text-accent-dark mb-2">🍯 {posts.length}개의 지원금·장학금 정보</p>
        <h1 className="text-2xl font-bold mb-3 text-ink">{SITE_DESCRIPTION}</h1>
        <p className="text-sm text-ink-soft mb-5">
          매일 새로운 지원제도 정보를 정리해서 올립니다. 구체적인 금액이 담긴 글은 국세청·정부24
          등 공식 자료를 근거로 출처와 함께 작성합니다.
        </p>
        <Link
          href="/tools/subsidy-calculator"
          className="inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          우리집 지원금 진단하기 →
        </Link>
      </section>

      <form action="/" method="get" className="mb-8 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="궁금한 지원금·제도 이름을 검색해보세요 (예: 전세대출, 장학금)"
          className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-sm text-ink"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          검색
        </button>
      </form>

      {categoryCounts.length > 0 && !q && (
        <section className="mb-10">
          <p className="text-xs font-semibold text-ink-soft mb-3">카테고리로 둘러보기</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categoryCounts.map((c) => (
              <Link
                key={c.id}
                href={`/?category=${c.id}`}
                className={`flex flex-col items-center gap-1 rounded-2xl border p-4 text-center transition hover:-translate-y-0.5 hover:shadow-md ${
                  activeCategory === c.id
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface"
                }`}
              >
                <span className="text-2xl">{c.icon}</span>
                <span className="text-xs font-medium text-ink">{c.label}</span>
                <span className="text-[11px] text-ink-soft">{c.count}개</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {allTags.length > 0 && !q && (
        <section className="mb-8 flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className={`rounded-full border px-3 py-1 text-xs ${
              !activeTag && !activeCategory
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
        </section>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">
          {q ? filterLabel : filterLabel ? `${filterLabel} 관련 글` : "전체 글"} ({visiblePosts.length})
        </h2>
        {q && (
          <Link href="/" className="text-xs text-ink-soft hover:text-accent">
            전체 글 보기
          </Link>
        )}
      </div>
      {visiblePosts.length === 0 ? (
        <p className="text-ink-soft text-sm">
          {q
            ? "검색 결과가 없습니다. 다른 검색어로 다시 시도해보세요."
            : filterLabel
              ? "이 주제로 작성된 글이 아직 없습니다."
              : `아직 게시된 글이 없습니다. 매일 아침 ${SITE_NAME}이 새 글을 자동으로 추가합니다.`}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {visiblePosts.map((post) => {
            const cat = categoryOf(post.tags);
            return (
              <li key={post.slug}>
                <Link
                  href={`/posts/${post.slug}`}
                  className="flex gap-4 group rounded-xl border border-line bg-surface p-5 transition hover:border-accent hover:shadow-md"
                >
                  <span className="text-2xl shrink-0" aria-hidden>
                    {cat?.icon ?? "💰"}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-ink group-hover:text-accent">{post.title}</h3>
                    <p className="text-sm text-ink-soft mt-1.5">{post.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <time className="text-xs text-ink-soft">{post.date}</time>
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-dark"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
