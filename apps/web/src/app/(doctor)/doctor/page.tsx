"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const DoctorWorkspace = dynamic(() => import("@/features/doctor/DoctorWorkspace"), {
  ssr: false,
});

function DoctorWorkspaceContent() {
  const searchParams = useSearchParams();
  const currentSubView = searchParams.get("view") || "home";

  return <DoctorWorkspace currentSubView={currentSubView} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-bg-base" />}>
      <DoctorWorkspaceContent />
    </Suspense>
  );
}
