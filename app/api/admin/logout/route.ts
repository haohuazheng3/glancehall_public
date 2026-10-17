import { ADMIN_COOKIE } from "@/lib/admin";

export async function POST(req: Request) {
  return new Response(null, {
    status: 303,
    headers: { location: new URL("/admin", req.url).toString(), "set-cookie": `${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` },
  });
}
