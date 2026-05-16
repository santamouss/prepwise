import { DashboardShell } from "@/components/layout/sidebar";
import {
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

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();

  const pathname = headers().get("x-pathname") ?? "";
  const onOnboarding =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  if (!profile?.user_type && !onOnboarding) {
    redirect("/onboarding");
  }

  if (profile?.user_type && onOnboarding) {
    redirect("/dashboard");
  }

  if (profile?.user_type && pathname) {
    if (profile.user_type === "candidate" && isRecruiterOnlyPath(pathname)) {
      redirect("/dashboard");
    }
    if (profile.user_type === "recruiter" && isCandidateOnlyPath(pathname)) {
      redirect("/dashboard");
    }
  }

  if (onOnboarding) {
    return <>{children}</>;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
