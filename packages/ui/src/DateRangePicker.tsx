import React from "react";

interface DateRangePickerProps {
  options: string[];
  selected: string;
  onChange: (opt: string) => void;
}

export default function DateRangePicker({ options, selected, onChange }: DateRangePickerProps) {
  return (
    <div className="flex bg-bg-subtle p-1 rounded-sm border border-border-dim select-none">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`text-[10px] font-semibold py-1.5 px-3 uppercase rounded-sm transition-all duration-200 cursor-pointer ${
            selected === opt
              ? "bg-bg-surface text-accent font-bold shadow-xs border border-border-dim/40"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-base/30"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
