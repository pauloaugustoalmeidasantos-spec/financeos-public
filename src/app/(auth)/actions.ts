"use server";

import { headers } from "next/headers";
import { ratelimitLogin, ratelimitSignup, ratelimitPasswordReset } from "@/lib/rate-limit";
import { logAuthEvent } from "@/server/services/audit";

export async function checkLoginRateLimit() {
  try {
    const reqHeaders = await headers();
    const ipList = reqHeaders.get("x-forwarded-for");
    const ip = ipList ? ipList.split(",")[0].trim() : "anonymous";
    const { success } = await ratelimitLogin.limit(ip);
    return { success, ip };
  } catch (error) {
    console.error("Rate limit falhou:", error);
    return { success: true, ip: "anonymous" };
  }
}

export async function checkSignupRateLimit() {
  try {
    const reqHeaders = await headers();
    const ipList = reqHeaders.get("x-forwarded-for");
    const ip = ipList ? ipList.split(",")[0].trim() : "anonymous";
    const { success } = await ratelimitSignup.limit(ip);
    return { success, ip };
  } catch (error) {
    console.error("Rate limit falhou:", error);
    return { success: true, ip: "anonymous" };
  }
}

export async function checkPasswordResetRateLimit() {
  try {
    const reqHeaders = await headers();
    const ipList = reqHeaders.get("x-forwarded-for");
    const ip = ipList ? ipList.split(",")[0].trim() : "anonymous";
    const { success } = await ratelimitPasswordReset.limit(ip);
    return { success, ip };
  } catch (error) {
    console.error("Rate limit falhou:", error);
    return { success: true, ip: "anonymous" };
  }
}

export async function logAuth(params: {
  event: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const reqHeaders = await headers();
    const ua = reqHeaders.get("user-agent") || undefined;
    void logAuthEvent({ ...params, userAgent: params.userAgent || ua });
  } catch (error) {
    console.error("logAuth falhou:", error);
  }
}
