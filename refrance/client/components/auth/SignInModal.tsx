import { useEffect, useRef, useState } from "react";
import { useLoginMutation } from "@/store/api";
import { useDispatch } from "react-redux";
import { setTokens } from "@/features/auth/authSlice";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import Link, { useNavigate } from "@/lib/navigation";

export default function SignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { register, handleSubmit, setFocus } = useForm<{ username: string; password: string }>();
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setVisible(true);
      try { document.body.style.overflow = "hidden"; } catch {}
      setTimeout(() => setFocus("username"), 50);
    } else {
      setVisible(false);
      try { document.body.style.overflow = ""; } catch {}
    }
    return () => { try { document.body.style.overflow = ""; } catch {} };
  }, [open, setFocus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onSubmit = async (vals: { username: string; password: string }) => {
    setError(null);
    try {
      const res = await login(vals).unwrap();
      if (res?.access && res?.refresh) {
        dispatch(setTokens({ access: res.access, refresh: res.refresh }));
      }
      onClose();
      navigate("/");
    } catch (e: any) {
      const msg = e?.data?.error || e?.data || e?.error || e?.status || String(e);
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-title"
        className={`relative z-10 w-full max-w-md transform rounded-2xl bg-card p-6 shadow-2xl transition-all duration-220 ease-out ${
          visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-3"
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 id="signin-title" className="text-lg font-semibold">Sign in to Py‑Gram</h3>
          <button aria-label="Close" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid gap-3">
          <label className="text-sm font-medium text-muted-foreground">Username or Email</label>
          <input {...register("username", { required: true })} placeholder="you@example.com" className="rounded-md border p-3 focus:outline-none focus:ring-2 focus:ring-primary/40" />

          <div>
            <label className="text-sm font-medium text-muted-foreground">Password</label>
            <div className="relative mt-1">
              <input type={showPassword ? "text" : "password"} {...register("password", { required: true })} placeholder="Your password" className="w-full rounded-md border p-3 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{showPassword ? "Hide" : "Show"}</button>
            </div>
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="flex items-center justify-between">
            <Button type="submit" disabled={isLoading}>Sign in</Button>
            <Link to="/register" onClick={onClose} className="text-sm text-muted-foreground underline">Register</Link>
          </div>

          <div className="mt-1 text-xs text-muted-foreground">By signing in you agree to our terms and privacy policy.</div>
        </form>
      </div>
    </div>
  );
}
