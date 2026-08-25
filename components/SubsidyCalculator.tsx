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
  isJobseeking: boolean;
  isRenter: boolean;
  hasDisabilityOrVeteran: boolean;
};

const DEFAULT_FORM: FormState = {
  age: "30",
  householdSize: "1",
  annualHouseholdIncomeManwon: "3000",
  hasChildUnder8: false,
  hasInfantUnder2: false,
  isLowIncomeHousehold: false,
  isJobseeking: false,
  isRenter: false,
  hasDisabilityOrVeteran: false,
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
    isJobseeking: form.isJobseeking,
    isRenter: form.isRenter,
    hasDisabilityOrVeteran: form.hasDisabilityOrVeteran,
  };
}

const STEPS = ["기본 정보", "상황 체크", "진단 결과"];

export default function SubsidyCalculator() {
  const [step, setStep] = useState(0); // 0,1 = 입력, 2 = 결과
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const input = toInput(form);
  const results = SUBSIDY_PROGRAMS.filter((program) => program.matches(input));

  const numberField = (key: "age" | "householdSize" | "annualHouseholdIncomeManwon") => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((v) => ({ ...v, [key]: stripLeadingZeros(e.target.value) })),
  });

  const checkField = (
    key: "hasChildUnder8" | "hasInfantUnder2" | "isLowIncomeHousehold" | "isJobseeking" | "isRenter" | "hasDisabilityOrVeteran"
  ) => ({
    checked: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((v) => ({ ...v, [key]: e.target.checked })),
  });

  return (
    <div className="flex flex-col gap-6">
      {/* 진행바 */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i <= step ? "bg-accent text-white" : "bg-line text-ink-soft"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-xs font-medium ${i <= step ? "text-ink" : "text-ink-soft"}`}>{label}</span>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? "bg-accent" : "bg-line"}`} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(1);
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

          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            다음 →
          </button>
        </form>
      )}

      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(2);
          }}
          className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6"
        >
          <p className="text-sm text-ink-soft -mt-1">해당하는 항목을 모두 체크해주세요.</p>
          <div className="flex flex-col gap-2.5 text-sm text-ink">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...checkField("hasChildUnder8")} />
              만 8세 미만 자녀가 있어요
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...checkField("hasInfantUnder2")} />
              만 1세 이하 영아가 있어요
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...checkField("isJobseeking")} />
              현재 구직활동 중이에요
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...checkField("isRenter")} />
              전월세로 거주하는 무주택자예요
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...checkField("hasDisabilityOrVeteran")} />
              장애인 또는 국가유공자예요
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...checkField("isLowIncomeHousehold")} />
              기초생활수급자 또는 차상위계층이에요
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-accent"
            >
              ← 이전
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              진단 결과 보기 →
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div>
          <div className="rounded-2xl border border-line bg-gradient-to-br from-accent-soft to-accent2-soft p-6 mb-6 text-center">
            <p className="text-sm text-ink-soft mb-1">진단 결과</p>
            <p className="text-3xl font-bold text-ink">
              {results.length}<span className="text-base font-medium text-ink-soft">개 제도 해당</span>
            </p>
          </div>

          {results.length === 0 ? (
            <p className="text-sm text-ink-soft">
              입력하신 조건으로는 대표 제도 목록에서 찾지 못했습니다. 복지로 모의계산에서 더 자세히 확인해보세요.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {results.map((program) => (
                <li key={program.id} className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-ink">{program.name}</h3>
                    <span className="shrink-0 rounded-full bg-accent2-soft px-2 py-0.5 text-[11px] font-medium text-accent2">
                      해당 가능성 높음
                    </span>
                  </div>
                  <p className="text-sm text-ink-soft mt-1">{program.summary}</p>
                  <p className="text-xs text-accent-dark mt-2">✓ {program.reason(input)}</p>
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

          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-accent"
            >
              ← 조건 다시 체크
            </button>
            <button
              onClick={() => {
                setForm(DEFAULT_FORM);
                setStep(0);
              }}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-accent"
            >
              처음부터 다시
            </button>
          </div>

          <p className="text-xs text-ink-soft mt-6">
            * 이 결과는 대표적인 전국 단위 제도만 간단한 조건으로 걸러본 참고용 진단이며,
            실제 신청 자격은 재산·부양가족 등 세부 조건에 따라 달라질 수 있습니다. 정확한 자격은
            복지로·정부24·보조금24 또는 해당 기관 공식 사이트에서 확인하세요.
          </p>
        </div>
      )}
    </div>
  );
}
