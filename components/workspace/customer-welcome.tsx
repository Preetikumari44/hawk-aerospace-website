"use client";

import { ArrowRightIcon, PlaneTakeoffIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useBookingAuth } from "@/lib/booking/auth-context";

// Welcome banner for the customer workspace (hawk-sage working area).
// Light Corrected card — greets by the phone number already held in the
// auth context, no profile data is invented.
export function CustomerWelcome() {
  const { user } = useBookingAuth();

  return (
    <section className="border-border bg-card rounded-3xl border p-6 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col gap-5 sm:p-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-brand text-xs font-semibold tracking-[0.2em] uppercase">
            Customer Workspace
          </span>
          <h1 className="text-foreground text-2xl font-semibold sm:text-3xl">
            Welcome back{user?.phone ? "," : ""}{" "}
            {user?.phone && <span>{user.phone}</span>}
          </h1>
          <p className="text-muted-foreground max-w-[540px] text-[15px] leading-relaxed">
            Book aerial services, follow every mission live, and review the
            status of your past operations.
          </p>
        </div>
        <Button size="lg" asChild className="h-12 shrink-0 px-6 text-base">
          <Link href="/#booking">
            <PlaneTakeoffIcon className="size-4" />
            Book a Raider
            <ArrowRightIcon className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
