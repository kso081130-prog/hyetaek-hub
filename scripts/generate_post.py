"""
정부지원금·생활비 절약 글 자동 생성기

흐름:
  1. scripts/topics.json 에서 아직 다루지 않은 주제를 하나 고른다
  2. 네이버 뉴스 검색으로 그 주제에 대한 최신 맥락(사실 자료)을 보강한다
  3. Claude(Anthropic API)로 사실 자료에 근거한 글을 작성한다
  4. 모델이 "구체적인 금액·자격요건을 담았다"고 표시한 글은 status: draft 로,
     일반적인 안내/팁 글은 status: published 로 content/posts/*.mdx 에 저장한다
     (draft는 app/posts/[slug]/page.tsx의 generateStaticParams가 걸러내므로
      사람이 검수 후 status를 published로 바꿔야 실제로 배포된다)
  5. 사용한 주제는 scripts/topics.json 에 done: true 로 표시한다
  6. 결과를 logs/generate-YYYY-MM-DD.log 에 기록한다

이 스크립트는 파일만 만들고 커밋/푸시는 하지 않는다 — 발행 자동화(git commit/push)는
별도 스케줄 루틴에서 이 스크립트 실행 뒤에 처리한다 (README 참고).
"""

from __future__ import annotations

import html
import json
import re
import sys
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv
import os

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

load_dotenv()

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")

ROOT = Path(__file__).parent.parent
TOPICS_PATH = Path(__file__).parent / "topics.json"
POSTS_DIR = ROOT / "content" / "posts"
LOGS_DIR = ROOT / "logs"

REQUEST_TIMEOUT = 15


def _strip_html(text: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", text or "")).strip()


def load_topics() -> list[dict]:
    return json.loads(TOPICS_PATH.read_text(encoding="utf-8"))


def save_topics(topics: list[dict]) -> None:
    TOPICS_PATH.write_text(
        json.dumps(topics, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def pick_next_topic(topics: list[dict]) -> dict | None:
    for topic in topics:
        if not topic.get("done"):
            return topic
    return None


def fetch_naver_context(query: str, display: int = 5) -> list[dict]:
    if not (NAVER_CLIENT_ID and NAVER_CLIENT_SECRET):
        return []
    try:
        resp = requests.get(
            "https://openapi.naver.com/v1/search/news.json",
            params={"query": query, "display": display, "sort": "sim"},
            headers={
                "X-Naver-Client-Id": NAVER_CLIENT_ID,
                "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
            },
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        return [
            {
                "title": _strip_html(item.get("title", "")),
                "description": _strip_html(item.get("description", "")),
                "link": item.get("originallink") or item.get("link", ""),
                "pubDate": item.get("pubDate", ""),
            }
            for item in data.get("items", [])
        ]
    except Exception as e:  # noqa: BLE001
        print(f"  [경고] 네이버 검색 실패 ({query}): {e}")
        return []


SYSTEM_PROMPT = """당신은 한국의 정부지원금·생활비 절약 정보를 다루는 블로그 에디터입니다.
주어진 "사실 자료"만 근거로 삼아 독자에게 실질적으로 도움이 되는 안내 글을 작성합니다.

절대 규칙 (이 니치는 실제 돈과 관련된 정보라 사실관계 오류가 치명적입니다):
- 사실 자료에 없는 금액·자격요건·날짜를 지어내지 마세요. 확실하지 않으면 "정확한 금액은
  공식 사이트에서 확인하세요"처럼 안내하고 구체적인 숫자를 쓰지 마세요.
- 사실 자료에 있는 정보라도 출처를 본문에서 "OOO에 따르면"처럼 자연스럽게 언급하세요.
- 원문을 그대로 베끼지 말고 반드시 자신의 표현으로 다시 설명하세요 (표절 금지).
- 분량: 본문 700~1100자 내외, 소제목(##) 2~4개 포함, 마지막은 "정리하면" 요약 섹션.
- 어조: 친근하지만 신뢰감 있는 정보성 블로그체.
- 이 글에서 독자가 가장 먼저 알아야 할 핵심 한 가지(지급액, 신청기간, 핵심 자격조건 중 사실
  자료로 뒷받침되는 것)가 있다면, 첫 소제목 바로 아래에 마크다운 인용구(">")로 강조해서
  넣으세요. 예: "> **핵심**: 정기신청 기간은 5월 1일~6월 1일입니다." 확실한 핵심 사실이
  없으면 억지로 만들지 말고 생략하세요.
- 오늘 날짜는 사용자 메시지에 주어집니다. 제목이나 본문에 연도를 쓸 때 학습 데이터의 기억에
  의존해 추측하지 말고 반드시 그 날짜를 기준으로 쓰세요 (예: 없는 해를 지어내거나 오래된
  연도를 쓰지 말 것). 확실하지 않으면 아예 연도를 쓰지 마세요.
- 결과는 반드시 아래 JSON 스키마 하나만 출력하세요. 다른 텍스트나 코드블록 표시(```)는 출력하지 마세요.
- JSON은 유효해야 합니다: body_mdx 문자열 안에 실제 줄바꿈 대신 \\n을 쓰세요.
  큰따옴표(")를 강조로 쓰고 싶으면 작은따옴표(')나 한글 따옴표(" ")를 대신 쓰세요.

- has_specific_figures: 이 글에 구체적인 지급액(원 단위 숫자)이나 구체적인 소득·재산 자격
  기준(원 단위 숫자)이 하나라도 들어갔으면 true, 일반적인 절차/채널 안내처럼 숫자가
  없거나 있어도 뭉뚱그린 설명뿐이면 false.

{
  "title": "SEO에 좋은 제목 (32자 내외)",
  "description": "검색결과 요약 (80자 내외)",
  "tags": ["태그1", "태그2", "태그3"],
  "has_specific_figures": true,
  "body_mdx": "## 소제목\\n\\n본문...",
  "sources": [{"title": "출처명", "url": "https://..."}]
}
"""


def write_article(topic: str, naver_items: list[dict]) -> dict:
    if not ANTHROPIC_API_KEY:
        raise SystemExit(
            "ANTHROPIC_API_KEY가 설정되어 있지 않습니다. .env 파일을 확인하세요."
        )
    import anthropic

    facts_lines = [
        f"- [{it['pubDate']}] {it['title']}: {it['description']} ({it['link']})"
        for it in naver_items
        if it["title"] or it["description"]
    ]
    if not facts_lines:
        facts_lines.append(
            "- (검색된 최신 뉴스 없음. 일반적으로 알려진 제도 절차만 근거로, "
            "구체적 금액은 쓰지 말고 공식 사이트 확인을 안내할 것)"
        )

    today_str = datetime.now().strftime("%Y년 %m월 %d일")
    user_prompt = (
        f"오늘 날짜: {today_str}\n"
        f"오늘 다룰 주제: {topic}\n\n"
        f"사실 자료:\n" + "\n".join(facts_lines) + "\n\n"
        "위 사실 자료를 근거로 글을 작성해 JSON으로만 답하세요."
    )

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    last_error: Exception | None = None
    for _ in range(2):
        resp = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=2500,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        text = "".join(block.text for block in resp.content if block.type == "text")
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end == -1:
            last_error = ValueError(f"모델 응답에서 JSON을 찾지 못했습니다: {text[:200]}")
            continue
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError as e:
            last_error = e
            continue
    raise last_error


def slugify(text: str, max_len: int = 50) -> str:
    cleaned = re.sub(r'[\\/:*?"<>|]', "", text).strip()
    cleaned = re.sub(r"\s+", "-", cleaned)
    return cleaned[:max_len] or "post"


def render_mdx(article: dict, status: str, date_str: str) -> str:
    meta = {
        "title": article["title"],
        "description": article["description"],
        "date": date_str,
        "tags": article.get("tags", []),
        "status": status,
        "sources": article.get("sources", []),
    }
    meta_json = json.dumps(meta, ensure_ascii=False, indent=2)
    # JSON -> JS object literal로 그대로 써도 유효한 JS이므로 변환 없이 사용
    return f"export const postMeta = {meta_json};\n\n{article['body_mdx']}\n"


def run() -> None:
    topics = load_topics()
    topic = pick_next_topic(topics)
    if topic is None:
        print("남은 주제가 없습니다. scripts/topics.json 에 새 주제를 추가해주세요.")
        return

    print(f"주제: {topic['topic']}")
    naver_items = fetch_naver_context(topic["topic"])
    print(f"  네이버 뉴스 {len(naver_items)}건 수집")

    article = write_article(topic["topic"], naver_items)
    status = "draft" if article.get("has_specific_figures") else "published"

    date_str = datetime.now().strftime("%Y-%m-%d")
    slug = f"{date_str}-{topic['id']}"
    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    post_path = POSTS_DIR / f"{slug}.mdx"
    post_path.write_text(render_mdx(article, status, date_str), encoding="utf-8")

    topic["done"] = True
    save_topics(topics)

    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_line = f"{datetime.now().isoformat()} slug={slug} status={status} title={article['title']}\n"
    (LOGS_DIR / f"generate-{date_str}.log").open("a", encoding="utf-8").write(log_line)

    print(f"  -> {post_path} (status={status})")
    if status == "draft":
        print("  [검토 필요] 구체적 금액/자격요건이 포함된 글입니다. 검수 후 status를 published로 바꿔주세요.")


if __name__ == "__main__":
    run()
