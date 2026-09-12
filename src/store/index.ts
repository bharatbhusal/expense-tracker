import { combineReducers, configureStore, type UnknownAction } from "@reduxjs/toolkit";
import {
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  type PersistConfig,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import autoMergeLevel2 from "redux-persist/lib/stateReconciler/autoMergeLevel2";

import authReducer from "./slices/authSlice";
import uiReducer from "./slices/uiSlice";
import expenseReducer from "./slices/expenseSlice";
import categoryReducer from "./slices/categorySlice";
import bucketReducer from "./slices/bucketSlice";
import budgetReducer from "./slices/budgetSlice";
import filtersReducer, { initialFiltersState } from "./slices/filtersSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  expenses: expenseReducer,
  categories: categoryReducer,
  buckets: bucketReducer,
  budgets: budgetReducer,
  filters: filtersReducer,
});

type RootReducerState = ReturnType<typeof rootReducer>;

const persistConfig: PersistConfig<RootReducerState> = {
  key: "root",
  storage,
  stateReconciler: autoMergeLevel2 as PersistConfig<RootReducerState>["stateReconciler"],
  whitelist: ["auth", "ui", "expenses", "categories", "filters", "buckets", "budgets"],
  version: 2,
  migrate: ((state: unknown) => {
    const s = state as Partial<RootReducerState> | undefined;
    // ponytail: v1 stored flat presets (bucketPreset/datePreset/…); v2 uses
    // discriminated unions — reset filters once instead of reading stale shapes.
    const filters = s?.filters as unknown as
      Record<string, { filterCriteria?: object }> | undefined;
    const isLegacy = filters
      ? Object.values(filters).some(
          (v) =>
            v?.filterCriteria &&
            ("bucketPreset" in v.filterCriteria || "datePreset" in v.filterCriteria),
        )
      : false;
    if (isLegacy) {
      return Promise.resolve({
        ...(s as object),
        filters: initialFiltersState,
      } as unknown as RootReducerState & { _persist: unknown });
    }
    if (s?.filters && "filterCriteria" in (s.filters as unknown as Record<string, unknown>)) {
      return Promise.resolve({
        ...(s as object),
        filters: initialFiltersState,
      } as unknown as RootReducerState & { _persist: unknown });
    }
    if (s?.filters) {
      const cur = s.filters as unknown as Record<string, unknown>;
      let changed = false;
      for (const k of Object.keys(initialFiltersState) as Array<keyof typeof initialFiltersState>) {
        if (!(k in cur)) {
          (cur as Record<string, unknown>)[k] = (initialFiltersState as Record<string, unknown>)[k];
          changed = true;
        }
      }
      if (changed) return Promise.resolve(s as unknown as RootReducerState & { _persist: unknown });
    }
    return Promise.resolve(s as unknown as RootReducerState & { _persist: unknown });
  }) as PersistConfig<RootReducerState>["migrate"],
};

const persistedReducer = persistReducer<RootReducerState, UnknownAction>(
  persistConfig,
  rootReducer,
);

// ponytail: logout clears every slice (memory + persisted) — one place fixes
// the stale-data after logout without touching each slice; purge follows via persist
const rootReducerWithReset = (
  state: Parameters<typeof persistedReducer>[0],
  action: Parameters<typeof persistedReducer>[1],
): ReturnType<typeof persistedReducer> => {
  if ((action as UnknownAction).type === "auth/logout/fulfilled") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state = undefined as any;
  }
  return persistedReducer(state, action);
};

export const makeStore = () =>
  configureStore({
    reducer: rootReducerWithReset,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
