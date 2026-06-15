import LayoutShell from "../LayoutShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <LayoutShell role="admin">{children}</LayoutShell>;
}
