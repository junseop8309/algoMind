import Editor, { type OnMount } from "@monaco-editor/react";
import { useUIStore } from "../../stores/uiStore";
import { useSessionStore } from "../../stores/sessionStore";

type Language = "python" | "javascript" | "typescript" | "java" | "cpp";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  readOnly?: boolean;
}

const LANGUAGE_LABELS: Record<Language, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  java: "Java",
  cpp: "C++",
};

export default function CodeEditor({
  value,
  onChange,
  onRun,
  readOnly = false,
}: CodeEditorProps) {
  const { theme } = useUIStore();
  const { language, setLanguage } = useSessionStore();

  const handleEditorMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
      onRun(),
    );
  };

  return (
    <div className="flex flex-col h-full border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        {/* Language selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="text-sm bg-transparent text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 focus:outline-none"
        >
          {Object.entries(LANGUAGE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>

        {/* Run button */}
        <button
          onClick={onRun}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-1 rounded transition-colors"
          title="Run code (Ctrl+Enter)"
        >
          ▶ Run
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={value}
          theme={theme === "dark" ? "vs-dark" : "light"}
          onChange={(val) => onChange(val ?? "")}
          onMount={handleEditorMount}
          options={{
            readOnly,
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            lineNumbers: "on",
            renderLineHighlight: "line",
            automaticLayout: true,
          }}
          loading={
            <div className="flex h-full items-center justify-center text-neutral-400 text-sm">
              Loading editor...
            </div>
          }
        />
      </div>
    </div>
  );
}
