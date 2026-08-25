import type { Metadata } from "next";
import SubsidyCalculator from "@/components/SubsidyCalculator";
import HelpContacts from "@/components/HelpContacts";

export const metadata: Metadata = {
  title: "우리집 지원금 계산기",
  description:
    "나이, 가구원수, 소득을 입력하면 해당 가능성이 있는 대표 정부지원제도를 보여드립니다.",
};

export default function SubsidyCalculatorPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-bold mb-2 text-ink">우리집 지원금 계산기</h1>
      <p className="text-sm text-ink-soft mb-8">
        간단한 정보만 입력하면 해당 가능성이 있는 대표 지원제도를 알려드립니다. 정확한 자격은
        각 제도 공식 페이지에서 다시 확인해주세요.
      </p>
      <SubsidyCalculator />
      <HelpContacts />
    </div>
  );
}
