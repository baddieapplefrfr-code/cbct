import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { CheckCircle } from "lucide-react";
import { storeToken } from "@/lib/youtube-auth";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing sign-in...");
  const [error, setError] = useState("");

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError("Authentication failed. Please try again.");
        setTimeout(() => navigate("/?error=auth_failed"), 2000);
        return;
      }

      const accessToken = session.provider_token;
      if (accessToken) {
        storeToken(accessToken);
        localStorage.setItem("yt_full_connect", "true");
        localStorage.setItem("yt_oauth_email", session.user?.email || "");
        setStatus("Google account connected! Loading your dashboard...");
      }

      const channelConnected = localStorage.getItem("channel_connected") === "true";
      if (channelConnected) {
        navigate("/dashboard?oauth=true", { replace: true });
      } else {
        navigate("/?oauth=success", { replace: true });
      }
    } catch {
      setError("Something went wrong. Redirecting...");
      setTimeout(() => navigate("/"), 2000);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <div className="h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}
