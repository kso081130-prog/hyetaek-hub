export type SubsidyProgram = {
  id: string;
  name: string;
  summary: string;
  officialUrl: string;
  matches: (input: CalculatorInput) => boolean;
  reason: (input: CalculatorInput) => string;
};

export type CalculatorInput = {
  age: number;
  householdSize: number;
  annualHouseholdIncomeManwon: number; // 가구 합산 연소득, 만원 단위
  hasChildUnder8: boolean;
  hasInfantUnder2: boolean;
  isLowIncomeHousehold: boolean; // 기초생활수급자·차상위 등 저소득층 해당 여부
  isJobseeking: boolean; // 구직활동 중
  isRenter: boolean; // 무주택 세입자(전월세)
  hasDisabilityOrVeteran: boolean; // 장애인 또는 국가유공자
};

// 대표적인 전국 단위 지원제도만 담았습니다. 지자체 자체 사업(청년 월세 지원 등)은
// 지역마다 조건이 크게 달라 여기서는 다루지 않고, /posts 글과 홈페이지 안내에서
// "거주 지자체 홈페이지 확인"을 별도로 안내합니다.
export const SUBSIDY_PROGRAMS: SubsidyProgram[] = [
  {
    id: "geunro-jangryeogeum",
    name: "근로장려금",
    summary: "일은 하지만 소득이 낮은 가구에 국세청이 현금으로 지급하는 근로연계형 지원금.",
    officialUrl: "https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7781&mi=2450",
    matches: (i) => i.age >= 19 && i.annualHouseholdIncomeManwon < 4400,
    reason: () => "만 19세 이상이면서 가구소득이 맞벌이 기준(4,400만 원) 미만이에요",
  },
  {
    id: "cheongnyeon-doyak-gyejwa",
    name: "청년도약계좌",
    summary: "만 19~34세 청년의 자산 형성을 정부가 매칭 지원으로 돕는 적금형 상품.",
    officialUrl: "https://ylaccount.kinfa.or.kr",
    matches: (i) => i.age >= 19 && i.age <= 34 && i.annualHouseholdIncomeManwon < 7500,
    reason: () => "만 19~34세 청년이면서 소득 기준을 대체로 충족해요",
  },
  {
    id: "adong-subang",
    name: "아동수당",
    summary: "만 8세 미만 아동에게 매월 지급되는 보편적 양육 지원금.",
    officialUrl: "https://www.bokjiro.go.kr",
    matches: (i) => i.hasChildUnder8,
    reason: () => "만 8세 미만 자녀가 있다고 답하셨어요",
  },
  {
    id: "bumo-geubyeo",
    name: "부모급여",
    summary: "만 0~1세 영아를 키우는 가구에 매월 지급되는 양육 지원금.",
    officialUrl: "https://www.bokjiro.go.kr",
    matches: (i) => i.hasInfantUnder2,
    reason: () => "만 1세 이하 영아가 있다고 답하셨어요",
  },
  {
    id: "gicho-yeongeum",
    name: "기초연금",
    summary: "만 65세 이상 소득 하위 어르신에게 매월 지급되는 노후 소득 지원금.",
    officialUrl: "https://www.bokjiro.go.kr",
    matches: (i) => i.age >= 65,
    reason: () => "만 65세 이상이에요",
  },
  {
    id: "energy-voucher",
    name: "에너지바우처",
    summary: "기초생활수급자 등 저소득층 가구의 냉·난방비를 지원하는 바우처.",
    officialUrl: "https://www.energyvoucher.go.kr",
    matches: (i) => i.isLowIncomeHousehold,
    reason: () => "기초생활수급자·차상위계층에 해당한다고 답하셨어요",
  },
  {
    id: "munhwa-nuri-card",
    name: "문화누리카드",
    summary: "기초생활수급자·차상위계층에게 문화·여행·체육 활동비를 지원하는 카드.",
    officialUrl: "https://www.mnuri.kr",
    matches: (i) => i.isLowIncomeHousehold,
    reason: () => "기초생활수급자·차상위계층에 해당한다고 답하셨어요",
  },
  {
    id: "jeongi-yogeum-halin",
    name: "전기요금 복지할인",
    summary: "기초생활수급자·장애인·국가유공자·다자녀가구 등의 전기요금을 깎아주는 제도.",
    officialUrl: "https://www.kepco.co.kr",
    matches: (i) => i.isLowIncomeHousehold || i.hasDisabilityOrVeteran,
    reason: (i) =>
      i.hasDisabilityOrVeteran
        ? "장애인·국가유공자에 해당한다고 답하셨어요"
        : "기초생활수급자·차상위계층에 해당한다고 답하셨어요",
  },
  {
    id: "tongsinbi-gamyeon",
    name: "통신비 감면",
    summary: "기초생활수급자·장애인·국가유공자·한부모가족 등의 통신요금을 감면해주는 제도.",
    officialUrl: "https://www.gov.kr",
    matches: (i) => i.isLowIncomeHousehold || i.hasDisabilityOrVeteran,
    reason: (i) =>
      i.hasDisabilityOrVeteran
        ? "장애인·국가유공자에 해당한다고 답하셨어요"
        : "기초생활수급자·차상위계층에 해당한다고 답하셨어요",
  },
  {
    id: "gukga-janghakgeum",
    name: "국가장학금",
    summary: "대학생의 등록금 부담을 가구 소득 구간에 따라 지원하는 학자금 지원 제도.",
    officialUrl: "https://www.kosaf.go.kr",
    matches: (i) => i.age >= 19 && i.age <= 29 && i.annualHouseholdIncomeManwon < 9000,
    reason: () => "대학생 나이대이면서 가구소득이 대략적인 지원 범위 안에 있어요",
  },
  {
    id: "gicho-saenghwal-bojang",
    name: "기초생활보장 (생계급여 등)",
    summary: "소득인정액이 기준 이하인 가구에 생계·의료·주거·교육급여를 지원하는 제도.",
    officialUrl: "https://www.bokjiro.go.kr",
    matches: (i) => i.isLowIncomeHousehold || i.annualHouseholdIncomeManwon < (2200 * i.householdSize) / 4,
    reason: (i) =>
      i.isLowIncomeHousehold
        ? "기초생활수급자·차상위계층에 해당한다고 답하셨어요"
        : "가구원 수 대비 소득이 낮은 편이라 자격을 확인해볼 만해요",
  },
  {
    id: "cheongnyeon-jeonse-daechul",
    name: "청년 전세자금대출",
    summary: "무주택 청년 세입자에게 시중은행보다 낮은 금리로 전세보증금을 빌려주는 제도.",
    officialUrl: "https://nhuf.molit.go.kr",
    matches: (i) => i.age >= 19 && i.age <= 34 && i.isRenter,
    reason: () => "만 19~34세 청년이면서 전월세로 거주 중이라고 답하셨어요",
  },
  {
    id: "gukmin-chwieop-jiwon",
    name: "국민취업지원제도",
    summary: "구직활동 중인 분에게 생계 지원금과 취업 역량 강화를 함께 지원하는 제도.",
    officialUrl: "https://www.work.go.kr",
    matches: (i) => i.isJobseeking,
    reason: () => "구직활동 중이라고 답하셨어요",
  },
];
