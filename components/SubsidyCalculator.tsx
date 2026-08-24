"use client";

import { useState } from "react";
import { SUBSIDY_PROGRAMS, type CalculatorInput } from "@/lib/subsidies-data";

const DEFAULT_INPUT: CalculatorInput = {
  age: 30,
  householdSize: 1,
  annualHouseholdIncomeManwon: 3000,
  hasChildUnder8: false,
  hasInfantUnder2: false,
  isLowIncomeHousehold: false,
};

export default function SubsidyCalculator() {
  const [input, setInput] = useState<CalculatorInput>(DEFAULT_INPUT);
  const [submitted, setSubmitted] = useState(false);

  const results = SUBSIDY_PROGRAMS.filter((program) => program.matches(input));

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="flex flex-col gap-5 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800"
      >
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            나이
            <input
              type="number"
              min={0}
              max={120}
              value={input.age}
              onChange={(e) => setInput((v) => ({ ...v, age: Number(e.target.value) }))}
              className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            가구원 수
            <input
              type="number"
              min={1}
              max={10}
              value={input.householdSize}
              onChange={(e) =>
                setInput((v) => ({ ...v, householdSize: Number(e.target.value) }))
              }
              className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          가구 합산 연소득 (만원)
          <input
            type="number"
            min={0}
            step={100}
            value={input.annualHouseholdIncomeManwon}
            onChange={(e) =>
              setInput((v) => ({
                ...v,
                annualHouseholdIncomeManwon: Number(e.target.value),
              }))
            }
            className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={input.hasChildUnder8}
              onChange={(e) => setInput((v) => ({ ...v, hasChildUnder8: e.target.checked }))}
            />
            만 8세 미만 자녀가 있어요
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={input.hasInfantUnder2}
              onChange={(e) => setInput((v) => ({ ...v, hasInfantUnder2: e.target.checked }))}
            />
            만 1세 이하 영아가 있어요
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={input.isLowIncomeHousehold}
              onChange={(e) =>
                setInput((v) => ({ ...v, isLowIncomeHousehold: e.target.checked }))
              }
            />
            기초생활수급자 또는 차상위계층이에요 (해당되면 체크)
          </label>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          결과 확인하기
        </button>
      </form>

      {submitted && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            해당 가능성이 있는 지원제도 {results.length}건
          </h2>
          {results.length === 0 ? (
            <p className="text-sm text-neutral-500">
              입력하신 조건으로는 대표 제도 목록에서 찾지 못했습니다. 복지로 모의계산에서 더 자세히 확인해보세요.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {results.map((program) => (
                <li
                  key={program.id}
                  className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
                >
                  <h3 className="font-medium">{program.name}</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {program.summary}
                  </p>
                  <a
                    href={program.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-sm text-blue-600 dark:text-blue-400 mt-2 inline-block"
                  >
                    공식 안내 보러가기 →
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-neutral-400 mt-6">
            * 이 결과는 대표적인 전국 단위 제도만 간단한 조건으로 걸러본 참고용 안내이며,
            실제 신청 자격은 재산·부양가족 등 세부 조건에 따라 달라질 수 있습니다. 정확한 자격은
            복지로·정부24·보조금24 또는 해당 기관 공식 사이트에서 확인하세요.
          </p>
        </div>
      )}
    </div>
  );
}
