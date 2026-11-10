"use client";

import { useUser } from "@/hooks/useUser";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { useSearchParams } from "next/navigation";

export default function ProfilePage() {
  const { user, profile, isLoading } = useUser();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const mode = searchParams.get("mode") || "";

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center p-20 text-gray-400">
        Carregando seus dados...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex w-full items-center justify-center p-20 text-red-500">
        Não foi possível carregar as informações do usuário.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <ProfileForm user={user} profile={profile} initialTab={initialTab} mode={mode} />
    </div>
  );
}
