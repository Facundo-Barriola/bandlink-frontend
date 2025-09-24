"use client";

import { FC } from "react";
import Image, { StaticImageData } from "next/image";
import { useRouter } from "next/navigation";

interface PillItem {
  label: string;
  href: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

interface PillNavProps {
  logo: string | StaticImageData;
  logoAlt: string;
  items: PillItem[];
  activeHref?: string;
  className?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  homeHref?: string;
  onLogoClick?: () => void;
}

const PillNav: FC<PillNavProps> = ({
  logo,
  logoAlt,
  items,
  activeHref,
  className = "",
  baseColor = "#EADDFF",
  pillColor = "#65558F",
  hoveredPillTextColor = "#EADDFF",
  pillTextColor = "#49454F",
  homeHref,
  onLogoClick
}) => {
  const router = useRouter();

  const goHome = () => {
    if (onLogoClick) {
      onLogoClick();
      return;
    }
    if (homeHref) {
      router.push(homeHref);
      return;
    }
    // fallback por si no te pasan nada
    router.push("/home");
  };
  return (
    <nav
      className={`w-screen flex items-center justify-between px-6 py-3 ${className}`}
      style={{ backgroundColor: baseColor, height: "60px" }}
    >
      {/* Logo + Nombre app */}
      <button
        type="button"
        onClick={goHome}
        className="flex items-center flex-shrink-0 gap-2 cursor-pointer select-none focus:outline-none"
        aria-label="Ir al inicio"
      >
        <Image src={logo} alt={logoAlt} className="h-20 w-auto" />
        <span className="text-xl font-bold" style={{ color: "#65558F" }}>
          BandLink
        </span>
      </button>

      {/* Nav Items */}
      <div className="flex-1 flex justify-center gap-4">
        {items.map((item) => {
          const isActive = activeHref === item.href;
          return (
            <button
              key={item.href}
              onClick={item.onClick}
              onMouseEnter={item.onMouseEnter}
              onMouseLeave={item.onMouseLeave}
              className="px-4 py-2 rounded-full transition-colors duration-200 font-medium cursor-pointer"
              style={{
                backgroundColor: isActive ? pillColor : "transparent",
                color: isActive ? hoveredPillTextColor : pillTextColor,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

    </nav>
  );
};

export default PillNav;
