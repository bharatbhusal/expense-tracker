import { apiRequest } from "@/lib/api/client";
import type { AuthUser, LoginPayload, SignupPayload } from "@/constants/types/auth.types";

export const authApi = {
  login: (input: LoginPayload) =>
    apiRequest<AuthUser>("/auth/login", { method: "POST", body: input }),
  signup: (input: SignupPayload) =>
    apiRequest<AuthUser>("/auth/signup", { method: "POST", body: input }),
  me: () => apiRequest<AuthUser>("/auth/me"),
  logout: () => apiRequest<{ message: string }>("/auth/logout", { method: "POST" }),
};
