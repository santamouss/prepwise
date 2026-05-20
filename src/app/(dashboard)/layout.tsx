import { DashboardShell } from "@/components/layout/sidebar";
import {
  getEffectiveUserType,
  isCandidateOnlyPath,
  isRecruiterOnlyPath,
} from "@/lib/auth/user-type-routes";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = headers().get("x-pathname") ?? "";
  const isGuestPractice =
    pathname === "/practice" || pathname.startsWith("/practice/");

  if (!user) {
    if (isGuestPractice) {
      return <>{children}</>;
    }
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();

  const effectiveUserType = getEffectiveUserType(profile?.user_type);

  if (pathname) {
    if (effectiveUserType === "candidate" && isRecruiterOnlyPath(pathname)) {
      redirect("/dashboard");
    }
    if (effectiveUserType === "recruiter" && isCandidateOnlyPath(pathname)) {
      redirect("/dashboard");
    }
  }

  const onOnboarding =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  if (onOnboarding) {
    return <>{children}</>;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
