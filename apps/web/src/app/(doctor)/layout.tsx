import LayoutShell from "../LayoutShell";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return <LayoutShell role="doctor">{children}</LayoutShell>;
}
