const AUDIT_ACTIONS = {
  SIGNUP: "signup",
  LOGIN: "login",
  LOGOUT: "logout",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  INVITE: "invite",
  ACCEPT: "accept",
  DECLINE: "decline",
  LEAVE: "leave",
  REVOKE: "revoke",
  REQUEST: "request",
  IN: "move-in",
  OUT: "move-out",
} as const;

const AUDIT_ENTITIES = {
  AUTH: "auth",
  USER: "user",
  EXPENSE: "expense",
  CATEGORY: "category",
  BUCKET: "bucket",
  MEMBER: "bucket-member",
  BUDGET: "budget",
} as const;

type AuditLogType = {
  actorId: string;
  bucketId?: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  note?: string;
  metadata?: Record<string, unknown>;
};

type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

type AuditEntity = (typeof AUDIT_ENTITIES)[keyof typeof AUDIT_ENTITIES];

export { AUDIT_ACTIONS, AUDIT_ENTITIES };
export type { AuditAction, AuditEntity, AuditLogType };
