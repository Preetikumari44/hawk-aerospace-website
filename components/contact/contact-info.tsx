import { Briefcase, Mail, Package, Phone } from "lucide-react";
import type { ComponentType } from "react";

import { contactDetails } from "@/lib/contact/details";

// Contact-details card shown beside the form. The supplied contact-info.tsx was empty, so this is rebuilt from the
// Contact app README: email, phone, suppliers/vendors and job-opportunities blocks, using only contactDetails.
function Row({
  icon: Icon,
  title,
  href,
  children,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  title: string;
  href: string;
  children: string;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-foreground text-sm font-semibold">{title}</p>
        <a
          href={href}
          className="text-muted-foreground hover:text-primary focus-visible:ring-ring text-[15px] break-words underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-hidden"
        >
          {children}
        </a>
      </div>
    </li>
  );
}

export default function ContactInfo() {
  return (
    <aside
      aria-labelledby="contact-details-heading"
      className="border-border bg-card rounded-3xl border p-6 shadow-[0_1px_2px_rgba(11,36,24,0.04),0_24px_60px_-28px_rgba(11,36,24,0.35)] sm:p-8"
    >
      <h2 id="contact-details-heading" className="text-foreground text-xl font-semibold tracking-tight">
        Contact Details
      </h2>
      <ul className="mt-6 flex flex-col gap-6">
        <Row icon={Mail} title="Email" href={`mailto:${contactDetails.email}`}>
          {contactDetails.email}
        </Row>
        <Row icon={Phone} title="Phone / WhatsApp" href={contactDetails.phoneHref}>
          {contactDetails.phone}
        </Row>
        <Row icon={Package} title={contactDetails.suppliers.title} href={`mailto:${contactDetails.suppliers.email}`}>
          {contactDetails.suppliers.email}
        </Row>
        <Row icon={Briefcase} title={contactDetails.jobs.title} href={`mailto:${contactDetails.jobs.email}`}>
          {contactDetails.jobs.email}
        </Row>
      </ul>
    </aside>
  );
}
