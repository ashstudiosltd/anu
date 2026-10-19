import "server-only";
import { authClient } from "./auth";

export type AnuMemberPreferences = {
  remember: string;
  response_style: string;
  theme: "light" | "dark" | "system";
};

export const EMPTY_ANU_PREFERENCES: AnuMemberPreferences = {
  remember: "",
  response_style: "",
  theme: "system",
};

export async function readAnuMemberProfile(userId: string) {
  const client = await authClient();
  const [{ data: userData }, { data: profile }, { data: preferences, error }] = await Promise.all([
    client.auth.getUser(),
    client.from("profiles").select("name,username").eq("id", userId).maybeSingle(),
    client.from("anu_member_preferences").select("remember,response_style,theme").eq("user_id", userId).maybeSingle(),
  ]);
  if (error) throw new Error("Your Anu profile could not be loaded.");
  if (userData.user?.id !== userId) throw new Error("Your account changed. Refresh and try again.");
  return {
    account: {
      id: userId,
      name: profile?.name || userData.user.user_metadata.full_name || userData.user.user_metadata.name || "Devvrat",
      username: profile?.username || null,
      email: userData.user.email || null,
    },
    preferences: preferences ? {
      remember: preferences.remember,
      response_style: preferences.response_style,
      theme: preferences.theme,
    } as AnuMemberPreferences : EMPTY_ANU_PREFERENCES,
    hasPreferences: !!preferences,
  };
}

