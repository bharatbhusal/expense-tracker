// ─────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────

const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Invalid username or password",
  INCORRECT_CREDENTIALS: "Incorrect username or password",
  USER_NOT_FOUND: "User doesn't exist",
  USERNAME_IN_USE: "Username already in use",
  UNAUTHORIZED: "You are not authorized to perform this action",
  AUTH_REQUIRED: "Authentication required",
  SESSION_EXPIRED: "Your session has expired. Please log in again",
  TOKEN_INVALID: "Invalid or expired authentication token",
  TOKEN_EXPIRED: "Invalid or expired token",
} as const;

// ─────────────────────────────────────────────
// Signup
// ─────────────────────────────────────────────

const SIGNUP_ERRORS = {
  NAME_TOO_SHORT: (min: number) => `Name must be at least ${min} characters`,

  NAME_TOO_LONG: (max: number) => `Name must not exceed ${max} characters`,

  USERNAME_TOO_SHORT: (min: number) => `Username must be at least ${min} characters`,

  USERNAME_TOO_LONG: (max: number) => `Username must not exceed ${max} characters`,

  USERNAME_INVALID: "Username can only contain lowercase letters, numbers, and underscores",

  USERNAME_TAKEN: "Username is already taken",

  PASSWORD_TOO_SHORT: (min: number) => `Password must be at least ${min} characters`,

  PASSWORD_TOO_LONG: (max: number) => `Password must not exceed ${max} characters`,
} as const;

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

const VALIDATION_ERRORS = {
  GENERIC: "Validation Error",

  INVALID_REQUEST: "Invalid request",
  INVALID_INPUT: "One or more fields contain invalid values",

  REQUIRED_FIELD: (field: string) => `${field} is required`,

  INVALID_FIELD: (field: string) => `${field} is invalid`,

  FIELD_TOO_SHORT: (field: string, min: number) => `${field} must be at least ${min} characters`,

  FIELD_TOO_LONG: (field: string, max: number) => `${field} must not exceed ${max} characters`,
} as const;

// ─────────────────────────────────────────────
// User
// ─────────────────────────────────────────────

const USER_ERRORS = {
  NOT_FOUND: "User not found",
  DOESNT_EXIST: "User doesn't exist",
  ALREADY_EXISTS: "User already exists",

  NOT_FOUND_BY_ID: (id: string) => `User with ID "${id}" was not found`,

  EMAIL_ALREADY_EXISTS: "An account with this email already exists",
} as const;

// ─────────────────────────────────────────────
// Server
// ─────────────────────────────────────────────

const SERVER_ERRORS = {
  INTERNAL_ERROR: "Something went wrong. Please try again later",
  DATABASE_ERROR: "A database error occurred",
  SERVICE_UNAVAILABLE: "Service is temporarily unavailable",
} as const;

// ─────────────────────────────────────────────
// Filters / search
// ─────────────────────────────────────────────

const FILTER_ERRORS = {
  INVALID_SORT_FIELD: (field: string) => `Invalid sort field: ${field}`,

  INVALID_DATE_RANGE: "Invalid date range",

  INVALID_ID: "Invalid ID",
} as const;

// ─────────────────────────────────────────────
// Expenses
// ─────────────────────────────────────────────

const EXPENSE_ERRORS = {
  NOT_FOUND: "Expense not found",
  NOT_OWNER_UPDATE: "Only the owner can update this expense",
  NOT_OWNER_DELETE: "Only the owner can delete this expense",
  SOURCE_CATEGORY_NOT_FOUND: "Source category not found",
} as const;

// ─────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────

const CATEGORY_ERRORS = {
  NOT_FOUND: "Category not found",
  NOT_OWNER: "Only the category creator can manage this category",
  NOT_IN_BUCKET: "Category does not belong to this bucket",
  HAS_EXPENSES: "Cannot delete category with existing expenses. Reassign or delete expenses first.",
  FROM_TO_REQUIRED: "from and to query params are required",
} as const;

// ─────────────────────────────────────────────
// Buckets / membership
// ─────────────────────────────────────────────

const BUCKET_ERRORS = {
  NOT_FOUND: "Bucket not found",
  NOT_MEMBER: "Not a member of this bucket",
  HAS_EXPENSES: "Cannot delete bucket with expenses",
  ALREADY_MEMBER_BUCKET: "User is already a member of this bucket",
  ALREADY_MEMBER: "User is already a member",
  ALREADY_MEMBER_SELF: "You are already a member",
  REQUEST_PENDING: "Your request is pending owner approval",
  ALREADY_PENDING: "Request already pending",
  REQUEST_NOT_FOUND: "Request not found",
  MEMBER_NOT_FOUND: "Member not found",
  IS_PERSONAL: "This bucket cannot be shared",
  PERSONAL_ACTION_NOT_ALLOWED: "This action is not allowed on the personal bucket",
  OWNER_CANNOT_LEAVE: "Owner cannot leave the bucket. Delete the bucket instead.",
  NOT_JOIN_REQUEST: "Only join requests can be approved here",
  OWNER_ONLY: "Only the bucket owner can perform this action",
  NOT_INVITED: "You were not invited to this bucket",
} as const;

// ─────────────────────────────────────────────
// Budgets
// ─────────────────────────────────────────────

const BUDGET_ERRORS = {
  NOT_FOUND: "Budget not found",
  NOT_OWNER_EDIT: "Only the owner can edit this budget",
  NOT_OWNER_DELETE: "Only the owner can delete this budget",
  ALREADY_EXISTS: "Budget already exists for this bucket/category/period",
} as const;

// ─────────────────────────────────────────────
// Error codes (AppError `code` field)
// ─────────────────────────────────────────────

const ERROR_CODES = {
  NOT_FOUND: "NOT_FOUND",
  NOT_OWNER: "NOT_OWNER",
  NOT_A_MEMBER: "NOT_A_MEMBER",
  CATEGORY_NOT_IN_BUCKET: "CATEGORY_NOT_IN_BUCKET",
  HAS_EXPENSES: "HAS_EXPENSES",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  USER_DOESNT_EXIST: "USER_DOESN'T_EXIST",
  ALREADY_MEMBER: "ALREADY_MEMBER",
  ALREADY_PENDING: "ALREADY_PENDING",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  REQUEST_PENDING: "REQUEST_PENDING",
  OWNER_CANNOT_LEAVE: "OWNER_CANNOT_LEAVE",
  BUCKET_IS_PERSONAL: "BUCKET_IS_PERSONAL",
  NOT_JOIN_REQUEST: "NOT_JOIN_REQUEST",
  OWNER_ONLY: "OWNER_ONLY",
  NOT_INVITED: "NOT_INVITED",
  EMAIL_EXISTS: "EMAIL_EXISTS",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_SORT_FIELD: "INVALID_SORT_FIELD",
} as const;

// ─────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────

export {
  AUTH_ERRORS,
  SIGNUP_ERRORS,
  VALIDATION_ERRORS,
  USER_ERRORS,
  SERVER_ERRORS,
  FILTER_ERRORS,
  EXPENSE_ERRORS,
  CATEGORY_ERRORS,
  BUCKET_ERRORS,
  BUDGET_ERRORS,
  ERROR_CODES,
};
