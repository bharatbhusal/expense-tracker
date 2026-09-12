import { Types } from "mongoose";

import { UserModel } from "@/models/User";

async function createUser(data: { name: string; username: string; password: string }) {
  const user = await UserModel.create(data);
  return user.toObject();
}

async function findUserByUsername(username: string) {
  // ponytail: +password select is a trust boundary; service compares the hash, never returns it.
  return UserModel.findOne({ username }).select("+password").lean();
}

async function findUserById(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    return null;
  }
  return UserModel.findById(userId).lean();
}

const userRepository = {
  createUser,
  findUserByUsername,
  findUserById,
};

export default userRepository;
