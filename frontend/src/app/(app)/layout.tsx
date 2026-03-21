"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`text-sm font-sans px-3 py-1.5 rounded-md transition-colors ${
        isActive
          ? "bg-white/20 text-white font-medium"
          : "text-white/70 hover:text-white hover:bg-white/10"
      }`}
    >
      {children}
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[var(--color-cream)]">
        {/* Top Navigation */}
        <nav className="bg-[var(--color-dark-teal)] text-white no-print">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Left: Logo + Nav Links */}
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="font-display text-lg font-bold hover:opacity-80 transition-opacity mr-3"
              >
                CSP
              </Link>
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/settings/mappings">Category Rules</NavLink>
            </div>

            {/* Right: User + Sign Out */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/70 font-sans hidden sm:block">
                {session?.user?.name || session?.user?.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-sm font-sans text-white/70 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </div>
    </AuthGuard>
  );
}
