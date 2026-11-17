import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

const getGenAI = (): GoogleGenerativeAI => {
  if (genAI) return genAI;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Get a free key from https://aistudio.google.com/apikey and add it to your .env file."
    );
  }

  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
};

const CANDIDATE_MODELS = [
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

export const extractJSON = <T = any>(text: string): T => {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  } else {
    const firstBrace = cleaned.indexOf("{");
    const firstBracket = cleaned.indexOf("[");
    const start =
      firstBrace !== -1 && firstBracket !== -1
        ? Math.min(firstBrace, firstBracket)
        : firstBrace !== -1
        ? firstBrace
        : firstBracket;

    const lastBrace = cleaned.lastIndexOf("}");
    const lastBracket = cleaned.lastIndexOf("]");
    const end = Math.max(lastBrace, lastBracket);

    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.slice(start, end + 1);
    }
  }
  return JSON.parse(cleaned);
};

const callGemini = async (prompt: string): Promise<string> => {
  const genAiInstance = getGenAI();
  let lastError: any = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAiInstance.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.response?.status;
      const message =
        err?.errorDetails?.[1]?.message ||
        err?.message ||
        "Unknown Gemini API error";

      if (
        (status === 400 || status === 401) &&
        (message.includes("API key not valid") ||
          message.includes("UNAUTHENTICATED") ||
          message.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED"))
      ) {
        throw new Error(
          "Invalid Gemini API key. Please check your GEMINI_API_KEY in .env.\n" +
          "Get a valid key from https://aistudio.google.com/apikey and restart the server."
        );
      }

      if (status === 403) {
        throw new Error(
          "Gemini API access denied. Please check your Google AI Studio account for any 'Action required' verification alerts."
        );
      }

      console.warn(`Model ${modelName} failed (${status || 'error'}). Trying fallback model...`);
    }
  }

  const status = lastError?.status || lastError?.response?.status;
  const message = lastError?.message || "Unknown error";

  if (status === 429) {
    throw new Error(
      "Gemini API rate limit reached. Please wait a moment and try again."
    );
  }

  throw new Error(`Gemini AI request failed: ${message}`);
};

export interface StudyPlanInput {
  subjectName: string;
  examDate: string;       
  topics: string[];
  dailyStudyHours: number;
  notesContext?: string;  
}

export interface DayTask {
  topic: string;
  duration: string;
  notes: string;
}

export interface DayPlan {
  day: number;
  date: string;
  tasks: DayTask[];
}

export interface StudyPlanResult {
  rawPlan: string;
  schedule: DayPlan[];
}

export const generateStudyPlan = async (
  input: StudyPlanInput
): Promise<StudyPlanResult> => {
  const topicList = input.topics.join(", ");
  const today = new Date().toISOString().split("T")[0];
  const daysLeft = Math.max(
    1,
    Math.ceil(
      (new Date(input.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  const contextBlock = input.notesContext
    ? `\n\nRelevant notes context (use this to tailor the plan):\n"""\n${input.notesContext.slice(0, 3000)}\n"""`
    : "";

  const prompt = `
You are an expert academic study planner. Create a detailed, day-by-day study plan.

Subject: ${input.subjectName}
Exam Date: ${input.examDate}
Today's Date: ${today}
Days Available: ${daysLeft}
Daily Study Hours: ${input.dailyStudyHours} hours
Topics to Cover: ${topicList}
${contextBlock}

IMPORTANT: Respond ONLY with a valid JSON object. No markdown, no explanation, no code fences.

Required JSON format:
{
  "schedule": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "tasks": [
        { "topic": "Topic Name", "duration": "2 Hours", "notes": "Brief study tip" }
      ]
    }
  ]
}

Rules:
- Distribute all topics evenly across available days
- Each day's total duration must equal ${input.dailyStudyHours} hours
- Add practical study tips in the "notes" field
- Include a review/revision day before the exam if possible
`.trim();

  const rawPlan = await callGemini(prompt);

  let schedule: DayPlan[] = [];
  try {
    const parsed = extractJSON(rawPlan);
    schedule = parsed.schedule || [];
  } catch {
    console.warn("Study plan JSON parse failed, storing raw text only");
  }

  return { rawPlan, schedule };
};

export interface MockPaperInput {
  subjectName: string;
  difficulty: "easy" | "medium" | "hard";
  totalQuestions: number;
  notesContext: string; // extracted text from uploaded notes
}

export interface GeneratedQuestion {
  type: "mcq" | "structured" | "essay";
  question: string;
  options: string[];   
  answer: string;
  marks: number;
}

export interface MockPaperResult {
  rawResponse: string;
  questions: GeneratedQuestion[];
}

export const generateMockPaper = async (
  input: MockPaperInput
): Promise<MockPaperResult> => {
  const mcqCount = Math.ceil(input.totalQuestions * 0.5);
  const structuredCount = Math.ceil(input.totalQuestions * 0.3);
  const essayCount =
    input.totalQuestions - mcqCount - structuredCount;

  const prompt = `
You are an experienced university examiner. Generate a mock exam paper based ONLY on the provided study notes.

Subject: ${input.subjectName}
Difficulty: ${input.difficulty}
Total Questions: ${input.totalQuestions}
  - MCQ (Section A): ${mcqCount} questions — 1 mark each
  - Structured (Section B): ${structuredCount} questions — 5 marks each
  - Essay (Section C): ${essayCount} questions — 10 marks each

Study Notes:
"""
${input.notesContext.slice(0, 5000)}
"""

IMPORTANT: Respond ONLY with a valid JSON object. No markdown, no explanation, no code fences.

Required JSON format:
{
  "questions": [
    {
      "type": "mcq",
      "question": "Question text here",
      "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
      "answer": "A",
      "marks": 1
    },
    {
      "type": "structured",
      "question": "Question text here",
      "options": [],
      "answer": "Model answer here",
      "marks": 5
    },
    {
      "type": "essay",
      "question": "Question text here",
      "options": [],
      "answer": "Key points to cover...",
      "marks": 10
    }
  ]
}

Rules:
- All questions must be derived strictly from the provided notes
- MCQ must have exactly 4 options labelled A, B, C, D
- For structured and essay, provide a model answer/key points
- Match difficulty level: ${input.difficulty}
`.trim();

  const rawResponse = await callGemini(prompt);

  let questions: GeneratedQuestion[] = [];
  try {
    const parsed = extractJSON(rawResponse);
    questions = parsed.questions || [];
  } catch {
    console.warn("Mock paper JSON parse failed, storing raw text only");
  }

  return { rawResponse, questions };
};

export interface AnswerSubmission {
  questionIndex: number;
  question: string;
  questionType: "mcq" | "structured" | "essay";
  studentAnswer: string;
  correctAnswer: string;
  marks: number;
}

export interface EvaluatedAnswer {
  questionIndex: number;
  question: string;
  questionType: "mcq" | "structured" | "essay";
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  aiFeedback: string;
}

export interface EvaluationResult {
  answers: EvaluatedAnswer[];
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  aiAnalysis: {
    strongAreas: string[];
    weakAreas: string[];
    summary: string;
  };
}

export const evaluateExam = async (
  subjectName: string,
  submissions: AnswerSubmission[]
): Promise<EvaluationResult> => {
  const preScoredAnswers: EvaluatedAnswer[] = submissions.map((s) => {
    const isCorrect =
      s.questionType === "mcq"
        ? s.studentAnswer.trim().toUpperCase() ===
          s.correctAnswer.trim().toUpperCase()
        : false; // essays/structured scored by AI below

    return {
      questionIndex: s.questionIndex,
      question: s.question,
      questionType: s.questionType,
      studentAnswer: s.studentAnswer,
      correctAnswer: s.correctAnswer,
      isCorrect,
      marksAwarded: isCorrect ? s.marks : 0,
      maxMarks: s.marks,
      aiFeedback: "",
    };
  });

  const nonMCQ = submissions.filter((s) => s.questionType !== "mcq");

  let aiScoredMap: Record<number, { marksAwarded: number; feedback: string }> =
    {};

  if (nonMCQ.length > 0) {
    const submissionBlock = nonMCQ
      .map(
        (s) =>
          `Q${s.questionIndex + 1} [${s.questionType}] (${s.marks} marks)\n` +
          `Question: ${s.question}\n` +
          `Model Answer: ${s.correctAnswer}\n` +
          `Student Answer: ${s.studentAnswer}`
      )
      .join("\n\n");

    const prompt = `
You are a university examiner evaluating student answers for subject: ${subjectName}.

Evaluate each answer and respond ONLY with valid JSON. No markdown, no explanation.

${submissionBlock}

Required JSON format:
{
  "scores": [
    {
      "questionIndex": 0,
      "marksAwarded": 4,
      "feedback": "Brief specific feedback on this answer"
    }
  ],
  "analysis": {
    "strongAreas": ["topic1", "topic2"],
    "weakAreas": ["topic3"],
    "summary": "Overall 2-3 sentence performance summary"
  }
}

Rules:
- Be fair and consistent
- marksAwarded must be between 0 and the question's max marks
- feedback must be specific and constructive
`.trim();

    try {
      const raw = await callGemini(prompt);
      const parsed = extractJSON(raw);

      (parsed.scores || []).forEach(
        (s: { questionIndex: number; marksAwarded: number; feedback: string }) => {
          aiScoredMap[s.questionIndex] = {
            marksAwarded: s.marksAwarded,
            feedback: s.feedback,
          };
        }
      );

      const totalMarks = preScoredAnswers.reduce((s, a) => s + a.maxMarks, 0);
      let marksObtained = preScoredAnswers
        .filter((a) => a.questionType === "mcq")
        .reduce((s, a) => s + a.marksAwarded, 0);

      const finalAnswers = preScoredAnswers.map((a) => {
        if (a.questionType !== "mcq" && aiScoredMap[a.questionIndex]) {
          const aiScore = aiScoredMap[a.questionIndex];
          marksObtained += aiScore.marksAwarded;
          return {
            ...a,
            marksAwarded: aiScore.marksAwarded,
            isCorrect: aiScore.marksAwarded >= a.maxMarks * 0.5,
            aiFeedback: aiScore.feedback,
          };
        }
        return a;
      });

      return {
        answers: finalAnswers,
        totalMarks,
        marksObtained,
        percentage: Math.round((marksObtained / totalMarks) * 100),
        aiAnalysis: {
          strongAreas: parsed.analysis?.strongAreas || [],
          weakAreas: parsed.analysis?.weakAreas || [],
          summary: parsed.analysis?.summary || "",
        },
      };
    } catch (err: any) {
      // If it's an API key error, re-throw so the controller can handle it
      if (err?.message?.includes("Invalid Gemini API key") || err?.message?.includes("Gemini AI request failed")) {
        throw err;
      }
      console.warn("AI evaluation parse failed, falling back to MCQ-only scoring");
    }
  }

  const totalMarks = preScoredAnswers.reduce((s, a) => s + a.maxMarks, 0);
  const marksObtained = preScoredAnswers.reduce(
    (s, a) => s + a.marksAwarded,
    0
  );

  return {
    answers: preScoredAnswers,
    totalMarks,
    marksObtained,
    percentage: totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0,
    aiAnalysis: {
      strongAreas: [],
      weakAreas: [],
      summary: "AI analysis unavailable — MCQ auto-grading applied.",
    },
  };
};
