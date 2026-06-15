"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";

const PatientPortal = dynamic(() => import("@/features/patients/components/PatientPortal"), {
  ssr: false,
});

function PatientPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSubView = searchParams.get("view") || "triage";

  return (
    <PatientPortal
      currentSubView={currentSubView}
      onNavigateToView={(view) => {
        router.push(`/patient?view=${view}`);
      }}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-bg-base" />}>
      <PatientPortalContent />
    </Suspense>
  );
}
