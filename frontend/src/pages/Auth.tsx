import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../features/auth/AuthProvider";
import {
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  BrainCircuit,
} from "lucide-react";

export default function Auth() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (tab === "login") {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        navigate("/dashboard");
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setError("Check your email for a confirmation link.");
      }
    }

    setLoading(false);
  }

  const isSuccess = error.includes("Check your email");

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-black dark:text-white">
            AlgoMind
          </span>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8">
          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-black dark:text-white">
              {tab === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {tab === "login"
                ? "Sign in to continue your learning journey"
                : "Start your personalized DSA roadmap today"}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex mb-6 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 gap-1">
            <button
              onClick={() => {
                setTab("login");
                setError("");
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                tab === "login"
                  ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => {
                setTab("signup");
                setError("");
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                tab === "signup"
                  ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Error / success */}
            {error && (
              <div
                className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm border ${
                  isSuccess
                    ? "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700/40 text-teal-700 dark:text-teal-400"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-400"
                }`}
              >
                {isSuccess ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading
                ? "Loading…"
                : tab === "login"
                  ? "Log In"
                  : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          By continuing, you agree to AlgoMind&apos;s terms of service.
        </p>
      </div>
    </div>
  );
}
