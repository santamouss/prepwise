"use client";

import { useAppLocale } from "@/components/app-locale-provider";
import { useAuth } from "@/components/auth-provider";
import { SupportDrawer } from "@/components/layout/support-drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { signOutAndRedirect } from "@/lib/auth/sign-out";
import { cn } from "@/lib/utils";
import {
  FolderKanban,
  Gauge,
  History,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  LogOut,
  MessageSquare,
  Mic,
  PlayCircle,
  Settings,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
};

type MobileNavSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function MobileNavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        item.active
          ? "bg-[#EEF2FF] text-[#3B6FF0]"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function MobileNavSheet({ open, onOpenChange }: MobileNavSheetProps) {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const { t } = useAppLocale();
  const [supportOpen, setSupportOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isCandidate = profile?.user_type === "candidate";
  const isOrgLevelPage =
    pathname.startsWith("/organizations") ||
    pathname.startsWith("/org/") ||
    pathname.startsWith("/usage");

  const displayName = profile?.name || user?.email?.split("@")[0] || "User";
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  const close = () => onOpenChange(false);

  let navItems: NavItem[] = [];

  if (isCandidate) {
    navItems = [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        active: pathname === "/dashboard",
      },
      {
        href: "/practice",
        label: "Practice",
        icon: Mic,
        active: pathname.startsWith("/practice"),
      },
      {
        href: "/my-sessions",
        label: "My Sessions",
        icon: History,
        active: pathname.startsWith("/my-sessions"),
      },
      {
        href: "/progress",
        label: "Progress",
        icon: TrendingUp,
        active: pathname.startsWith("/progress"),
      },
    ];
  } else if (isOrgLevelPage) {
    navItems = [
      {
        href: "/organizations",
        label: t("sidebar.organizations"),
        icon: FolderKanban,
        active: pathname.startsWith("/organizations"),
      },
      {
        href: "/usage",
        label: t("sidebar.usage"),
        icon: Gauge,
        active: pathname.startsWith("/usage"),
      },
    ];
  } else {
    navItems = [
      {
        href: "/dashboard",
        label: t("sidebar.dashboard"),
        icon: LayoutDashboard,
        active: pathname === "/dashboard",
      },
      {
        href: "/interviews",
        label: t("sidebar.interviews"),
        icon: MessageSquare,
        active: pathname.startsWith("/interviews"),
      },
      {
        href: "/candidates",
        label: t("sidebar.sessions"),
        icon: PlayCircle,
        active: pathname.startsWith("/candidates"),
      },
      {
        href: "/settings",
        label: t("sidebar.projectSettings"),
        icon: Settings,
        active: pathname.startsWith("/settings"),
      },
    ];
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOutAndRedirect("/login");
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="flex w-[min(100vw,280px)] flex-col gap-0 p-0">
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <Link href={isCandidate ? "/dashboard" : "/organizations"} onClick={close}>
              <img
                src="/images/marketing/parker-logo.png"
                alt="Parker"
                className="h-10 w-auto object-contain object-left"
              />
            </Link>
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <SheetDescription className="sr-only">
              App navigation and account actions
            </SheetDescription>
          </SheetHeader>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => (
              <MobileNavLink key={item.href} item={item} onNavigate={close} />
            ))}
          </nav>

          <div className="mt-auto space-y-1 border-t border-border px-3 py-3">
            <button
              type="button"
              onClick={() => {
                close();
                setSupportOpen(true);
              }}
              className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <LifeBuoy className="h-4 w-4 shrink-0" />
              {t("sidebar.support")}
            </button>

            <Link
              href="/account"
              onClick={close}
              className={cn(
                "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                pathname.startsWith("/account")
                  ? "bg-[#EEF2FF] text-[#3B6FF0]"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <User className="h-4 w-4 shrink-0" />
              {t("sidebar.accountSettings")}
            </Link>

            <Button
              type="button"
              variant="ghost"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
              className="h-11 w-full justify-start gap-3 px-3 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {signingOut ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4 shrink-0" />
              )}
              {signingOut ? t("sidebar.signingOut") : t("sidebar.signOut")}
            </Button>
          </div>

          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0 rounded-md">
                <AvatarImage src={profile?.avatar ?? undefined} />
                <AvatarFallback className="rounded-md text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <SupportDrawer open={supportOpen} onOpenChange={setSupportOpen} />
    </>
  );
}
