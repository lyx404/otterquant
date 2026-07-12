import { useEffect, useState, type ReactNode, type RefObject } from "react";

export type ChartTooltipRow = {
  label: string;
  value: string;
  color?: string;
  active?: boolean;
};

export function ChartCard({
  title,
  subtitle,
  className = "",
  headerActions,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`oq-report-card ${className}`}>
      <header
        className={`oq-report-card-header ${headerActions ? "has-actions" : ""}`}
      >
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {headerActions}
      </header>
      <div className="oq-report-card-body">{children}</div>
    </section>
  );
}

export function ChartLegendItem({
  color,
  label,
  mark = "dot",
  active = true,
  pressed,
  onFocus,
  onHover,
  onLeave,
  onToggle,
}: {
  color: string;
  label: string;
  mark?: "dot" | "cross";
  active?: boolean;
  pressed?: boolean;
  onFocus?: () => void;
  onHover?: () => void;
  onLeave?: () => void;
  onToggle?: () => void;
}) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className={
          mark === "cross" ? "oq-report-cross-mark" : "oq-report-legend-dot"
        }
        style={{ color, background: mark === "dot" ? color : undefined }}
      >
        {mark === "cross" ? "x" : null}
      </span>
      <span>{label}</span>
    </>
  );

  if (onToggle || onHover || onFocus) {
    return (
      <button
        type="button"
        className="oq-report-legend-item is-interactive"
        aria-pressed={pressed}
        data-active={active}
        onClick={onToggle}
        onFocus={onFocus}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onBlur={onLeave}
      >
        {content}
      </button>
    );
  }

  return (
    <span className="oq-report-legend-item" data-active={active}>
      {content}
    </span>
  );
}

export function ChartTooltip({
  title,
  unit,
  rows,
}: {
  title: string;
  unit?: string;
  rows: ChartTooltipRow[];
}) {
  return (
    <div className="oq-chart-tooltip-card oq-dense-tooltip-card" role="status">
      <div className="oq-dense-tooltip-head">
        <span>{title || "--"}</span>
        {unit ? <em>{unit}</em> : null}
      </div>
      <div className="oq-dense-tooltip-list">
        {rows.map((row, index) => (
          <div
            className="oq-dense-tooltip-row"
            data-active={row.active}
            key={`${row.label}-${index}`}
          >
            <span className="oq-dense-tooltip-label">
              {row.color ? <i style={{ background: row.color }} /> : null}
              <span>{row.label}</span>
            </span>
            <strong>{row.value || "--"}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function useContainerNarrow<T extends HTMLElement>(
  ref: RefObject<T | null>,
  threshold: number,
  enabled = true
) {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled || typeof ResizeObserver === "undefined") {
      setIsNarrow(false);
      return;
    }

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = node.getBoundingClientRect().width < threshold;
        setIsNarrow(current => (current === next ? current : next));
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [enabled, ref, threshold]);

  return isNarrow;
}
