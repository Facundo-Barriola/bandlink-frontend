"use client";

import { useState, useEffect, useRef } from "react";
import { User } from "lucide-react";
import { useRouter } from "next/navigation"; 
import { useUser } from '../../app/context/userContext';
import PillNav from "./pillnav";
import logo from "/public/logo-bandlink.png";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("/discover");
  const [hovered, setHovered] = useState<string | null>(null);
  const router = useRouter();


  const menuRef = useRef<HTMLDivElement>(null);
  const items = [
    { label: "Discover", href: "/discover" },
    { label: "Request", href: "/request" },
    { label: "My Events", href: "/events" },
    { label: "Connections", href: "/connections" },
  ];
    const { user } = useUser();
    useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
 
    const handleLogout = async () => {
    try {
      const res = await fetch("http://localhost:4000/auth/logout", { 
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        router.push("/login");
      } else {
        console.error("Error al cerrar sesión");
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

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
        <div  ref={menuRef} className="relative ml-6">
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#65558F] text-white cursor-pointer hover:bg-[#EADDFF] transition-colors duration-200"
            onClick={() => setOpen(!open)}
          >
            <User size={20} />
          </button>

          {open && user &&(
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg py-2 z-50">
              <button className="block w-full text-left px-4 py-2 text-[#65558F] hover:bg-[#EADDFF]">
                Mi Perfil
              </button>
              <button className="block w-full text-left px-4 py-2 text-[#65558F] hover:bg-[#EADDFF]"
              onClick={() => router.push(`/settings/${user.idUser}`)}>
                Configuración
              </button>
              <button className="block w-full text-left px-4 py-2 text-[#65558F] hover:bg-[#EADDFF]"
              onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
