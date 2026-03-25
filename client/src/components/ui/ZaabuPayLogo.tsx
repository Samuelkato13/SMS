import logoDark from "@assets/aeLjv-removebg-preview_1774429611912.png";
import logoLight from "@assets/Z4REQ-removebg-preview_1774430029798.png";

interface ZaabuPayLogoProps {
  size?: number;
  className?: string;
  variant?: "dark" | "light";
}

export function ZaabuPayLogo({ size = 40, className = "", variant = "dark" }: ZaabuPayLogoProps) {
  const src = variant === "light" ? logoLight : logoDark;
  return (
    <img
      src={src}
      alt="ZaabuPay"
      style={{ height: size, width: "auto", objectFit: "contain" }}
      className={className}
    />
  );
}

export function ZaabuPayWordmark({
  size = 36,
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
