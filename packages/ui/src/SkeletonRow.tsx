import React from "react";

export default function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="p-4"><div className="h-4 w-12 bg-bg-subtle rounded-sm" /></td>
      <td className="p-4"><div className="h-4 w-28 bg-bg-subtle rounded-sm" /></td>
      <td className="p-4"><div className="h-4 w-20 bg-bg-subtle rounded-sm" /></td>
      <td className="p-4"><div className="h-4 w-16 bg-bg-subtle rounded-sm" /></td>
      <td className="p-4"><div className="h-4 w-16 bg-bg-subtle rounded-sm" /></td>
    </tr>
  );
}
