import Container from "@/components/Container";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";

const BrandsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-shop_light_bg via-white to-shop_light_pink">
      <Container className="py-10">
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
                <BreadcrumbPage>Brands</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-shop_dark_green mb-4">
            Shop by Brands
          </h1>
          <p className="text-lg text-dark-text">
            Coming soon - Browse products by your favorite brands
          </p>
        </div>
      </Container>
    </div>
  );
};

export default BrandsPage;
