import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../features/auth/AuthProvider";
import { useCodeExecution } from "../hooks/useCodeExecution";
import { useAgent } from "../hooks/useAgent";
import { AgentType } from "../types/agent";
import CodeEditor from "../components/CodeEditor/CodeEditor";
import { useSessionStore } from "../stores/sessionStore";
import {
  Mic2,
  Timer,
  BrainCircuit,
  FileCheck,
  ShieldAlert,
  ChevronRight,
  Send,
  Play,
  CheckCircle2,
  XCircle,
  Sparkles,
  LayoutDashboard,
  RotateCcw,
} from "lucide-react";

const INTERVIEW_DURATION = 45 * 60;

interface Problem {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  conceptId: string;
  starterCode: Record<string, string>;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }>;
  hints: Array<{ level: number; content: string }>;
}

type Phase = "setup" | "solving" | "finished";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700/40",
  medium:
    "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700/40",
  hard: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/40",
};

export default function Interview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language } = useSessionStore();
  const { state: execState, execute, reset: resetExec } = useCodeExecution();
  const { state: agentState, ask } = useAgent();

  const [phase, setPhase] = useState<Phase>("setup");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(INTERVIEW_DURATION);
  const [submitResult, setSubmitResult] = useState<
    "accepted" | "rejected" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [chatInput, setChatInput] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProblems();
  }, []);

  useEffect(() => {
    if (phase !== "solving") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function loadProblems() {
    const { data } = await supabase
      .from("problems")
      .select("*")
      .order("difficulty", { ascending: true });
    if (data) setProblems(data);
  }

  function startInterview(problem: Problem) {
    setSelectedProblem(problem);
    setCode(problem.starterCode[language] ?? problem.starterCode["python"]);
    setTimeLeft(INTERVIEW_DURATION);
    setPhase("solving");
    const openingMsg = {
      role: "assistant" as const,
      content: `Welcome to your mock interview! Today's problem is "${problem.title}" (${problem.difficulty}). Take a moment to read the problem, then talk me through your initial approach before you start coding. I'll be here to ask follow-up questions.`,
    };
    setChatMessages([openingMsg]);
  }

  async function handleTimeUp() {
    setPhase("finished");
    if (!selectedProblem) return;
    await generateFinalFeedback(false);
  }

  async function handleSubmit() {
    if (!selectedProblem || !user) return;
    resetExec();
    setIsSubmitting(true);
    const testCase = selectedProblem.testCases.find((t) => !t.isHidden);
    await execute(code, language, testCase?.input);
  }

  useEffect(() => {
    if (!isSubmitting) return;
    if (execState.status !== "success" && execState.status !== "error") return;
    const passed =
      execState.status === "success" &&
      execState.data?.status?.id === 3 &&
      (() => {
        const testCase = selectedProblem?.testCases.find((t) => !t.isHidden);
        if (!testCase) return false;
        const actual = (execState.data?.stdout?.trim() ?? "")
          .replace(/\s+/g, "")
          .toLowerCase();
        const expected = testCase.expectedOutput
          .trim()
          .replace(/\s+/g, "")
          .toLowerCase();
        return actual === expected;
      })();
    setSubmitResult(passed ? "accepted" : "rejected");
    setIsSubmitting(false);
    if (passed) {
      clearInterval(timerRef.current!);
      setPhase("finished");
      generateFinalFeedback(true);
    }
  }, [execState.status, isSubmitting]);

  async function generateFinalFeedback(solved: boolean) {
    if (!selectedProblem) return;
    const elapsed = INTERVIEW_DURATION - timeLeft;
    const minutes = Math.floor(elapsed / 60);
    const feedbackMsg = solved
      ? `The candidate solved "${selectedProblem.title}" in ${minutes} minutes. Here's their final solution:\n\n${code}\n\nPlease give comprehensive interview feedback: communication, problem-solving approach, code quality, time/space complexity, and edge cases. Be constructive and professional.`
      : `The candidate attempted "${selectedProblem.title}" but did not complete it within 45 minutes. Here's their code so far:\n\n${code}\n\nGive constructive feedback on what they did well, where they got stuck, and what they should study next. Be encouraging.`;
    await ask(AgentType.Interview, [{ role: "user", content: feedbackMsg }], {
      problemId: selectedProblem.id,
      problemTitle: selectedProblem.title,
      language,
      code,
      hintLevel: 0,
      elapsedSeconds: elapsed,
      attemptCount: 0,
    });
  }

  useEffect(() => {
    if (agentState.status === "success" && phase === "finished")
      setAiFeedback(agentState.message);
  }, [agentState.status, phase]);

  useEffect(() => {
    if (
      agentState.status === "success" &&
      phase === "solving" &&
      chatMessages.length > 0
    ) {
      const last = chatMessages[chatMessages.length - 1];
      if (last.role === "user")
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: agentState.message },
        ]);
    }
  }, [agentState.status]);

  async function sendChatMessage() {
    if (
      !chatInput.trim() ||
      !selectedProblem ||
      agentState.status === "loading"
    )
      return;
    const userMsg = { role: "user" as const, content: chatInput };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    await ask(AgentType.Interview, newMessages, {
      problemId: selectedProblem.id,
      problemTitle: selectedProblem.title,
      language,
      code,
      hintLevel: 0,
      elapsedSeconds: INTERVIEW_DURATION - timeLeft,
      attemptCount: 0,
    });
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  const timeColor =
    timeLeft > 600
      ? "text-teal-400"
      : timeLeft > 300
        ? "text-amber-400"
        : "text-red-400";

  // ── SETUP PHASE ──────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 shrink-0">
              <Mic2 size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-black dark:text-white">
              Mock Interview
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-[52px]">
            45-minute timed session with AI interviewer
          </p>
        </div>

        {/* How it works */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 mb-6">
          <h2 className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide mb-4">
            How it works
          </h2>
          <ul className="space-y-3">
            {[
              {
                icon: (
                  <Timer
                    size={15}
                    className="text-indigo-500 shrink-0 mt-0.5"
                  />
                ),
                text: "You have 45 minutes to solve the problem",
              },
              {
                icon: (
                  <BrainCircuit
                    size={15}
                    className="text-indigo-500 shrink-0 mt-0.5"
                  />
                ),
                text: "An AI interviewer will ask you follow-up questions in real time",
              },
              {
                icon: (
                  <FileCheck
                    size={15}
                    className="text-indigo-500 shrink-0 mt-0.5"
                  />
                ),
                text: "Submit when done — the AI grades your solution and gives feedback",
              },
              {
                icon: (
                  <ShieldAlert
                    size={15}
                    className="text-amber-500 shrink-0 mt-0.5"
                  />
                ),
                text: "No hints available — this simulates a real interview",
              },
            ].map(({ icon, text }, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-neutral-600 dark:text-neutral-400"
              >
                {icon}
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Problem list */}
        <h2 className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide mb-3">
          Choose a problem
        </h2>

        <div className="flex flex-col gap-2">
          {problems.map((p) => (
            <button
              key={p.id}
              onClick={() => startInterview(p)}
              className="group flex items-center justify-between w-full px-4 py-3.5 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl transition-all text-left"
            >
              <span className="text-sm font-medium text-black dark:text-white">
                {p.title}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-md border ${DIFFICULTY_COLORS[p.difficulty] ?? "text-neutral-500 bg-neutral-100 border-neutral-200"}`}
                >
                  {p.difficulty}
                </span>
                <ChevronRight
                  size={15}
                  className="text-neutral-400 group-hover:text-indigo-500 transition-colors"
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── FINISHED PHASE ───────────────────────────────────────
  if (phase === "finished") {
    const solved = submitResult === "accepted";
    return (
      <div className="p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            {solved ? (
              <CheckCircle2 size={28} className="text-teal-500 shrink-0" />
            ) : (
              <XCircle size={28} className="text-red-500 shrink-0" />
            )}
            <h1 className="text-3xl font-bold text-black dark:text-white">
              Interview Complete
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-[44px]">
            {selectedProblem?.title}
            {" · "}
            {solved ? (
              <span className="text-teal-500 font-medium">Solved</span>
            ) : (
              <span className="text-red-500 font-medium">Not solved</span>
            )}
          </p>
        </div>

        {/* AI Feedback card */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <BrainCircuit size={16} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-black dark:text-white">
              AI Interviewer Feedback
            </h2>
          </div>
          <div className="flex items-center gap-1.5 mb-4">
            <Sparkles size={12} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">
              Personalized review
            </span>
          </div>

          {agentState.status === "loading" ? (
            <div className="flex gap-1 items-center py-2">
              <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          ) : aiFeedback ? (
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {aiFeedback}
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No feedback available.
            </p>
          )}
        </div>

        {/* Final code */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 mb-6">
          <h2 className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide mb-3">
            Your final solution
          </h2>
          <pre className="text-xs text-neutral-300 bg-neutral-950 rounded-lg p-4 overflow-auto whitespace-pre-wrap font-mono leading-relaxed">
            {code}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            <LayoutDashboard size={15} />
            Back to Dashboard
          </button>
          <button
            onClick={() => {
              setPhase("setup");
              setSubmitResult(null);
              setAiFeedback("");
              setChatMessages([]);
              resetExec();
            }}
            className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-black dark:text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            <RotateCcw size={15} />
            Try Another
          </button>
        </div>
      </div>
    );
  }

  // ── SOLVING PHASE ────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left panel — problem + chat ───────────────────── */}
      <div className="w-2/5 flex flex-col border-r border-neutral-200 dark:border-neutral-800 min-w-0">
        {/* Panel header: title + difficulty + timer */}
        <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-base font-bold text-black dark:text-white leading-tight truncate">
              {selectedProblem?.title}
            </h1>
            <span
              className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-md border shrink-0 ${DIFFICULTY_COLORS[selectedProblem?.difficulty ?? ""] ?? "text-neutral-500 bg-neutral-100 border-neutral-200"}`}
            >
              {selectedProblem?.difficulty}
            </span>
          </div>
          <div className="text-right shrink-0 ml-3">
            <p
              className={`text-xl font-mono font-bold tabular-nums ${timeColor}`}
            >
              {formatTime(timeLeft)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              remaining
            </p>
          </div>
        </div>

        {/* Problem description */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 max-h-48 overflow-auto shrink-0">
          <h3 className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide mb-2">
            Problem
          </h3>
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
            {selectedProblem?.description}
          </p>
        </div>

        {/* AI Interviewer chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="px-5 py-2.5 border-b border-neutral-200 dark:border-neutral-800 shrink-0 flex items-center gap-2">
            <BrainCircuit size={14} className="text-indigo-500" />
            <span className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
              AI Interviewer
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto px-4 py-3 flex flex-col gap-3">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <span className="text-xs text-neutral-400 dark:text-neutral-500 px-1">
                  {msg.role === "user" ? "You" : "Interviewer"}
                </span>
                <div
                  className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-sm"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {agentState.status === "loading" && (
              <div className="flex flex-col items-start gap-1">
                <span className="text-xs text-neutral-400 px-1">
                  Interviewer
                </span>
                <div className="bg-neutral-100 dark:bg-neutral-800 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Chat input */}
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 shrink-0 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
              placeholder="Talk through your approach..."
              className="flex-1 text-sm bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
            <button
              onClick={sendChatMessage}
              disabled={agentState.status === "loading" || !chatInput.trim()}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm px-3 py-2 rounded-lg transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Right panel — editor + output ─────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Code editor */}
        <div className="flex-1 min-h-0">
          <CodeEditor
            value={code}
            onChange={setCode}
            onRun={async () => {
              if (!selectedProblem) return;
              resetExec();
              const testCase = selectedProblem.testCases.find(
                (t) => !t.isHidden,
              );
              await execute(code, language, testCase?.input);
            }}
          />
        </div>

        {/* Output panel */}
        <div className="h-48 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-900 flex flex-col">
          {/* Output header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-400 font-medium">
                Output
              </span>
              {submitResult === "accepted" && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 bg-teal-900/30 px-2 py-0.5 rounded">
                  <CheckCircle2 size={11} /> Accepted
                </span>
              )}
              {submitResult === "rejected" && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded">
                  <XCircle size={11} /> Wrong answer
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!selectedProblem) return;
                  resetExec();
                  const testCase = selectedProblem.testCases.find(
                    (t) => !t.isHidden,
                  );
                  await execute(code, language, testCase?.input);
                }}
                className="flex items-center gap-1.5 text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1 rounded transition-colors"
              >
                <Play size={11} /> Run
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1 rounded transition-colors"
              >
                <Send size={11} />
                {isSubmitting ? "Submitting..." : "Submit Solution"}
              </button>
            </div>
          </div>

          {/* Output content */}
          <div className="flex-1 overflow-auto p-4 font-mono text-sm">
            {execState.status === "idle" && (
              <p className="text-neutral-500 text-xs">
                Run your code to see output here
              </p>
            )}
            {execState.status === "running" && (
              <p className="text-amber-400 animate-pulse text-xs">Running...</p>
            )}
            {execState.status === "error" && (
              <p className="text-red-400 text-xs">{execState.message}</p>
            )}
            {execState.status === "success" && (
              <div className="space-y-2">
                {execState.data.stdout && (
                  <pre className="text-teal-400 whitespace-pre-wrap text-xs">
                    {execState.data.stdout}
                  </pre>
                )}
                {execState.data.stderr && (
                  <pre className="text-red-400 whitespace-pre-wrap text-xs">
                    {execState.data.stderr}
                  </pre>
                )}
                {execState.data.compile_output && (
                  <pre className="text-amber-400 whitespace-pre-wrap text-xs">
                    {execState.data.compile_output}
                  </pre>
                )}
                <p
                  className={`text-xs mt-1 ${execState.data.status.id === 3 ? "text-teal-500" : "text-red-400"}`}
                >
                  ● {execState.data.status.description}
                  {execState.data.time && ` · ${execState.data.time}s`}
                  {execState.data.memory && ` · ${execState.data.memory}KB`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
