import { NextRequest } from "next/server";

import { getAuthPayload } from "@/lib/auth";
import categoryService from "@/services/category.service";

async function searchCategories(request: NextRequest) {
  const auth = await getAuthPayload();
  const body = await request.json();
  return categoryService.searchCategories(auth.id, body);
}

async function listCategoriesWithStats(request: NextRequest) {
  const auth = await getAuthPayload();
  const body = await request.json().catch(() => ({}));
  return categoryService.listCategoriesWithStats(auth.id, body);
}

async function createCategory(request: NextRequest) {
  const auth = await getAuthPayload();
  const body = await request.json();
  return categoryService.createCategory(auth, body);
}

async function getCategory(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  return categoryService.getCategory(auth.id, id);
}

async function updateCategory(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  const body = await request.json();
  return categoryService.updateCategory(auth.id, id, body);
}

async function deleteCategory(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  return categoryService.deleteCategory(auth.id, id);
}

async function getCategoryStats(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  return categoryService.getCategoryStats(auth.id, id, from, to);
}

async function getCategoryDistribution(request: NextRequest) {
  const auth = await getAuthPayload();
  const body = await request.json().catch(() => ({}));
  return categoryService.getCategoryDistribution(auth.id, body);
}

async function getCategoryStatsSummary(request: NextRequest) {
  const auth = await getAuthPayload();
  const body = await request.json().catch(() => ({}));
  return categoryService.getCategoryStatsSummary(auth.id, body);
}

const categoryController = {
  searchCategories,
  listCategoriesWithStats,
  createCategory,
  getCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  getCategoryDistribution,
  getCategoryStatsSummary,
};

export default categoryController;
