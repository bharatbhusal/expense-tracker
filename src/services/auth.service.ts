import { AppError } from "@/lib/errors";
import { AUTH_ERRORS, BUCKET_ERRORS, ERROR_CODES } from "@/constants/error-messages";
import { comparePassword, hashPassword, signToken } from "@/lib/auth";
import { loginSchema, signupSchema } from "@/lib/validators";
import userRepository from "@/repositories/user.repository";
import { createBucket, findBucketByUserId } from "@/repositories/bucket.repository";
import { ensureCategoryInBucket } from "@/repositories/category.repository";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { logAuditEvent } from "@/services/audit.service";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/constants/types/audit.types";
import { AuthUser } from "@/constants/types/auth.types";

async function registerUser(body: unknown): Promise<{
  token: string;
  user: AuthUser;
}> {
  const input = signupSchema.parse(body);

  const existing = await userRepository.findUserByUsername(input.username);
  if (existing) {
    // ponytail: EMAIL_EXISTS code predates username auth; kept for client compat.
    throw new AppError(AUTH_ERRORS.USERNAME_IN_USE, 409, ERROR_CODES.EMAIL_EXISTS);
  }

  const password = await hashPassword(input.password);
  const user = await userRepository.createUser({
    name: input.name,
    username: input.username,
    password,
  });

  const userId = user._id.toString();

  const personalBucket = await createBucket({
    name: "Personal",
    icon: "📁",
    ownerId: userId,
    isPersonal: true,
    members: [
      {
        userId,
        role: "owner",
        status: "accepted",
        joinedAt: new Date(),
      },
    ],
  });
  const bucketId = personalBucket._id.toString();

  for (const cat of DEFAULT_CATEGORIES) {
    await ensureCategoryInBucket(userId, bucketId, cat);
  }

  const token = signToken({
    id: userId,
    name: user.name,
    username: user.username,
    bucketId,
  });

  await logAuditEvent({
    actorId: userId,
    action: AUDIT_ACTIONS.SIGNUP,
    entity: AUDIT_ENTITIES.AUTH,
    note: "Signed up",
  });

  return {
    token,
    user: {
      id: userId,
      name: user.name,
      username: user.username,
      bucketId,
    },
  };
}

async function loginUser(body: unknown): Promise<{
  token: string;
  user: AuthUser;
}> {
  const input = loginSchema.parse(body);

  const user = await userRepository.findUserByUsername(input.username);
  if (!user?.password) {
    throw new AppError(AUTH_ERRORS.USER_NOT_FOUND, 401, ERROR_CODES.INVALID_CREDENTIALS);
  }

  const isValid = await comparePassword(input.password, user.password);
  if (!isValid) {
    throw new AppError(AUTH_ERRORS.INCORRECT_CREDENTIALS, 401, ERROR_CODES.INVALID_CREDENTIALS);
  }

  const personalBucket = await findBucketByUserId(user._id.toString());
  if (!personalBucket) {
    throw new AppError(BUCKET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  const userId = user._id.toString();
  const bucketId = personalBucket._id.toString();

  const token = signToken({
    id: userId,
    name: user.name,
    username: user.username,
    bucketId,
  });

  await logAuditEvent({
    actorId: userId,
    action: AUDIT_ACTIONS.LOGIN,
    entity: AUDIT_ENTITIES.AUTH,
    note: "Logged in",
  });

  return {
    token,
    user: {
      id: userId,
      name: user.name,
      username: user.username,
      bucketId,
    },
  };
}

async function logoutUser(actorId: string) {
  await logAuditEvent({
    actorId,
    action: AUDIT_ACTIONS.LOGOUT,
    entity: AUDIT_ENTITIES.AUTH,
    note: "Logged out",
  });
  return { message: "Logged out" };
}

const authService = {
  registerUser,
  loginUser,
  logoutUser,
};

export default authService;
