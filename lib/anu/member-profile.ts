import "server-only";
import { authClient } from "./auth";

import { ACCOUNT_FIELDS, type AnuMemberPreferences, type AnuMemberProfile } from "./profile-types";
export type { AnuMemberPreferences } from "./profile-types";

export const EMPTY_ANU_PREFERENCES: AnuMemberPreferences = {
  remember: "",
  response_style: "",
  theme: "system",
};

export async function readAnuMemberProfile(userId: string): Promise<AnuMemberProfile> {
  const client = await authClient();
  const [{ data: userData }, { data: profile, error: profileError }, { data: preferences, error }] = await Promise.all([
    client.auth.getUser(),
    client.from("profiles").select(ACCOUNT_FIELDS).eq("id", userId).maybeSingle(),
    client.from("anu_member_preferences").select("remember,response_style,theme").eq("user_id", userId).maybeSingle(),
  ]);
  if (error || profileError) throw new Error("Your Anu profile could not be loaded.");
  if (userData.user?.id !== userId) throw new Error("Your account changed. Refresh and try again.");
  return {
    account: {
      id: userId,
      name: profile?.name || "Devvrat",
      username: profile?.username || null,
      email: userData.user.email || null,
      avatar_url: profile?.avatar_url || null,
      bio: profile?.bio || null,
      role: profile?.role || null,
      skills: profile?.skills || null,
      interests: profile?.interests || null,
      website: profile?.website || null,
      location: profile?.location || null,
      location_public: profile?.location_public === true,
      joined_at: profile?.joined_at || null,
    },
    preferences: preferences ? {
      remember: preferences.remember,
      response_style: preferences.response_style,
      theme: preferences.theme,
    } as AnuMemberPreferences : EMPTY_ANU_PREFERENCES,
    hasPreferences: !!preferences,
  };
}

