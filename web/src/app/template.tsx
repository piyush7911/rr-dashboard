"use client"
// Re-mounts on every navigation: a short fade-and-rise so pages never snap in.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>
}
