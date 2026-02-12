// app/sitemap.ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getPublicBaseUrl } from "@/lib/siteConfig";

function getBaseUrl() {
  return getPublicBaseUrl();
}

function isDatabaseUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Environment variable not found: DATABASE_URL") ||
    message.includes("Can't reach database server")
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  // Статические страницы
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/shop",
    "/blog",
    "/about",
    "/contacts",
    "/ask",
  ].map((path) => ({
    url: `${baseUrl}${path || "/"}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  try {
    // Динамические товары
    const products = await prisma.product.findMany({
      select: { id: true, updatedAt: true },
    });

    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${baseUrl}/shop/${p.id}`,
      lastModified: p.updatedAt || new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    // Динамические посты блога
    const posts = await prisma.post.findMany({
      select: { slug: true, updatedAt: true },
    });

    const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
      url: `${baseUrl}/blog/${p.slug}`,
      lastModified: p.updatedAt || new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    // Можно позже добавить другие динамические сущности (категории и т.п.)

    return [...staticRoutes, ...productRoutes, ...postRoutes];
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      console.warn("Sitemap dynamic routes skipped: database is unavailable.");
      return staticRoutes;
    }

    throw error;
  }
}
