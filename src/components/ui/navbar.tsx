"use client";

import { useState } from "react";
import { User } from "lucide-react";
import PillNav from "./pillnav";
import logo from "/public/logo-bandlink.png";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("/discover");
  const [hovered, setHovered] = useState<string | null>(null);

  const items = [
    { label: "Discover", href: "/discover" },
    { label: "Request", href: "/request" },
    { label: "My Events", href: "/events" },
    { label: "Connections", href: "/connections" },
  ];

  return (
    <nav className="w-full shadow-md relative z-50">
      <div className="w-full mx-auto flex items-center  px-5 bg-[#EADDFF]">
        {/* Menú principal */}
        <PillNav
          logo={logo}
          logoAlt="BandLink Logo"
          items={items.map((item) => ({
            ...item,
            onMouseEnter: () => setHovered(item.href),
            onMouseLeave: () => setHovered(null),
            onClick: () => setActive(item.href),
          }))}
          activeHref={hovered || active}
          baseColor="#EADDFF"
          pillColor="#65558F"
          hoveredPillTextColor="#EADDFF"
          pillTextColor="#49454F"
        />

        {/* Avatar + Dropdown */}
        <div className="relative ml-6">
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#65558F] text-white"
            onClick={() => setOpen(!open)}
          >
            <User size={20} />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg py-2 z-50">
              <button className="block w-full text-left px-4 py-2 text-[#65558F] hover:bg-[#EADDFF]">
                Mi Perfil
              </button>
              <button className="block w-full text-left px-4 py-2 text-[#65558F] hover:bg-[#EADDFF]">
                Configuración
              </button>
              <button className="block w-full text-left px-4 py-2 text-[#65558F] hover:bg-[#EADDFF]">
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
