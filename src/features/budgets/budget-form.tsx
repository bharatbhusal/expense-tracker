/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/modals/dialog";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchAllBuckets } from "@/store/slices/bucketSlice";
import { createBudget, updateBudget } from "@/store/slices/budgetSlice";
import { budgetsApi } from "@/lib/api/budgets";
import type { BudgetItem } from "@/constants/types/budget.types";
import type { CategoryItem } from "@/constants/types/expense.types";

type Props = {
  open: boolean;
  onClose: () => void;
  budget?: BudgetItem | null;
};

export function BudgetFormDialog({ open, onClose, budget }: Props) {
  const dispatch = useAppDispatch();
  const buckets = useAppSelector((s) => s.buckets.allBuckets);
  const isEditing = !!budget;

  const [bucketId, setBucketId] = useState(budget?.bucketId ?? "");
  const [categoryId, setCategoryId] = useState<string | "">(budget?.categoryId ?? "");
  const [amount, setAmount] = useState(String(budget?.amount ?? ""));
  const [period, setPeriod] = useState<BudgetItem["period"]>(budget?.period ?? "monthly");
  const [loading, setLoading] = useState(false);
  const [cats, setCats] = useState<CategoryItem[]>([]);

  // reset when budget changes or open
  useEffect(() => {
    if (open) {
      setBucketId(budget?.bucketId ?? buckets[0]?._id ?? "");
      setCategoryId(budget?.categoryId ?? "");
      setAmount(String(budget?.amount ?? ""));
      setPeriod(budget?.period ?? "monthly");
      if (buckets.length === 0) dispatch(fetchAllBuckets());
    }
  }, [open, budget, buckets, dispatch]);

  useEffect(() => {
    if (!open || !bucketId) return;
    budgetsApi
      .searchCategories(bucketId)
      .then((r) => setCats(r.items))
      .catch(() => setCats([]));
  }, [open, bucketId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!bucketId) return toast.error("Select a bucket");
    if (!num || num <= 0) return toast.error("Enter a valid amount");

    setLoading(true);
    try {
      if (isEditing && budget) {
        await dispatch(
          updateBudget({
            id: budget._id,
            data: {
              bucketId,
              categoryId: categoryId || null,
              amount: num,
              period,
            },
          }),
        ).unwrap();
        toast.success("Budget updated");
      } else {
        await dispatch(
          createBudget({
            bucketId,
            categoryId: categoryId || null,
            amount: num,
            period,
          }),
        ).unwrap();
        toast.success("Budget created");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save budget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Budget" : "New Budget"}
      subtitle={isEditing ? "Update budget" : "Create budget per bucket/category"}
      description={
        isEditing
          ? "Update amount, period or move to another bucket"
          : "At most one per bucket/category/period"
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label>Bucket</Label>
          <Select value={bucketId} onChange={(e) => setBucketId(e.target.value)}>
            {buckets.map((b) => (
              <option key={b._id} value={b._id}>
                {b.icon ?? "📁"} {b.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Category (optional — leave empty for bucket budget)</Label>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Bucket budget (no category)</option>
            {cats.map((c) => (
              <option key={c._id} value={c._id}>
                {c.emoji ?? "🏷️"} {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Period</Label>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value as BudgetItem["period"])}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Amount (INR)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : isEditing ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AddBudgetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <BudgetFormDialog open={open} onClose={onClose} budget={null} />;
}
