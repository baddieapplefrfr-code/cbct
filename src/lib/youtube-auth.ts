import { supabase } from "./supabase";

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/youtube.readonly",
          "https://www.googleapis.com/auth/yt-analytics.readonly",
        ].join(" "),
        queryParams: { access_type: "offline", prompt: "consent" },
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return { error: "Google sign-in failed. Please try again." };
    return { error: null };
  } catch {
    return { error: "Could not connect to Google." };
  }
}

export function storeToken(token: string) {
  localStorage.setItem("yt_access_token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("yt_access_token");
}

export function clearToken() {
  localStorage.removeItem("yt_access_token");
  localStorage.removeItem("yt_channel_data");
  localStorage.removeItem("channel_connected");
  localStorage.removeItem("channel_id");
  localStorage.removeItem("user_email");
  localStorage.removeItem("yt_full_connect");
  supabase.auth.signOut();
}

export function isAuthenticated(): boolean {
  return localStorage.getItem("channel_connected") === "true";
}

export function isFullyConnected(): boolean {
  return localStorage.getItem("yt_full_connect") === "true";
}

export { isChannelConnected } from "@/lib/youtube-api";

export const FULL_CONNECT_FEATURES = [
  "/diagnose/algorithm-intelligence",
  "/analyze/war-room",
  "/analyze/best-upload-time",
  "/analyze/subscriber-converter",
  "/diagnose/growth-intelligence",
  "/grow/sponsor",
];

export function requiresFullConnect(path: string): boolean {
  return FULL_CONNECT_FEATURES.some((f) => path.startsWith(f));
}
