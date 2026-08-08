import type { CSSProperties } from "react";
import type { Magnitude } from "../utils/stats";
import "./BarList.css";

type BarListProps = {
  rows: Magnitude[];
  /** Turns a raw value into its printed label. */
  format: (value: number) => string;
  /**
   * Which categorical slot to paint. Two magnitude charts share the overview,
   * so each takes its own validated hue rather than two steps of one ramp.
   */
  series?: 1 | 2;
  /** `id` of the heading that titles the chart. */
  labelledBy: string;
};

/**
 * Horizontal magnitude bars.
 *
 * Built as a table on purpose: comparing labelled magnitudes *is* tabular, so
 * the accessible view and the visual one are the same markup rather than a
 * chart with a hidden table bolted beside it. Every row carries its value as a
 * direct label, and the fuller figure appears on hover — and is in the DOM
 * either way, so assistive technology never depends on the pointer.
 */
const BarList = ({ rows, format, series = 1, labelledBy }: BarListProps) => {
  // Bars are relative to the largest value, not to the axis maximum: with no
  // axis drawn, scaling to anything else wastes the width.
  const max = rows.reduce((peak, row) => Math.max(peak, row.value), 0) || 1;

  return (
    <table className={`barlist barlist--series-${series}`} aria-labelledby={labelledBy}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="barlist-row">
            <th scope="row" className="barlist-label" title={row.label}>
              {row.label}
            </th>
            <td className="barlist-track">
              <div
                className="barlist-fill"
                style={{ "--bar-fill": `${(row.value / max) * 100}%` } as CSSProperties}
              />
              <span className="barlist-tip" role="note">
                {row.detail}
              </span>
            </td>
            <td className="barlist-value">{format(row.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default BarList;
