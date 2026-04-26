import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../features/auth/AuthProvider";
import { useSessionStore } from "../stores/sessionStore";
import { useCodeExecution } from "../hooks/useCodeExecution";
import CodeEditor from "../components/CodeEditor/CodeEditor";
import { useAgent } from "../hooks/useAgent";
import { AgentType } from "../types/agent";
import {
  Lock,
  Lightbulb,
  BrainCircuit,
  Play,
  Send,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800",
  medium:
    "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  hard: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
};

const UNLOCKS: Record<string, string[]> = {
  c1: ["c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c18"],
  c2: ["c5", "c20"],
  c3: ["c5", "c20"],
  c4: ["c5", "c9"],
  c5: ["c10", "c17"],
  c6: ["c7", "c10"],
  c7: ["c15"],
  c8: ["c11"],
  c9: ["c13"],
  c10: ["c11", "c16", "c17", "c18"],
  c11: ["c12", "c14", "c19", "c20"],
  c12: ["c13"],
  c13: ["c17"],
  c14: ["c15", "c16"],
  c15: ["c17"],
  c16: ["c17"],
  c17: ["c19", "c20"],
  c18: ["c19"],
  c19: ["c20"],
};

export default function Problem() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [activeTab, setActiveTab] = useState<"description" | "hints" | "ai">(
    "description",
  );
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<
    "accepted" | "rejected" | null
  >(null);
  const [reflectionOpen, setReflectionOpen] = useState(false);

  const { language, startTimer, stopTimer, resetSession } = useSessionStore();
  const { state: execState, execute, reset: resetExec } = useCodeExecution();
  const { state: agentState, ask, reset: resetAgent } = useAgent();
  const [agentMessages, setAgentMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slug) loadProblem();
    return () => {
      stopTimer();
      resetSession();
    };
  }, [slug]);

  // Append AI response to chat
  useEffect(() => {
    if (agentState.status === "success" && agentMessages.length > 0) {
      const last = agentMessages[agentMessages.length - 1];
      if (last.role === "user") {
        setAgentMessages((prev) => [
          ...prev,
          { role: "assistant", content: agentState.message },
        ]);
      }
    }
  }, [agentState.status]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentMessages]);

  // Auto-open reflection panel when AI evaluation arrives after accept
  useEffect(() => {
    if (submitResult === "accepted" && agentState.status === "success") {
      setReflectionOpen(true);
    }
  }, [agentState.status, submitResult]);

  async function loadProblem() {
    const { data } = await supabase
      .from("problems")
      .select("*")
      .eq("slug", slug)
      .single();

    if (!data) {
      navigate("/roadmap");
      return;
    }

    setProblem(data);
    setCode(data.starterCode[language] ?? data.starterCode["python"]);
    startTimer(data.id);
    setLoading(false);
  }

  useEffect(() => {
    if (problem) {
      setCode(problem.starterCode[language] ?? problem.starterCode["python"]);
    }
  }, [language]);

  async function handleRun() {
    if (!problem) return;
    resetExec();
    setSubmitResult(null);
    const testCase = problem.testCases.find((t) => !t.isHidden);
    await execute(code, language, testCase?.input);
  }

  async function handleSubmit() {
    if (!problem || !user) return;
    resetExec();
    setSubmitResult(null);
    setReflectionOpen(false);
    setIsSubmitting(true);
    const testCase = problem.testCases.find((t) => !t.isHidden);
    await execute(code, language, testCase?.input);
  }

  useEffect(() => {
    if (!isSubmitting) return;
    if (execState.status !== "success" && execState.status !== "error") return;

    const passed =
      execState.status === "success" &&
      execState.data?.status?.id === 3 &&
      execState.data?.stdout?.trim() !== "" &&
      (() => {
        const testCase = problem?.testCases.find((t) => !t.isHidden);
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

    async function saveResult() {
      if (!problem || !user) return;

      await supabase.from("attempts").insert({
        id: crypto.randomUUID(),
        userId: user.id,
        problemId: problem.id,
        code,
        language,
        passed,
        timeTaken: useSessionStore.getState().elapsedSeconds,
        hintLevel: revealedHints.length,
        createdAt: new Date().toISOString(),
      });

      if (passed) {
        // Set nextReview to 1 day from now — first SM-2 interval after mastering
        const firstReview = new Date();
        firstReview.setDate(firstReview.getDate() + 1);

        await supabase
          .from("mastery_records")
          .update({
            masteryState: "mastered",
            nextReview: firstReview.toISOString(),
            lastReview: new Date().toISOString(),
            interval: 1,
            repetitions: 1,
            easeFactor: 2.5,
            updatedAt: new Date().toISOString(),
          })
          .eq("userId", user.id)
          .eq("conceptId", problem.conceptId);

        const toUnlock = UNLOCKS[problem.conceptId] ?? [];
        if (toUnlock.length > 0) {
          const { data: currentMastery } = await supabase
            .from("mastery_records")
            .select("conceptId, masteryState")
            .eq("userId", user.id)
            .in("conceptId", toUnlock);

          const stillLocked = toUnlock.filter((cid) => {
            const record = currentMastery?.find((m) => m.conceptId === cid);
            return !record || record.masteryState === "locked";
          });

          if (stillLocked.length > 0) {
            await supabase.from("mastery_records").upsert(
              stillLocked.map((cid) => ({
                id: crypto.randomUUID(),
                userId: user.id,
                conceptId: cid,
                masteryState: "available",
                easeFactor: 2.5,
                interval: 1,
                repetitions: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })),
              { onConflict: "userId,conceptId" },
            );
          }
        }

        setSubmitResult("accepted");

        await ask(
          AgentType.Reflection,
          [
            {
              role: "user",
              content: `I just solved "${problem.title}" in ${language}. Here's my solution:\n\n${code}\n\nPlease give me feedback.`,
            },
          ],
          {
            problemId: problem.id,
            problemTitle: problem.title,
            language,
            code,
            hintLevel: revealedHints.length,
            elapsedSeconds: useSessionStore.getState().elapsedSeconds,
            attemptCount: 0,
          },
        );
      } else {
        const { data: currentMastery } = await supabase
          .from("mastery_records")
          .select("masteryState")
          .eq("userId", user.id)
          .eq("conceptId", problem.conceptId)
          .single();

        if (currentMastery?.masteryState === "available") {
          await supabase
            .from("mastery_records")
            .update({
              masteryState: "in_progress",
              updatedAt: new Date().toISOString(),
            })
            .eq("userId", user.id)
            .eq("conceptId", problem.conceptId);
        }

        setSubmitResult("rejected");
      }

      setIsSubmitting(false);
    }

    saveResult();
  }, [execState.status, isSubmitting]);

  function revealHint(level: number) {
    if (!revealedHints.includes(level)) {
      setRevealedHints((prev) => [...prev, level]);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!problem) return null;

  const visibleTestCases = problem.testCases.filter((t) => !t.isHidden);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left panel ────────────────────────────────────────────── */}
      <div className="w-2/5 flex flex-col border-r border-neutral-200 dark:border-neutral-800 min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5 mb-3">
            <h1 className="text-lg font-bold text-black dark:text-white leading-tight">
              {problem.title}
            </h1>
            <span
              className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-md border ${DIFFICULTY_COLORS[problem.difficulty]}`}
            >
              {problem.difficulty}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {(
              [
                { id: "description", label: "Description" },
                { id: "hints", label: `Hints (${problem.hints.length})` },
                { id: "ai", label: "AI Mentor" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white"
                    : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                {tab.id === "ai" && <BrainCircuit size={12} />}
                {tab.id === "hints" && <Lightbulb size={12} />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto">
          {/* ── Description ── */}
          {activeTab === "description" && (
            <div className="p-6 space-y-6">
              {/* Problem statement — parsed into sections */}
              <div className="space-y-4">
                {(() => {
                  const text = problem.description;

                  // Split on known section keywords to extract parts
                  const inputMatch = text.match(/Input\s*:/i);
                  const outputMatch = text.match(/Output\s*:/i);
                  const exampleMatch = text.match(/Example\s*:/i);

                  // Statement = everything before the first of Input/Output/Example
                  const firstKeyword = [inputMatch, outputMatch, exampleMatch]
                    .filter(Boolean)
                    .map((m) => m!.index!)
                    .sort((a, b) => a - b)[0];

                  const statement =
                    firstKeyword !== undefined
                      ? text.slice(0, firstKeyword).trim()
                      : text.trim();

                  // Extract Input / Output format lines
                  const inputLine = inputMatch
                    ? text
                        .slice(inputMatch.index!)
                        .match(/Input\s*:\s*([^\n.]+)/i)?.[1]
                        ?.trim()
                    : null;
                  const outputLine = outputMatch
                    ? text
                        .slice(outputMatch.index!)
                        .match(/Output\s*:\s*([^\n.]+)/i)?.[1]
                        ?.trim()
                    : null;

                  return (
                    <>
                      {/* Statement */}
                      {statement && (
                        <p className="text-sm leading-7 text-neutral-700 dark:text-neutral-300">
                          {statement}
                        </p>
                      )}

                      {/* Input / Output format */}
                      {(inputLine || outputLine) && (
                        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                          <div className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
                            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                              Format
                            </span>
                          </div>
                          <div className="p-4 space-y-2 text-sm">
                            {inputLine && (
                              <div className="flex gap-2">
                                <span className="text-xs font-semibold text-neutral-400 w-14 shrink-0 pt-0.5">
                                  Input
                                </span>
                                <span className="text-neutral-700 dark:text-neutral-300">
                                  {inputLine}
                                </span>
                              </div>
                            )}
                            {outputLine && (
                              <div className="flex gap-2">
                                <span className="text-xs font-semibold text-neutral-400 w-14 shrink-0 pt-0.5">
                                  Output
                                </span>
                                <span className="text-neutral-700 dark:text-neutral-300">
                                  {outputLine}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Examples */}
              {visibleTestCases.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
                    Examples
                  </h3>
                  {visibleTestCases.map((tc, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                    >
                      <div className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
                        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                          Example {i + 1}
                        </span>
                      </div>
                      <div className="p-4 space-y-3 font-mono text-sm">
                        <div>
                          <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 block mb-1">
                            Input
                          </span>
                          <div className="bg-neutral-100 dark:bg-neutral-800 rounded-md px-3 py-2 text-neutral-900 dark:text-neutral-100">
                            {tc.input}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 block mb-1">
                            Output
                          </span>
                          <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-md px-3 py-2 text-teal-800 dark:text-teal-300">
                            {tc.expectedOutput}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Constraints note */}
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Note:{" "}
                  </span>
                  Hidden test cases may include edge cases not shown above. Make
                  sure your solution handles all inputs correctly.
                </p>
              </div>
            </div>
          )}

          {/* ── Hints ── */}
          {activeTab === "hints" && (
            <div className="p-6 space-y-3">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-4">
                Reveal hints one at a time. The fewer hints you use, the better
                your understanding.
              </p>
              {problem.hints.map((hint, i) => {
                const isRevealed = revealedHints.includes(hint.level);
                const isLocked =
                  hint.level > 1 && !revealedHints.includes(hint.level - 1);
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                  >
                    {isRevealed ? (
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb
                            size={14}
                            className="text-indigo-500 shrink-0"
                          />
                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            Hint {hint.level}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                          {hint.content}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => revealHint(hint.level)}
                        disabled={isLocked}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isLocked
                            ? "opacity-40 cursor-not-allowed bg-neutral-50 dark:bg-neutral-900"
                            : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60 cursor-pointer"
                        }`}
                      >
                        {isLocked ? (
                          <Lock
                            size={14}
                            className="text-neutral-400 shrink-0"
                          />
                        ) : (
                          <Lightbulb
                            size={14}
                            className="text-indigo-400 shrink-0"
                          />
                        )}
                        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                          {isLocked
                            ? `Unlock hint ${hint.level} after hint ${hint.level - 1}`
                            : `Reveal hint ${hint.level}`}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── AI Mentor ── */}
          {activeTab === "ai" && (
            <div className="flex flex-col h-full">
              {/* Intro */}
              {agentMessages.length === 0 && (
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <BrainCircuit size={16} className="text-indigo-500" />
                    <span className="text-sm font-semibold text-black dark:text-white">
                      AI Mentor
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Stuck? Ask for a nudge in the right direction. I won't
                    reveal the solution — just help you think it through.
                  </p>
                </div>
              )}

              {/* Chat messages */}
              <div className="flex-1 overflow-auto px-4 py-2 space-y-3">
                {agentMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 px-1">
                      {msg.role === "user" ? "You" : "AI Mentor"}
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

                {agentState.status === "loading" && (
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-xs text-neutral-400 px-1">
                      AI Mentor
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

                {agentState.status === "error" && (
                  <p className="text-xs text-red-500 px-1">
                    {agentState.message}
                  </p>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Action buttons */}
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!problem) return;
                    const userMsg = {
                      role: "user" as const,
                      content: `I'm stuck on "${problem.title}". I've been working for ${useSessionStore.getState().elapsedSeconds}s. Can you give me a hint?`,
                    };
                    const newMessages = [...agentMessages, userMsg];
                    setAgentMessages(newMessages);
                    await ask(AgentType.Hint, newMessages, {
                      problemId: problem.id,
                      problemTitle: problem.title,
                      language,
                      code,
                      hintLevel: revealedHints.length,
                      elapsedSeconds: useSessionStore.getState().elapsedSeconds,
                      attemptCount: 0,
                    });
                  }}
                  disabled={agentState.status === "loading"}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <Send size={14} />
                  {agentState.status === "loading"
                    ? "Thinking..."
                    : "Ask for a hint"}
                </button>
                {agentMessages.length > 0 && (
                  <button
                    onClick={() => {
                      setAgentMessages([]);
                      resetAgent();
                    }}
                    className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title="Clear conversation"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel — editor + output ─────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 min-h-0">
          <CodeEditor value={code} onChange={setCode} onRun={handleRun} />
        </div>

        {/* Output panel */}
        <div className="h-48 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-900 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-400 font-medium">
                Output
              </span>
              {submitResult === "accepted" && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 bg-teal-900/30 px-2 py-0.5 rounded">
                  <CheckCircle2 size={11} /> Accepted — concept mastered
                </span>
              )}
              {submitResult === "rejected" && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded">
                  <XCircle size={11} /> Wrong answer — try again
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRun}
                className="flex items-center gap-1.5 text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1 rounded transition-colors"
              >
                <Play size={11} /> Run
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1 rounded transition-colors"
              >
                <Send size={11} /> {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>

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

        {/* ── AI Reflection panel — slides up after accepted submission ── */}
        {submitResult === "accepted" && (
          <div className="border-t border-indigo-500/30 bg-neutral-900 shrink-0">
            {/* Toggle header */}
            <button
              onClick={() => setReflectionOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-neutral-800/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BrainCircuit size={14} className="text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-400">
                  AI Reflection
                </span>
                {agentState.status === "loading" && (
                  <span className="text-xs text-neutral-500 animate-pulse">
                    Generating...
                  </span>
                )}
                {agentState.status === "success" && (
                  <span className="text-xs text-neutral-500">
                    Tap to {reflectionOpen ? "collapse" : "expand"}
                  </span>
                )}
              </div>
              {reflectionOpen ? (
                <ChevronDown size={14} className="text-neutral-500" />
              ) : (
                <ChevronUp size={14} className="text-neutral-500" />
              )}
            </button>

            {/* Reflection body */}
            {reflectionOpen && (
              <div className="px-4 pb-4">
                {agentState.status === "loading" && (
                  <div className="flex gap-1 items-center py-2">
                    <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                )}
                {agentState.status === "success" && (
                  <div className="rounded-xl bg-neutral-800 border border-neutral-700 p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles size={12} className="text-indigo-400" />
                      <span className="text-xs font-semibold text-indigo-400">
                        Feedback on your solution
                      </span>
                    </div>
                    <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                      {agentState.message}
                    </p>
                  </div>
                )}
                {agentState.status === "error" && (
                  <p className="text-xs text-red-400">{agentState.message}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
