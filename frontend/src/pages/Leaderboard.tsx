import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../features/auth/AuthProvider";
import { Trophy, CheckCircle2, Flame, Medal, Crown, Info } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  username: string | null;
  currentStreak: number;
  longestStreak: number;
  mastered_count: number;
  active_count: number;
  score: number;
}

const RANK_STYLES = [
  {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-700/40",
    text: "text-amber-600 dark:text-amber-400",
  },
  {
    bg: "bg-neutral-100 dark:bg-neutral-800/60",
    border: "border-neutral-200 dark:border-neutral-700",
    text: "text-neutral-500 dark:text-neutral-400",
  },
  {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-200 dark:border-orange-700/40",
    text: "text-orange-600 dark:text-orange-400",
  },
];

const RANK_ICONS = [
  <Crown size={16} className="text-amber-500" />,
  <Medal size={16} className="text-neutral-400" />,
  <Medal size={16} className="text-orange-400" />,
];

const TABS: {
  id: "score" | "mastered" | "streak";
  label: string;
  Icon: React.ElementType;
}[] = [
  { id: "score", label: "Score", Icon: Trophy },
  { id: "mastered", label: "Mastered", Icon: CheckCircle2 },
  { id: "streak", label: "Streak", Icon: Flame },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"score" | "mastered" | "streak">("score");

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    const { data } = await supabase.from("leaderboard").select("*");
    if (data) setEntries(data);
    setLoading(false);
  }

  function sorted() {
    return [...entries].sort((a, b) => {
      if (tab === "score") return b.score - a.score;
      if (tab === "mastered") return b.mastered_count - a.mastered_count;
      return b.currentStreak - a.currentStreak;
    });
  }

  const sortedEntries = sorted();
  const myRank = sortedEntries.findIndex((e) => e.id === user?.id) + 1;
  const myEntry = entries.find((e) => e.id === user?.id);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-black dark:text-white">
          Leaderboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ranked by mastery score · updates in real time
        </p>
      </div>

      {/* Your rank card */}
      {myEntry && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/40 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 shrink-0">
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                #{myRank}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-black dark:text-white">
                Your ranking
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <CheckCircle2 size={11} className="text-teal-500" />
                  {myEntry.mastered_count} mastered
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Flame size={11} className="text-orange-500" />
                  {myEntry.currentStreak}d streak
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {myEntry.score}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg transition-colors ${
              tab === id
                ? "bg-white dark:bg-neutral-700 text-black dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Rankings */}
      <div className="flex flex-col gap-2">
        {sortedEntries.map((entry, i) => {
          const isMe = entry.id === user?.id;
          const rank = i + 1;
          const rankStyle = rank <= 3 ? RANK_STYLES[rank - 1] : null;

          return (
            <div
              key={entry.id}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${
                isMe
                  ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700/40"
                  : rankStyle
                    ? `${rankStyle.bg} ${rankStyle.border}`
                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
              }`}
            >
              {/* Rank indicator */}
              <div className="w-7 flex items-center justify-center shrink-0">
                {rank <= 3 ? (
                  RANK_ICONS[rank - 1]
                ) : (
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                    #{rank}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isMe
                    ? "bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {(entry.username ?? entry.id)?.[0]?.toUpperCase() ?? "?"}
              </div>

              {/* Name + stats */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-black dark:text-white truncate">
                  {entry.username ?? `User ${entry.id.slice(0, 6)}`}
                  {isMe && (
                    <span className="ml-1.5 text-xs font-normal text-indigo-500 dark:text-indigo-400">
                      (you)
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <CheckCircle2 size={10} className="text-teal-500" />
                    {entry.mastered_count} mastered
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Flame size={10} className="text-orange-500" />
                    {entry.currentStreak}d
                  </span>
                </div>
              </div>

              {/* Score / stat */}
              <div className="text-right shrink-0">
                {tab === "score" && (
                  <>
                    <p className="text-base font-bold text-black dark:text-white">
                      {entry.score}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      pts
                    </p>
                  </>
                )}
                {tab === "mastered" && (
                  <>
                    <p className="text-base font-bold text-teal-600 dark:text-teal-400">
                      {entry.mastered_count}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      concepts
                    </p>
                  </>
                )}
                {tab === "streak" && (
                  <>
                    <p className="text-base font-bold text-orange-500 dark:text-orange-400">
                      {entry.currentStreak}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      days
                    </p>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400 text-sm">
            No users yet — be the first on the leaderboard!
          </div>
        )}
      </div>

      {/* Score formula */}
      <div className="flex items-start gap-2 px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
        <Info size={13} className="text-gray-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-black dark:text-white mb-0.5">
            Score formula
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            (Concepts mastered × 100) + (Current streak × 10)
          </p>
        </div>
      </div>
    </div>
  );
}
