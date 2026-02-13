"use client";

import Link from "next/link";
import { useState } from "react";
import FavoriteButton from "./FavoriteCompareButtons";
import AddToCartButton from "./AddToCartButton";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    image: string;
    price: number;
    stock: number;
    isPopular: boolean;
    createdAt: Date | string;
    category: string;
    brand?: { name: string } | null;
    variants?: any;
  };
};

type Variant = {
  id: string;
  label: string;
  price: number;
  stock: number;
  sku?: string;
  image?: string;
};

function isNew(createdAt: Date | string, days = 14) {
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const diff = Date.now() - d.getTime();
  return diff <= days * 24 * 60 * 60 * 1000;
}

function normalizeVariants(v: any): Variant[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => ({
      id: String(x?.id ?? ""),
      label: String(x?.label ?? ""),
      price: Math.trunc(Number(x?.price) || 0),
      stock: Math.trunc(Number(x?.stock) || 0),
      sku: x?.sku ? String(x.sku) : undefined,
      image: x?.image ? String(x.image) : undefined,
    }))
    .filter((x) => x.id && x.label);
}

export default function ProductCard({ product }: ProductCardProps) {
  const newBadge = isNew(product.createdAt, 14);

  const variants = normalizeVariants(product.variants);
  const hasVariants = variants.length > 0;

  const defaultVariant =
    hasVariants
      ? variants.find((v) => (v.stock ?? 0) > 0) ?? variants[0]
      : null;

  const [variantId, setVariantId] = useState<string | null>(
    defaultVariant?.id ?? null
  );

  const selectedVariant = hasVariants
    ? variants.find((v) => v.id === variantId) ?? defaultVariant
    : null;

  const priceToShow =
    Number(selectedVariant?.price ?? product.price) || 0;
  const stockToUse = Math.trunc(
    Number(selectedVariant?.stock ?? product.stock) || 0
  );
  const inStock = stockToUse > 0;

  const imageToShow =
    selectedVariant?.image &&
    String(selectedVariant.image).trim().length > 0
      ? String(selectedVariant.image).trim()
      : product.image;

  return (
    <div className="group relative h-full flex flex-col rounded-2xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-brand-soft/50">
      
      {/* Бейджи */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
        {product.isPopular && (
          <span className="inline-flex items-center rounded-full bg-brand px-2 py-1 text-xs text-white">
            Хит
          </span>
        )}
        {newBadge && (
          <span className="inline-flex items-center rounded-full bg-brand-light px-2 py-1 text-xs text-gray-800">
            Новинка
          </span>
        )}
        {!inStock && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
            Нет в наличии
          </span>
        )}
      </div>

      {/* Избранное */}
      <div className="absolute right-3 top-3 z-10">
        <FavoriteButton productId={product.id} />
      </div>

      {/* Фото */}
      <Link
        href={`/shop/${product.id}`}
        className="block aspect-square w-full bg-brand-soft rounded-2xl mb-4 overflow-hidden"
        aria-label={`Открыть товар: ${product.name}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageToShow}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </Link>

      {/* Бренд / категория */}
      <div className="text-sm text-gray-500 px-4">
        {product.brand?.name ?? product.category}
      </div>

      {/* Название */}
      <h3 className="font-semibold line-clamp-2 min-h-[40px] px-4 text-gray-900">
        {product.name}
      </h3>

      {/* Варианты */}
      <div className="mt-2 min-h-[36px] px-4">
        {hasVariants && (
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const active = v.id === variantId;
              const disabled = (v.stock ?? 0) <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setVariantId(v.id)}
                  className={
                    "px-3 py-1 rounded-full text-xs border transition " +
                    (active
                      ? "bg-brand text-white border-brand"
                      : "bg-white border-gray-200 hover:border-brand hover:bg-brand-soft") +
                    (disabled
                      ? " opacity-40 cursor-not-allowed"
                      : "")
                  }
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Нижний блок */}
      <div className="mt-auto px-4 pb-4">
        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="font-semibold text-brand">
            {priceToShow.toLocaleString("ru-RU")} ₸
          </div>

          <AddToCartButton
            productId={product.id}
            variantId={selectedVariant?.id ?? null}
            disabled={stockToUse <= 0}
            maxStock={stockToUse}
          />
        </div>

        <div
          className={
            "mt-1 text-xs " +
            (inStock ? "text-brand" : "text-gray-400")
          }
        >
          {inStock
            ? `В наличии: ${stockToUse}`
            : "Под заказ / нет"}
        </div>

        <div className="mt-2">
          <Link
            href={`/shop/${product.id}`}
            className="text-xs text-gray-600 hover:text-brand transition"
          >
            Подробнее
          </Link>
        </div>
      </div>
    </div>
  );
}
