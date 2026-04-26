import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../features/auth/AuthProvider";
import {
  Flame,
  Medal,
  BookOpen,
  RotateCcw,
  CheckCircle2,
  Unlock,
  BarChart2,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

interface Stats {
  totalConcepts: number;
  mastered: number;
  available: number;
  locked: number;
  totalAttempts: number;
  passedAttempts: number;
  currentStreak: number;
  longestStreak: number;
}

interface RecentAttempt {
  id: string;
  passed: boolean;
  language: string;
  timeTaken: number;
  createdAt: string;
  problems: { title: string; slug: string; difficulty: string } | null;
}

const MASTERY_COLORS: Record<string, string> = {
  locked: "bg-neutral-300 dark:bg-neutral-600",
  available: "bg-sky-500",
  in_progress: "bg-blue-500",
  mastered: "bg-teal-500",
  review_due: "bg-amber-500",
  gap_detected: "bg-red-500",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-teal-600 dark:text-teal-400",
  medium: "text-amber-600 dark:text-amber-400",
  hard: "text-red-600 dark:text-red-400",
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [masteryBreakdown, setMasteryBreakdown] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);

  async function loadDashboard() {
    const { data: masteryData } = await supabase
      .from("mastery_records")
      .select("masteryState")
      .eq("userId", user!.id);

    const { count: totalConcepts } = await supabase
      .from("concepts")
      .select("*", { count: "exact", head: true });

    const { data: attemptsData } = await supabase
      .from("attempts")
      .select("id, passed, language, timeTaken, createdAt, problemId")
      .eq("userId", user!.id)
      .order("createdAt", { ascending: false })
      .limit(5);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("currentStreak, longestStreak")
      .eq("id", user!.id)
      .single();

    let recentWithProblems: RecentAttempt[] = [];
    if (attemptsData && attemptsData.length > 0) {
      const problemIds = [...new Set(attemptsData.map((a) => a.problemId))];
      const { data: problemsData } = await supabase
        .from("problems")
        .select("id, title, slug, difficulty")
        .in("id", problemIds);

      const problemMap = new Map(problemsData?.map((p) => [p.id, p]) ?? []);
      recentWithProblems = attemptsData.map((a) => ({
        ...a,
        problems: problemMap.get(a.problemId) ?? null,
      }));
    }

    const breakdown: Record<string, number> = {};
    masteryData?.forEach((m) => {
      breakdown[m.masteryState] = (breakdown[m.masteryState] ?? 0) + 1;
    });

    const mastered = breakdown["mastered"] ?? 0;
    const available = breakdown["available"] ?? 0;
    const locked = breakdown["locked"] ?? 0;
    const passed = attemptsData?.filter((a) => a.passed).length ?? 0;

    setStats({
      totalConcepts: totalConcepts ?? 20,
      mastered,
      available,
      locked,
      totalAttempts: attemptsData?.length ?? 0,
      passedAttempts: passed,
      currentStreak: profileData?.currentStreak ?? 0,
      longestStreak: profileData?.longestStreak ?? 0,
    });
    setMasteryBreakdown(breakdown);
    setRecentAttempts(recentWithProblems);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  const successRate = stats?.totalAttempts
    ? Math.round((stats.passedAttempts / stats.totalAttempts) * 100)
    : 0;

  const progressPct = stats
    ? Math.round((stats.mastered / stats.totalConcepts) * 100)
    : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-black dark:text-white">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {user?.email}
        </p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Mastered",
            value: stats?.mastered ?? 0,
            icon: <CheckCircle2 size={18} />,
            color: "text-teal-600 dark:text-teal-400",
            bg: "bg-teal-50 dark:bg-teal-900/20",
          },
          {
            label: "Available",
            value: stats?.available ?? 0,
            icon: <Unlock size={18} />,
            color: "text-sky-600 dark:text-sky-400",
            bg: "bg-sky-50 dark:bg-sky-900/20",
          },
          {
            label: "Attempts",
            value: stats?.totalAttempts ?? 0,
            icon: <BarChart2 size={18} />,
            color: "text-indigo-600 dark:text-indigo-400",
            bg: "bg-indigo-50 dark:bg-indigo-900/20",
          },
          {
            label: "Success Rate",
            value: `${successRate}%`,
            icon: <TrendingUp size={18} />,
            color: "text-green-600 dark:text-green-400",
            bg: "bg-green-50 dark:bg-green-900/20",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5"
          >
            <div className={`inline-flex p-2 rounded-lg mb-3 ${stat.bg}`}>
              <span className={stat.color}>{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-black dark:text-white">
              {stat.value}
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Streak cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Current Streak */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 shrink-0">
            <Flame size={24} className="text-orange-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Current Streak
            </p>
            <p className="text-2xl font-bold text-black dark:text-white">
              {stats?.currentStreak ?? 0}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                days
              </span>
            </p>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 shrink-0">
            <Medal size={24} className="text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Longest Streak
            </p>
            <p className="text-2xl font-bold text-black dark:text-white">
              {stats?.longestStreak ?? 0}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                days
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom grid — Mastery + Recent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mastery Breakdown */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
          <h2 className="text-sm font-semibold text-black dark:text-white uppercase tracking-wide mb-4">
            Mastery Breakdown
          </h2>

          {Object.keys(masteryBreakdown).length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Complete the diagnostic to see your breakdown.
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(masteryBreakdown).map(([state, count]) => (
                <div key={state} className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${MASTERY_COLORS[state] ?? "bg-neutral-400"}`}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize flex-1">
                    {state.replace("_", " ")}
                  </span>
                  <span className="text-sm font-semibold text-black dark:text-white">
                    {count}
                    <span className="font-normal text-gray-400 dark:text-gray-500">
                      {" "}
                      / {stats?.totalConcepts}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Progress bar */}
          {stats && stats.totalConcepts > 0 && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                <span>Overall progress</span>
                <span className="font-semibold text-black dark:text-white">
                  {progressPct}%
                </span>
              </div>
              <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Recent Attempts */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
          <h2 className="text-sm font-semibold text-black dark:text-white uppercase tracking-wide mb-4">
            Recent Attempts
          </h2>

          {recentAttempts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
                <BarChart2 size={18} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No attempts yet
              </p>
              <button
                onClick={() => navigate("/roadmap")}
                className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Go to Roadmap →
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {recentAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  onClick={() =>
                    attempt.problems &&
                    navigate(`/problem/${attempt.problems.slug}`)
                  }
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors group"
                >
                  <span
                    className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                      attempt.passed
                        ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {attempt.passed ? "✓" : "✗"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black dark:text-white truncate">
                      {attempt.problems?.title ?? "Unknown Problem"}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {attempt.language} · {attempt.timeTaken}s ·{" "}
                      <span
                        className={
                          DIFFICULTY_COLORS[
                            attempt.problems?.difficulty ?? ""
                          ] ?? "text-gray-400"
                        }
                      >
                        {attempt.problems?.difficulty ?? ""}
                      </span>
                    </p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors shrink-0"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => navigate("/roadmap")}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          <BookOpen size={16} />
          Continue Learning
        </button>
        <button
          onClick={() => navigate("/review")}
          className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-black dark:text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          <RotateCcw size={16} />
          Start Review Session
        </button>
      </div>
    </div>
  );
}
