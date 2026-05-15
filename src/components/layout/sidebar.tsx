"use client";

import { useAppLocale } from "@/components/app-locale-provider";
import { useAuth } from "@/components/auth-provider";
import { TourCelebration } from "@/components/tour/tour-celebration";
import { TourOverlay } from "@/components/tour/tour-overlay";
import { TourProvider } from "@/components/tour/tour-provider";
import { TourWelcome } from "@/components/tour/tour-welcome";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
    ArrowUpRight,
    ChevronUp,
    FolderKanban,
    Gauge,
    HelpCircle,
    LayoutDashboard,
    LifeBuoy,
    Loader2,
    LogOut,
    MessageSquare,
    Monitor,
    Moon,
    Palette,
    PanelLeftClose,
    PanelLeftOpen,
    PlayCircle,
    Settings,
    Sun
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Header } from "./header";
import { SupportDrawer } from "./support-drawer";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useAppLocale();

  const options = [
    { value: "light", icon: Sun, label: t("common.light") },
    { value: "dark", icon: Moon, label: t("common.dark") },
    { value: "system", icon: Monitor, label: t("common.system") },
  ] as const;

  return (
    <div className="flex items-center justify-between px-2 py-1.5 text-sm">
      <span className="flex items-center gap-2">
        <Palette className="h-4 w-4" />
        {t("sidebar.theme")}
      </span>
      <div className="flex items-center gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTheme(opt.value);
            }}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              theme === opt.value
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <opt.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  suffix,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  collapsed: boolean;
  suffix?: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigating = isPending && !active;

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (active) return;
        e.preventDefault();
        startTransition(() => {
          router.push(href);
        });
      }}
      className={cn(
        "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-normal transition-colors",
        active
          ? "bg-[#EEF2FF] text-[#3B6FF0]"
          : "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/10",
      )}
    >
      {navigating ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : (
        <Icon className="h-4 w-4 shrink-0" />
      )}
      {!collapsed &&
        (suffix ? (
          <>
            <span className="flex-1">{label}</span>
            {suffix}
          </>
        ) : (
          label
        ))}
    </Link>
  );
}

export function Sidebar({
  collapsed,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const { t } = useAppLocale();

  const projectNavigation = [
    { name: t("sidebar.dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("sidebar.interviews"), href: "/interviews", icon: MessageSquare },
    { name: t("sidebar.sessions"), href: "/candidates", icon: PlayCircle },
    { name: t("sidebar.questions"), href: "/questions", icon: HelpCircle },
  ];

  const displayName = profile?.name || user?.email?.split("@")[0] || "User";
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  const isOrgLevelPage =
    pathname.startsWith("/organizations") ||
    pathname.startsWith("/org/") ||
    pathname.startsWith("/usage");

  const isSettingsActive = pathname.startsWith("/settings");

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar transition-all duration-200",
        collapsed ? "w-16" : "w-[240px]",
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <Link
          href="/organizations"
          className="flex items-center overflow-hidden"
          aria-label="Parker home"
        >
          {!collapsed ? (
            <img
              src="/images/marketing/parker-logo.png"
              alt="Parker"
              height={28}
              className="h-7 w-auto max-w-[200px] object-contain object-left"
            />
          ) : (
            <img
              src="/images/marketing/parker-icon.png"
              alt="Parker"
              height={28}
              width={28}
              className="h-7 w-7 object-contain"
            />
          )}
        </Link>
      </div>

      {isOrgLevelPage ? (
        <>
          {/* Org-level nav */}
          <nav className="flex-1 space-y-0.5 px-3 pb-3 pt-2">
            <SidebarLink
              href="/organizations"
              icon={FolderKanban}
              label={t("sidebar.organizations")}
              active={pathname.startsWith("/organizations")}
              collapsed={collapsed}
            />
          </nav>

          {/* Bottom section: Support */}
          <div className="space-y-0.5 px-3 pb-2 pt-2">
            <button
              onClick={() => setSupportOpen(true)}
              className={cn(
                "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-normal transition-colors",
                "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/10",
              )}
            >
              <LifeBuoy className="h-4 w-4 shrink-0" />
              {!collapsed && t("sidebar.support")}
            </button>
            <SidebarLink
              href="/usage"
              icon={Gauge}
              label={t("sidebar.usage")}
              active={pathname.startsWith("/usage")}
              collapsed={collapsed}
            />
          </div>
        </>
      ) : (
        <>
          {/* Navigation */}
          <nav className="flex-1 space-y-0.5 px-3 pt-2">
            {projectNavigation.map((item) => (
              <SidebarLink
                key={item.name}
                href={item.href}
                icon={item.icon}
                label={item.name}
                active={pathname.startsWith(item.href)}
                collapsed={collapsed}
              />
            ))}
          </nav>

          {/* Bottom section: Settings + Support */}
          <div className="space-y-0.5 px-3 pb-2 pt-2">
            <SidebarLink
              href="/settings"
              icon={Settings}
              label={t("sidebar.projectSettings")}
              active={isSettingsActive}
              collapsed={collapsed}
            />
            <button
              onClick={() => setSupportOpen(true)}
              className={cn(
                "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-normal transition-colors",
                "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/10",
              )}
            >
              <LifeBuoy className="h-4 w-4 shrink-0" />
              {!collapsed && t("sidebar.support")}
            </button>
            <SidebarLink
              href="/usage"
              icon={Gauge}
              label={t("sidebar.usage")}
              active={pathname.startsWith("/usage")}
              collapsed={collapsed}
              suffix={
                <ArrowUpRight
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    pathname.startsWith("/usage")
                      ? "text-[#3B6FF0]"
                      : "text-muted-foreground",
                  )}
                />
              }
            />
          </div>
        </>
      )}

      <SupportDrawer open={supportOpen} onOpenChange={setSupportOpen} />

      {/* User profile */}
      <div className="border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-black/[0.04] dark:hover:bg-white/10",
                collapsed && "justify-center px-0",
              )}
            >
              <Avatar className="h-8 w-8 shrink-0 rounded-md">
                <AvatarImage src={profile?.avatar ?? undefined} />
                <AvatarFallback className="text-xs rounded-md">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <span className="truncate font-normal text-foreground">
                      {displayName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email ?? ""}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <Avatar className="h-7 w-7 shrink-0 rounded-md">
                <AvatarImage src={profile?.avatar ?? undefined} />
                <AvatarFallback className="text-[10px] rounded-md">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-medium text-foreground">
                  {displayName}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {user?.email ?? ""}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t("sidebar.accountSettings")}
              </Link>
            </DropdownMenuItem>
            <ThemeToggle />
            <DropdownMenuItem
              className="flex items-center gap-2 text-destructive"
              disabled={signingOut}
              onSelect={async (e) => {
                e.preventDefault();
                setSigningOut(true);
                const supabase = createClient();
                try {
                  await supabase.auth.signOut();
                } catch {
                  // Session may have expired; clear local state instead
                  await supabase.auth
                    .signOut({ scope: "local" })
                    .catch(() => {});
                }
                window.location.href = "/login";
              }}
            >
              {signingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {signingOut ? t("sidebar.signingOut") : t("sidebar.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

export function SidebarToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useAppLocale();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
      aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
    >
      {collapsed ? (
        <PanelLeftOpen className="h-4 w-4" />
      ) : (
        <PanelLeftClose className="h-4 w-4" />
      )}
    </Button>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TourProvider>
      <div className="dashboard-shell flex h-screen overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <Header
            sidebarToggle={
              <SidebarToggle
                collapsed={collapsed}
                onToggle={() => setCollapsed(!collapsed)}
              />
            }
          />
          <main className="code-scrollbar flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1200px] px-8 py-8">{children}</div>
          </main>
        </div>
      </div>
      <TourOverlay />
      <TourWelcome />
      <TourCelebration />
    </TourProvider>
  );
}
