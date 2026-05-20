import { getEffectiveUserType } from "@/lib/auth/user-type-routes";
import type { ProfileUserType } from "@/lib/profile-user-type";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "../context";
import { protectedProcedure, router } from "../trpc";

const userTypeSchema = z.enum(["candidate", "recruiter"]);

/** Default persona for new accounts (onboarding selection skipped). */
export const DEFAULT_PROFILE_USER_TYPE: ProfileUserType = "candidate";

export async function ensureDefaultProfileUserType(
  supabase: Context["supabase"],
  userId: string,
): Promise<ProfileUserType> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", userId)
    .single();

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }

  if (profile?.user_type) {
    return getEffectiveUserType(profile.user_type);
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ user_type: DEFAULT_PROFILE_USER_TYPE })
    .eq("id", userId);

  if (updateError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: updateError.message,
    });
  }

  return DEFAULT_PROFILE_USER_TYPE;
}

export const userRouter = router({
  ensureDefaultUserType: protectedProcedure.mutation(async ({ ctx }) => {
    const userType = await ensureDefaultProfileUserType(ctx.supabase, ctx.user.id);
    return { userType };
  }),

  setUserType: protectedProcedure
    .input(
      z.object({
        userType: userTypeSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: existing, error: fetchError } = await ctx.supabase
        .from("profiles")
        .select("user_type")
        .eq("id", ctx.user.id)
        .single();

      if (fetchError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: fetchError.message,
        });
      }

      if (existing?.user_type) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User type is already set",
        });
      }

      const { error } = await ctx.supabase
        .from("profiles")
        .update({ user_type: input.userType })
        .eq("id", ctx.user.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { userType: input.userType };
    }),

  updateName: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("profiles")
        .update({ name: input.name })
        .eq("id", ctx.user.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { success: true };
    }),
});
