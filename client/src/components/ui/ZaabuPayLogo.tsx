import logoDark from "@assets/aeLjv-removebg-preview_1774431054710.png";
import logoLight from "@assets/CQgI0-removebg-preview_1774431068565.png";

interface ZaabuPayLogoProps {
  size?: number;
  className?: string;
  variant?: "dark" | "light";
}

export function ZaabuPayLogo({ size = 72, className = "", variant = "dark" }: ZaabuPayLogoProps) {
  const src = variant === "light" ? logoLight : logoDark;
  return (
    <img
      src={src}
      alt="ZaabuPay"
      style={{ height: size, width: "auto", objectFit: "contain", maxWidth: "100%" }}
      className={className}
    />
  );
}

export function ZaabuPayWordmark({
  size = 72,
  className = "",
  variant = "dark",
}: {
  size?: number;
  textClass?: string;
  className?: string;
  variant?: "dark" | "light";
}) {
  return <ZaabuPayLogo size={size} className={className} variant={variant} />;
}
