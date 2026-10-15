import type { Metadata } from "next";

import ContactForm from "@/components/contact/contact-form";
import ContactInfo from "@/components/contact/contact-info";
import FooterSection from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact the Hawk Aerospace team - questions about drones, servicing or partnerships.",
};

export default function ContactPage() {
  return (
    <div className="hawk-theme bg-background text-foreground flex min-h-screen w-full flex-col">
      <Navbar />

      <main id="main" className="hawk-sand flex-1 pt-16 sm:pt-18">
        {/* Compact introduction */}
        <section aria-labelledby="contact-heading" className="px-4 pt-12 pb-8 sm:pt-16 sm:pb-10">
          <div className="max-w-container mx-auto">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Contact our team
            </p>
            <h1
              id="contact-heading"
              className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
            >
              Let&rsquo;s Talk.
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Have a question or a project in mind? We&rsquo;d love to hear from you.
            </p>
          </div>
        </section>

        {/* Form + contact details */}
        <section className="px-4 pb-16 sm:pb-24">
          <div className="max-w-container mx-auto grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="relative rounded-3xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(11,36,24,0.04),0_24px_60px_-28px_rgba(11,36,24,0.35)] sm:p-10">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Message Us</h2>
                <p className="mt-1.5 text-[15px] text-muted-foreground">
                  Reach out and we&rsquo;ll get back to you shortly.
                </p>
              </div>
              <ContactForm />
            </div>
            <ContactInfo />
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
