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
      <div className="h-screen bg-[var(--color-cream)] flex flex-col">
        {/* Top Navigation */}
        <nav className="bg-[var(--color-dark-teal)] text-white no-print shrink-0">
          <div className="w-full px-6 lg:px-10 py-3 flex items-center justify-between">
            {/* Left: Logo + Nav Links */}
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="font-display text-lg font-bold hover:opacity-80 transition-opacity mr-3"
              >
                CSP
              </Link>
              <NavLink href="/dashboard">Dashboard</NavLink>
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
        <main className="flex-1 w-full px-6 lg:px-10 py-8 overflow-y-auto">{children}</main>
      </div>
    </AuthGuard>
  );
}
