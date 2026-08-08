import { useMemo, useState } from "react";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import typescript from "highlight.js/lib/languages/typescript";
import Icon from "./Icon";
import "./CodeBlock.css";

// Registered once, at module scope — `lib/core` ships no languages itself, so
// this is what keeps the bundle to the two this page actually shows.
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("json", json);

type CodeBlockProps = {
  code: string;
  /** Names what is being copied, for the button's accessible label. */
  label: string;
  /** Omit for plain text (e.g. a bare URL) that has nothing to highlight. */
  language?: "typescript" | "json";
};

type CopyState = "idle" | "copied" | "failed";

const CodeBlock = ({ code, label, language }: CodeBlockProps) => {
  const [copy, setCopy] = useState<CopyState>("idle");

  // Highlighting is a pure function of the code and language, so it is
  // recomputed only when either actually changes, not on every copy-state render.
  const highlighted = useMemo(
    () => (language ? hljs.highlight(code, { language }).value : undefined),
    [code, language],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopy("copied");
      window.setTimeout(() => setCopy("idle"), 2_000);
    } catch {
      // Insecure origins and locked-down browsers both reject the write. The
      // text is on screen and selectable, so this is a downgrade, not a fault.
      setCopy("failed");
    }
  };

  return (
    <div className="relative">
      <pre className="hljs overflow-x-auto rounded-lg border border-divider bg-raised p-4 pr-14 text-xs leading-relaxed text-foreground">
        {highlighted ? (
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        ) : (
          <code>{code}</code>
        )}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy ${label}`}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-divider bg-surface px-2 py-1 text-xs text-muted hover:border-border-accent hover:text-accent"
      >
        <Icon name={copy === "copied" ? "check" : "copy"} className="h-3.5 w-3.5" />
        {copy === "copied" ? "Copied" : "Copy"}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copy === "copied" && `${label} copied to the clipboard`}
        {copy === "failed" && `Could not copy ${label}; select the text instead`}
      </span>
    </div>
  );
};

export default CodeBlock;
