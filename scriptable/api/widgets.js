// ─────────────────────────────────────────────────────────────────────────────
// api/widgets.js
// Widget-level data layer: composes low-level endpoints + auth into flat,
// view-ready objects for each Scriptable widget. Widgets themselves stay
// thin — single `await widgets.xxx({bucketId})` then direct component mapping.
// All functions resolve bucketId via `param || me().bucketId` so callers can
// pass widgetParameter or rely on logged-in user's bucket.
// ─────────────────────────────────────────────────────────────────────────────

const auth = importModule("api/auth");
const endpoints = importModule("api/endpoints");

module.exports = {
  budgetAccessory,
  budgetsWidget,
  categoryMonth,
  monthOverview,
  overviewAccessory,
  budgetOverviewAccessory, // combined budget + perDay accessory
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolve bucketId from widgetParameter or authenticated user.
// Empty/whitespace param → fetch `me().bucketId`. Swallows auth errors and
// returns "" so caller can show "Set bucket ID" empty state.
// ─────────────────────────────────────────────────────────────────────────────
async function resolveBucketId(paramId) {
  let bucketId = String(paramId || "").trim();
  if (!bucketId) {
    try {
      const me = await auth.me();
      bucketId = me?.bucketId || "";
    } catch {}
  }
  return bucketId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Budget accessory (Lock Screen rectangular): bucket + bucket-level budget
// Picks monthly > yearly > weekly > first. Returns flat {bucketId, bucket,
// budget: pick, bucketBudgets} for direct rendering.
// ─────────────────────────────────────────────────────────────────────────────
async function budgetAccessory({ bucketId: paramId } = {}) {
  const bucketId = await resolveBucketId(paramId);
  if (!bucketId) return { bucketId: "", bucket: null, budget: null, bucketBudgets: [] };
  const buckets = await endpoints.buckets({ page: 1, pageSize: 20 });
  const bucket = buckets.find((b) => b && b._id === bucketId) || null;
  if (!bucket) return { bucketId, bucket: null, budget: null, bucketBudgets: [] };
  const allBudgets = await endpoints.budgets({ bucketId });
  const bucketBudgets = allBudgets.filter((b) => b.categoryId === null);
  if (!bucketBudgets.length) return { bucketId, bucket, budget: null, bucketBudgets };
  // Prefer monthly, fallback yearly/weekly/first — matches widget priority
  const pick =
    bucketBudgets.find((b) => b.period === "monthly") ||
    bucketBudgets.find((b) => b.period === "yearly") ||
    bucketBudgets.find((b) => b.period === "weekly") ||
    bucketBudgets[0];
  return { bucketId, bucket, budget: pick, bucketBudgets };
}

// ─────────────────────────────────────────────────────────────────────────────
// bucketFor: display bucket from the budgets response when possible; only falls
// back to a buckets() lookup when an explicit param produced no budgets (so
// "Bucket Not Found" stays honest). A param-less run already proved the bucket
// exists via me(), and the budgets items carry bucketName/bucketIcon.
// ponytail: keeps the common widget path free of the extra buckets() round-trip
// ─────────────────────────────────────────────────────────────────────────────
async function bucketFor(bucketId, budgets, paramId) {
  if (budgets.length)
    return { name: budgets[0].bucketName || "Bucket", icon: budgets[0].bucketIcon || "📊" };
  if (String(paramId || "").trim()) {
    const found = (await endpoints.buckets({ page: 1, pageSize: 20 })).find(
      (b) => b && b._id === bucketId,
    );
    return found ? { name: found.name || "Bucket", icon: found.icon || "📊" } : null;
  }
  return { name: "Personal", icon: "📊" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Budgets large widget: bucket + split budgets (bucket vs top 3 categories)
// Returns {bucket, bucketName, bucketBudgets, categoryBudgets}
// ─────────────────────────────────────────────────────────────────────────────
async function budgetsWidget({ bucketId: paramId } = {}) {
  const bucketId = await resolveBucketId(paramId);
  if (!bucketId) return { bucketId: "", bucket: null, bucketBudgets: [], categoryBudgets: [] };
  const inBucket = await endpoints.budgets({ bucketId });
  const bucketBudgets = inBucket.filter((b) => b.categoryId === null);
  const categoryBudgets = inBucket
    .filter((b) => b.categoryId !== null)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);
  const bucket = await bucketFor(bucketId, inBucket, paramId);
  if (!bucket) return { bucketId, bucket: null, bucketBudgets, categoryBudgets };
  return { bucketId, bucket, bucketName: bucket.name, bucketBudgets, categoryBudgets };
}

// ─────────────────────────────────────────────────────────────────────────────
// Category-month widget: bucket + categories with stats + totalSpend
// ─────────────────────────────────────────────────────────────────────────────
async function categoryMonth({ bucketId: paramId } = {}) {
  const param = String(paramId || "").trim();
  // No param → personal bucket; server resolves via PERSONAL preset. One call
  // instead of auth/me + buckets + stats — widgets get killed on the Home
  // Screen if they don't reach Script.setWidget before the execution budget.
  if (!param) {
    const categories = await endpoints.categoriesWithStats({});
    const totalSpend = categories.reduce((sum, c) => sum + (c.total || 0), 0);
    // ponytail: truthy sentinels — bucket.icon falls back in accessory renders,
    // bucketId only guards the top-level "Set a bucket ID" checks
    return {
      bucketId: "personal",
      bucket: { icon: "" },
      bucketName: "Personal",
      categories,
      totalSpend,
    };
  }
  const buckets = await endpoints.buckets({ page: 1, pageSize: 20 });
  const bucket = buckets.find((b) => b && b._id === param) || null;
  if (!bucket) return { bucketId: param, bucket: null, categories: [], totalSpend: 0 };
  const categories = await endpoints.categoriesWithStats({ bucketId: param });
  const totalSpend = categories.reduce((sum, c) => sum + (c.total || 0), 0);
  return { bucketId: param, bucket, bucketName: bucket.name || "Bucket", categories, totalSpend };
}

// ─────────────────────────────────────────────────────────────────────────────
// Month overview widget: bucket + latest expenses + totals
// totalSpend is sum of returned items (THIS_MONTH page 1, 50)
// ─────────────────────────────────────────────────────────────────────────────
async function monthOverview({ bucketId: paramId } = {}) {
  const param = String(paramId || "").trim();
  // No param → personal bucket; server resolves via PERSONAL preset. One call
  // instead of auth/me + buckets + expenses — widgets get killed on the Home
  // Screen if they don't reach Script.setWidget before the execution budget.
  if (!param) {
    const { items, total } = await endpoints.expenses({ page: 1, pageSize: 50 });
    const totalSpend = items.reduce((sum, e) => sum + (e.amount || 0), 0);
    // ponytail: truthy sentinels — bucket.icon is used in accessory renders and
    // falls back, bucketId only guards the top-level "Set a bucket ID" checks
    return {
      bucketId: "personal",
      bucket: { icon: "" },
      bucketName: "Personal",
      expenses: items,
      total,
      totalSpend,
    };
  }
  const buckets = await endpoints.buckets({ page: 1, pageSize: 20 });
  const bucket = buckets.find((b) => b && b._id === param) || null;
  if (!bucket) return { bucketId: param, bucket: null, expenses: [], total: 0, totalSpend: 0 };
  const { items, total } = await endpoints.expenses({ bucketId: param, page: 1, pageSize: 50 });
  const totalSpend = items.reduce((sum, e) => sum + (e.amount || 0), 0);
  return {
    bucketId: param,
    bucket,
    bucketName: bucket.name || "Bucket",
    expenses: items,
    total,
    totalSpend,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview accessory (Lock Screen rectangular): totalSpend + perDay
// ─────────────────────────────────────────────────────────────────────────────
async function overviewAccessory({ bucketId: paramId } = {}) {
  const bucketId = await resolveBucketId(paramId);
  // overview handles undefined → PERSONAL fallback
  const { totalSpend, perDay } = await endpoints.overview({
    bucketId: bucketId || undefined,
  });
  return { bucketId, totalSpend, perDay };
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined budget + overview accessory:
// Same as budgetAccessory but also fetches perDay spend so widget can show
// "Day X of Y" left + "590/day" right. Reuses budget pick logic + overview.
// Returns {bucketId, bucket, budget: pick, bucketBudgets, perDay, totalSpend}
// ─────────────────────────────────────────────────────────────────────────────
async function budgetOverviewAccessory({ bucketId: paramId } = {}) {
  const bucketId = await resolveBucketId(paramId);
  if (!bucketId)
    return {
      bucketId: "",
      bucket: null,
      budget: null,
      bucketBudgets: [],
      perDay: 0,
      totalSpend: 0,
    };
  // Budgets + overview in parallel — two independent calls, no buckets() lookup
  const [allBudgets, overview] = await Promise.all([
    endpoints.budgets({ bucketId }),
    endpoints.overview({ bucketId }),
  ]);
  const bucketBudgets = allBudgets.filter((b) => b.categoryId === null);
  const bucket = await bucketFor(bucketId, allBudgets, paramId);
  if (!bucket)
    return { bucketId, bucket: null, budget: null, bucketBudgets, perDay: 0, totalSpend: 0 };
  if (!bucketBudgets.length) {
    // No budget: still return perDay for header context
    return {
      bucketId,
      bucket,
      budget: null,
      bucketBudgets,
      perDay: overview.perDay,
      totalSpend: overview.totalSpend,
    };
  }
  const pick =
    bucketBudgets.find((b) => b.period === "monthly") ||
    bucketBudgets.find((b) => b.period === "yearly") ||
    bucketBudgets.find((b) => b.period === "weekly") ||
    bucketBudgets[0];
  return {
    bucketId,
    bucket,
    budget: pick,
    bucketBudgets,
    perDay: overview.perDay,
    totalSpend: overview.totalSpend,
  };
}
