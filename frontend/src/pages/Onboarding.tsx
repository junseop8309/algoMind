import { useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../features/auth/AuthProvider";
import { BrainCircuit, ChevronRight, LogOut, CheckCircle2 } from "lucide-react";

const QUESTIONS = [
  {
    id: "q1",
    conceptId: "c1",
    question:
      "What is the time complexity of accessing an element in an array by index?",
    options: ["O(n)", "O(log n)", "O(1)", "O(n²)"],
    correct: 2,
  },
  {
    id: "q2",
    conceptId: "c3",
    question:
      "What data structure gives you O(1) average time for lookups by key?",
    options: ["Array", "Linked List", "Hash Map", "Binary Tree"],
    correct: 2,
  },
  {
    id: "q3",
    conceptId: "c6",
    question: "Which data structure follows Last In First Out (LIFO)?",
    options: ["Queue", "Stack", "Heap", "Graph"],
    correct: 1,
  },
  {
    id: "q4",
    conceptId: "c9",
    question: "Binary search requires the input array to be:",
    options: ["Unsorted", "Sorted", "Filled with unique values", "Non-empty"],
    correct: 1,
  },
  {
    id: "q5",
    conceptId: "c10",
    question: "What is the base case in recursion?",
    options: [
      "The first function call",
      "The condition that stops recursion",
      "The recursive call itself",
      "The return value",
    ],
    correct: 1,
  },
  {
    id: "q6",
    conceptId: "c12",
    question: "In a binary tree, each node has at most how many children?",
    options: ["1", "2", "3", "Unlimited"],
    correct: 1,
  },
  {
    id: "q7",
    conceptId: "c15",
    question: "BFS uses which data structure to track nodes to visit?",
    options: ["Stack", "Queue", "Heap", "Array"],
    correct: 1,
  },
  {
    id: "q8",
    conceptId: "c4",
    question: "The two pointer technique is most useful for:",
    options: [
      "Tree traversal",
      "Graph search",
      "Sorted array problems",
      "String formatting",
    ],
    correct: 2,
  },
  {
    id: "q9",
    conceptId: "c17",
    question: "Dynamic programming solves problems by:",
    options: [
      "Always using recursion",
      "Breaking into subproblems and storing results",
      "Sorting first",
      "Using graphs",
    ],
    correct: 1,
  },
  {
    id: "q10",
    conceptId: "c14",
    question:
      "Which traversal visits all neighbors of a node before going deeper?",
    options: ["DFS", "BFS", "In-order", "Pre-order"],
    correct: 1,
  },
];

// All 20 concept IDs
const ALL_CONCEPTS = [
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "c7",
  "c8",
  "c9",
  "c10",
  "c11",
  "c12",
  "c13",
  "c14",
  "c15",
  "c16",
  "c17",
  "c18",
  "c19",
  "c20",
];

// These foundational concepts are always unlocked regardless of quiz answers
const ALWAYS_AVAILABLE = new Set(["c1", "c2", "c3"]);

const OPTION_LETTERS = ["A", "B", "C", "D"];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const question = QUESTIONS[current];
  const isLast = current === QUESTIONS.length - 1;
  const progress = ((current + 1) / QUESTIONS.length) * 100;

  function handleSelect(index: number) {
    setSelected(index);
  }

  function handleNext() {
    if (selected === null) return;

    const newAnswers = { ...answers, [question.id]: selected };
    setAnswers(newAnswers);
    setSelected(null);

    if (isLast) {
      handleSubmit(newAnswers);
    } else {
      setCurrent((c) => c + 1);
    }
  }

  async function handleSubmit(finalAnswers: Record<string, number>) {
    if (!user) return;
    setSubmitting(true);

    try {
      const testedIds = new Set(QUESTIONS.map((q) => q.conceptId));

      // Tested concepts — always available if correct OR if foundational
      const testedInserts = QUESTIONS.map((q) => {
        const correct = finalAnswers[q.id] === q.correct;
        const alwaysOpen = ALWAYS_AVAILABLE.has(q.conceptId);
        return {
          id: crypto.randomUUID(),
          userId: user.id,
          conceptId: q.conceptId,
          masteryState: correct || alwaysOpen ? "available" : "locked",
          easeFactor: correct ? 2.5 : 1.5,
          interval: 0,
          repetitions: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      // Untested concepts — foundational ones always available, rest locked
      const untestedInserts = ALL_CONCEPTS.filter(
        (cid) => !testedIds.has(cid),
      ).map((cid) => ({
        id: crypto.randomUUID(),
        userId: user.id,
        conceptId: cid,
        masteryState: ALWAYS_AVAILABLE.has(cid) ? "available" : "locked",
        easeFactor: 1.5,
        interval: 0,
        repetitions: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const masteryInserts = [...testedInserts, ...untestedInserts];

      const { error } = await supabase
        .from("mastery_records")
        .upsert(masteryInserts, { onConflict: "userId,conceptId" });

      if (error) {
        console.error("Error saving mastery:", JSON.stringify(error));
        alert(
          `Mastery error: ${error.message} | Code: ${error.code} | Details: ${error.details}`,
        );
        setSubmitting(false);
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ onboardingComplete: true })
        .eq("id", user.id);

      if (profileError) {
        console.error("Profile update error:", JSON.stringify(profileError));
      }

      navigate("/roadmap");
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {/* Logo + sign out row */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-black dark:text-white">
              AlgoMind
            </span>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate("/auth");
            }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Diagnostic Quiz
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Answer honestly — this helps us build your personalized roadmap.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            <span>
              Question {current + 1} of {QUESTIONS.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step dots */}
          <div className="flex gap-1 mt-3 justify-center">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i < current
                    ? "bg-indigo-500 w-4"
                    : i === current
                      ? "bg-indigo-600 w-5"
                      : "bg-neutral-200 dark:bg-neutral-700 w-4"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 mb-4">
          <p className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide mb-4">
            Question {current + 1}
          </p>
          <p className="text-base font-medium text-black dark:text-white mb-5 leading-relaxed">
            {question.question}
          </p>

          <div className="flex flex-col gap-2.5">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelect(index)}
                className={`text-left px-4 py-3 rounded-lg border text-sm transition-all flex items-center gap-3 ${
                  selected === index
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                    : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    selected === index
                      ? "bg-indigo-600 text-white"
                      : "bg-neutral-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {OPTION_LETTERS[index]}
                </span>
                <span>{option}</span>
                {selected === index && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          disabled={selected === null || submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Saving your results…
            </>
          ) : isLast ? (
            <>
              Finish & Build My Roadmap
              <ChevronRight className="w-4 h-4" />
            </>
          ) : (
            <>
              Next Question
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
