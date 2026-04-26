import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../features/auth/AuthProvider";
import {
  Trophy,
  Code2,
  CheckCircle2,
  TrendingUp,
  Pencil,
  Check,
  X,
  RotateCcw,
  LogOut,
  CalendarDays,
  Mail,
} from "lucide-react";

interface Profile {
  id: string;
  email: string;
  username: string | null;
  onboardingComplete: boolean;
  createdAt: string;
}

// Issue #7 fix: removed unused reviewsDone field
interface Stats {
  mastered: number;
  totalConcepts: number;
  totalAttempts: number;
  passedAttempts: number;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [username, setUsername] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  async function loadProfile() {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user!.id)
      .single();

    const { data: masteryData } = await supabase
      .from("mastery_records")
      .select("masteryState")
      .eq("userId", user!.id);

    const { count: totalConcepts } = await supabase
      .from("concepts")
      .select("*", { count: "exact", head: true });

    const { data: attemptsData } = await supabase
      .from("attempts")
      .select("passed")
      .eq("userId", user!.id);

    const mastered =
      masteryData?.filter((m) => m.masteryState === "mastered").length ?? 0;
    const passed = attemptsData?.filter((a) => a.passed).length ?? 0;

    setProfile(profileData);
    setUsername(profileData?.username ?? "");
    setStats({
      mastered,
      totalConcepts: totalConcepts ?? 20,
      totalAttempts: attemptsData?.length ?? 0,
      passedAttempts: passed,
    });
    setLoading(false);
  }

  async function handleSaveUsername() {
    if (!user) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ username, updatedAt: new Date().toISOString() })
      .eq("id", user.id);
    setSaving(false);
    setEditing(false);
    setProfile((prev) => (prev ? { ...prev, username } : prev));
  }

  async function handleResetOnboarding() {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({
        onboardingComplete: false,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", user.id);
    await supabase.from("mastery_records").delete().eq("userId", user.id);
    navigate("/onboarding");
  }

  async function handleSignOut() {
    await signOut();
    navigate("/auth");
  }

  const successRate = stats?.totalAttempts
    ? Math.round((stats.passedAttempts / stats.totalAttempts) * 100)
    : 0;

  const statCards = [
    {
      label: "Concepts Mastered",
      value: `${stats?.mastered ?? 0} / ${stats?.totalConcepts ?? 0}`,
      icon: Trophy,
      iconBg: "bg-teal-50 dark:bg-teal-900/20",
      iconColor: "text-teal-600 dark:text-teal-400",
      progress: stats?.totalConcepts
        ? (stats.mastered / stats.totalConcepts) * 100
        : 0,
      progressColor: "bg-teal-500",
    },
    {
      label: "Problems Attempted",
      value: stats?.totalAttempts ?? 0,
      icon: Code2,
      iconBg: "bg-indigo-50 dark:bg-indigo-900/20",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      progress: null,
      progressColor: "",
    },
    {
      label: "Problems Passed",
      value: stats?.passedAttempts ?? 0,
      icon: CheckCircle2,
      iconBg: "bg-green-50 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
      progress: null,
      progressColor: "",
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      icon: TrendingUp,
      iconBg: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      progress: successRate,
      progressColor: "bg-blue-500",
    },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white">
          Profile
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your account and track your progress
        </p>
      </div>

      {/* Avatar + Info Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 mb-4">
        {/* Avatar row */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shrink-0 select-none">
            {(profile?.username ?? user?.email ?? "U")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-black dark:text-white truncate">
              {profile?.username ?? "No username set"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <p className="text-xs text-gray-400">
                Joined{" "}
                {new Date(profile?.createdAt ?? "").toLocaleDateString(
                  "en-US",
                  { month: "long", year: "numeric" },
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-neutral-100 dark:border-neutral-800 mb-5" />

        {/* Username edit */}
        <div>
          <p className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide mb-3">
            Username
          </p>
          {editing ? (
            <div className="flex gap-2">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoFocus
                className="flex-1 min-w-0 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
              />
              <button
                onClick={handleSaveUsername}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setUsername(profile?.username ?? "");
                }}
                className="border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-black dark:text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {profile?.username ?? "Not set"}
              </span>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 mb-4">
        <p className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide mb-4">
          Your Stats
        </p>
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-100 dark:border-neutral-800"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center ${s.iconBg}`}
                  >
                    <Icon className={`w-4 h-4 ${s.iconColor}`} />
                  </div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {s.label}
                  </p>
                </div>
                <p className="text-2xl font-bold text-black dark:text-white">
                  {s.value}
                </p>
                {s.progress !== null && (
                  <div className="mt-2 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.progressColor} transition-all duration-500`}
                      style={{ width: `${Math.min(s.progress, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Actions */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-3">
        <p className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide mb-4">
          Account
        </p>

        <button
          onClick={handleResetOnboarding}
          className="w-full flex items-start gap-3 px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0 mt-0.5">
            <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-black dark:text-white">
              Retake Diagnostic Quiz
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Reset your roadmap and start fresh
            </p>
          </div>
        </button>

        <button
          onClick={handleSignOut}
          className="w-full flex items-start gap-3 px-4 py-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-neutral-900 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0 mt-0.5">
            <LogOut className="w-4 h-4 text-red-500 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Sign Out
            </p>
            <p className="text-xs text-red-400/70 dark:text-red-500/60 mt-0.5">
              {user?.email}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
