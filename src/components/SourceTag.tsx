import type { GameSource } from "../types";
import { SOURCE_LABELS } from "../utils/format";
import Icon, { type IconName } from "./Icon";

type SourceTagProps = {
  source: GameSource;
  /** Adds the platform name, for places where the console matters. */
  platform?: string;
  variant?: "default" | "plain";
};

const ICONS: Record<GameSource, IconName> = {
  steam: "monitor",
  retroachievements: "joystick",
};

/**
 * Which service a game came from.
 *
 * Deliberately not colour-coded: the two sources would need two hues that
 * survive colourblind simulation next to the accent, and the label is already
 * the clearer signal. The icon is decorative reinforcement.
 */
const SourceTag = ({ source, platform, variant = "default" }: SourceTagProps) => (
  <span
    className={`inline-flex items-center text-xs text-muted ${
      variant === "plain" ? "gap-1.5" : "gap-1.5 rounded-full border border-divider px-2 py-0.5"
    }`}
  >
    <Icon name={ICONS[source]} className="h-3.5 w-3.5" />
    {platform ?? SOURCE_LABELS[source]}
  </span>
);

export default SourceTag;
