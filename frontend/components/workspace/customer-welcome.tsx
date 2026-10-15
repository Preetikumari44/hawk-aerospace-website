"use client";

import { ArrowRightIcon, PlaneTakeoffIcon } from "lucide-react";
import Link from "next/link";

import { AerialScene } from "@/components/visuals/aerial-scene";
import { Button } from "@/components/ui/button";
import { useBookingAuth } from "@/lib/booking/auth-context";

// Welcome banner for the customer workspace. Greets by the phone number
// already held in the auth context — no profile data is invented.
export function CustomerWelcome() {
  const { user } = useBookingAuth();

  return (
    <section className="hawk-forest relative isolate overflow-hidden rounded-3xl border border-white/10 shadow-lg">
      <div aria-hidden className="absolute inset-0 -z-20 opacity-90">
        <AerialScene variant="terrain" />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(100deg, rgba(11,36,24,0.95) 0%, rgba(14,42,29,0.88) 45%, rgba(12,58,42,0.55) 100%)",
        }}
      />
      <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-brand text-xs font-semibold tracking-[0.2em] uppercase">
            Customer Workspace
          </span>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            Welcome back{user?.phone ? "," : ""}{" "}
            {user?.phone && <span className="text-[#cfe2d3]">{user.phone}</span>}
          </h1>
          <p className="max-w-[540px] text-[15px] leading-relaxed text-[#b9cfbe]">
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
