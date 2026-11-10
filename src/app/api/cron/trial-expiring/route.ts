import { NextRequest } from "next/server";

/**
 * Trial expiring cron — disabled. Trial period removed from the system.
 */
export async function GET(_req: NextRequest) {
  return new Response(
    JSON.stringify({ success: true, message: "Trial feature disabled." }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
