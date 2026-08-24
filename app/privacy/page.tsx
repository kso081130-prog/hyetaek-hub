import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: `${SITE_NAME}의 개인정보처리방침 및 광고 안내`,
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 prose prose-neutral dark:prose-invert">
      <h1>개인정보처리방침 및 광고 안내</h1>

      <h2>수집하는 정보</h2>
      <p>
        {SITE_NAME}의 지원금 계산기는 입력하신 나이·가구원수·소득 정보를 서버로 전송하지
        않고 브라우저 안에서만 계산합니다. 별도로 저장하거나 수집하지 않습니다.
      </p>

      <h2>광고 및 쿠키</h2>
      <p>
        이 사이트는 Google 애드센스(Google AdSense)를 통해 광고를 게재하여 운영비를
        마련할 수 있습니다. Google 및 광고 파트너는 맞춤형 광고 제공을 위해 쿠키를 사용해
        방문 이력을 기반으로 광고를 표시할 수 있습니다.
      </p>
      <p>
        맞춤형 광고를 원하지 않으시면{" "}
        <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">
          Google 광고 설정
        </a>{" "}
        또는{" "}
        <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">
          aboutads.info
        </a>
        에서 선택을 변경하실 수 있습니다.
      </p>

      <h2>이용 통계</h2>
      <p>사이트 개선을 위해 방문자 수·접속 페이지 등 기본적인 이용 통계를 익명으로 수집할 수 있습니다.</p>

      <h2>법적 성격</h2>
      <p>
        이 사이트가 제공하는 정보는 정부·지자체 공식 자료를 근거로 정리한 안내이며, 법률·세무·재무
        자문이 아닙니다. 실제 신청 전에는 반드시 해당 기관 공식 페이지에서 최신 정보를 다시
        확인하세요.
      </p>

      <h2>문의</h2>
      <p>이 방침이나 사이트 운영에 대해 문의할 사항이 있으면 문의 채널을 통해 연락해 주세요.</p>

      <p className="text-sm text-neutral-500">최종 수정일: 2026-08-24</p>
    </div>
  );
}
