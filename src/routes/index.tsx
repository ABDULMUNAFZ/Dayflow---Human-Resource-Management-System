import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CalendarOff,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sun,
  Users,
  Wallet,
} from "lucide-react";

import heroImage from "@/assets/hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dayflow — Human Resource Management, Perfectly Aligned" },
      {
        name: "description",
        content:
          "Dayflow digitizes attendance, leave, payroll, and people operations in one premium HR platform. Every workday, perfectly aligned.",
      },
      { property: "og:title", content: "Dayflow — Human Resource Management, Perfectly Aligned" },
      {
        property: "og:description",
        content:
          "Dayflow digitizes attendance, leave, payroll, and people operations in one premium HR platform. Every workday, perfectly aligned.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Clock,
    title: "Attendance that runs itself",
    text: "One-tap check-in and check-out with automatic duration, status detection, and live team presence.",
  },
  {
    icon: CalendarOff,
    title: "Leave without the paperwork",
    text: "Employees apply in seconds. HR approves in one click. Calendars and balances stay in sync automatically.",
  },
  {
    icon: Wallet,
    title: "Payroll, crystal clear",
    text: "Salary structures, monthly payslips, history, and full compensation visibility for every employee.",
  },
  {
    icon: BarChart3,
    title: "Analytics that answer back",
    text: "Workforce trends, attendance rates, and salary distribution — visualized and always current.",
  },
  {
    icon: Users,
    title: "One source of people truth",
    text: "Profiles, documents, managers, and departments unified in a searchable, editable directory.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based by design",
    text: "Admin, HR, and Employee roles with server-enforced policies on every table and every action.",
  },
];

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

function Landing() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => setAuthed(!!data?.user));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-hero-glow" />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent shadow-glow-sm">
            <Sun className="h-4.5 w-4.5 text-accent-foreground" />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight">Dayflow</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">Platform</a>
          <a href="#product" className="transition-colors hover:text-foreground">Product</a>
        </nav>
        <Button
          onClick={() => navigate({ to: authed ? "/dashboard" : "/auth" })}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {authed ? "Open dashboard" : "Sign in"}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-12 text-center md:pt-20">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid bg-grid-mask" />
        <motion.p
          {...fade}
          transition={{ duration: 0.5 }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/5 px-4 py-1.5 text-xs font-semibold tracking-widest text-accent"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          HUMAN RESOURCE MANAGEMENT SYSTEM
        </motion.p>
        <motion.h1
          {...fade}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="font-display text-5xl font-extrabold leading-[1.04] tracking-tight md:text-7xl"
        >
          Every workday,
          <br />
          <span className="text-gradient-accent">perfectly aligned.</span>
        </motion.h1>
        <motion.p
          {...fade}
          transition={{ duration: 0.6, delay: 0.16 }}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
        >
          Dayflow brings attendance, leave, payroll, and people operations into one calm, fast, beautifully
          organized system — so HR teams and employees stay in sync, every day.
        </motion.p>
        <motion.div {...fade} transition={{ duration: 0.6, delay: 0.24 }} className="mt-9 flex items-center justify-center gap-3">
          <Button
            size="lg"
            onClick={() => navigate({ to: authed ? "/dashboard" : "/auth" })}
            className="bg-accent px-7 text-accent-foreground shadow-glow hover:bg-accent/90"
          >
            Get started <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" asChild className="px-7">
            <a href="#features">Explore the platform</a>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-16 max-w-4xl"
        >
          <div className="overflow-hidden rounded-2xl border border-border shadow-glow-lg">
            <img src={heroImage} alt="Dayflow HR dashboard showing attendance, leave, and payroll at a glance" className="w-full" />
          </div>
          <div aria-hidden className="absolute -inset-x-8 -bottom-10 top-1/2 -z-10 rounded-[40px] bg-accent/10 blur-3xl" />
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <motion.div {...fade} transition={{ duration: 0.5 }} className="mb-12 max-w-2xl">
          <p className="mb-3 text-xs font-semibold tracking-widest text-accent">THE PLATFORM</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Everything HR, in one flow
          </h2>
          <p className="mt-3 text-muted-foreground">
            Six tightly integrated modules replace a tangle of spreadsheets, email threads, and disconnected tools.
          </p>
        </motion.div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fade}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-glow"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-transform duration-300 group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats / closing */}
      <section id="product" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <motion.div {...fade} transition={{ duration: 0.5 }}>
            <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
              Ready to align your team?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Sign in to explore a fully seeded workspace — attendance, leave, payroll, analytics, and reports included.
            </p>
            <Button
              size="lg"
              onClick={() => navigate({ to: "/auth" })}
              className="mt-8 bg-accent px-8 text-accent-foreground shadow-glow hover:bg-accent/90"
            >
              Sign in to Dayflow <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <div className="mx-auto mt-12 flex max-w-lg flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {["Server-enforced RBAC", "Live notifications", "CSV reports", "Dark & light themes"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" /> {t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent">
              <Sun className="h-3 w-3 text-accent-foreground" />
            </div>
            <span className="font-display font-bold text-foreground">Dayflow</span>
          </div>
          <span>Every workday, perfectly aligned.</span>
        </div>
      </footer>
    </div>
  );
}
