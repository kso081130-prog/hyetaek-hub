import Link from "next/link";
import { getPublishedPosts } from "@/lib/posts";

export default async function HomePage() {
  const posts = await getPublishedPosts();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <section className="mb-12 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-xl font-bold mb-2">우리집이 받을 수 있는 지원금, 확인해보세요</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          나이·가구원수만 입력하면 해당 가능성이 있는 대표 지원제도를 보여드립니다.
        </p>
        <Link
          href="/tools/subsidy-calculator"
          className="inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          지원금 계산기 열기 →
        </Link>
      </section>

      <h2 className="text-lg font-semibold mb-4">최신 글</h2>
      {posts.length === 0 ? (
        <p className="text-neutral-500 text-sm">아직 게시된 글이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/posts/${post.slug}`} className="block group">
                <h3 className="font-medium group-hover:underline">{post.title}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  {post.description}
                </p>
                <time className="text-xs text-neutral-400 mt-1 block">{post.date}</time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
