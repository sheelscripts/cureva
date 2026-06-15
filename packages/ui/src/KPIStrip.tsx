import React from "react";

interface KPIStripProps {
  children: React.ReactNode;
}

export default function KPIStrip({ children }: KPIStripProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 select-none">
      {children}
    </div>
  );
}
