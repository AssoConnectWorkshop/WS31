import { createClient } from "@/lib/supabase/server";
import PrenomsClient from "./PrenomsClient";

export const dynamic = "force-dynamic";

export type BabyName = {
  id: number;
  name: string;
  gender: "M" | "F" | "MF";
  origin: string;
  meaning: string;
  style: "classique" | "moderne" | "original";
};

export type Like = {
  partner_id: string;
  name_id: number;
};

export default async function PrenomsPage() {
  const supabase = await createClient();
  const [namesResult, likesResult] = await Promise.all([
    supabase.from("baby_names").select("*").order("name"),
    supabase.from("baby_name_likes").select("partner_id, name_id"),
  ]);

  if (namesResult.error || !namesResult.data) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-red-500">Erreur de chargement des prénoms.</p>
      </main>
    );
  }

  return (
    <PrenomsClient
      names={namesResult.data as BabyName[]}
      initialLikes={(likesResult.data ?? []) as Like[]}
    />
  );
}
