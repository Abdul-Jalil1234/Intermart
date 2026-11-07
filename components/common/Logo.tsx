import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

interface Props {
  className?: string;
  /** "sm" is used in the footer. */
  variant?: "default" | "sm";
  /** Put the logo on a white chip so it stays readable on dark backgrounds. */
  onDark?: boolean;
}

/**
 * Store logo. The image comes from NEXT_PUBLIC_COMPANY_LOGO (default /logo.png),
 * so switching stores only means replacing that file or URL.
 */
const Logo = ({ className, variant = "default", onDark = false }: Props) => {
  const { src, alt, width, height } = siteConfig.logo;
  const displayHeight = variant === "sm" ? 32 : 44;
  const displayWidth = Math.round((width / height) * displayHeight);

  return (
    <Link
      href="/"
      aria-label={`${siteConfig.displayName} home`}
      className={cn(
        "inline-flex items-center shrink-0",
        onDark && "rounded-md bg-white px-2 py-1",
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={displayWidth}
        height={displayHeight}
        priority={variant === "default"}
        unoptimized={src.startsWith("http")}
        style={{ height: displayHeight, width: "auto" }}
      />
    </Link>
  );
};

export default Logo;
