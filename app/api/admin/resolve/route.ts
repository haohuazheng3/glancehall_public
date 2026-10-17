import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return new Response("Unauthorized", { status: 401 });
  const form = await req.formData().catch(() => null);
  const fp = String(form?.get("fingerprint") ?? "");
  if (fp === "all") await db()`update error_groups set resolved_at = now() where resolved_at is null`;
  else if (fp) await db()`update error_groups set resolved_at = now() where fingerprint = ${fp}`;
  const back = req.headers.get("accept")?.includes("text/html") ? new URL("/admin", req.url).toString() : null;
  return back ? new Response(null, { status: 303, headers: { location: back } }) : Response.json({ ok: true });
}
