import Image from "next/image";
import { cn } from "@/lib/utils";

type Variant = "color-light" | "color-dark" | "mono-black" | "mono-white";

const sources: Record<Variant, string> = {
  "color-light": "/brand/Metier-Color.png",
  "color-dark": "/brand/Metier-Color_02.png",
  "mono-black": "/brand/Metier-Lockup-Black.png",
  "mono-white": "/brand/Metier-Lockup-White.png",
};

export function MetierLogo({
  variant = "color-light",
  className,
  width = 140,
  priority = false,
}: {
  variant?: Variant;
  className?: string;
  width?: number;
  priority?: boolean;
}) {
  const src = sources[variant];
  const height = Math.round((width * 622) / 1920);
  return (
    <Image
      src={src}
      alt="Metier (Thailand)"
      width={width}
      height={height}
      priority={priority}
      className={cn("select-none", className)}
    />
  );
}

const symbolSrc: Record<"color" | "black" | "white", string> = {
  color: "/brand/Metier-Symbol-Color.png",
  black: "/brand/Metier-Symbol-Black.png",
  white: "/brand/Metier-Symbol-White.png",
};

export function MetierSymbol({
  variant = "color",
  size = 32,
  className,
}: {
  variant?: "color" | "black" | "white";
  size?: number;
  className?: string;
}) {
  const height = Math.round((size * 622) / 1159);
  return (
    <Image
      src={symbolSrc[variant]}
      alt="Metier"
      width={size}
      height={height}
      className={cn("select-none", className)}
    />
  );
}
