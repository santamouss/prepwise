"use client";

import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import { useAppLocale } from "@/components/app-locale-provider";
import { ParkerLogo } from "@/components/ui/parker-logo";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getPostLoginPath, getRegisterHref } from "@/lib/auth/post-login-redirect";
import { MARKETING_HOME } from "@/components/marketing/marketing-links";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const autoStart = searchParams.get("autoStart");
  const { toast } = useToast();
  const { t } = useAppLocale();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: t("auth.errorTitle"),
          description: t("auth.invalidEmailOrPassword"),
          variant: "destructive",
        });
        setLoading(false);
      } else {
        router.push(getPostLoginPath(redirect, autoStart));
        router.refresh();
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <ParkerLogo height={128} className="mx-auto mb-2" />
        <CardTitle className="font-heading text-2xl">
          {t("auth.welcomeBack")}
        </CardTitle>
        <CardDescription>{t("auth.signInSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleOAuthButton />
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("common.or")}
          </span>
          <Separator className="flex-1" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("auth.signIn")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-3">
        <p className="text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link
            href={getRegisterHref(redirect, autoStart)}
            className="text-primary hover:underline"
          >
            {t("auth.signUp")}
          </Link>
        </p>
        <Link
          href={MARKETING_HOME}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("auth.backToHome")}
        </Link>
      </CardFooter>
    </Card>
  );
}
