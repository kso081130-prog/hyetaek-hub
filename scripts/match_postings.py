"""
지원사업(장학금·지원금·멘토링) 매칭 알리미

흐름:
  1. Claude(Anthropic API)에게 웹검색 도구(web_search)를 주고, 프로필 조건에
     맞는 최신 장학금·지원금·멘토링 공고를 직접 찾고 판단하게 한다
     (검색과 판단을 한 번의 API 호출 안에서 처리 — 별도 검색 API 불필요)
  2. 골라진 공고마다 POST /api/postings/ingest 호출 (URL 기준 서버가 중복 무시)
  3. 결과를 logs/match-postings-YYYY-MM-DD.log 에 기록한다

GitHub Actions에서 5일마다 실행된다 (.github/workflows/match-postings.yml) —
GitHub Actions runner는 인터넷 제한이 없어서, 네트워크가 막힌 Claude 클라우드
루틴 환경 대신 이 방식을 쓴다.

원래는 네이버 검색 오픈API + Claude 판단 조합이었으나, 이 프로젝트의 네이버
개발자 계정에서 검색 API 셀프 등록이 막혀있어(신규로 등록할 수 없는 API)
Claude API 자체의 web_search 도구로 교체했다. 별도 키 발급/승인 절차 없이
기존 ANTHROPIC_API_KEY로 바로 동작한다.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

load_dotenv()

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

SYSTEM_PROMPT = """당신은 hyetaek-hub(꿀머니)의 지원사업 매칭 심사자입니다.
web_search 도구를 사용해 프로필 조건에 실제로 맞는 최신 장학금·지원금·멘토링
공고를 찾아야 합니다.

절대 규칙 (이 니치는 실제 돈과 관련된 정보라 잘못된 매칭이 치명적입니다):
- 대형 집계 사이트(보조금24, 복지로, 한국장학재단, 장학쌤, 드림스폰,
  자립정보ON, 온통청소년, K-스타트업)와 프로필 조건에 맞는 키워드 조합으로
  여러 번 검색하세요.
- 나이·지역·재학여부 같은 자격요건을 검색 결과에서 확인할 수 있으면 확인하고,
  확인이 안 되거나 애매하면 절대 포함하지 마세요. 놓치는 것보다 틀린 걸
  넣는 게 훨씬 나쁩니다.
- 검색 결과에 없는 금액·마감일·자격요건을 지어내지 마세요. 마감일을 모르면
  deadline은 null로 두세요.
- 순수 뉴스/이슈성 기사(정책 발표, 통계, 캠페인 홍보)는 제외하고, 실제로
  "신청 가능한" 공고만 고르세요. 마감이 이미 지난 공고도 제외하세요.
- category는 scholarship(장학금) / subsidy(지원금) / mentoring(멘토링) 중 하나로
  분류하세요.
- 검색과 판단이 끝나면, 마지막 응답은 반드시 JSON 배열 하나만 출력하세요
  (다른 텍스트나 코드블록 표시 없이, 배열 앞뒤에 설명 문장도 쓰지 마세요).
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


def search_and_judge() -> list[dict]:
    if not ANTHROPIC_API_KEY:
        raise SystemExit("ANTHROPIC_API_KEY가 설정되어 있지 않습니다.")
    import anthropic

    today_str = datetime.now().strftime("%Y년 %m월 %d일")
    user_prompt = (
        f"오늘 날짜: {today_str}\n\n"
        f"{PROFILE_TEXT}\n\n"
        "위 프로필 조건에 맞는 최근 1~2주 내 신규 장학금/지원금/멘토링 공고를 "
        "웹검색으로 찾아서 매칭된 것만 JSON 배열로 답하세요."
    )

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    resp = client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=8000,
        system=SYSTEM_PROMPT,
        tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 15}],
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
    print("Claude 웹검색으로 매칭 중...")
    matched = search_and_judge()
    print(f"  매칭된 공고 {len(matched)}건")

    sent = 0
    for posting in matched:
        if ingest_posting(posting):
            sent += 1
            print(f"  [전송] {posting.get('title')}")

    date_str = datetime.now().strftime("%Y-%m-%d")
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_line = (
        f"{datetime.now().isoformat()} matched={len(matched)} sent={sent}\n"
    )
    (LOGS_DIR / f"match-postings-{date_str}.log").open("a", encoding="utf-8").write(log_line)

    print(f"완료: 매칭 {len(matched)}건 -> 전송 {sent}건")


if __name__ == "__main__":
    run()
