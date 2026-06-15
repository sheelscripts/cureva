import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-base text-text-primary p-6">
      <h2 className="text-xl font-bold uppercase tracking-widest font-mono">404 - Clinical Path Not Found</h2>
      <p className="text-xs text-text-secondary mt-2">The requested operational view could not be retrieved.</p>
      <Link href="/" className="mt-4 px-4 py-2 bg-text-primary text-bg-base text-xs font-semibold rounded-sm hover:opacity-90 transition-all">
        Return Home
      </Link>
    </div>
  );
}
