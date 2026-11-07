"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ClerkLoaded, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import Container from "./Container";
import HeaderMenu from "./layout/HeaderMenu";
import Logo from "./common/Logo";
import CartIcon from "./cart/CartIcon";
import MobileMenu from "./layout/MobileMenu";
import SearchBar from "./common/SearchBar";
import FavoriteButton from "./FavoriteButton";
import NotificationBell from "./NotificationBell";
import UserDropdown from "./UserDropdown";
import { useRouter, useSearchParams } from "next/navigation";

const ClientHeader = () => {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);

  // Track when component is mounted on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle redirect after successful login
  useEffect(() => {
    if (isSignedIn && user && isMounted && typeof window !== "undefined") {
      const redirectTo = searchParams.get("redirectTo");
      if (redirectTo) {
        // Clean up the URL and redirect
        const cleanUrl = decodeURIComponent(redirectTo);
        router.push(cleanUrl);
        // Remove the redirectTo param from current URL
        const currentPath = window.location.pathname;
        router.replace(currentPath);
      }
    }
  }, [isSignedIn, user, searchParams, router, isMounted]);

  const getSignInUrl = () => {
    if (!isMounted || typeof window === "undefined") return "/sign-in";
    const currentPath = window.location.pathname + window.location.search;
    return `/sign-in?redirectTo=${encodeURIComponent(currentPath)}`;
  };

  const getSignUpUrl = () => {
    if (!isMounted || typeof window === "undefined") return "/sign-up";
    const currentPath = window.location.pathname + window.location.search;
    return `/sign-up?redirectTo=${encodeURIComponent(currentPath)}`;
  };

  return (
    <header className="sticky top-0 z-40 py-2 sm:py-3 lg:py-4 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <Container className="h-full">
        <div className="flex items-center h-full min-h-[3rem] sm:min-h-[3.5rem] lg:min-h-[4rem]">
          {/* Left Section: Mobile Menu + Logo */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <MobileMenu />
            <Logo />
          </div>

          {/* Center Section: Navigation Menu (Desktop Only) */}
          <div className="hidden lg:flex items-center justify-center flex-1 mx-8">
            <HeaderMenu />
          </div>

          {/* Right Section: Search + Actions */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 ml-auto">
            {/* Search Bar */}
            <div className="flex-shrink-0">
              <SearchBar />
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-4">
              <CartIcon />
              <FavoriteButton />
              <NotificationBell />

              <ClerkLoaded>
                <SignedIn>
                  <UserDropdown />
                </SignedIn>

                <SignedOut>
                  <div className="flex items-center gap-3">
                    <Link
                      href={getSignInUrl()}
                      className="bg-transparent border border-shop_btn_dark_green hover:bg-shop_btn_dark_green text-shop_btn_dark_green  hover:text-white px-2 py-1.5 rounded text-xs font-semibold hoverEffect"
                    >
                      Sign In
                    </Link>
                    <Link
                      href={getSignUpUrl()}
                      className="bg-shop_btn_dark_green border border-shop_btn_dark_green hover:bg-transparent text-white hover:text-shop_btn_dark_green px-2 py-1.5 rounded text-xs font-semibold hoverEffect"
                    >
                      Sign Up
                    </Link>
                  </div>
                </SignedOut>
              </ClerkLoaded>
            </div>

            {/* Tablet Actions (Medium screens) */}
            <div className="hidden md:flex lg:hidden items-center gap-2">
              <CartIcon />
              <FavoriteButton />
              <NotificationBell />

              <ClerkLoaded>
                <SignedIn>
                  <UserDropdown />
                </SignedIn>
                <SignedOut>
                  <div className="flex items-center gap-2">
                    <Link
                      href={getSignInUrl()}
                      className="text-sm font-semibold hover:text-shop_light_green hoverEffect px-2 py-1 transition-colors duration-200"
                    >
                      Sign In
                    </Link>
                    <Link
                      href={getSignUpUrl()}
                      className="bg-shop_dark_green hover:bg-shop_light_green text-white px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200"
                    >
                      Sign Up
                    </Link>
                  </div>
                </SignedOut>
              </ClerkLoaded>
            </div>

            {/* Mobile Actions (Small screens) */}
            <div className="flex md:hidden items-center gap-1">
              <ClerkLoaded>
                <SignedIn>
                  <UserDropdown />
                </SignedIn>
                <SignedOut>
                  <div className="flex items-center gap-1">
                    <Link
                      href={getSignInUrl()}
                      className="bg-transparent border border-shop_btn_dark_green hover:bg-shop_btn_dark_green text-shop_btn_dark_green  hover:text-white px-2 py-1.5 rounded text-xs font-semibold hoverEffect"
                    >
                      Sign In
                    </Link>
                    <Link
                      href={getSignUpUrl()}
                      className="bg-shop_btn_dark_green border border-shop_btn_dark_green hover:bg-transparent text-white hover:text-shop_btn_dark_green px-2 py-1.5 rounded text-xs font-semibold hoverEffect"
                    >
                      Sign Up
                    </Link>
                  </div>
                </SignedOut>
              </ClerkLoaded>
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
};

export default ClientHeader;
