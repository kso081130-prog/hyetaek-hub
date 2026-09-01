"""
지원사업(장학금·지원금·멘토링) 매칭 알리미

흐름:
  1. 프로필 조건 x 카테고리 조합으로 네이버 검색(뉴스 + 웹문서)을 여러 번 돌려서
     후보 공고를 모은다
  2. Claude(Anthropic API)에게 검색 스니펫만 근거로 프로필 조건에 실제로 맞는
     공고만 골라달라고 한다 (확실하지 않으면 제외 — 이 사이트는 정확도가 최우선)
  3. 골라진 공고마다 POST /api/postings/ingest 호출 (URL 기준 서버가 중복 무시)
  4. 결과를 logs/match-postings-YYYY-MM-DD.log 에 기록한다

GitHub Actions에서 5일마다 실행된다 (.github/workflows/match-postings.yml) —
GitHub Actions runner는 인터넷 제한이 없어서, 네트워크가 막힌 Claude 클라우드
루틴 환경 대신 이 방식을 쓴다.
"""

from __future__ import annotations

import html
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

load_dotenv()

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")
INGEST_URL = os.getenv("INGEST_URL", "https://hyetaek-hub.vercel.app/api/postings/ingest")
INGEST_SECRET = os.getenv("INGEST_SECRET")

ROOT = Path(__file__).parent.parent
LOGS_DIR = ROOT / "logs"

REQUEST_TIMEOUT = 15

# 프로필 조건 — 나중에 다중 사용자로 확장하면 Supabase profiles 테이블에서
# 읽어오도록 바꿀 것. 지금은 1인 전용이라 하드코딩.
PROFILE_TEXT = """시온(Sion)의 조건 (정확):
- 2008년 11월 30일생 (현재 만 17세, 2026년 11월 30일 만 18세 됨)
- 거주지: 전남(전라남도) 무안군 일로읍
- 가정위탁보호아동 (친인척 외 위탁) - 아직 보호종료된 건 아니고 위탁 중
  (주의: '자립준비청년' 전용 사업은 보호종료 이후만 해당되니 지금은 부합하지 않음.
   '위탁가정 청소년'/'보호아동' 대상 사업이 지금 맞는 카테고리)
- 기초생활수급자
- 고등학교졸업학력 검정고시 출신
- 목포대학교 자율전공학부 합격, 컴퓨터공학과 진학 예정 (AI 창업 준비 중)
  (진학 예정이므로 예비대학생/신입생 대상 장학금도 해당될 수 있음)
- 전남/무안군 지역 한정 사업도 적극 포함"""

SEARCH_QUERIES = [
    "위탁가정 청소년 장학금 신규 공고",
    "보호아동 대상 장학금 신청",
    "전라남도 무안군 청소년 장학금",
    "목포대학교 신입생 장학금 기초생활수급자",
    "검정고시 출신 대학 신입생 장학금",
    "가정위탁 아동 지원금 신청",
    "기초생활수급자 대학 신입생 장학금",
    "AI 창업 대학생 지원사업 예비창업",
    "전남 대학생 창업 지원 프로그램",
    "위탁가정 대학생 멘토링 프로그램 모집",
]


def _strip_html(text: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", text or "")).strip()


def naver_search(query: str, category: str, display: int = 5) -> list[dict]:
    if not (NAVER_CLIENT_ID and NAVER_CLIENT_SECRET):
        return []
    try:
        resp = requests.get(
            f"https://openapi.naver.com/v1/search/{category}.json",
            params={"query": query, "display": display, "sort": "date" if category == "news" else "sim"},
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
        print(f"  [경고] 네이버 검색 실패 ({category}/{query}): {e}")
        return []


def collect_candidates() -> list[dict]:
    seen_links: set[str] = set()
    candidates: list[dict] = []
    for query in SEARCH_QUERIES:
        for category in ("news", "webkr"):
            for item in naver_search(query, category):
                link = item["link"]
                if not link or link in seen_links:
                    continue
                seen_links.add(link)
                candidates.append(item)
    return candidates


SYSTEM_PROMPT = """당신은 hyetaek-hub(꿀머니)의 지원사업 매칭 심사자입니다.
검색으로 모은 후보 목록(제목/설명/링크 스니펫)만 근거로, 아래 프로필 조건에
실제로 해당하는 장학금·지원금·멘토링 공고만 골라야 합니다.

절대 규칙 (이 니치는 실제 돈과 관련된 정보라 잘못된 매칭이 치명적입니다):
- 나이·지역·재학여부 같은 자격요건을 스니펫에서 확인할 수 있으면 확인하고,
  확인이 안 되거나 애매하면 절대 포함하지 마세요. 놓치는 것보다 틀린 걸
  넣는 게 훨씬 나쁩니다.
- 스니펫에 없는 금액·마감일·자격요건을 지어내지 마세요. 마감일을 모르면
  deadline은 null로 두세요.
- 순수 뉴스/이슈성 기사(예: 정책 발표, 통계, 캠페인 홍보)는 제외하고,
  실제로 "신청 가능한" 공고만 고르세요.
- category는 scholarship(장학금) / subsidy(지원금) / mentoring(멘토링) 중 하나로
  분류하세요.
- 결과는 반드시 JSON 배열 하나만 출력하세요 (다른 텍스트나 코드블록 표시 없이).
  관련 있는 공고가 하나도 없으면 빈 배열 []을 출력하세요.

각 항목의 형식:
{
  "title": "...",
  "url": "...",
  "source": "...",
  "category": "scholarship | subsidy | mentoring",
  "summary": "2~3문장 요약",
  "why_matched": "프로필의 어떤 구체적인 조건과 왜 맞는지 한 줄, 확실한 근거 기반으로만",
  "deadline": "YYYY-MM-DD 또는 null"
}
"""


def judge_candidates(candidates: list[dict]) -> list[dict]:
    if not ANTHROPIC_API_KEY:
        raise SystemExit("ANTHROPIC_API_KEY가 설정되어 있지 않습니다.")
    import anthropic

    if not candidates:
        return []

    candidate_lines = [
        f"- [{c['pubDate']}] {c['title']}: {c['description']} ({c['link']})"
        for c in candidates
    ]
    today_str = datetime.now().strftime("%Y년 %m월 %d일")
    user_prompt = (
        f"오늘 날짜: {today_str}\n\n"
        f"{PROFILE_TEXT}\n\n"
        f"후보 목록 ({len(candidates)}건):\n" + "\n".join(candidate_lines) + "\n\n"
        "위 후보 중 프로필 조건에 실제로 맞는 것만 골라 JSON 배열로만 답하세요."
    )

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    resp = client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=4000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    text = "".join(block.text for block in resp.content if block.type == "text")
    start, end = text.find("["), text.rfind("]")
    if start == -1 or end == -1:
        print(f"  [경고] 모델 응답에서 JSON 배열을 찾지 못했습니다: {text[:300]}")
        return []
    try:
        matched = json.loads(text[start : end + 1])
    except json.JSONDecodeError as e:
        print(f"  [경고] JSON 파싱 실패: {e}")
        return []
    return matched if isinstance(matched, list) else []


def ingest_posting(posting: dict) -> bool:
    if not INGEST_SECRET:
        raise SystemExit("INGEST_SECRET이 설정되어 있지 않습니다.")
    try:
        resp = requests.post(
            INGEST_URL,
            json=posting,
            headers={"x-ingest-secret": INGEST_SECRET},
            timeout=REQUEST_TIMEOUT,
        )
        if resp.status_code in (200, 201):
            return True
        print(f"  [실패] {posting.get('title')}: HTTP {resp.status_code} {resp.text[:200]}")
        return False
    except Exception as e:  # noqa: BLE001
        print(f"  [실패] {posting.get('title')}: {e}")
        return False


def run() -> None:
    print("후보 검색 중...")
    candidates = collect_candidates()
    print(f"  후보 {len(candidates)}건 수집 (중복 제거 후)")

    print("Claude로 매칭 심사 중...")
    matched = judge_candidates(candidates)
    print(f"  매칭된 공고 {len(matched)}건")

    sent = 0
    for posting in matched:
        if ingest_posting(posting):
            sent += 1
            print(f"  [전송] {posting.get('title')}")

    date_str = datetime.now().strftime("%Y-%m-%d")
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_line = (
        f"{datetime.now().isoformat()} candidates={len(candidates)} "
        f"matched={len(matched)} sent={sent}\n"
    )
    (LOGS_DIR / f"match-postings-{date_str}.log").open("a", encoding="utf-8").write(log_line)

    print(f"완료: 후보 {len(candidates)}건 -> 매칭 {len(matched)}건 -> 전송 {sent}건")


if __name__ == "__main__":
    run()
