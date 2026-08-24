"""
사이트 점검 스크립트

배포된 사이트의 홈페이지, sitemap.xml, robots.txt, 그리고 최근 발행된 글 URL들이
정상 응답(200)하는지 확인하고 logs/check-YYYY-MM-DD.log 에 기록한다.

사용법:
  python scripts/check_site.py --url https://hyetaek-hub.vercel.app
  (--url 생략 시 SITE_URL 환경변수 또는 .env의 NEXT_PUBLIC_SITE_URL 사용)
"""

from __future__ import annotations

import argparse
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

ROOT = Path(__file__).parent.parent
LOGS_DIR = ROOT / "logs"
REQUEST_TIMEOUT = 15


def get_published_slugs() -> list[str]:
    posts_dir = ROOT / "content" / "posts"
    slugs = []
    status_re = re.compile(r"""status['"]?\s*:\s*['"]published['"]""")
    for path in sorted(posts_dir.glob("*.mdx")):
        text = path.read_text(encoding="utf-8")
        if status_re.search(text):
            slugs.append(path.stem)
    return slugs


def check_url(url: str) -> tuple[bool, str]:
    try:
        resp = requests.get(url, timeout=REQUEST_TIMEOUT, headers={"User-Agent": "hyetaek-hub-sitecheck/1.0"})
        return resp.status_code == 200, f"{resp.status_code}"
    except Exception as e:  # noqa: BLE001
        return False, f"오류: {e}"


def run(base_url: str) -> None:
    base_url = base_url.rstrip("/")
    targets = [
        ("홈페이지", base_url),
        ("sitemap.xml", f"{base_url}/sitemap.xml"),
        ("robots.txt", f"{base_url}/robots.txt"),
        ("지원금 계산기", f"{base_url}/tools/subsidy-calculator"),
    ]
    for slug in get_published_slugs()[-5:]:  # 최근 5개만 점검 (전체 점검은 비용이 큼)
        targets.append((f"글: {slug}", f"{base_url}/posts/{slug}"))

    results = []
    all_ok = True
    for name, url in targets:
        ok, detail = check_url(url)
        all_ok = all_ok and ok
        status = "OK" if ok else "FAIL"
        results.append(f"[{status}] {name} -> {url} ({detail})")
        print(results[-1])

    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    date_str = datetime.now().strftime("%Y-%m-%d")
    log_path = LOGS_DIR / f"check-{date_str}.log"
    with log_path.open("a", encoding="utf-8") as f:
        f.write(f"{datetime.now().isoformat()} all_ok={all_ok}\n")
        for line in results:
            f.write(f"  {line}\n")

    if not all_ok:
        print("\n일부 점검 실패 — 로그를 확인하세요:", log_path)
        sys.exit(1)
    print("\n전체 정상.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="배포된 사이트 상태 점검")
    parser.add_argument("--url", default=os.getenv("SITE_URL") or os.getenv("NEXT_PUBLIC_SITE_URL"))
    args = parser.parse_args()
    if not args.url:
        raise SystemExit("--url 을 지정하거나 SITE_URL 환경변수를 설정하세요.")
    run(args.url)
