import { api } from './client';

export interface ChatUserProfile {
  uid: string;
  name?: string | null;
  phone?: string | null;
  role?: string;
  profileData?: {
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
    address?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const usersApi = {
  getByUid: (uid: string) =>
    api.get<ChatUserProfile>(`/users/${encodeURIComponent(uid)}`),
};
