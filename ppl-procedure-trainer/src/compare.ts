// Answer checking & comparison logic for Learn Mode (spec §5.3).

export type StudentRowStatus = "correct" | "wrong-position" | "extra";
export type CorrectRowStatus = "correct" | "misplaced" | "missing";

export type StudentRow = { actionId: string; status: StudentRowStatus };
export type CorrectRow = { actionId: string; status: CorrectRowStatus };

export type Comparison = {
  isCorrect: boolean;
  studentRows: StudentRow[];
  correctRows: CorrectRow[];
};

/** Exact match: same length, same ids, same order. */
export function isExactMatch(student: string[], correct: string[]): boolean {
  if (student.length !== correct.length) return false;
  return student.every((id, i) => id === correct[i]);
}

export function compareAnswer(student: string[], correct: string[]): Comparison {
  const correctSet = new Set(correct);
  const studentSet = new Set(student);

  const studentRows: StudentRow[] = student.map((actionId, i) => {
    let status: StudentRowStatus;
    if (i < correct.length && correct[i] === actionId) {
      status = "correct";
    } else if (correctSet.has(actionId)) {
      status = "wrong-position";
    } else {
      status = "extra";
    }
    return { actionId, status };
  });

  const correctRows: CorrectRow[] = correct.map((actionId, i) => {
    let status: CorrectRowStatus;
    if (i < student.length && student[i] === actionId) {
      status = "correct";
    } else if (studentSet.has(actionId)) {
      status = "misplaced";
    } else {
      status = "missing";
    }
    return { actionId, status };
  });

  return {
    isCorrect: isExactMatch(student, correct),
    studentRows,
    correctRows,
  };
}
