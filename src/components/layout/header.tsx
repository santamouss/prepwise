"use client";

import { useAppLocale } from "@/components/app-locale-provider";
import { trpc } from "@/lib/trpc/client";
import { MobileNavSheet } from "@/components/layout/mobile-nav-sheet";
import { ChevronDown, Compass, Menu, Plus, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useOrg } from "@/components/org-provider";
import { useProject } from "@/components/project-provider";
import { useTourSafe } from "@/components/tour/tour-provider";
import { isRecruiterDashboardTourEnabled } from "@/lib/tour/tour-flags";
import { TourChecklist } from "@/components/tour/tour-checklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function isDynamicSegment(segment: string): boolean {
  return /^c[a-z0-9]{20,}$/i.test(segment) || /^[a-f0-9-]{20,}$/i.test(segment);
}

function InterviewBreadcrumbLabel({ id }: { id: string }) {
  const interview = trpc.interview.getById.useQuery({ id }, { retry: false });
  if (interview.data?.title) {
    return <>{interview.data.title}</>;
  }
  return <>{id.slice(0, 8)}...</>;
}

function OrgSwitcher() {
  const { orgs, currentOrg, setCurrentOrg } = useOrg();
  const router = useRouter();
  const { t } = useAppLocale();

  if (!currentOrg) return null;

  const handleSwitch = (orgId: string) => {
    if (orgId !== currentOrg.id) {
      setCurrentOrg(orgId);
      router.refresh();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex max-w-[160px] items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/10 outline-none">
          <span className="truncate max-w-[160px]">{currentOrg.name}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {t("header.orgList")}
        </div>
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitch(org.id)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{org.name}</span>
            <Link
              href="/org/settings"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentOrg(org.id);
              }}
              className="rounded-md p-1 -mr-1 text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <Settings className="h-4 w-4 shrink-0" />
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/org/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t("header.newOrganization")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProjectSwitcher() {
  const { projects, currentProject, setCurrentProject } = useProject();
  const { currentOrg } = useOrg();
  const router = useRouter();
  const { t } = useAppLocale();

  if (!currentProject || !currentOrg) return null;

  const handleSwitch = (projectId: string) => {
    if (projectId !== currentProject.id) {
      setCurrentProject(projectId);
      router.refresh();
    }
  };

  return (
    <>
      <span className="mx-1 text-xs text-muted-foreground/45">/</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex max-w-[160px] items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/10 outline-none">
            <span className="truncate max-w-[160px]">
              {currentProject.name}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {t("header.projectList")}
          </div>
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => handleSwitch(project.id)}
              className="flex items-center justify-between"
            >
              <span className="truncate">{project.name}</span>
              <Link
                href="/settings"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentProject(project.id);
                }}
                className="rounded-md p-1 -mr-1 text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <Settings className="h-4 w-4 shrink-0" />
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/organizations" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("header.newProject")}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function Header({ sidebarToggle }: { sidebarToggle?: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { t } = useAppLocale();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isCandidate =
    profile?.user_type === "candidate" || profile?.user_type == null;
  const SEGMENT_LABELS: Record<string, string> = {
    dashboard: t("header.dashboard"),
    interviews: t("header.interviews"),
    new: t("header.newInterview"),
    edit: t("header.content"),
    results: t("header.results"),
    settings: t("header.settings"),
    sessions: t("header.sessions"),
    workspaces: t("header.workspaces"),
    projects: t("header.projects"),
    members: t("header.members"),
    org: t("header.organizations"),
    organization: t("header.organization"),
    organizations: t("header.organizations"),
    candidates: t("header.sessions"),
    questions: t("header.questions"),
    account: t("header.accountSettings"),
    usage: t("header.usage"),
  };
  const ORG_SEGMENT_LABELS: Record<string, string> = {
    settings: t("header.organizationSettings"),
    members: t("header.members"),
    new: t("header.newOrganization"),
  };

  const segments = pathname.split("/").filter(Boolean);

  // Org-level pages: /organizations, /org/settings, /org/members, /org/new, /usage
  const isOrgLevelPage =
    segments[0] === "organizations" ||
    segments[0] === "org" ||
    segments[0] === "usage";

  const breadcrumbs: { label: React.ReactNode; href: string }[] = [];

  if (isOrgLevelPage) {
    // For org-level pages, always start with "Organizations"
    if (segments[0] === "org") {
      breadcrumbs.push({
        label: t("header.organizations"),
        href: "/organizations",
      });
      for (let i = 1; i < segments.length; i++) {
        const segment = segments[i];
        const href = "/" + segments.slice(0, i + 1).join("/");
        breadcrumbs.push({
          label:
            ORG_SEGMENT_LABELS[segment] ?? SEGMENT_LABELS[segment] ?? segment,
          href,
        });
      }
    } else if (segments[0] === "usage") {
      breadcrumbs.push({
        label: SEGMENT_LABELS[segments[0]] ?? segments[0],
        href: `/${segments[0]}`,
      });
    } else {
      // /organizations itself
      breadcrumbs.push({
        label: t("header.organizations"),
        href: "/organizations",
      });
    }
  } else {
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const href = "/" + segments.slice(0, i + 1).join("/");

      // Skip "edit" from breadcrumbs when followed by a sub-tab (settings/sessions)
      if (segment === "edit" && i < segments.length - 1) {
        continue;
      }

      if (isDynamicSegment(segment)) {
        const prevSegment = segments[i - 1];
        if (prevSegment === "interviews") {
          breadcrumbs.push({
            label: <InterviewBreadcrumbLabel id={segment} />,
            href: href + "/edit",
          });
        } else {
          breadcrumbs.push({ label: segment.slice(0, 8) + "...", href });
        }
      } else {
        breadcrumbs.push({
          label: SEGMENT_LABELS[segment] ?? segment,
          href,
        });
      }
    }
  }

  return (
    <header className="shrink-0 border-b border-border bg-background">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 px-4 py-2.5 sm:px-8 md:flex-nowrap md:gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 md:gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 sm:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {sidebarToggle ? <div className="hidden sm:block">{sidebarToggle}</div> : null}

          {!isOrgLevelPage && !isCandidate ? (
            <>
              <OrgSwitcher />
              <ProjectSwitcher />
            </>
          ) : segments[0] === "usage" ? (
            <OrgSwitcher />
          ) : null}

          {breadcrumbs.length > 0 && (
            <nav className="flex min-w-0 flex-wrap items-center text-xs text-muted-foreground">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={i}>
                  {(i > 0 || !isOrgLevelPage || segments[0] === "usage") && (
                    <span className="mx-1 shrink-0 text-muted-foreground/45">
                      /
                    </span>
                  )}
                  {i < breadcrumbs.length - 1 ? (
                    <Link
                      href={crumb.href}
                      className="max-w-[160px] truncate px-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="max-w-[200px] truncate px-1.5 text-muted-foreground/90">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
        </div>

        <div className="relative mx-auto hidden w-full max-w-xl flex-none md:block md:flex-1 md:min-w-0 lg:mx-6">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder={t("header.searchPlaceholder")}
            aria-label={t("header.searchPlaceholder")}
            className="h-9 rounded-lg border-border bg-background pl-9 text-sm shadow-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[#3B6FF0]/25 focus-visible:ring-offset-0"
          />
        </div>

        <div
          className="relative flex flex-1 justify-end md:flex-none"
          style={{ zIndex: 10002 }}
        >
          <TourHeaderButton />
        </div>
      </div>
      <MobileNavSheet open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </header>
  );
}

function TourHeaderButton() {
  const tour = useTourSafe();
  const pathname = usePathname();
  const { profile } = useAuth();
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const handleClose = useCallback(() => setChecklistOpen(false), []);
  const { t } = useAppLocale();

  useEffect(() => {
    // Guard against SSR or missing document/body
    if (typeof document === "undefined" || !document.body) {
      return;
    }

    const check = () => {
      if (document.querySelector) {
        setSheetOpen(
          !!document.querySelector('[role="dialog"][data-state="open"]'),
        );
      }
    };

    check();

    // Use MutationObserver if available (all modern browsers)
    if (typeof MutationObserver !== "undefined") {
      try {
        const mo = new MutationObserver(check);
        mo.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["data-state"],
        });
        return () => mo.disconnect();
      } catch {
        // Fail silently if MutationObserver fails (e.g., in restricted environment)
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (!tour?.showRecoveryHint) return;
    const timer = setTimeout(() => tour.clearRecoveryHint(), 5000);
    return () => clearTimeout(timer);
  }, [tour]);

  if (
    !tour ||
    sheetOpen ||
    !isRecruiterDashboardTourEnabled(profile?.user_type, pathname)
  ) {
    return null;
  }
  const showDot = !tour.completed;

  const handleIconClick = () => {
    if (tour.showRecoveryHint) tour.clearRecoveryHint();
    setChecklistOpen((v) => !v);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        data-tour-trigger
        onClick={handleIconClick}
        className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
        title={t("header.guidedTour")}
      >
        <Compass className="h-4 w-4" />
        {showDot && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
        )}
      </Button>
      <TourChecklist open={checklistOpen} onClose={handleClose} />
      {tour.showRecoveryHint && (
        <div
          className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl"
          style={{ zIndex: 10003 }}
        >
          <div className="absolute -top-[6px] right-3.5 h-[11px] w-[11px] rotate-45 rounded-tl-[3px] border-l border-t border-border bg-popover" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("header.resumeTour")}
          </p>
        </div>
      )}
    </>
  );
}
