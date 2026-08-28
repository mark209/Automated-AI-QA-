export type AuthUser = { id: string; email?: string | null };

export type AuthApi = {
  getUser(): Promise<{ data: { user: AuthUser | null } }>;
  signInWithPassword(credentials: { email: string; password: string }): Promise<{ data: { session: unknown }; error: { message: string } | null }>;
  signUp(credentials: { email: string; password: string; options?: { data?: Record<string, unknown> } }): Promise<{ data: { session: unknown }; error: { message: string } | null }>;
  signOut(): Promise<{ error: { message: string } | null }>;
};

export function getAuthApi(client: { auth: unknown }) {
  return client.auth as AuthApi;
}
