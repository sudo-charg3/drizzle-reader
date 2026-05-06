"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else alert("Check your email for the confirmation link!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = "/library";
    }
  };

  const handleGoogleAuth = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative z-10 p-4">
      <div className="bokeh-bg"></div>
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] text-center font-['DM_Sans']">
        <h1 className="text-3xl font-['Lora'] mb-8">Drizzle Reader</h1>
        
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            required
          />
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <button
            type="submit"
            className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {isSignUp ? "Sign up" : "Sign in"}
          </button>
        </form>

        <div className="my-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
          <div className="h-px bg-gray-200 flex-1"></div>
          <span>OR</span>
          <div className="h-px bg-gray-200 flex-1"></div>
        </div>

        <button
          onClick={handleGoogleAuth}
          className="w-full border border-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors mb-4"
        >
          Continue with Google
        </button>

        <p className="text-sm text-gray-500">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-gray-900 underline"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
