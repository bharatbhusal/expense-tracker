import { z } from "zod";
import { HEX_COLOR_REGEX, USERNAME_REGEX } from "../constants/regex";
import { FILTER_ERRORS, SIGNUP_ERRORS } from "../constants/error-messages";
import {
  AUDIT_SORTABLE_FIELDS,
  BUCKET_SORTABLE_FIELDS,
  CATEGORY_SORTABLE_FIELDS,
  DISTRIBUTION_DIMENSIONS,
  EXPENSE_SORTABLE_FIELDS,
  NON_CUSTOM_DATE_PRESETS,
  SORT_DIRECTIONS,
} from "../constants/filter-enums";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USER_NAME_MAX_LENGTH,
  USER_NAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/constants/validation";

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(USER_NAME_MIN_LENGTH, SIGNUP_ERRORS.NAME_TOO_SHORT(USER_NAME_MIN_LENGTH))
    .max(USER_NAME_MAX_LENGTH, SIGNUP_ERRORS.NAME_TOO_LONG(USER_NAME_MAX_LENGTH)),

  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(USERNAME_MIN_LENGTH, SIGNUP_ERRORS.USERNAME_TOO_SHORT(USERNAME_MIN_LENGTH))
    .max(USERNAME_MAX_LENGTH, SIGNUP_ERRORS.USERNAME_TOO_LONG(USERNAME_MAX_LENGTH))
    .regex(USERNAME_REGEX, SIGNUP_ERRORS.USERNAME_INVALID),

  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, SIGNUP_ERRORS.PASSWORD_TOO_SHORT(PASSWORD_MIN_LENGTH))
    .max(PASSWORD_MAX_LENGTH, SIGNUP_ERRORS.PASSWORD_TOO_LONG(PASSWORD_MAX_LENGTH)),
});

export const loginSchema = z.object({
  username: z.string().min(6).max(20),
  password: z.string().min(8),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(HEX_COLOR_REGEX).optional(),
  emoji: z.string().trim().max(8).optional(),
  bucketId: z.string(),
});

const roundedAmountSchema = z
  .number()
  .positive()
  .transform((value) => Number(value.toFixed(2)));

export const expenseSchema = z.object({
  title: z.string().min(1).max(120),
  amount: roundedAmountSchema,
  categoryId: z.string().min(1),
  bucketId: z.string().min(1),
  notes: z.string().max(400).optional(),
  images: z.array(z.string()).max(5).default([]),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      address: z.string().optional(),
    })
    .optional(),
  currency: z.string(),
  paidAt: z.iso.datetime().optional(),
});

export const bucketSchema = z.object({
  name: z.string().trim().min(1).max(50),
  icon: z.string().trim().min(1).max(8).optional(),
});

export const inviteSchema = z.object({
  username: z.string().trim().min(1).max(20),
});

const sortDirectionSchema = z.enum(SORT_DIRECTIONS);

// ponytail: 24-hex check, no mongoose import needed in validation layer.
const objectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/, FILTER_ERRORS.INVALID_ID);

const dateFilterSchema = z
  .discriminatedUnion("preset", [
    z.object({
      preset: z.enum(NON_CUSTOM_DATE_PRESETS),
    }),
    z.object({
      preset: z.literal("CUSTOM"),
      from: z.iso.datetime(),
      to: z.iso.datetime(),
    }),
  ])
  .refine((d) => d.preset !== "CUSTOM" || new Date(d.from) <= new Date(d.to), {
    message: FILTER_ERRORS.INVALID_DATE_RANGE,
  });

const bucketSelectionSchema = z.discriminatedUnion("preset", [
  z.object({ preset: z.literal("PERSONAL") }),
  z.object({ preset: z.literal("ALL") }),
  z.object({
    preset: z.literal("MULTIPLE"),
    ids: z.array(objectIdString).min(1).max(100),
  }),
]);

const ownerSelectionSchema = z.discriminatedUnion("preset", [
  z.object({ preset: z.literal("ME") }),
  z.object({ preset: z.literal("ALL") }),
  z.object({
    preset: z.literal("MULTIPLE"),
    ids: z.array(objectIdString).min(1).max(100),
  }),
]);

const categorySelectionSchema = z.discriminatedUnion("preset", [
  z.object({ preset: z.literal("ALL") }),
  z.object({
    preset: z.literal("MULTIPLE"),
    ids: z.array(objectIdString).min(1).max(100),
  }),
]);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const expenseSortSchema = z.object({
  field: z.enum(EXPENSE_SORTABLE_FIELDS).default("paidAt"),
  direction: sortDirectionSchema.default("DESC"),
});

const categorySortSchema = z.object({
  field: z.enum(CATEGORY_SORTABLE_FIELDS).default("amount"),
  direction: sortDirectionSchema.default("DESC"),
});

const bucketSortSchema = z.object({
  field: z.enum(BUCKET_SORTABLE_FIELDS).default("createdAt"),
  direction: sortDirectionSchema.default("DESC"),
});

const auditSortSchema = z.object({
  field: z.enum(AUDIT_SORTABLE_FIELDS).default("timestamp"),
  direction: sortDirectionSchema.default("DESC"),
});

export const expenseFilterSchema = z.object({
  bucket: bucketSelectionSchema.default({ preset: "ALL" }),
  category: categorySelectionSchema.default({ preset: "ALL" }),
  owner: ownerSelectionSchema.default({ preset: "ALL" }),
  date: dateFilterSchema.default({ preset: "THIS_MONTH" }),
  hasNotes: z.boolean().optional(),
  hasLocation: z.boolean().optional(),
  q: z.string().trim().max(120).optional(),
});

const categoryFilterSchema = z.object({
  bucket: bucketSelectionSchema.default({ preset: "ALL" }),
  owner: ownerSelectionSchema.default({ preset: "ALL" }),
  date: dateFilterSchema.optional(),
  q: z.string().trim().max(120).optional(),
});

const auditFilterSchema = z.object({
  bucket: bucketSelectionSchema.default({ preset: "ALL" }),
  owner: ownerSelectionSchema.default({ preset: "ALL" }),
  date: dateFilterSchema.default({ preset: "THIS_MONTH" }),
});

const bucketFilterSchema = z.object({
  date: dateFilterSchema.default({ preset: "THIS_MONTH" }),
  owner: ownerSelectionSchema.optional(),
});

export const expenseSearchSchema = z.object({
  filterCriteria: expenseFilterSchema.optional(),
  sortCriteria: expenseSortSchema.optional(),
  pagination: paginationSchema.optional(),
});

export const categorySearchSchema = z.object({
  filterCriteria: categoryFilterSchema.optional(),
  sortCriteria: categorySortSchema.optional(),
  pagination: paginationSchema.optional(),
});

export const bucketSearchSchema = z.object({
  filterCriteria: bucketFilterSchema.optional(),
  sortCriteria: bucketSortSchema.optional(),
  pagination: paginationSchema.optional(),
});

export const auditSearchSchema = z.object({
  filterCriteria: auditFilterSchema.optional(),
  sortCriteria: auditSortSchema.optional(),
  pagination: paginationSchema.optional(),
});

export const categoryDistributionSchema = z.object({
  filterCriteria: expenseFilterSchema.optional(),
});

export const chartOverviewSchema = z.object({
  filterCriteria: expenseFilterSchema.optional(),
});

export const distributionSchema = z.object({
  dimension: z.enum(DISTRIBUTION_DIMENSIONS),
  filterCriteria: expenseFilterSchema.optional(),
});

export const categoryStatsSummarySchema = z.object({
  filterCriteria: categoryFilterSchema.optional(),
  sortCriteria: categorySortSchema.optional(),
});

export const bucketStatsSchema = z.object({
  filterCriteria: expenseFilterSchema.optional(),
});

export const budgetSchema = z.object({
  bucketId: z.string().min(1),
  categoryId: z.string().nullable().optional(),
  amount: roundedAmountSchema,
  period: z.enum(["weekly", "monthly", "yearly"]),
});

export const budgetUpdateSchema = z.object({
  bucketId: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
  amount: roundedAmountSchema.optional(),
  period: z.enum(["weekly", "monthly", "yearly"]).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
