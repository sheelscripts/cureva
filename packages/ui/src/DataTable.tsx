import React from "react";

interface DataTableProps {
  headers: string[];
  children: React.ReactNode;
}

export default function DataTable({ headers, children }: DataTableProps) {
  return (
    <div className="w-full overflow-x-auto border border-border-dim rounded-sm bg-bg-surface">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border-dim bg-bg-subtle text-[10px] font-sans font-semibold tracking-wider text-text-secondary uppercase">
            {headers.map((h, idx) => (
              <th key={idx} className="p-3 sm:p-4">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-dim text-xs font-sans text-text-primary">
          {children}
        </tbody>
      </table>
    </div>
  );
}
