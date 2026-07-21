import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { enUS, es, fr, ja, ko, zhCN } from "react-day-picker/locale";
import type { UiLang } from "@/contexts/AppLanguageContext";
import { Calendar } from "@/components/ui/calendar";
import "./StrategyReportDateControl.css";

const calendarLocales = { en: enUS, zh: zhCN, ja, ko, es, fr };

function getRangeSeparator(uiLang: UiLang) {
  return uiLang === "zh" ? "至" : uiLang === "en" ? "to" : "–";
}

export function localizeDateRangeLabel(label: string, uiLang: UiLang) {
  const separator = getRangeSeparator(uiLang);
  return label.replace(
    /(\d{4}-\d{2}-\d{2})\s+(?:–|—|to|至)\s+(\d{4}-\d{2}-\d{2})/,
    `$1 ${separator} $2`
  );
}

function formatDate(date?: Date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function StrategyReportDateControl({
  dateLabel,
  dateOptions,
  customDateOption,
  uiLang,
  labels,
  variant = "default",
  triggerMode = "default",
  iconOnly = false,
  onSelectionChange,
}: {
  dateLabel: string;
  dateOptions?: string[];
  customDateOption?: string;
  uiLang: UiLang;
  labels: {
    selectPeriod: string;
    customRange: string;
    startDate: string;
    endDate: string;
    switchPeriod?: string;
  };
  variant?: "default" | "compact";
  triggerMode?: "default" | "switch";
  iconOnly?: boolean;
  onSelectionChange?: (label: string) => void;
}) {
  const options = Array.from(new Set(dateOptions && dateOptions.length > 0
    ? dateOptions
    : [dateLabel, "2021-01-01_2021-12-31", "2022-01-01_2022-12-31", "2023-01-01_2023-12-31"]));
  const [selectedLabel, setSelectedLabel] = useState(dateLabel);
  const [customRange, setCustomRange] = useState<DateRange>();
  const [draftRange, setDraftRange] = useState<DateRange>();
  const [activeField, setActiveField] = useState<"from" | "to">("from");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isCustomRange = selectedLabel === customDateOption;
  const visibleRange = isCalendarOpen ? draftRange : customRange;
  const visibleStartDate = visibleRange?.from ? formatDate(visibleRange.from) : labels.startDate;
  const visibleEndDate = visibleRange?.to ? formatDate(visibleRange.to) : labels.endDate;
  const rangeSeparator = getRangeSeparator(uiLang);
  const selectedDisplay = isCustomRange
    ? `${visibleStartDate} ${rangeSeparator} ${visibleEndDate}`
    : localizeDateRangeLabel(selectedLabel, uiLang);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 700px)");
    const updateSize = () => setIsCompact(mediaQuery.matches);
    updateSize();
    mediaQuery.addEventListener("change", updateSize);
    return () => mediaQuery.removeEventListener("change", updateSize);
  }, []);

  const closeOverlays = () => {
    setIsMenuOpen(false);
    setIsCalendarOpen(false);
  };

  const openCalendar = () => {
    setDraftRange(customRange);
    setActiveField("from");
    setIsMenuOpen(false);
    setIsCalendarOpen(true);
  };

  return (
    <div
      className={`oq-report-date-select oq-report-date-select--${variant} oq-report-date-select--${triggerMode}${iconOnly ? " oq-report-date-select--icon-only" : ""}`}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeOverlays();
      }}
      onKeyDown={event => {
        if (event.key === "Escape") {
          closeOverlays();
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isMenuOpen || isCalendarOpen}
        aria-label={triggerMode === "switch"
          ? `${labels.switchPeriod ?? labels.selectPeriod}: ${selectedDisplay}`
          : selectedDisplay}
        onClick={() => {
          setIsCalendarOpen(false);
          setIsMenuOpen(previous => !previous);
        }}
      >
        {triggerMode === "switch" && !iconOnly ? (
          <span className="oq-report-date-switch-label">{labels.switchPeriod ?? labels.selectPeriod}</span>
        ) : triggerMode === "default" ? (
          <span
            className={`oq-report-date-trigger-label${isCustomRange ? " is-custom-range" : ""}`}
            aria-live={isCustomRange ? "polite" : undefined}
          >
            <CalendarDays aria-hidden="true" />
            {isCustomRange ? (
              <>
                <span className="oq-report-date-trigger-value">{visibleStartDate}</span>
                <span className="oq-report-date-trigger-separator" aria-hidden="true">{rangeSeparator}</span>
                <span className="oq-report-date-trigger-value">{visibleEndDate}</span>
              </>
            ) : (
              <span className="oq-report-date-trigger-value">{selectedDisplay}</span>
            )}
          </span>
        ) : null}
        <ChevronDown aria-hidden="true" className="oq-report-date-chevron" />
      </button>

      {isMenuOpen ? (
        <div className="oq-report-date-menu" role="listbox" aria-label={labels.selectPeriod}>
          {options.map(option => (
            <button
              type="button"
              role="option"
              aria-selected={selectedLabel === option}
              key={option}
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                setSelectedLabel(option);
                if (option === customDateOption) openCalendar();
                else {
                  onSelectionChange?.(option);
                  closeOverlays();
                }
              }}
            >
              <span>{option}</span>
              {selectedLabel === option ? <Check aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}

      {isCalendarOpen ? (
        <div className="oq-report-date-calendar-panel" role="dialog" aria-label={labels.customRange}>
          <Calendar
            mode="range"
            selected={draftRange}
            onDayClick={day => {
              const from = draftRange?.from;
              if (activeField === "from" || !from || day.getTime() <= from.getTime()) {
                setDraftRange({ from: day });
                setActiveField("to");
                return;
              }
              const range = { from, to: day };
              setDraftRange(range);
              setCustomRange(range);
              setSelectedLabel(customDateOption ?? selectedLabel);
              onSelectionChange?.(`${formatDate(from)} ${rangeSeparator} ${formatDate(day)}`);
              setIsCalendarOpen(false);
              requestAnimationFrame(() => triggerRef.current?.focus());
            }}
            defaultMonth={draftRange?.from ?? customRange?.from}
            numberOfMonths={isCompact ? 1 : 2}
            pagedNavigation={!isCompact}
            min={1}
            locale={calendarLocales[uiLang]}
            autoFocus
            className="oq-report-range-calendar"
          />
        </div>
      ) : null}
    </div>
  );
}
