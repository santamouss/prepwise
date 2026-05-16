import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

const userTypeSchema = z.enum(["candidate", "recruiter"]);

export const userRouter = router({
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
