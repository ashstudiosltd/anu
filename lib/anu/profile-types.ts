export type AnuMemberPreferences = {
  remember: string;
  response_style: string;
  theme: "light" | "dark" | "system";
};
export type MemberAccount = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  skills: string | null;
  interests: string | null;
  website: string | null;
  location: string | null;
  location_public: boolean;
  joined_at: string | null;
};
export type AnuMemberProfile = { account: MemberAccount; preferences: AnuMemberPreferences; hasPreferences: boolean };
export const ACCOUNT_FIELDS = "name,username,avatar_url,bio,role,skills,interests,website,location,location_public,joined_at";
