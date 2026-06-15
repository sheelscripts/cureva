import React from "react";

interface SectionLabelProps {
  text: string;
}

export default function SectionLabel({ text }: SectionLabelProps) {
  return (
    <span className="text-[10px] font-sans font-semibold tracking-wider text-text-tertiary uppercase block">
      {text}
    </span>
  );
}
