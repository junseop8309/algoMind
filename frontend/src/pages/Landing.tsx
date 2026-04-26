import { useNavigate } from "react-router";
import { useAuth } from "../features/auth/AuthProvider";
import { useEffect } from "react";
import {
  BrainCircuit,
  MapPin,
  Lightbulb,
  RotateCcw,
  Terminal,
  ArrowRight,
  Stethoscope,
} from "lucide-react";

const FEATURES = [
  {
    icon: Stethoscope,
    label: "Adaptive Diagnostic",
    desc: "A short quiz that maps exactly what you know",
    color:
      "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
  },
  {
    icon: MapPin,
    label: "Dynamic Roadmap",
    desc: "Visual graph that unlocks as you master concepts",
    color: "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400",
  },
  {
    icon: Lightbulb,
    label: "AI Hint Agent",
    desc: "Socratic hints — nudges you forward without spoilers",
    color:
      "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
  },
  {
    icon: RotateCcw,
    label: "Spaced Review",
    desc: "SM-2 scheduling so nothing slips through the cracks",
    color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
  },
  {
    icon: Terminal,
    label: "Code Execution",
    desc: "Run and test your solutions right in the browser",
    color:
      "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-black dark:text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <BrainCircuit className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-lg font-bold text-black dark:text-white">
            AlgoMind
          </span>
        </div>
        <button
          onClick={() => navigate("/auth")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          Get Started
        </button>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/40 text-indigo-600 dark:text-indigo-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <BrainCircuit className="w-3.5 h-3.5" />
          Personalized DSA Learning
        </div>

        <h1 className="text-5xl font-bold text-black dark:text-white mb-5 leading-tight max-w-2xl">
          Diagnose. Roadmap. Master.
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mb-10 leading-relaxed">
          AlgoMind builds a personalized DSA learning roadmap based on what you
          already know, then adapts as you grow.
        </p>

        {/* CTA buttons */}
        <div className="flex gap-3 mb-20">
          <button
            onClick={() => navigate("/auth")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
          >
            Start for free
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-black dark:text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            Log in
          </button>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl w-full text-left">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${f.color}`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <p className="text-sm font-semibold text-black dark:text-white mb-1">
                  {f.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 py-5 text-center">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} AlgoMind. Built to make DSA stick.
        </p>
      </div>
    </div>
  );
}
