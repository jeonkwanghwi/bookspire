import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/notes/[id]/like">) {
  try {
    const { id } = await ctx.params;
    const { on } = await req.json();

    const supabase = getSupabase();
    const { error } = await supabase.rpc("change_likes", { note_id: Number(id), delta: on ? 1 : -1 });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
