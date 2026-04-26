import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../features/auth/AuthProvider";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { MasteryState } from "../types/roadmap";
import {
  Lock,
  Sparkles,
  Zap,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  X,
  ChevronRight,
} from "lucide-react";

// ─── Mastery config ───────────────────────────────────────────────────────────

const MASTERY_ICON: Record<MasteryState, React.ElementType> = {
  locked: Lock,
  available: Sparkles,
  in_progress: Zap,
  mastered: CheckCircle2,
  review_due: RotateCcw,
  gap_detected: AlertTriangle,
};

const MASTERY_NODE_DARK: Record<
  MasteryState,
  {
    bg: string;
    border: string;
    text: string;
    iconColor: string;
    opacity: number;
  }
> = {
  locked: {
    bg: "#18181b",
    border: "#3f3f46",
    text: "#71717a",
    iconColor: "#52525b",
    opacity: 0.55,
  },
  available: {
    bg: "#0c1a2e",
    border: "#0ea5e9",
    text: "#38bdf8",
    iconColor: "#38bdf8",
    opacity: 1,
  },
  in_progress: {
    bg: "#0d1b3e",
    border: "#6366f1",
    text: "#a5b4fc",
    iconColor: "#818cf8",
    opacity: 1,
  },
  mastered: {
    bg: "#0a1f1a",
    border: "#14b8a6",
    text: "#5eead4",
    iconColor: "#2dd4bf",
    opacity: 1,
  },
  review_due: {
    bg: "#1c1608",
    border: "#f59e0b",
    text: "#fcd34d",
    iconColor: "#fbbf24",
    opacity: 1,
  },
  gap_detected: {
    bg: "#1f0a0a",
    border: "#ef4444",
    text: "#fca5a5",
    iconColor: "#f87171",
    opacity: 1,
  },
};

const MASTERY_NODE_LIGHT: Record<
  MasteryState,
  {
    bg: string;
    border: string;
    text: string;
    iconColor: string;
    opacity: number;
  }
> = {
  locked: {
    bg: "#f4f4f5",
    border: "#d4d4d8",
    text: "#a1a1aa",
    iconColor: "#a1a1aa",
    opacity: 0.65,
  },
  available: {
    bg: "#e0f2fe",
    border: "#0ea5e9",
    text: "#0369a1",
    iconColor: "#0284c7",
    opacity: 1,
  },
  in_progress: {
    bg: "#eef2ff",
    border: "#6366f1",
    text: "#4338ca",
    iconColor: "#6366f1",
    opacity: 1,
  },
  mastered: {
    bg: "#f0fdfa",
    border: "#14b8a6",
    text: "#0f766e",
    iconColor: "#0d9488",
    opacity: 1,
  },
  review_due: {
    bg: "#fffbeb",
    border: "#f59e0b",
    text: "#b45309",
    iconColor: "#d97706",
    opacity: 1,
  },
  gap_detected: {
    bg: "#fef2f2",
    border: "#ef4444",
    text: "#b91c1c",
    iconColor: "#dc2626",
    opacity: 1,
  },
};

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND: {
  state: MasteryState;
  label: string;
  Icon: React.ElementType;
  color: string;
}[] = [
  {
    state: "locked",
    label: "Locked",
    Icon: Lock,
    color: "text-neutral-400 dark:text-neutral-500",
  },
  {
    state: "available",
    label: "Available",
    Icon: Sparkles,
    color: "text-sky-500",
  },
  {
    state: "in_progress",
    label: "In Progress",
    Icon: Zap,
    color: "text-indigo-500",
  },
  {
    state: "mastered",
    label: "Mastered",
    Icon: CheckCircle2,
    color: "text-teal-500",
  },
  {
    state: "review_due",
    label: "Review Due",
    Icon: RotateCcw,
    color: "text-amber-500",
  },
  {
    state: "gap_detected",
    label: "Gap Detected",
    Icon: AlertTriangle,
    color: "text-red-500",
  },
];

// ─── Difficulty ───────────────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-teal-700 dark:text-teal-400",
  medium: "text-amber-700 dark:text-amber-400",
  hard: "text-red-700 dark:text-red-400",
};

const DIFFICULTY_BG: Record<string, string> = {
  easy: "bg-teal-50 border-teal-200 dark:bg-teal-900/30 dark:border-teal-700/40",
  medium:
    "bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700/40",
  hard: "bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700/40",
};

// ─── Custom node component ────────────────────────────────────────────────────

type ConceptNodeData = {
  label: string;
  mastery: MasteryState;
  style: {
    bg: string;
    border: string;
    text: string;
    iconColor: string;
    opacity: number;
  };
};

function ConceptNode({ data }: { data: ConceptNodeData }) {
  const Icon = MASTERY_ICON[data.mastery];
  const s = data.style;

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{
          background: s.bg,
          border: `1.5px solid ${s.border}`,
          opacity: s.opacity,
          borderRadius: "10px",
          padding: "9px 14px",
          minWidth: "140px",
          display: "flex",
          alignItems: "center",
          gap: "7px",
          cursor: data.mastery === "locked" ? "not-allowed" : "pointer",
          transition: "all 0.15s ease",
        }}
      >
        <Icon size={13} style={{ color: s.iconColor, flexShrink: 0 }} />
        <span
          style={{
            color: s.text,
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
        >
          {data.label}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

const nodeTypes: NodeTypes = { concept: ConceptNode };

// ─── Positions & edges ────────────────────────────────────────────────────────

const POSITIONS: Record<string, { x: number; y: number }> = {
  c1: { x: 300, y: 0 },
  c2: { x: 600, y: 0 },
  c3: { x: 300, y: 120 },
  c4: { x: 0, y: 120 },
  c5: { x: 150, y: 240 },
  c6: { x: 450, y: 240 },
  c7: { x: 650, y: 240 },
  c8: { x: 750, y: 120 },
  c9: { x: 0, y: 240 },
  c10: { x: 300, y: 360 },
  c11: { x: 500, y: 480 },
  c12: { x: 500, y: 600 },
  c13: { x: 650, y: 720 },
  c14: { x: 300, y: 600 },
  c15: { x: 150, y: 720 },
  c16: { x: 350, y: 720 },
  c17: { x: 300, y: 840 },
  c18: { x: 100, y: 480 },
  c19: { x: 700, y: 600 },
  c20: { x: 750, y: 480 },
};

const EDGES: Edge[] = [
  { id: "e1-3", source: "c1", target: "c3" },
  { id: "e1-4", source: "c1", target: "c4" },
  { id: "e1-5", source: "c1", target: "c5" },
  { id: "e1-6", source: "c1", target: "c6" },
  { id: "e1-7", source: "c1", target: "c7" },
  { id: "e1-8", source: "c1", target: "c8" },
  { id: "e1-9", source: "c1", target: "c9" },
  { id: "e2-5", source: "c2", target: "c5" },
  { id: "e1-10", source: "c1", target: "c10" },
  { id: "e8-11", source: "c8", target: "c11" },
  { id: "e10-11", source: "c10", target: "c11" },
  { id: "e11-12", source: "c11", target: "c12" },
  { id: "e12-13", source: "c12", target: "c13" },
  { id: "e9-13", source: "c9", target: "c13" },
  { id: "e11-14", source: "c11", target: "c14" },
  { id: "e14-15", source: "c14", target: "c15" },
  { id: "e7-15", source: "c7", target: "c15" },
  { id: "e14-16", source: "c14", target: "c16" },
  { id: "e10-16", source: "c10", target: "c16" },
  { id: "e10-17", source: "c10", target: "c17" },
  { id: "e1-18", source: "c1", target: "c18" },
  { id: "e10-18", source: "c10", target: "c18" },
  { id: "e11-19", source: "c11", target: "c19" },
  { id: "e11-20", source: "c11", target: "c20" },
  { id: "e2-20", source: "c2", target: "c20" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConceptWithMastery {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: number;
  masteryState: MasteryState;
}

interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  bestResult: "passed" | "failed" | "untried";
}

interface ProblemPickerModal {
  conceptTitle: string;
  masteryState: MasteryState;
  problems: Problem[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Roadmap() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [concepts, setConcepts] = useState<ConceptWithMastery[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ProblemPickerModal | null>(null);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  // Stay in sync with dark mode toggle
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadRoadmap();
  }, [user]);

  async function loadRoadmap() {
    const { data: conceptData } = await supabase
      .from("concepts")
      .select("id, slug, title, category, difficulty");

    const { data: masteryData } = await supabase
      .from("mastery_records")
      .select("conceptId, masteryState")
      .eq("userId", user!.id);

    if (!conceptData) return;

    const masteryMap = new Map(
      masteryData?.map((m) => [m.conceptId, m.masteryState]) ?? [],
    );

    const merged = conceptData.map((c) => ({
      ...c,
      masteryState: (masteryMap.get(c.id) ?? "locked") as MasteryState,
    }));

    setConcepts(merged);
    setLoading(false);
  }

  const MASTERY_NODE = isDark ? MASTERY_NODE_DARK : MASTERY_NODE_LIGHT;

  // Build nodes using custom type — icon + label rendered by ConceptNode
  const nodes: Node[] = concepts.map((c) => ({
    id: c.id,
    type: "concept",
    position: POSITIONS[c.id] ?? { x: 0, y: 0 },
    data: {
      label: c.title,
      mastery: c.masteryState,
      style: MASTERY_NODE[c.masteryState],
    },
  }));

  const edgeColor = isDark ? "#3f3f46" : "#d4d4d8";
  const styledEdges = EDGES.map((e) => ({
    ...e,
    style: { stroke: edgeColor, strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
  }));

  async function handleNodeClick(_: React.MouseEvent, node: Node) {
    const concept = concepts.find((c) => c.id === node.id);
    if (!concept) return;

    if (concept.masteryState === "locked") {
      alert(
        `Complete prerequisite concepts first to unlock "${concept.title}"`,
      );
      return;
    }

    const { data: problemData } = await supabase
      .from("problems")
      .select("id, slug, title, difficulty")
      .eq("conceptId", concept.id)
      .order("difficulty", { ascending: true });

    if (!problemData || problemData.length === 0) {
      alert(`No problems available for "${concept.title}" yet. Coming soon!`);
      return;
    }

    // Fetch user's attempts for these problems
    const problemIds = problemData.map((p) => p.id);
    const { data: attemptData } = await supabase
      .from("attempts")
      .select("problemId, passed")
      .eq("userId", user!.id)
      .in("problemId", problemIds);

    // Build best result per problem
    const resultMap = new Map<string, "passed" | "failed">();
    attemptData?.forEach((a) => {
      if (a.passed) {
        resultMap.set(a.problemId, "passed");
      } else if (!resultMap.has(a.problemId)) {
        resultMap.set(a.problemId, "failed");
      }
    });

    const problems: Problem[] = problemData.map((p) => ({
      ...p,
      bestResult: resultMap.get(p.id) ?? "untried",
    }));

    setModal({
      conceptTitle: concept.title,
      masteryState: concept.masteryState,
      problems,
    });
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-8 py-5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <h1 className="text-3xl font-bold text-black dark:text-white">
          Roadmap
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Click any unlocked concept to start solving problems
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-8 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        {LEGEND.map(({ state, label, Icon, color }) => (
          <div key={state} className="flex items-center gap-1.5">
            <Icon size={13} className={color} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* React Flow canvas */}
      <div className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <ReactFlow
          nodes={nodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.5}
        >
          <Background color={isDark ? "#27272a" : "#e4e4e7"} gap={24} />
          <Controls />
        </ReactFlow>
      </div>

      {/* Problem picker modal */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-lg font-bold text-black dark:text-white">
                  {modal.conceptTitle}
                </h2>
                <div className="flex items-center gap-2 mt-1.5">
                  {(() => {
                    const Icon = MASTERY_ICON[modal.masteryState];
                    const cfg: Record<
                      MasteryState,
                      { label: string; cls: string }
                    > = {
                      available: {
                        label: "Available",
                        cls: "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-900/30 dark:border-sky-700/40 dark:text-sky-400",
                      },
                      in_progress: {
                        label: "In Progress",
                        cls: "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700/40 dark:text-indigo-400",
                      },
                      mastered: {
                        label: "Mastered",
                        cls: "bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-900/30 dark:border-teal-700/40 dark:text-teal-400",
                      },
                      review_due: {
                        label: "Review Due",
                        cls: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700/40 dark:text-amber-400",
                      },
                      gap_detected: {
                        label: "Gap Detected",
                        cls: "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700/40 dark:text-red-400",
                      },
                      locked: {
                        label: "Locked",
                        cls: "bg-neutral-100 border-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400",
                      },
                    };
                    const { label, cls } = cfg[modal.masteryState];
                    return (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border ${cls}`}
                      >
                        <Icon size={11} />
                        {label}
                      </span>
                    );
                  })()}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose a problem to solve
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModal(null)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-4" />

            <div className="flex flex-col gap-2">
              {modal.problems.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => {
                    setModal(null);
                    navigate(`/problem/${p.slug}`);
                  }}
                  className="flex items-center justify-between w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-xl transition-colors group text-left"
                >
                  <span className="text-sm font-medium text-black dark:text-white">
                    {p.title}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Attempt result badge */}
                    {p.bestResult === "passed" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-900/30 dark:border-teal-700/40 dark:text-teal-400">
                        <CheckCircle2 size={11} />
                        Solved
                      </span>
                    )}
                    {p.bestResult === "failed" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700/40 dark:text-amber-400">
                        <Zap size={11} />
                        Attempted
                      </span>
                    )}
                    {p.bestResult === "untried" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border bg-neutral-50 border-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400">
                        <Sparkles size={11} />
                        New
                      </span>
                    )}
                    {/* Difficulty badge */}
                    <span
                      className={`text-xs font-medium capitalize px-2 py-0.5 rounded-md border ${
                        DIFFICULTY_BG[p.difficulty] ??
                        "bg-neutral-50 border-neutral-200"
                      } ${DIFFICULTY_COLORS[p.difficulty] ?? "text-neutral-400"}`}
                    >
                      {p.difficulty}
                    </span>
                    <ChevronRight
                      size={14}
                      className="text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
