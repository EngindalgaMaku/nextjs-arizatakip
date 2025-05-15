// Test modeli tanımlamaları

export interface TestOption {
  id: string;
  text: string;
}

export interface TestQuestion {
  id: number;
  text: string;
  options: TestOption[];
  correctOptionId: string;
}

export interface Test {
  id: string;
  title: string;
  slug: string;
  description: string;
  questions: TestQuestion[];
  passingScore?: number;
  timeLimit?: number; // in minutes
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestUserState {
  answers: Record<number, string>; // questionId -> optionId
  startTime: Date;
  isSubmitted: boolean;
  endTime?: Date;
}

export interface TestResult {
  testId: string;
  userId: string;
  score: number;
  isPassed: boolean;
  answers: Record<number, string>;
  startTime: Date;
  endTime: Date;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  createdAt: Date;
} 