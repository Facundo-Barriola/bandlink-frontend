"use client";

import { useState } from "react";
import { Search, User } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="w-full bg-[#EADDFF] shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        
        {/* Logo + Título */}
        <div className="flex items-center gap-3">
          <img
            src="/logo-bandlink.png"
            alt="BandLink Logo"
            className="h-15 w-15"
          />
          <span className="text-xl font-bold text-[#65558F]">BandLink</span>
        </div>

        {/* Links */}
        <div className="flex flex-1 justify-around items-center">
          <button className="flex items-center gap-1 text-[#65558F] hover:underline underline-offset-4 decoration-[#65558F]">
            <Search size={18} />
            Discover
          </button>
          <button className="text-[#65558F] hover:underline underline-offset-4 decoration-[#65558F]">
            Request
          </button>
          <button className="text-[#65558F] hover:underline underline-offset-4 decoration-[#65558F]">
            My Events
          </button>
          <button className="text-[#65558F] hover:underline underline-offset-4 decoration-[#65558F]">
            Connections
          </button>
        </div>

        {/* Avatar + Dropdown */}
        <div className="relative">
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
