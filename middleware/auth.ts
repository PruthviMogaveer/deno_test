import { supabase } from "../supabase.ts";

// Extracts Bearer token from Authorization header
export function getAccessToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

// Verifies the access token with Supabase and returns user ID if valid
export async function authorizeRequest(req: Request): Promise<string | null> {
  const token = getAccessToken(req);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}
