import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-dim pb-4 mb-6 select-none">
      <div className="space-y-1">
        <h1 className="text-xl font-display font-bold text-text-primary tracking-tight uppercase">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-text-secondary font-mono tracking-wide">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
