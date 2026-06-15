"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";

const AdminDashboard = dynamic(() => import("@/features/admin/AdminDashboard"), {
  ssr: false,
});

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSubView = searchParams.get("view") || "admin-overview";

  return (
    <AdminDashboard
      currentSubView={currentSubView}
      onNavigateToView={(view) => {
        router.push(`/admin?view=${view}`);
      }}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-bg-base" />}>
      <AdminDashboardContent />
    </Suspense>
  );
}
