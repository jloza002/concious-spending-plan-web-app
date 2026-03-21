"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[var(--color-cream)]">
        {/* Navigation */}
        <nav className="bg-[var(--color-dark-teal)] text-white no-print">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link
              href="/dashboard"
              className="font-display text-lg font-bold hover:opacity-80 transition-opacity"
            >
              Conscious Spending Plan
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm opacity-75 font-sans">
                {session?.user?.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-white hover:bg-white/10"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </div>
    </AuthGuard>
  );
}
