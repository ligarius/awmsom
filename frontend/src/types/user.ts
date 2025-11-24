import type { AuthUser } from "./auth";

export type UserProfile = AuthUser & {
  phone?: string;
  avatarUrl?: string;
};
