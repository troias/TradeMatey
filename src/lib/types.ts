export interface Tradie {
  id: string;
  name: string;
  trade: string;
  location: string;
  bio: string;
  user_id?: string; // Optional, added for auth
}
