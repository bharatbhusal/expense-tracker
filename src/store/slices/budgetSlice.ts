import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { budgetsApi } from "@/lib/api/budgets";
import type {
  BudgetGroup,
  CreateBudgetPayload,
  UpdateBudgetPayload,
} from "@/constants/types/budget.types";

type BudgetState = {
  groups: BudgetGroup[];
  loading: boolean;
  error: string | null;
};

const initialState: BudgetState = {
  groups: [],
  loading: false,
  error: null,
};

export const fetchBudgets = createAsyncThunk("budgets/fetch", async () => budgetsApi.list());

export const createBudget = createAsyncThunk(
  "budgets/create",
  async (payload: CreateBudgetPayload, { dispatch }) => {
    const res = await budgetsApi.create(payload);
    dispatch(fetchBudgets());
    return res;
  },
);

export const updateBudget = createAsyncThunk(
  "budgets/update",
  async (payload: { id: string; data: UpdateBudgetPayload }, { dispatch }) => {
    const res = await budgetsApi.update(payload.id, payload.data);
    dispatch(fetchBudgets());
    return res;
  },
);

export const deleteBudget = createAsyncThunk("budgets/delete", async (id: string, { dispatch }) => {
  const res = await budgetsApi.remove(id);
  dispatch(fetchBudgets());
  return res;
});

const budgetSlice = createSlice({
  name: "budgets",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBudgets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload;
      })
      .addCase(fetchBudgets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to fetch budgets";
      });
  },
});

export default budgetSlice.reducer;
