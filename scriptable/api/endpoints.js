// ─────────────────────────────────────────────────────────────────────────────
// api/endpoints.js
// Low-level API layer: builds request bodies, calls api/client.request,
// and normalizes responses into flat, view-ready objects for widgets.
// All date filters are THIS_MONTH — widgets never pass custom ranges.
// Bucket handling: if bucketId is set we use MULTIPLE + [bucketId],
// otherwise PERSONAL (server resolves to user's personal bucket).
// ─────────────────────────────────────────────────────────────────────────────

const { request } = importModule("api/client");

module.exports = {
  overview,
  categoriesWithStats,
  expenses,
  buckets,
  budgets,
};

// ─────────────────────────────────────────────────────────────────────────────
// Overview: POST /expenses/overview → array of {key, value}
// Normalizes to {totalSpend, perDay, expenseCount, ...} for direct use.
// Row keys from server: total_spend, spend_per_day, expense_count, etc.
// ─────────────────────────────────────────────────────────────────────────────
function overview({ bucketId } = {}) {
  const body = {
    filterCriteria: {
      date: { preset: "THIS_MONTH" },
      bucket: bucketId ? { preset: "MULTIPLE", ids: [bucketId] } : { preset: "PERSONAL" },
      category: { preset: "ALL" },
      owner: { preset: "ALL" },
    },
  };
  return request("/expenses/overview", { method: "POST", body }).then((rows) => {
    // Convert array → dict for easy key lookup
    const stats = {};
    for (const row of Array.isArray(rows) ? rows : []) stats[row.key] = Number(row.value) || 0;
    return {
      totalSpend: stats.total_spend || 0,
      perDay: stats.spend_per_day || 0,
      expenseCount: stats.expense_count || 0,
      categoriesCount: stats.categories_count || 0,
      avgAmount: stats.avg_amount || 0,
      minAmount: stats.min_amount || 0,
      maxAmount: stats.max_amount || 0,
      raw: Array.isArray(rows) ? rows : [], // kept for debugging only
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Categories with stats: POST /categories/stats → {items: [{name,stats}]}
// Maps server stats to flat {name,emoji,color,total,pct,count},
// filters out empty (total/pct 0), sorts by total desc.
// ─────────────────────────────────────────────────────────────────────────────
function categoriesWithStats({ bucketId } = {}) {
  const body = {
    filterCriteria: {
      date: { preset: "THIS_MONTH" },
      bucket: bucketId ? { preset: "MULTIPLE", ids: [bucketId] } : { preset: "PERSONAL" },
      owner: { preset: "ALL" },
    },
    sortCriteria: { field: "amount", direction: "DESC" },
  };
  return request("/categories/stats", { method: "POST", body }).then((res) => {
    if (!res?.items) return [];
    return res.items
      .map((item) => ({
        name: item.name || "Other",
        emoji: item.emoji || "💸",
        color: item.color || "#999999",
        total: Number(item.stats?.total) || 0,
        pct: Number(item.stats?.pct) || 0,
        count: Number(item.stats?.count) || 0,
      }))
      .filter((c) => c.total > 0 && c.pct > 0)
      .sort((a, b) => b.total - a.total);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Expenses: POST /expenses/search → {items, total, page, totalPages}
// Normalizes amount to Number, guarantees array + pagination numbers.
// Sorted by paidAt DESC (latest first) — matches widget "Latest Expenses".
// ─────────────────────────────────────────────────────────────────────────────
function expenses({ pageSize = 6, page = 1, bucketId } = {}) {
  const body = {
    filterCriteria: {
      date: { preset: "THIS_MONTH" },
      bucket: bucketId ? { preset: "MULTIPLE", ids: [bucketId] } : { preset: "PERSONAL" },
      category: { preset: "ALL" },
      owner: { preset: "ALL" },
    },
    sortCriteria: { field: "paidAt", direction: "DESC" },
    pagination: { page, pageSize },
  };
  return request("/expenses/search", { method: "POST", body }).then((res) => ({
    items: Array.isArray(res?.items)
      ? res.items.map((e) => ({ ...e, amount: Number(e.amount) || 0 }))
      : [],
    total: Number(res?.total) || 0,
    page: Number(res?.page) || page,
    totalPages: Number(res?.totalPages) || 1,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Buckets: POST /buckets/search → {items}
// Returns flat Bucket[] (no wrapper) for easy find by _id.
// Pagination defaults to 4, widgets that need all buckets pass 20.
// ─────────────────────────────────────────────────────────────────────────────
function buckets({ page = 1, pageSize = 4 } = {}) {
  const body = {
    filterCriteria: { date: { preset: "THIS_MONTH" } },
    sortCriteria: { field: "createdAt", direction: "DESC" },
    pagination: { page, pageSize },
  };
  return request("/buckets/search", { method: "POST", body }).then((res) =>
    Array.isArray(res?.items) ? res.items : [],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Budgets: GET /budgets → [{bucketId, budgets: [...]}, ...]
// Flattens groups, optionally filters by bucketId, maps to flat view model
// with normalized numbers and consistent null handling for category fields.
// ─────────────────────────────────────────────────────────────────────────────
function budgets({ bucketId } = {}) {
  return request("/budgets").then((groups) => {
    const flat = Array.isArray(groups)
      ? groups.flatMap((g) => (Array.isArray(g.budgets) ? g.budgets : []))
      : [];
    const filtered = bucketId ? flat.filter((b) => b && b.bucketId === bucketId) : flat;
    return filtered.map((b) => ({
      _id: b._id,
      id: b._id,
      bucketId: b.bucketId,
      bucketName: b.bucketName,
      bucketIcon: b.bucketIcon,
      categoryId: b.categoryId ?? null,
      categoryName: b.categoryName || null,
      categoryColor: b.categoryColor || "#999999",
      categoryEmoji: b.categoryEmoji || "🏷️",
      amount: Number(b.amount) || 0,
      spent: Number(b.spent) || 0,
      remaining: Number(b.remaining) || 0,
      pct: Number(b.pct) || 0,
      period: b.period,
    }));
  });
}
