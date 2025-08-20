"use client";

import { FC } from "react";
import Image, { StaticImageData } from "next/image";

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
}) => {
  return (
    <nav
      className={`w-screen flex items-center justify-between px-6 py-3 ${className}`}
      style={{ backgroundColor: baseColor, height: "60px" }}
    >
      {/* Logo + Nombre app */}
      <div className="flex items-center flex-shrink-0">
        <Image src={logo} alt={logoAlt} className="h-20 w-auto" />
        <span className="text-xl font-bold" style={{ color: "#65558F" }}>BandLink</span>
      </div>

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
              className="px-4 py-2 rounded-full transition-colors duration-200 font-medium"
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
