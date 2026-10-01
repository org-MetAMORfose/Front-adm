export type FaqQuestion = {
  id: number;
  question: string;
  created_at: string;
};

export type FaqGroup = {
  id: number;
  answer: string;
  questions: FaqQuestion[];
};

export type FaqGroupList = {
  groups: FaqGroup[];
};
