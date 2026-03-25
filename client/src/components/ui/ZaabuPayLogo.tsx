import logoImg from "@assets/aeLjv-removebg-preview_1774429611912.png";

interface ZaabuPayLogoProps {
  size?: number;
  className?: string;
}

export function ZaabuPayLogo({ size = 40, className = "" }: ZaabuPayLogoProps) {
  return (
    <img
      src={logoImg}
      alt="ZaabuPay"
      style={{ height: size, width: "auto", objectFit: "contain" }}
      className={className}
    />
  );
}

export function ZaabuPayWordmark({
  size = 36,
  className = "",
}: {
  size?: number;
  textClass?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src={logoImg}
        alt="ZaabuPay"
        style={{ height: size, width: "auto", objectFit: "contain" }}
      />
    </div>
  );
}
