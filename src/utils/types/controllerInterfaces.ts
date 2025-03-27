export interface IApplicationTest {
  _id: string;
  instruction: string;
  questions: {
    _id: string;
    question_type: "multiple_choice" | "yes/no" | "text";
    options: string[];
    score: number;
    correct_answer: string;
  }[];
  type: "application_test" | "job_test";
}
