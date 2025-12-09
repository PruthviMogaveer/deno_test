import { supabase } from "../supabase.ts";
import { create, getNumericDate } from "djwt";

const JWT_SECRET =
  Deno.env.get("JWT_SECRET");

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
  console.log(`🔐 Login attempt for email: ${email}`);

  let { data, error } = await supabase
    .from("User_Profile")
    .select("*")
    .eq("email", email);

  data = data ? data[0] : null;

  console.log("📊 Query result:", { data: data ? data : "not found", error });

  if (error) {
    console.error("❌ Database error:", error.message);
    throw new Error("Invalid credentials");
  }

  if (!data) {
    console.error("❌ No user found with email:", email);
    throw new Error("Invalid credentials");
  }

  console.log("✅ User found, comparing password...");
  const isMatch = password === data.password;

  if (!isMatch) {
    console.error("❌ Password mismatch");
    throw new Error("Invalid credentials");
  }

  console.log("✅ Password matched, generating token...");
  const token = await generateToken(data.id);
  return token;
}
