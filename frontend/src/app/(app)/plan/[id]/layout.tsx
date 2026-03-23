"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
import { usePlan } from "@/hooks/use-spending-plan";
import Link from "next/link";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function PlanTab({
  href,
  children,
  exact,
}: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`px-4 py-2.5 text-sm font-sans font-medium border-b-2 transition-colors ${
        isActive
          ? "border-[var(--color-orange)] text-[var(--color-orange)]"
          : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
      }`}
    >
      {children}
    </Link>
  );
}

export default function PlanLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: planId } = use(params);
  const { data: plan } = usePlan(planId);

  const planTitle = plan
    ? `${MONTH_NAMES[plan.month - 1]} ${plan.year}`
    : "Loading…";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-sans text-gray-500 mb-4 no-print">
        <Link href="/dashboard" className="hover:text-gray-800 transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">{planTitle}</span>
      </div>

      {/* Plan Tab Navigation */}
      <div className="border-b border-gray-200 mb-6 no-print">
        <div className="flex gap-1">
          <PlanTab href={`/plan/${planId}`} exact>
            Plan
          </PlanTab>
          <PlanTab href={`/plan/${planId}/import`}>
            Transactions
          </PlanTab>
          <PlanTab href={`/plan/${planId}/preview`}>
            Preview &amp; Export
          </PlanTab>
        </div>
      </div>

      {children}
    </div>
  );
}
