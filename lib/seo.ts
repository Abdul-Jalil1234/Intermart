import { Metadata } from "next";
import { Product, Category } from "@/sanity.types";
import { urlFor } from "@/sanity/lib/image";
import { siteConfig } from "@/config/site";
import { contactConfig } from "@/config/contact";
import { formatCurrency } from "@/lib/currency";

const BASE_URL = siteConfig.url;

/**
 * Generate metadata for product pages
 */
export function generateProductMetadata(product: any): Metadata {
  const title = product.name || "Product";
  const description =
    product.description ||
    `Buy ${title} online at ${siteConfig.displayName}. ${
      product.price ? `Price: ${formatCurrency(product.price)}` : ""
    }`;
  const imageUrl = product.images?.[0]
    ? urlFor(product.images[0]).url()
    : siteConfig.logo.src;
  const url = `${BASE_URL}/product/${product.slug?.current}`;

  // Extract brand name if it's populated
  const brandName =
    typeof product.brand === "object" ? product.brand?.name : "";

  return {
    title,
    description,
    keywords: [
      product.name || "",
      brandName || "",
      "buy online",
      "shop",
      "e-commerce",
    ].filter(Boolean),
    openGraph: {
      type: "website",
      url,
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      siteName: siteConfig.displayName,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Generate metadata for category pages
 */
export function generateCategoryMetadata(
  category: Category,
  productCount: number = 0
): Metadata {
  const title = category.title || "Category";
  const description =
    category.description ||
    `Browse ${productCount} products in ${title} category at ${siteConfig.displayName}. Find the best deals and quality items.`;
  const imageUrl = category.image
    ? urlFor(category.image).url()
    : siteConfig.logo.src;
  const url = `${BASE_URL}/category/${category.slug?.current}`;

  return {
    title,
    description,
    keywords: [
      category.title || "",
      "category",
      "shop",
      "buy online",
      "e-commerce",
      "products",
    ].filter(Boolean),
    openGraph: {
      type: "website",
      url,
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      siteName: siteConfig.displayName,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Generate Product Schema (JSON-LD) for rich snippets
 */
export function generateProductSchema(product: any) {
  const imageUrl = product.images?.[0] ? urlFor(product.images[0]).url() : "";

  // Extract brand name if it's populated
  const brandName =
    typeof product.brand === "object" ? product.brand?.name : siteConfig.displayName;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: imageUrl,
    sku: product._id,
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    offers: {
      "@type": "Offer",
      url: `${BASE_URL}/product/${product.slug?.current}`,
      priceCurrency: siteConfig.currency.code,
      price: product.price,
      priceValidUntil: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
      )
        .toISOString()
        .split("T")[0],
      availability:
        product.stock && product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(product.averageRating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.averageRating,
        reviewCount: product.totalReviews || 0,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
}

/**
 * Generate BreadcrumbList Schema (JSON-LD)
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };
}

/**
 * Generate Organization Schema (JSON-LD)
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.displayName,
    url: BASE_URL,
    logo: siteConfig.logo.src.startsWith("http")
      ? siteConfig.logo.src
      : `${BASE_URL}${siteConfig.logo.src}`,
    description: siteConfig.description,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: contactConfig.company.phone,
      contactType: "customer service",
      areaServed: process.env.NEXT_PUBLIC_COUNTRY_CODE || "MU",
      availableLanguage: "en",
    },
    sameAs: Object.values(contactConfig.socialMedia).filter(
      (url) => url && url !== "#"
    ),
  };
}

/**
 * Generate WebSite Schema (JSON-LD) with search action
 */
export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.displayName,
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/shop?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generate ItemList Schema for product listings
 */
export function generateItemListSchema(products: any[], listName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${BASE_URL}/product/${product.slug?.current}`,
      name: product.name,
    })),
  };
}

/**
 * Generate Review Schema for product reviews
 */
export function generateReviewSchema(reviews: any[], product: Product) {
  if (!reviews || reviews.length === 0) return null;

  const reviewSchemas = reviews.map((review) => ({
    "@type": "Review",
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    author: {
      "@type": "Person",
      name: review.userName || "Anonymous",
    },
    reviewBody: review.comment,
    datePublished: review._createdAt,
  }));

  return reviewSchemas;
}

/**
 * Generate FAQ Schema
 */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Helper to create canonical URL
 */
export function getCanonicalUrl(path: string): string {
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Generate metadata for homepage
 */
export function generateHomeMetadata(): Metadata {
  const title = `${siteConfig.displayName} - ${siteConfig.tagline}`;
  return {
    title,
    description: siteConfig.description,
    keywords: [
      "online supermarket",
      "grocery delivery",
      "fresh produce",
      "household essentials",
      "best deals",
      siteConfig.displayName,
    ],
    openGraph: {
      type: "website",
      url: BASE_URL,
      title,
      description: siteConfig.description,
      images: [
        {
          url: siteConfig.logo.src,
          width: siteConfig.logo.width,
          height: siteConfig.logo.height,
          alt: siteConfig.logo.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: siteConfig.description,
      images: [siteConfig.logo.src],
    },
    alternates: {
      canonical: BASE_URL,
    },
  };
}
