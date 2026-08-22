import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  CalendarOff,
  Check,
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AvatarStack, PageLoader, RoleBadge, StatusPill } from "@/components/ui/bits";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, staffOnly: false },
  { to: "/attendance", label: "Attendance", icon: Clock, staffOnly: false },
  { to: "/leave", label: "Leave", icon: CalendarOff, staffOnly: false },
  { to: "/employees", label: "Employees", icon: Users, staffOnly: true },
  { to: "/payroll", label: "Payroll", icon: Wallet, staffOnly: false },
  { to: "/analytics", label: "Analytics", icon: BarChart3, staffOnly: true },
  { to: "/reports", label: "Reports", icon: FileText, staffOnly: true },
  { to: "/notifications", label: "Notifications", icon: Bell, staffOnly: false },
] as const;

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("dayflow-theme", theme);
    } catch {}
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, signOut } = useSession();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, toggle } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isStaff = session?.role === "admin" || session?.role === "hr";
  const navItems = NAV.filter((n) => !n.staffOnly || isStaff);

  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getMyNotifications(),
    refetchInterval: 30_000,
  });
  const unread = notifData?.unread ?? 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pathname = router.state.location.pathname;
  const crumbs = useMemo(() => pathname.split("/").filter(Boolean), [pathname]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const initials = (session.profile?.full_name ?? session.user.email ?? "D F")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        {/* Ambient glow */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-hero-glow" />

        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-border bg-card/60 backdrop-blur-xl lg:flex">
          <div className="flex h-16 items-center gap-3 border-b border-border px-5">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-glow-sm">
                <Sun className="h-4 w-4 text-accent-foreground" />
              </div>
              <span className="font-display text-lg font-extrabold tracking-tight">Dayflow</span>
            </Link>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link key={item.to} to={item.to} className="block">
                  <span
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-accent/10 text-accent shadow-inset-line"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 transition-transform duration-200", active ? "scale-110" : "group-hover:scale-105")} />
                    {item.label}
                    {item.to === "/notifications" && unread > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
              <Avatar className="h-9 w-9 border border-border">
                <AvatarImage src={session.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-accent/15 text-xs font-bold text-accent">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{session.profile?.full_name ?? session.user.email}</p>
                <RoleBadge role={session.role} className="mt-0.5" />
              </div>
            </div>
          </div>
        </aside>

        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:pl-[272px] lg:pr-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
            <LayoutDashboard className="h-5 w-5" />
          </Button>

          <div className="hidden items-center gap-1.5 text-sm text-muted-foreground md:flex">
            <span className="font-display font-semibold text-foreground">Dayflow</span>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5 capitalize">
                <span className="text-border">/</span>
                {c}
              </span>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground md:flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Quick actions</span>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
            </button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="h-[18px] w-[18px]" />
                  {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-accent" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[360px] p-0">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="font-display text-sm font-bold">Notifications</p>
                  <button
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-accent"
                    onClick={async () => {
                      await markAllNotificationsRead();
                      queryClient.invalidateQueries({ queryKey: ["notifications"] });
                    }}
                  >
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                </div>
                <ScrollArea className="h-[320px]">
                  {(notifData?.notifications ?? []).length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">All caught up.</p>
                  ) : (
                    (notifData?.notifications ?? []).slice(0, 8).map((n) => (
                      <button
                        key={n.id}
                        onClick={async () => {
                          if (!n.read) {
                            await markNotificationRead({ data: { id: n.id } });
                            queryClient.invalidateQueries({ queryKey: ["notifications"] });
                          }
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-secondary/50",
                          !n.read && "bg-accent/5",
                        )}
                      >
                        <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", n.read ? "bg-border" : "bg-accent")} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{n.title}</span>
                          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.message}</span>
                        </span>
                      </button>
                    ))
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
                  {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{theme === "dark" ? "Light mode" : "Dark mode"}</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border border-border transition-transform hover:scale-105">
                    <AvatarImage src={session.profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-accent/15 text-xs font-bold text-accent">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="font-display font-bold">{session.profile?.full_name ?? session.user.email}</span>
                  <span className="text-xs font-normal text-muted-foreground">{session.user.email}</span>
                  <RoleBadge role={session.role} className="mt-1 w-fit" />
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>Dashboard</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>My profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {
                    await signOut();
                    toast.success("Signed out. See you tomorrow.");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-card/90 px-2 py-2 backdrop-blur-xl lg:hidden">
          {navItems.slice(0, 5).map((item) => {
            const active = pathname === item.to;
            return (
              <Link key={item.to} to={item.to}>
                <span className={cn("flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-medium", active ? "text-accent" : "text-muted-foreground")}>
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <main className="px-4 pb-24 pt-6 lg:pl-[272px] lg:pr-8 lg:pb-10">{children}</main>

        {/* Command palette */}
        <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
          <CommandInput placeholder="Jump to a page or run an action…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigate">
              {navItems.map((item) => (
                <CommandItem
                  key={item.to}
                  onSelect={() => {
                    setPaletteOpen(false);
                    navigate({ to: item.to });
                  }}
                >
                  <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {item.label}
                </CommandItem>
              ))}
              <CommandItem
                onSelect={() => {
                  setPaletteOpen(false);
                  navigate({ to: "/profile" });
                }}
              >
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                My profile
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() => {
                  setPaletteOpen(false);
                  toggle();
                }}
              >
                {theme === "dark" ? <Sun className="mr-2 h-4 w-4 text-muted-foreground" /> : <Moon className="mr-2 h-4 w-4 text-muted-foreground" />}
                Toggle theme
              </CommandItem>
              <CommandItem
                onSelect={async () => {
                  setPaletteOpen(false);
                  await signOut();
                }}
              >
                <LogOut className="mr-2 h-4 w-4 text-muted-foreground" />
                Sign out
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>

        {/* Mobile nav sheet (simple overlay) */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-[280px] border-r border-border bg-card p-4">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                  <Sun className="h-4 w-4 text-accent-foreground" />
                </div>
                <span className="font-display text-lg font-extrabold">Dayflow</span>
              </div>
              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link key={item.to} to={item.to} onClick={() => setMobileNavOpen(false)} className="block">
                    <span className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export { PageLoader, StatusPill, AvatarStack };
