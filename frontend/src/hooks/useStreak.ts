import { useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useStreak() {
  const updateStreak = useCallback(async (userId: string) => {
    const today = new Date().toISOString().split("T")[0];

    const { data: profile } = await supabase
      .from("profiles")
      .select("currentStreak, longestStreak, lastActivityDate")
      .eq("id", userId)
      .single();

    if (!profile) return;

    const last = profile.lastActivityDate;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    let newStreak = profile.currentStreak;

    if (last === today) return; // already counted today
    else if (last === yesterdayStr) newStreak += 1; // consecutive
    else newStreak = 1; // reset

    await supabase
      .from("profiles")
      .update({
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, profile.longestStreak),
        lastActivityDate: today,
      })
      .eq("id", userId);
  }, []);

  return { updateStreak };
}
