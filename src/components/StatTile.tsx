import Icon, { type IconName } from "./Icon";

type StatTileProps = {
  label: string;
  value: string;
  detail?: string;
  icon: IconName;
};

/**
 * One headline number. Renders a `<div>` and expects to sit inside a `<dl>` —
 * a stat is a term and its definition, and a KPI row is a description list.
 *
 * Deliberately not a one-bar chart: a single current value is a number, and a
 * bar next to nothing else to compare it against encodes no information.
 */
const StatTile = ({ label, value, detail, icon }: StatTileProps) => (
  <div className="rounded-lg border border-divider bg-raised p-4">
    <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted">
      <Icon name={icon} className="h-4 w-4 text-faint" />
      {label}
    </dt>
    <dd className="mt-2 font-display text-3xl leading-none text-foreground">{value}</dd>
    {detail && <dd className="mt-1.5 text-sm text-muted">{detail}</dd>}
  </div>
);

export default StatTile;
