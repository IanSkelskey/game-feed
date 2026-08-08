/**
 * The single icon choke point.
 *
 * No icon library is installed — these are hand-written 24x24 strokes, drawn on
 * a common grid so they sit together evenly. Import icons from here and nowhere
 * else, so `aria-hidden` and `focusable={false}` can never be forgotten:
 * every icon in this app is decorative, and the label beside it carries the
 * meaning.
 */

const PATHS = {
  /** Steam and other PC storefronts. */
  monitor: "M3 5h18v11H3zM8 20h8M12 16v4",
  /** Emulated console play. */
  joystick: "M12 3a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM12 8.5v4.5M6 20l1.2-4h9.6L18 20z",
  trophy: "M7 4h10v5a5 5 0 0 1-10 0zM7 6H5a2 2 0 0 0 2 3.8M17 6h2a2 2 0 0 1-2 3.8M12 14v4M9 20h6",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7.5V12l3 2",
  bars: "M3 20h18M7 20v-7M12 20V6M17 20v-4",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4.2-4.2",
  back: "M19 12H5M11 18l-6-6 6-6",
  external: "M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  copy: "M9 9h10v11H9zM15 5H5v11",
  check: "M20 6 9 17l-5-5",
  code: "M8 6l-6 6 6 6M16 6l6 6-6 6",
} as const;

export type IconName = keyof typeof PATHS;

type IconProps = {
  name: IconName;
  /** Sized in `em` so an icon tracks the text it sits beside. */
  className?: string;
};

const Icon = ({ name, className = "h-4 w-4" }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    focusable={false}
  >
    <path d={PATHS[name]} />
  </svg>
);

export default Icon;
