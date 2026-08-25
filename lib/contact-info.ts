export type ContactChannel = {
  name: string;
  phone?: string;
  url: string;
  note: string;
};

// 특정 제도 담당기관이 불분명하거나 여러 곳에 걸칠 때도 항상 도움받을 수 있는
// 대표적인 공식 상담 채널만 모았다. 개별 글의 sources와는 별개로 사이트 전역에서 보여준다.
export const HELP_CONTACTS: ContactChannel[] = [
  {
    name: "복지로 (보건복지상담센터)",
    phone: "129",
    url: "https://www.bokjiro.go.kr",
    note: "복지 제도 전반 상담·모의계산",
  },
  {
    name: "정부24",
    phone: "110",
    url: "https://www.gov.kr",
    note: "민원 신청·발급, 온라인 처리",
  },
  {
    name: "국세청 국세상담센터",
    phone: "126",
    url: "https://www.nts.go.kr",
    note: "근로장려금 등 세금·장려금 상담",
  },
  {
    name: "한국장학재단",
    phone: "1599-2000",
    url: "https://www.kosaf.go.kr",
    note: "국가장학금·학자금 대출 상담",
  },
  {
    name: "고용노동부 고객상담센터",
    phone: "1350",
    url: "https://www.moel.go.kr",
    note: "취업지원제도·구직급여 상담",
  },
];
