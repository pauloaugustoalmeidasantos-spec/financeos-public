import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});



async function main() {
  // Use dynamic import so process.env variables are loaded BEFORE Prisma initializes
  const { prisma } = await import("../src/lib/prisma");

  console.log("Synchronizing Supabase Auth users to Prisma...");

  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }

    console.log(`Found ${users.length} users in Supabase Auth.`);

    for (const user of users) {
      console.log(`Syncing user: ${user.email} (${user.id})`);
      
      const email = user.email || "";
      const name = user.user_metadata?.full_name || user.user_metadata?.name || null;
      const avatarUrl = user.user_metadata?.avatar_url || null;

      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          email,
          name,
          avatarUrl,
        },
        create: {
          id: user.id,
          email,
          name,
          avatarUrl,
        },
      });

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          plan: "FREE",
          status: "TRIALING",
          trialEndsAt,
        },
      });
      
      console.log(`✅ Synced user ${email}`);
    }

    console.log("Synchronization complete!");
  } catch (error) {
    console.error("Error synchronizing users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
