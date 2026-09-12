import { AppError } from "@/lib/errors";
import { BUCKET_ERRORS, ERROR_CODES, USER_ERRORS } from "@/constants/error-messages";
import userRepository from "@/repositories/user.repository";
import { findBucketByUserId } from "@/repositories/bucket.repository";

async function getCurrentUser(userId: string) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new AppError(USER_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  const bucket = await findBucketByUserId(userId);
  if (!bucket) {
    throw new AppError(BUCKET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    bucketId: bucket._id.toString(),
  };
}

const userService = {
  getCurrentUser,
};

export default userService;
