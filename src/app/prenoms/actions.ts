"use server";

import { createClient } from "@/lib/supabase/server";

export async function likeName(partnerId: string, nameId: number) {
  const supabase = await createClient();
  await supabase
    .from("baby_name_likes")
    .upsert({ partner_id: partnerId, name_id: nameId });
}

export async function unlikeName(partnerId: string, nameId: number) {
  const supabase = await createClient();
  await supabase
    .from("baby_name_likes")
    .delete()
    .match({ partner_id: partnerId, name_id: nameId });
}
