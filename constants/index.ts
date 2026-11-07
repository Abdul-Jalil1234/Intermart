import { siteConfig } from "@/config/site";
import { contactConfig } from "@/config/contact";
import { formatCurrency } from "@/lib/currency";
export const headerData = [
  { title: "Home", href: "/" },
  { title: "Shop", href: "/shop" },
  { title: "Hot Deal", href: "/deal" },
  { title: "Blog", href: "/blog" },
  { title: "Contact", href: "/contact" },
];

// Home page tabs: "all" shows everything, other values are category slugs in Sanity.
export const productType = [
  { title: "All", value: "all" },
  { title: "Fruits & Vegetables", value: "fruits-vegetables" },
  { title: "Dairy & Eggs", value: "dairy-eggs" },
  { title: "Bakery", value: "bakery" },
  { title: "Beverages", value: "beverages" },
  { title: "Snacks & Sweets", value: "snacks-sweets" },
];

export const quickLinksData = [
  { title: "About us", href: "/about" },
  { title: "Contact us", href: "/contact" },
  { title: "Terms & Conditions", href: "/terms" },
  { title: "Privacy Policy", href: "/privacy" },
  { title: "FAQs", href: "/faqs" },
  { title: "Help", href: "/help" },
];

export const categoriesData = [
  { title: "Fruits & Vegetables", href: "fruits-vegetables" },
  { title: "Dairy & Eggs", href: "dairy-eggs" },
  { title: "Bakery", href: "bakery" },
  { title: "Meat & Fish", href: "meat-fish" },
  { title: "Rice, Pasta & Grains", href: "rice-pasta-grains" },
  { title: "Snacks & Sweets", href: "snacks-sweets" },
  { title: "Beverages", href: "beverages" },
  { title: "Household & Cleaning", href: "household" },
];

// Enhanced user account menu items
export const userAccountData = [
  { title: "My Profile", href: "/account/profile" },
  { title: "My Orders", href: "/user/orders" },
  { title: "My Wishlist", href: "/wishlist" },
  { title: "Shopping Cart", href: "/cart" },
  { title: "Address Book", href: "/account/addresses" },
  { title: "Payment Methods", href: "/account/payments" },
  { title: "Order History", href: "/user/orders" },
];

// Support and help menu items
export const supportData = [
  { title: "Help Center", href: "/help" },
  { title: "Customer Service", href: "/support" },
  { title: "Track Your Order", href: "/track-order" },
  { title: "Return Policy", href: "/returns" },
  { title: "Shipping Info", href: "/shipping" },
  { title: "Size Guide", href: "/size-guide" },
];
export const faqsData = [
  {
    question: `What can I buy from ${siteConfig.displayName} online?`,
    answer: `${siteConfig.displayName} offers fresh produce, groceries, household essentials and more, with the same quality and prices you find in store.`,
  },
  {
    question: `How can I get support from ${siteConfig.displayName}?`,
    answer: `You can reach our support team through our contact page or by emailing ${contactConfig.emails.support}.`,
  },
  {
    question: "How does delivery work?",
    answer: `Orders are confirmed, packed and dispatched in stages, and you can follow each stage on your order page. Orders above ${formatCurrency(siteConfig.shipping.freeThreshold, { minimumFractionDigits: 0 })} ship free; otherwise a delivery fee of ${formatCurrency(siteConfig.shipping.fee, { minimumFractionDigits: 0 })} applies.`,
  },
  {
    question: "What if an item is missing or damaged?",
    answer: "Contact us as soon as possible with your order number and we will arrange a replacement or refund.",
  },
  {
    question: "How is my payment and personal data protected?",
    answer: "Payments are processed securely through our payment provider, and we never store your card details. We only use your data to fulfil your orders and improve your service.",
  },
];
