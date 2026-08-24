"use client";

import { useState } from "react";
import { SUBSIDY_PROGRAMS, type CalculatorInput } from "@/lib/subsidies-data";

type FormState = {
  age: string;
  householdSize: string;
  annualHouseholdIncomeManwon: string;
  hasChildUnder8: boolean;
  hasInfantUnder2: boolean;
  isLowIncomeHousehold: boolean;
};

const DEFAULT_FORM: FormState = {
  age: "30",
  householdSize: "1",
  annualHouseholdIncomeManwon: "3000",
  hasChildUnder8: false,
  hasInfantUnder2: false,
  isLowIncomeHousehold: false,
};

// 앞자리 0이 남아 "021" 같은 값이 되는 걸 막는다 ("0" 한 글자는 그대로 둠).
function stripLeadingZeros(raw: string): string {
  const digitsOnly = raw.replace(/[^0-9]/g, "");
  return digitsOnly.replace(/^0+(?=\d)/, "");
}

function toInput(form: FormState): CalculatorInput {
  return {
    age: Number(form.age) || 0,
    householdSize: Number(form.householdSize) || 0,
    annualHouseholdIncomeManwon: Number(form.annualHouseholdIncomeManwon) || 0,
    hasChildUnder8: form.hasChildUnder8,
    hasInfantUnder2: form.hasInfantUnder2,
    isLowIncomeHousehold: form.isLowIncomeHousehold,
  };
}

export default function SubsidyCalculator() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitted, setSubmitted] = useState(false);

  const results = SUBSIDY_PROGRAMS.filter((program) => program.matches(toInput(form)));

  const numberField = (
    key: "age" | "householdSize" | "annualHouseholdIncomeManwon"
  ) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((v) => ({ ...v, [key]: stripLeadingZeros(e.target.value) })),
  });

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink">
            나이
            <input
              type="text"
              inputMode="numeric"
              placeholder="예: 30"
              {...numberField("age")}
              className="rounded-lg border border-line px-3 py-2 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink">
            가구원 수
            <span className="text-xs font-normal text-ink-soft">본인 포함 함께 사는 가족 수</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="예: 1"
              {...numberField("householdSize")}
              className="rounded-lg border border-line px-3 py-2 text-ink"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-ink">
          가구 합산 연소득 (만원)
          <span className="text-xs font-normal text-ink-soft">
            세전 기준, 가구원 전체 소득을 더한 값 (모르면 대략적인 값도 괜찮아요)
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="예: 3000"
            {...numberField("annualHouseholdIncomeManwon")}
            className="rounded-lg border border-line px-3 py-2 text-ink"
          />
        </label>

        <div className="flex flex-col gap-2 text-sm text-ink">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.hasChildUnder8}
              onChange={(e) => setForm((v) => ({ ...v, hasChildUnder8: e.target.checked }))}
            />
            만 8세 미만 자녀가 있어요
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.hasInfantUnder2}
              onChange={(e) => setForm((v) => ({ ...v, hasInfantUnder2: e.target.checked }))}
            />
            만 1세 이하 영아가 있어요
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isLowIncomeHousehold}
              onChange={(e) =>
                setForm((v) => ({ ...v, isLowIncomeHousehold: e.target.checked }))
              }
            />
            기초생활수급자 또는 차상위계층이에요 (해당되면 체크)
          </label>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          결과 확인하기
        </button>
      </form>

      {submitted && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-ink">
            해당 가능성이 있는 지원제도 {results.length}건
          </h2>
          {results.length === 0 ? (
            <p className="text-sm text-ink-soft">
              입력하신 조건으로는 대표 제도 목록에서 찾지 못했습니다. 복지로 모의계산에서 더 자세히 확인해보세요.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {results.map((program) => (
                <li key={program.id} className="rounded-xl border border-line bg-surface p-4">
                  <h3 className="font-medium text-ink">{program.name}</h3>
                  <p className="text-sm text-ink-soft mt-1">{program.summary}</p>
                  <a
                    href={program.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-sm text-accent mt-2 inline-block font-medium"
                  >
                    공식 안내 보러가기 →
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-ink-soft mt-6">
            * 이 결과는 대표적인 전국 단위 제도만 간단한 조건으로 걸러본 참고용 안내이며,
            실제 신청 자격은 재산·부양가족 등 세부 조건에 따라 달라질 수 있습니다. 정확한 자격은
            복지로·정부24·보조금24 또는 해당 기관 공식 사이트에서 확인하세요.
          </p>
        </div>
      )}
    </div>
  );
}
