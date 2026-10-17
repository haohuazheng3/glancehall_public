import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Deliberately throws so we can verify the server-side error pipeline end to end.
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return new Response("Unauthorized", { status: 401 });
  throw new Error(`Deliberate test error ${new Date().toISOString()}`);
}
