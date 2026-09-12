import type { MetadataRoute } from "next";

const BASE_URL = "https://trackmybiryani.bharatbhusal.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/dashboard",
        "/home",
        "/expenses",
        "/buckets",
        "/categories",
        "/budgets",
        "/logs",
        "/more",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
