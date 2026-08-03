"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { SessionGuard } from "@/components/auth/session-guard";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({
  href,
  children,
  dataTour,
}: {
  href: string;
  children: React.ReactNode;
  dataTour?: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      data-tour={dataTour}
      className={`text-sm font-sans px-3 py-2 rounded-md transition-colors shrink-0 whitespace-nowrap ${
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
      <SessionGuard />
      <div className="h-screen bg-[var(--color-cream)] flex flex-col">
        {/* Top Navigation */}
        <nav className="bg-[var(--color-dark-teal)] text-white no-print shrink-0">
          <div className="w-full px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between">
            {/* Left: Logo + Nav Links.
                min-w-0 + overflow-x-auto keeps the links scrolling within the
                bar on narrow screens instead of widening the whole page. */}
            <div className="flex items-center gap-2 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Link
                href="/plans"
                className="font-display text-lg font-bold hover:opacity-80 transition-opacity mr-3 shrink-0"
              >
                CSP
              </Link>
              <NavLink href="/plans">Plans</NavLink>
              <NavLink href="/dashboard" dataTour="nav-dashboard">Dashboard</NavLink>
              <NavLink href="/budget" dataTour="nav-budget">Budget</NavLink>
              <NavLink href="/help" dataTour="nav-help">Help</NavLink>
            </div>

            {/* Right: User + Sign Out */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/profile"
                className="text-sm text-white/70 hover:text-white font-sans hidden sm:block transition-colors"
              >
                {session?.user?.name?.split(" ")[0] || session?.user?.email}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-sm font-sans text-white/70 hover:text-white transition-colors py-2 px-1"
              >
                Sign out
              </button>
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-10 py-6 sm:py-8 overflow-y-auto">{children}</main>
      </div>
    </AuthGuard>
  );
}
