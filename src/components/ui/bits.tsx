import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="h-10 w-10 rounded-xl bg-accent shadow-glow"
          animate={{ rotate: [0, 90, 90, 180, 180, 270, 270, 360], scale: [1, 0.85, 1, 0.85, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <p className="font-display text-sm font-semibold tracking-widest text-muted-foreground">ALIGNING YOUR DAY…</p>
      </div>
    </div>
  );
}

const pillVariants: Record<string, string> = {
  accent: "border-accent/30 bg-accent/10 text-accent",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  neutral: "border-border bg-secondary text-muted-foreground",
  accentSoft: "border-accent-soft/40 bg-accent-soft/10 text-accent-soft",
};

export function StatusPill({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: (keyof typeof pillVariants) | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        pillVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function attendanceVariant(status: string): keyof typeof pillVariants {
  switch (status) {
    case "present":
      return "success";
    case "half_day":
      return "warning";
    case "leave":
      return "accentSoft";
    case "absent":
      return "destructive";
    default:
      return "neutral";
  }
}

export function leaveVariant(status: string): keyof typeof pillVariants {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "destructive";
    case "pending":
      return "warning";
    default:
      return "neutral";
  }
}

export function RoleBadge({ role, className }: { role: string; className?: string }) {
  const variant = role === "admin" ? "accent" : role === "hr" ? "accentSoft" : "neutral";
  return <StatusPill variant={variant} className={className}>{role}</StatusPill>;
}

export function AvatarStack({
  people,
  max = 4,
  className,
}: {
  people: { name: string; avatar?: string | null }[];
  max?: number;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className={cn("flex -space-x-2", className)}>
      {shown.map((p, i) => (
        <Avatar key={i} className="h-7 w-7 border-2 border-card">
          <AvatarImage src={p.avatar ?? undefined} />
          <AvatarFallback className="bg-secondary text-[10px] font-bold text-muted-foreground">
            {p.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
          </AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-accent text-[10px] font-bold text-accent-foreground">
          +{extra}
        </span>
      )}
    </div>
  );
}

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedNumber({ value, format }: { value: number; format?: ((n: number) => string) | undefined }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const from = 0;
    const duration = 800;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="font-data tabular-nums">{format ? format(display) : Math.round(display).toLocaleString()}</span>;
}
