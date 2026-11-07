import Container from "@/components/Container";
import Title from "@/components/Title";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getCategories } from "@/sanity/queries";
import { Category } from "@/sanity.types";
import { urlFor } from "@/sanity/lib/image";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Package, Tag } from "lucide-react";

const CategoryPage = async () => {
  const categories: Category[] = await getCategories();

  return (
    <div className="min-h-screen bg-gradient-to-br from-shop_light_bg via-white to-shop_light_pink">
      <Container className="py-10">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Categories</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="text-center mb-10">
          <Title className="text-3xl lg:text-4xl font-bold text-shop_dark_green mb-3">
            Shop by Categories
          </Title>
          <p className="text-base lg:text-lg text-dark-text max-w-2xl mx-auto mb-6">
            Discover our wide range of products organized by categories. Find
            exactly what you&apos;re looking for with ease.
          </p>

          {/* View All Products Button */}
          <div className="flex justify-center">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 bg-shop_dark_green hover:bg-shop_light_green text-white px-8 py-3 rounded-full font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Package className="w-5 h-5" />
              View All Products
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {categories.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {categories.map((category) => (
                <Link
                  key={category._id}
                  href={`/category/${category.slug?.current}`}
                  className="group relative bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 hover:border-shop_light_green transform hover:-translate-y-1"
                >
                  {/* Category Image */}
                  <div className="relative h-24 sm:h-28 lg:h-32 bg-gradient-to-br from-shop_light_pink to-shop_light_bg overflow-hidden">
                    {category.image ? (
                      <Image
                        src={urlFor(category.image).url()}
                        alt={category.title || "Category"}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 lg:w-10 lg:h-10 text-shop_light_green opacity-60" />
                      </div>
                    )}

                    {/* Subtle Overlay */}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-300" />

                    {/* Featured Badge */}
                    {category.featured && (
                      <div className="absolute top-1.5 left-1.5 bg-shop_orange text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                        <Tag className="w-2 h-2" />
                        <span className="hidden sm:inline text-xs">
                          Featured
                        </span>
                      </div>
                    )}

                    {/* Product Count - Removed as not available in Category type */}
                  </div>

                  {/* Category Content */}
                  <div className="p-3 lg:p-4">
                    <div className="flex items-start justify-between mb-1.5">
                      <h3 className="text-sm lg:text-base font-semibold text-shop_dark_green group-hover:text-shop_light_green transition-colors duration-300 line-clamp-1">
                        {category.title}
                      </h3>
                      <ArrowRight className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-shop_light_green group-hover:translate-x-0.5 transition-transform duration-300 flex-shrink-0 ml-2" />
                    </div>

                    {category.description && (
                      <p className="text-dark-text text-xs mb-2 line-clamp-1 lg:line-clamp-2">
                        {category.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-light-text">
                      <span className="capitalize truncate text-xs">
                        {category.slug?.current?.replace(/-/g, " ")}
                      </span>
                      {category.range && (
                        <span className="bg-shop_light_pink/50 text-shop_dark_green px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ml-2">
                          {category.range}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hover Effect Bottom Border */}
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-shop_light_green via-shop_orange to-shop_light_green transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                </Link>
              ))}
            </div>

            {/* View All Products CTA after categories */}
            <div className="mt-10 text-center">
              <div className="bg-gradient-to-r from-shop_light_green/10 via-shop_orange/5 to-shop_light_green/10 rounded-xl p-6 border border-shop_light_green/20">
                <h3 className="text-lg lg:text-xl font-semibold text-shop_dark_green mb-2">
                  Explore Our Complete Product Range
                </h3>
                <p className="text-dark-text text-sm mb-4">
                  Don&apos;t see what you&apos;re looking for? Browse our entire
                  collection of products.
                </p>
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center gap-2 bg-shop_light_green hover:bg-shop_dark_green text-white px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <Package className="w-4 h-4" />
                  View All Products
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-8 shadow-md border border-gray-100/50 max-w-md mx-auto">
              <Package className="w-16 h-16 text-light-text mx-auto mb-4" />
              <h3 className="text-xl font-bold text-shop_dark_green mb-3">
                No Categories Available
              </h3>
              <p className="text-dark-text text-sm mb-6">
                It looks like there are no categories set up yet. Check back
                soon for our product categories!
              </p>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 bg-shop_light_green hover:bg-shop_dark_green text-white px-6 py-2.5 rounded-full font-medium text-sm transition-colors duration-300"
              >
                <Package className="w-4 h-4" />
                Browse All Products
              </Link>
            </div>
          </div>
        )}

        {/* Additional Info Section */}
        {categories.length > 0 && (
          <div className="mt-12 bg-white/70 backdrop-blur-sm rounded-xl p-6 lg:p-8 shadow-md border border-gray-100/50">
            <div className="text-center">
              <h3 className="text-xl lg:text-2xl font-bold text-shop_dark_green mb-3">
                Can&apos;t Find What You&apos;re Looking For?
              </h3>
              <p className="text-dark-text mb-6 text-sm lg:text-base">
                Browse all our products or use our search feature to find
                specific items.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center gap-2 bg-shop_light_green hover:bg-shop_dark_green text-white px-6 py-2.5 rounded-full font-medium text-sm transition-colors duration-300"
                >
                  <Package className="w-4 h-4" />
                  All Products
                </Link>
                <Link
                  href="/brands"
                  className="inline-flex items-center justify-center gap-2 border-2 border-shop_light_green text-shop_light_green hover:bg-shop_light_green hover:text-white px-6 py-2.5 rounded-full font-medium text-sm transition-colors duration-300"
                >
                  <Tag className="w-4 h-4" />
                  Shop by Brands
                </Link>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};

export default CategoryPage;
