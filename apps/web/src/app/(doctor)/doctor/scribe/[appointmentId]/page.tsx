"use client";

import dynamic from "next/dynamic";

const DoctorWorkspace = dynamic(() => import("@/features/doctor/DoctorWorkspace"), {
  ssr: false,
});

export default function Page() {
  return <DoctorWorkspace currentSubView="scribe" />;
}
