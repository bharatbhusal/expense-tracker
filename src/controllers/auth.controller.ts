import { NextRequest } from "next/server";

import { clearAuthCookie, getAuthPayload, setAuthCookie } from "@/lib/auth";
import authService from "@/services/auth.service";

async function signup(request: NextRequest) {
  const body = await request.json();

  const result = await authService.registerUser(body);

  // Cookies stay in the controller: transport concern, service owns validation + audit.
  await setAuthCookie(result.token);

  return result.user;
}

async function login(request: NextRequest) {
  const body = await request.json();

  const result = await authService.loginUser(body);

  // Cookies stay in the controller: transport concern, service owns validation + audit.
  await setAuthCookie(result.token);

  return result.user;
}

async function logout() {
  const authUser = await getAuthPayload();

  // Cookies stay in the controller: transport concern, service owns validation + audit.
  await clearAuthCookie();

  return authService.logoutUser(authUser.id);
}

const authController = {
  signup,
  login,
  logout,
};

export default authController;
