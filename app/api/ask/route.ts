import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

function tokenizeQuery(input: string) {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .map((x) => x.trim())
        .filter((x) => x.length >= 3),
    ),
  ).slice(0, 6);
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (ip) {
    const rl = checkRateLimit(`ask:${ip}`, 12, 60_000);
    if (!rl.ok) {
      return new Response("Too many requests", {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      });
    }
  }

  const { query } = await req.json();

  if (!query || String(query).trim().length < 3) {
    return new Response("Query too short", { status: 400 });
  }

  const normalizedQuery = String(query).trim();
  const tokens = tokenizeQuery(normalizedQuery);

  const [products, posts, brands] = await Promise.all([
    prisma.product.findMany({
      take: 12,
      include: { brand: true },
      orderBy: [{ isPopular: "desc" }, { createdAt: "desc" }],
      where: tokens.length
        ? {
            OR: [
              { name: { contains: normalizedQuery, mode: "insensitive" } },
              { description: { contains: normalizedQuery, mode: "insensitive" } },
              { category: { contains: normalizedQuery, mode: "insensitive" } },
              { brand: { name: { contains: normalizedQuery, mode: "insensitive" } } },
              ...tokens.flatMap((token) => [
                { name: { contains: token, mode: "insensitive" as const } },
                { description: { contains: token, mode: "insensitive" as const } },
                { category: { contains: token, mode: "insensitive" as const } },
                { brand: { name: { contains: token, mode: "insensitive" as const } } },
              ]),
            ],
          }
        : undefined,
    }),
    prisma.post.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      where: tokens.length
        ? {
            OR: [
              { title: { contains: normalizedQuery, mode: "insensitive" } },
              { content: { contains: normalizedQuery, mode: "insensitive" } },
              ...tokens.flatMap((token) => [
                { title: { contains: token, mode: "insensitive" as const } },
                { content: { contains: token, mode: "insensitive" as const } },
              ]),
            ],
          }
        : undefined,
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      select: { name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 50,
    }),
  ]);

  const brandsLine = brands.length
    ? `ДОСТУПНЫЕ БРЕНДЫ: ${brands.map((b) => b.name).join(", ")}`
    : "";

  const context = [
    brandsLine,
    ...products.map(
      (p) =>
        `ТОВАР: ${p.name}${p.brand?.name ? ` (${p.brand.name})` : ""} — ${p.description}`,
    ),
    ...posts.map((a) => `СТАТЬЯ: ${a.title} — ${a.content.slice(0, 600)}`),
  ]
    .filter(Boolean)
    .join("\n\n");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({
      answer:
        "ИИ не настроен (нет OPENAI_API_KEY). Добавьте ключ и повторите вопрос.",
      usedContext: context.slice(0, 1500),
    });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Ты консультант по косметике/фитопродукции. Отвечай кратко, точно, с оговорками по безопасности. Если нет данных, говори честно. Всегда учитывай бренды из контекста и используй их в рекомендациях, когда это уместно.",
        },
        {
          role: "user",
          content: `Вопрос: ${normalizedQuery}\n\nКонтекст:\n${context}`,
        },
      ],
      temperature: 0.2,
    }),
  });

  const data = await res.json().catch(() => ({} as any));
  const answer = data?.choices?.[0]?.message?.content ?? "Не удалось получить ответ.";

  return Response.json({ answer });
}
