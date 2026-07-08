import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

function getOAuthUrl() {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${kimiAuthUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", appID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function Login() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fdfbf5] to-[#f5f5f4] p-4">
      <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-xl border border-[#e7e5e4]/50 p-8 transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#fff7ed] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#ffedd5] shadow-sm">
            <span className="text-3xl">🍲</span>
          </div>
          <h1 className="font-serif text-3xl font-medium text-[#1c1917] mb-2">Welcome Back</h1>
          <p className="text-sm text-[#78716c]">Sign in to continue your nutrition journey.</p>
        </div>
        
        <button
          onClick={() => {
            localStorage.setItem("mockUser", "true");
            navigate("/");
          }}
          className="w-full bg-white text-[#374151] border border-[#d1d5db] font-medium flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl hover:bg-[#f9fafb] hover:border-[#9ca3af] hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-[#f3f4f6] active:scale-[0.98] transition-all duration-200"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          <span className="text-base">Sign in with Google</span>
        </button>
        
        <div className="mt-8 text-center">
          <p className="text-[11px] text-[#a8a29e]">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
