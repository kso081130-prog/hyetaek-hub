export type Category = {
  id: string;
  label: string;
  icon: string;
  test: (tags: string[]) => boolean;
};

export const CATEGORIES: Category[] = [
  { id: "edu", label: "장학금·교육", icon: "🎓", test: (t) => t.some((x) => /장학금|교육급여|청소년증|학자금|청소년/.test(x)) },
  { id: "childcare", label: "육아", icon: "👶", test: (t) => t.some((x) => /아동수당|부모급여|육아|다자녀|산모|출산/.test(x)) },
  { id: "senior", label: "노인", icon: "👵", test: (t) => t.some((x) => /기초연금|노인|국민연금/.test(x)) },
  { id: "disability", label: "장애인·유공자", icon: "🦽", test: (t) => t.some((x) => /장애인|국가유공자/.test(x)) },
  { id: "saving", label: "생활비 절약", icon: "💡", test: (t) => t.some((x) => /에너지바우처|전기요금|통신비|생활비절약|세금환급|환급/.test(x)) },
  { id: "housing", label: "주거", icon: "🏠", test: (t) => t.some((x) => /전세|주택|임차/.test(x)) },
  { id: "job", label: "취업", icon: "💼", test: (t) => t.some((x) => /취업|구직|근로장려금|일자리/.test(x)) },
  { id: "youth", label: "청년", icon: "🧑", test: (t) => t.some((x) => /청년/.test(x)) },
  { id: "welfare", label: "기초생활·복지카드", icon: "🤝", test: (t) => t.some((x) => /기초생활|생계급여|문화누리|긴급복지/.test(x)) },
];

export function categoryOf(tags: string[]): Category | undefined {
  return CATEGORIES.find((c) => c.test(tags));
}
