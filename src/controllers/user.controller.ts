import { getAuthPayload } from "@/lib/auth";
import userService from "@/services/user.service";

async function getAuthUser() {
  const auth = await getAuthPayload();
  return userService.getCurrentUser(auth.id);
}

const userController = { getAuthUser };

export default userController;
