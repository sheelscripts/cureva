import React from "react";

export default function SkeletonCard() {
  return (
    <div className="p-5 bg-bg-surface border border-border-dim rounded-sm space-y-3">
      <div className="h-3 w-24 bg-bg-subtle rounded-sm animate-pulse" />
      <div className="h-8 w-36 bg-bg-subtle rounded-sm animate-pulse" />
      <div className="h-3 w-40 bg-bg-subtle rounded-sm animate-pulse" />
    </div>
  );
}
