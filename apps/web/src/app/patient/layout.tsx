import LayoutShell from "../LayoutShell";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return <LayoutShell role="patient">{children}</LayoutShell>;
}
