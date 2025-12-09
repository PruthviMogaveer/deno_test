import { supabase } from "../supabase.ts";
import * as bcrypt from "bcrypt";
import { create, getNumericDate } from "djwt";

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "your-secret-key";

// Create a CryptoKey for HMAC signing
async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function generateToken(userId: string): Promise<string> {
  return getKey().then((key) =>
    create(
      { alg: "HS256", typ: "JWT" },
      { sub: userId, exp: getNumericDate(60 * 60 * 24) }, // 24 hours
      key
    )
  );
}

export async function loginUser(
  email: string,
  password: string
): Promise<string> {
  const { data, error } = await supabase
    .from("User_Profile")
    .select("id, email, password")
    .eq("email", email)
    .single();

  if (error || !data) {
    throw new Error("Invalid ");
  }

  const isMatch = await bcrypt.compare(password, data.password);
  if (!isMatch) {
    throw new Error("Invalid ma");
  }

  const token = await generateToken(data.id);
  return token;
}
