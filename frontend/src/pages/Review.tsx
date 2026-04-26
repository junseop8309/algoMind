import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../features/auth/AuthProvider";
import { sm2, type SM2Item } from "../lib/sm2";
import {
  CheckCircle2,
  Map as MapIcon,
  LayoutDashboard,
  RotateCcw,
  Brain,
  ArrowRight,
  XCircle,
  AlertTriangle,
  ThumbsDown,
  Minus,
  ThumbsUp,
  Zap,
  PartyPopper,
} from "lucide-react";

interface ReviewItem {
  conceptId: string;
  conceptTitle: string;
  conceptCategory: string;
  masteryState: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: string | null;
  problemSlug: string | null;
  problemTitle: string | null;
}

const RATING_BUTTONS = [
  {
    quality: 0,
    label: "Blackout",
    sub: "No memory at all",
    Icon: XCircle,
    color:
      "border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400",
    activeBg: "bg-red-50 dark:bg-red-950 border-red-400 dark:border-red-600",
  },
  {
    quality: 2,
    label: "Hard",
    sub: "Wrong but close",
    Icon: ThumbsDown,
    color:
      "border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950 text-orange-600 dark:text-orange-400",
    activeBg:
      "bg-orange-50 dark:bg-orange-950 border-orange-400 dark:border-orange-600",
  },
  {
    quality: 3,
    label: "Difficult",
    sub: "Correct with effort",
    Icon: AlertTriangle,
    color:
      "border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950 text-amber-600 dark:text-amber-400",
    activeBg:
      "bg-amber-50 dark:bg-amber-950 border-amber-400 dark:border-amber-600",
  },
  {
    quality: 4,
    label: "Good",
    sub: "Correct, slight hesitation",
    Icon: ThumbsUp,
    color:
      "border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400",
    activeBg:
      "bg-blue-50 dark:bg-blue-950 border-blue-400 dark:border-blue-600",
  },
  {
    quality: 5,
    label: "Perfect",
    sub: "Instant recall",
    Icon: Zap,
    color:
      "border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950 text-teal-600 dark:text-teal-400",
    activeBg:
      "bg-teal-50 dark:bg-teal-950 border-teal-400 dark:border-teal-600",
  },
  {
    quality: 1,
    label: "Skip",
    sub: "Come back later",
    Icon: Minus,
    color:
      "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400",
    activeBg:
      "bg-neutral-100 dark:bg-neutral-800 border-neutral-400 dark:border-neutral-500",
  },
];

export default function Review() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) loadReviewItems();
  }, [user]);

  async function loadReviewItems() {
    const now = new Date().toISOString();

    const { data: masteryData } = await supabase
      .from("mastery_records")
      .select(
        "conceptId, masteryState, easeFactor, interval, repetitions, nextReview",
      )
      .eq("userId", user!.id)
      .in("masteryState", ["mastered", "review_due"]);

    if (!masteryData || masteryData.length === 0) {
      setLoading(false);
      return;
    }

    const conceptIds = masteryData.map((m) => m.conceptId);
    const { data: conceptsData } = await supabase
      .from("concepts")
      .select("id, title, category")
      .in("id", conceptIds);

    const { data: problemsData } = await supabase
      .from("problems")
      .select("conceptId, slug, title")
      .in("conceptId", conceptIds);

    const conceptMap = new Map(conceptsData?.map((c) => [c.id, c]) ?? []);
    const problemMap = new Map(
      problemsData?.map((p) => [p.conceptId, p]) ?? [],
    );

    const dueItems = masteryData
      .filter((m) => {
        if (!m.nextReview) return true;
        // Normalize nextReview to UTC — Supabase may omit the Z suffix
        const nextReviewStr = m.nextReview.endsWith("Z")
          ? m.nextReview
          : m.nextReview + "Z";
        return new Date(nextReviewStr) <= new Date(now);
      })
      .map((m) => {
        const concept = conceptMap.get(m.conceptId);
        const problem = problemMap.get(m.conceptId);
        return {
          conceptId: m.conceptId,
          conceptTitle: concept?.title ?? "Unknown",
          conceptCategory: concept?.category ?? "",
          masteryState: m.masteryState,
          easeFactor: m.easeFactor,
          interval: m.interval,
          repetitions: m.repetitions,
          nextReview: m.nextReview,
          problemSlug: problem?.slug ?? null,
          problemTitle: problem?.title ?? null,
        };
      });

    setItems(dueItems);
    setLoading(false);
  }

  async function handleRate(quality: number) {
    if (!user || submitting) return;
    setRating(quality);
    setSubmitting(true);

    const item = items[activeIndex];
    const sm2Item: SM2Item = {
      easeFactor: item.easeFactor,
      interval: item.interval,
      repetitions: item.repetitions,
    };

    const result = sm2(sm2Item, quality);
    const newState =
      quality >= 4 ? "mastered" : quality >= 2 ? "review_due" : "gap_detected";

    await supabase
      .from("mastery_records")
      .update({
        masteryState: newState,
        easeFactor: result.easeFactor,
        interval: result.interval,
        repetitions: result.repetitions,
        nextReview: result.nextReviewDate.toISOString(),
        lastReview: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("userId", user.id)
      .eq("conceptId", item.conceptId);

    setTimeout(() => {
      setRating(null);
      setSubmitting(false);
      if (activeIndex + 1 >= items.length) {
        setSessionDone(true);
      } else {
        setActiveIndex((i) => i + 1);
      }
    }, 800);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // ── All caught up ──────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Review
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Spaced repetition session
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center mb-4">
            <CheckCircle2 size={28} className="text-teal-500" />
          </div>
          <h2 className="text-xl font-bold text-black dark:text-white mb-2">
            All caught up!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
            No concepts are due for review right now. Keep solving problems to
            build your mastery.
          </p>
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => navigate("/roadmap")}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              <MapIcon size={15} /> Go to Roadmap
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-black dark:text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              <LayoutDashboard size={15} /> Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Session complete ───────────────────────────────────────────────────────
  if (sessionDone) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Review
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Spaced repetition session
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
            <PartyPopper size={28} className="text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold text-black dark:text-white mb-2">
            Session complete!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You reviewed{" "}
            <span className="font-semibold text-black dark:text-white">
              {items.length}
            </span>{" "}
            concept{items.length !== 1 ? "s" : ""}.
          </p>
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => navigate("/roadmap")}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              <MapIcon size={15} /> Continue Learning
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-black dark:text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              <LayoutDashboard size={15} /> Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Active session ─────────────────────────────────────────────────────────
  const current = items[activeIndex];
  const progressPct = Math.round((activeIndex / items.length) * 100);

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-black dark:text-white">
          Review
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Spaced repetition session
        </p>
      </div>

      {/* Progress */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <RotateCcw size={14} className="text-indigo-500" />
            <span className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
              Progress
            </span>
          </div>
          <span className="text-xs font-semibold text-black dark:text-white">
            {activeIndex + 1}
            <span className="font-normal text-gray-400 dark:text-gray-500">
              {" "}
              / {items.length}
            </span>
          </span>
        </div>
        <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Concept card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 mb-4">
          <Brain size={22} className="text-indigo-500" />
        </div>

        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-2">
          {current.conceptCategory}
        </p>
        <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
          {current.conceptTitle}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          How well do you remember this concept?
        </p>

        {current.problemSlug && (
          <button
            onClick={() => navigate(`/problem/${current.problemSlug}`)}
            className="inline-flex items-center gap-1.5 mt-5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            Practice: {current.problemTitle}
            <ArrowRight size={12} />
          </button>
        )}
      </div>

      {/* Rating card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
        <p className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide mb-4 text-center">
          Rate your recall
        </p>
        <div className="grid grid-cols-3 gap-3">
          {RATING_BUTTONS.map((btn) => {
            const isActive = rating === btn.quality;
            return (
              <button
                key={btn.quality}
                onClick={() => handleRate(btn.quality)}
                disabled={submitting}
                className={`border-2 rounded-xl p-3.5 text-center transition-all disabled:opacity-50 ${
                  isActive ? btn.activeBg : btn.color
                } ${isActive ? "scale-95" : "hover:scale-[1.02]"}`}
              >
                <div className="flex justify-center mb-1.5">
                  <btn.Icon size={18} />
                </div>
                <div className="text-sm font-semibold">{btn.label}</div>
                <div className="text-xs opacity-60 mt-0.5 leading-tight">
                  {btn.sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
