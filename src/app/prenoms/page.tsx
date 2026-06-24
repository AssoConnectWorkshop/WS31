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

export default async function PrenomsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("baby_names")
    .select("*")
    .order("name");

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-red-500">Erreur de chargement des prénoms.</p>
      </main>
    );
  }

  return <PrenomsClient names={data as BabyName[]} />;
}
