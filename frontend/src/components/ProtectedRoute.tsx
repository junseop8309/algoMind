import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../features/auth/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null,
  );
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      setOnboardingComplete(null);
      return;
    }
    supabase
      .from("profiles")
      .select("onboardingComplete")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setOnboardingComplete(data?.onboardingComplete ?? false);
      });
  }, [user]);

  // Show spinner while checking
  if (loading || (user && onboardingComplete === null)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // Not logged in — go to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Logged in but not onboarded — go to onboarding
  // But only if we're not already on /onboarding
  if (!onboardingComplete && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
