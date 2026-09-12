"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiSave, FiPlus } from "react-icons/fi";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DropdownList } from "@/components/ui/dropdown-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { getLocalDateTimeInputValue, toUtcIsoString } from "@/lib/datetime";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchAllBuckets } from "@/store/slices/bucketSlice";
import { fetchExpenseDetail, createExpense, updateExpense } from "@/store/slices/expenseSlice";
import { AddCategoryDialog } from "@/features/categories/components/add-category-dialog";
import { AddBucketDialog } from "@/features/buckets/components/add-bucket-dialog";
import { setDraftExpense, clearDraftExpense } from "@/store/slices/uiSlice";
import { expensesApi } from "@/lib/api/expenses";
import { personalBucketId, scopedCategoryRequest } from "@/lib/filters";
import type { CategoryItem, CreateExpensePayload } from "@/constants/types/expense.types";

const schema = z.object({
  title: z.string().min(1, "Enter a title"),
  amount: z.number({ error: "Enter an amount" }).positive("Amount must be greater than 0"),
  categoryId: z.string().min(1, "Choose a category"),
  paidAt: z.string().min(1, "Choose a date and time"),
  notes: z.string().optional(),
  bucketId: z.string().min(1, "Choose a bucket"),
});

type FormValues = z.infer<typeof schema>;

type ExpenseFormProps = {
  id?: string;
};

const FIELD_ORDER: (keyof FormValues)[] = [
  "amount",
  "title",
  "bucketId",
  "categoryId",
  "paidAt",
  "notes",
];

export function ExpenseForm({ id }: ExpenseFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currency = useAppSelector((s) => s.ui.currency);
  const locale = useAppSelector((s) => s.ui.locale);
  const isEditing = Boolean(id);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const buckets = useAppSelector((s) => s.buckets.allBuckets);
  const defaultBucketId = personalBucketId(buckets);
  const currentExpense = useAppSelector((s) => s.expenses.currentExpense);
  const expensesLoading = useAppSelector((s) => s.expenses.loading);
  const draftExpense = useAppSelector((s) => s.ui.draftExpense);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addBucketOpen, setAddBucketOpen] = useState(false);
  // ponytail: id lookup instead of a ref — the invalid-submit handler only
  // runs on user submit, never during render.
  const focusSummary = () => {
    document.getElementById("expense-error-summary")?.focus();
  };

  const availableBuckets = buckets.filter((b) => b.status === "accepted");

  useEffect(() => {
    if (buckets.length === 0) {
      dispatch(fetchAllBuckets());
    }
  }, [dispatch, buckets.length]);

  useEffect(() => {
    if (isEditing && id) {
      dispatch(fetchExpenseDetail(id));
    }
  }, [dispatch, isEditing, id]);

  const defaultValues = useCallback(() => {
    if (isEditing)
      return {
        title: "",
        amount: undefined,
        categoryId: "",
        paidAt: "",
        notes: "",
        bucketId: "",
      };
    if (draftExpense && draftExpense.title && draftExpense.categoryId) {
      return {
        title: draftExpense.title ?? "",
        amount: draftExpense.amount ?? undefined,
        categoryId: draftExpense.categoryId ?? "",
        paidAt: draftExpense.paidAt ?? getLocalDateTimeInputValue(),
        notes: draftExpense.notes ?? "",
        bucketId: "",
      };
    }
    return {
      title: "",
      amount: undefined,
      categoryId: "",
      paidAt: getLocalDateTimeInputValue(),
      notes: "",
      bucketId: "",
    };
  }, [isEditing, draftExpense]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(),
  });
  const {
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = form;

  const allValues = useWatch({
    control,
  }) as FormValues | undefined;

  const watchedBucketId = useWatch({
    control,
    name: "bucketId",
  });

  // ponytail: form categories are fetched locally per selected bucket so the
  // page's shared category slice keeps whatever the filters chose.
  const loadCategories = useCallback((bucketId: string) => {
    if (!bucketId) return;
    expensesApi
      .searchCategories(scopedCategoryRequest(bucketId))
      .then((r) => setCategories(r.items))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!watchedBucketId) {
      if (defaultBucketId) setValue("bucketId", defaultBucketId);
      return;
    }
    loadCategories(watchedBucketId);
  }, [watchedBucketId, defaultBucketId, setValue, loadCategories]);

  useEffect(() => {
    if (!isEditing && allValues?.title) {
      dispatch(setDraftExpense(allValues));
    }
  }, [allValues, isEditing, dispatch]);

  useEffect(() => {
    if (!isEditing) return;
    if (!currentExpense) return;

    reset({
      title: currentExpense.title,
      amount: currentExpense.amount,
      categoryId: currentExpense.categoryId,
      paidAt: getLocalDateTimeInputValue(new Date(currentExpense.paidAt)),
      notes: currentExpense.notes,
      bucketId: currentExpense.bucketId ?? "",
    });
  }, [currentExpense, reset, isEditing]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const payload: CreateExpensePayload = {
        title: values.title,
        amount: values.amount,
        categoryId: values.categoryId,
        bucketId: values.bucketId,
        paidAt: toUtcIsoString(values.paidAt),
        currency,
        images: [],
        location: { latitude: 0, longitude: 0 },
        notes: values.notes,
      };

      if (isEditing && id) {
        await dispatch(updateExpense({ id, payload })).unwrap();
        toast.success("Expense updated");
        router.replace(`/expenses/${id}`);
      } else {
        const newExpense = await dispatch(createExpense(payload)).unwrap();
        dispatch(clearDraftExpense());
        toast.success("Expense created");
        router.replace(`/expenses/${newExpense._id}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isEditing
            ? "Update failed"
            : "Failed to create expense",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditing && expensesLoading && !currentExpense) {
    return (
      <div className="h-full flex flex-col justify-between">
        <div className="flex flex-col items-center gap-6 px-4 pt-8">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-30 w-full" />
        </div>
        <div className="space-y-3 px-4">
          <div className="space-y-3 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10" />
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 flex-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const backLink = isEditing && id ? `/expenses/${id}` : "/dashboard";
  const errorEntries = FIELD_ORDER.filter((name) => errors[name]).map((name) => ({
    name,
    message: errors[name]?.message ?? "Invalid value",
  }));

  return (
    <div className="h-full flex flex-col">
      <Form {...form}>
        <form
          className="h-full flex flex-col justify-between"
          onSubmit={handleSubmit(onSubmit, focusSummary)}
          noValidate
        >
          <div className="flex flex-col items-center gap-6 px-4 pt-8">
            {errorEntries.length > 0 && (
              <div
                id="expense-error-summary"
                role="alert"
                tabIndex={-1}
                aria-labelledby="expense-error-heading"
                className="w-full max-w-md rounded-xl border border-red-600/40 bg-red-600/10 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-red-600/40"
              >
                <p id="expense-error-heading" className="text-sm font-semibold text-red-600">
                  Fix {errorEntries.length === 1 ? "this field" : "these fields"} to continue
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-red-600">
                  {errorEntries.map(({ name, message }) => (
                    <li key={name}>
                      <a href={`#expense-${name}`} className="underline underline-offset-2">
                        {message}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <FormField
              control={control}
              name="amount"
              render={({ field }) => (
                <FormItem className="w-full max-w-md">
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-2xl text-[var(--color-muted)]">
                        {(0)
                          .toLocaleString(locale, {
                            style: "currency",
                            currency,
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })
                          .replace(/[\d.,\s]/g, "")
                          .trim() || currency}
                      </span>
                      <Input
                        id="expense-amount"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="0"
                        autoFocus
                        className="h-14 pl-10 text-center text-2xl font-semibold tracking-tight"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value ? Number(event.target.value) : undefined,
                          )
                        }
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="title"
              render={({ field }) => (
                <FormItem className="w-full max-w-md">
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      id="expense-title"
                      placeholder="What was this for?"
                      className="text-center text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="notes"
              render={({ field }) => (
                <FormItem className="w-full max-w-md">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      id="expense-notes"
                      placeholder="Add a note!"
                      rows={3}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-center text-base text-[var(--color-text)] outline-none transition-all duration-200 placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-3 px-4 pb-4 text-[16px]">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={control}
                name="bucketId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bucket</FormLabel>
                    <FormControl>
                      <DropdownList
                        id="expense-bucketId"
                        aria-label="Bucket"
                        value={field.value ?? ""}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setValue("categoryId", "");
                        }}
                        options={availableBuckets.map((b) => ({
                          value: b._id as string,
                          label: b.name,
                        }))}
                        addLabel="Add new bucket"
                        onAddNew={() => setAddBucketOpen(true)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <DropdownList
                        id="expense-categoryId"
                        aria-label="Category"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={categories.map((category) => ({
                          value: category._id,
                          label: `${category.emoji} ${category.name}`,
                        }))}
                        placeholder="Category"
                        addLabel="Add new category"
                        onAddNew={() => setAddCategoryOpen(true)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={control}
              name="paidAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date and time</FormLabel>
                  <FormControl>
                    <Input
                      id="expense-paidAt"
                      type="datetime-local"
                      aria-label="Date and time"
                      value={field.value?.slice(0, 16) ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="sticky bottom-0 flex gap-2 bg-[var(--color-bg)] pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push(backLink)}
              >
                <FiArrowLeft aria-hidden="true" className="mr-1.5 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2" />
                    Saving...
                  </>
                ) : isEditing ? (
                  <>
                    <FiSave aria-hidden="true" className="mr-1.5 h-4 w-4" />
                    Save changes
                  </>
                ) : (
                  <>
                    <FiPlus aria-hidden="true" className="mr-1.5 h-4 w-4" />
                    Create expense
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      <AddCategoryDialog
        open={addCategoryOpen}
        onClose={() => setAddCategoryOpen(false)}
        onCreated={() => loadCategories(watchedBucketId ?? "")}
      />
      <AddBucketDialog open={addBucketOpen} onClose={() => setAddBucketOpen(false)} />
    </div>
  );
}
