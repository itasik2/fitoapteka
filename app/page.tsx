import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import {
  SITE_BRAND,
  SITE_HERO_SUBTITLE,
  SITE_HERO_TITLE,
  SITE_NICHE_LABEL,
} from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${SITE_BRAND} – ${SITE_NICHE_LABEL}`,
  description: `Магазин ${SITE_BRAND}: ${SITE_NICHE_LABEL} с аккуратным подбором и доставкой по Казахстану.`,
};

export default async function Home() {
  const [popular, newArrivals, reviews] = await Promise.all([
    prisma.product
      .findMany({
        where: { isPopular: true },
        include: { brand: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
      .catch(() => []),
    prisma.product
      .findMany({
        include: { brand: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
      .catch(() => []),
    prisma.review
      .findMany({
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      })
      .catch(() => []),
  ]);

  return (
    <main className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-lime-50 to-white p-8 md:p-12">
        <div className="absolute -top-16 -right-16 h-52 w-52 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-lime-200/40 blur-3xl" />

        <div className="relative z-10 max-w-3xl">
          <div className="mb-4 inline-flex rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-medium text-emerald-700">
            Фитоаптека • Здоровье • Казахстан
          </div>

          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-emerald-950">
            {SITE_HERO_TITLE}
          </h1>
          <p className="mt-3 text-emerald-900/80 max-w-2xl">{SITE_HERO_SUBTITLE}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/shop" className="btn bg-emerald-700 hover:bg-emerald-800">
              Перейти в каталог
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
            >
              О бренде
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          ["Проверенные категории", "Витамины, фиточаи, БАДы и сопутствующие товары"],
          ["Честный подбор", "Понятные описания и аккуратные рекомендации"],
          ["Быстрая доставка", "По Павлодару и другим городам Казахстана"],
        ].map(([title, text]) => (
          <div key={title} className="rounded-2xl border bg-white p-4">
            <h3 className="font-semibold text-emerald-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-600">{text}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold">Популярные товары</h2>
          <Link href="/shop" className="text-sm text-gray-500 hover:underline">
            Смотреть весь каталог
          </Link>
        </div>

        {popular.length === 0 ? (
          <div className="text-sm text-gray-500">
            Пока нет отмеченных популярных товаров. Отметь нужные позиции в админке.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {popular.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold">Новинки</h2>
          <Link href="/shop" className="text-sm text-gray-500 hover:underline">
            Смотреть весь каталог
          </Link>
        </div>

        {newArrivals.length === 0 ? (
          <div className="text-sm text-gray-500">Пока нет товаров.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Отзывы клиентов</h2>

        {reviews.length === 0 ? (
          <div className="text-sm text-gray-500">Пока нет отзывов.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-3xl border p-5 bg-white/80 backdrop-blur">
                <div className="text-sm font-medium">{r.name}</div>
                <div className="text-xs text-gray-500 mt-1">Оценка: {r.rating}/5</div>
                <p className="text-sm text-gray-700 mt-3 whitespace-pre-line">{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
