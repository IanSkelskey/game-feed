import type { CSSProperties } from "react";
import "./Meter.css";

type MeterProps = {
  /** 0–100. */
  value: number;
  label: string;
  /** `compact` drops to a hairline, for the corner of a card. */
  variant?: "default" | "compact";
};

/**
 * A single ratio against its limit — achievement completion, always.
 *
 * The fill width is the one dynamic value, injected as a custom property so the
 * rule that consumes it lives in CSS rather than in an inline style.
 */
const Meter = ({ value, label, variant = "default" }: MeterProps) => {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={`meter${variant === "compact" ? " meter--compact" : ""}`}
      style={{ "--meter-fill": `${clamped}%` } as CSSProperties}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="meter-fill" />
    </div>
  );
};

export default Meter;
