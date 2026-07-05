import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("add_visit");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ today: data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
