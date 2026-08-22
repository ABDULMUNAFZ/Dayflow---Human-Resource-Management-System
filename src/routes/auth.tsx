import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sun, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  validateSearch: (search): { redirect?: string | undefined } => ({ redirect: (search["redirect"] as string) || undefined }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — Dayflow HR" },
      { name: "description", content: "Sign in to Dayflow — the human resource management system for every perfectly aligned workday." },
      { property: "og:title", content: "Sign in — Dayflow HR" },
      { property: "og:description", content: "Sign in to Dayflow — the human resource management system for every perfectly aligned workday." },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        opacity=".7"
      />
      <path
        fill="currentColor"
        d="M5.84 14.1a7.16 7.16 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
        opacity=".5"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.96 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
        opacity=".9"
      />
    </svg>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const redirectTo = search["redirect"];
  const navigate = useNavigate();
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<null | "in" | "google">(null);
  const [showPassword, setShowPassword] = useState(false);

  const afterAuth = () => {
    const safe = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard";
    navigate({ to: safe, replace: true });
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginInput.trim() === "" || password.length < 6) {
      toast.error("Enter a valid Login ID/email and a password of at least 6 characters.");
      return;
    }
    setLoading("in");
    
    try {
      let emailToUse = loginInput.trim();
      
      // If it doesn't contain '@', it is a Login ID. Resolve it to an email!
      if (!emailToUse.includes("@")) {
        const { resolveLoginId } = await import("@/lib/employees.functions");
        const { email: resolvedEmail } = await resolveLoginId({ data: { loginId: emailToUse } });
        if (!resolvedEmail) {
          throw new Error("Invalid Login ID or email.");
        }
        emailToUse = resolvedEmail;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Welcome back.");
      afterAuth();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(null);
    }
  };

  const google = async () => {
    setLoading("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth",
      },
    });
    if (error) {
      setLoading(null);
      toast.error(error.message);
      return;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-grid bg-grid-mask p-4">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-hero-glow" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-glow-lg backdrop-blur-xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent shadow-glow">
              <Sun className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold tracking-tight">Dayflow</h1>
              <p className="text-xs text-muted-foreground">Every workday, perfectly aligned.</p>
            </div>
          </div>

          <form onSubmit={signIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-input">Login ID or Email</Label>
              <Input
                id="login-input"
                type="text"
                placeholder="OIJODO20220001 or you@company.com"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                required
                className="bg-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password-in">Password</Label>
                <button
                  type="button"
                  onClick={() => toast.info("Contact your HR administrator to reset your password.")}
                  className="text-xs text-accent hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password-in"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-secondary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading !== null}>
              {loading === "in" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="mt-4 border-t border-border/50 pt-4">
            <p className="text-xs text-muted-foreground mb-2 text-center font-display font-medium">Quick Demo Login</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setLoginInput("DFAD20260001");
                  setPassword("password");
                }}
              >
                Admin User
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setLoginInput("DFEM20260001");
                  setPassword("password");
                }}
              >
                John Doe
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setLoginInput("DFJOHN20260001");
                  setPassword("password");
                }}
              >
                John
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setLoginInput("DFABDU20260001");
                  setPassword("password");
                }}
              >
                Abdul
              </Button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground border-t border-border pt-4">
            Employee accounts are created by your HR administrator.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
