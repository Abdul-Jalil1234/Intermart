import Link from "next/link";
import Logo from "./common/Logo";
import { categoriesData, quickLinksData } from "@/constants";
import { contactConfig } from "@/config/contact";
import FooterTop from "./layout/FooterTop";
import { siteConfig } from "@/config/site";
import SocialMedia from "./common/SocialMedia";
import NewsletterForm from "./NewsletterForm";


const Footer = () => {
  return (
    <footer className="bg-white border-t">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top section with contact info */}
        <FooterTop />

        {/* Main footer content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="mb-2">
              <Logo variant="sm" />
            </div>
            <p className="text-gray-600 text-sm">
              {contactConfig.company.description}
            </p>
            <SocialMedia
              className="text-dark-color/60"
              iconClassName="border-dark-color/60 hover:border-shop_dark_green hover:text-shop_dark_green"
              tooltipClassName="bg-dark-color text-white"
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinksData?.map((item) => (
                <li key={item?.title}>
                  <Link
                    href={item?.href}
                    className="text-gray-600 hover:text-shop_dark_green text-sm font-medium hoverEffect"
                  >
                    {item?.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
            <ul className="space-y-3">
              {categoriesData.map((item) => (
                <li key={item?.title}>
                  <Link
                    href={`/category/${item?.href}`}
                    className="text-gray-600 hover:text-shop_dark_green text-sm font-medium hoverEffect capitalize"
                  >
                    {item?.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Newsletter</h3>
            <p className="text-gray-600 text-sm mb-4">
              Subscribe to our newsletter to receive updates and exclusive
              offers.
            </p>
            <NewsletterForm />
          </div>
        </div>

        {/* Bottom copyright section */}
        <div className="py-6 border-t text-center text-sm text-gray-600">
          <p>
               © {new Date().getFullYear()}{" "}
              <span className="text-dark-color font-black tracking-wider uppercase hover:text-shop_dark_green hoverEffect font-sans">
                  {siteConfig.displayName}
                </span>
                . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
