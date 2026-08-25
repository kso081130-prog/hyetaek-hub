import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "소개",
  description: `${SITE_NAME} 소개 — 정부지원금·생활비 절약 정보를 정리해서 전달합니다.`,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 prose prose-neutral prose-a:text-accent">
      <h1>{SITE_NAME} 소개</h1>
      <p>
        {SITE_NAME}는 정부·지자체 지원금과 생활비 절약 정보를 정리해서 전달하는 개인 운영
        정보 사이트입니다. 매일 새로운 글을 통해 놓치기 쉬운 지원제도를 소개하고, 계산기 같은
        도구로 내가 받을 수 있는 지원금을 빠르게 확인할 수 있도록 돕는 것을 목표로 합니다.
      </p>
      <h2>콘텐츠 원칙</h2>
      <ul>
        <li>구체적인 금액·자격요건이 담긴 글은 공식 자료(국세청, 정부24, 복지로 등)를 근거로 작성하고 출처를 표시합니다.</li>
        <li>이 사이트의 정보는 참고용 안내이며 법률·세무·재무 자문이 아닙니다. 실제 신청 전에는 반드시 해당 기관 공식 페이지에서 최신 정보를 다시 확인하세요.</li>
        <li>
          오류를 발견하시면{" "}
          <a href="https://github.com/kso081130-prog/hyetaek-hub/issues/new" target="_blank" rel="noopener noreferrer">
            GitHub 이슈
          </a>
          로 알려주세요.
        </li>
      </ul>
    </div>
  );
}
