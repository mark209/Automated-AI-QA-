"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAuthApi } from "@/lib/supabase/auth-api";

export function AuthUserMenu() {
  const [email, setEmail] = useState("Signed-in user");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void getAuthApi(supabase).getUser().then(({ data }) => { if (data.user?.email) setEmail(data.user.email); });
  }, []);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await getAuthApi(supabase).signOut();
    window.location.assign("/login");
  }

  return <div className="mt-auto border-t border-white/10 pt-4"><button onClick={signOut} className="focus-ring flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/10"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3c6af0] text-sm font-semibold">{email.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{email}</p><p className="truncate text-xs text-slate-400">Sign out</p></div><ChevronDown size={16} className="text-slate-400" /></button></div>;
}
