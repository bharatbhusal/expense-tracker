export type AuthUser = {
  id: string;
  name: string;
  username: string;
  bucketId: string;
};

export type LoginPayload = {
  username: string;
  password: string;
};

export type SignupPayload = {
  name: string;
  username: string;
  password: string;
};
