"use client";

import { useState } from "react";
import Navbar from "@/components/ui/navbar";
import {useUser} from "@/app/context/userContext";
import { Trash } from "lucide-react";
import { useRouter } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export default function SettingsForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [username, setUsername] = useState("");
  const { user } = useUser();
  const router = useRouter();
  const handleChangePassword = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/${user?.idUser}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        alert("Contraseña cambiada con éxito ✅");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        alert("Error al cambiar la contraseña ❌");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleUpdateUsername = async () => {
    try {
      const res = await fetch("http://localhost:4000/auth/update-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
      });

      if (res.ok) {
        alert("Nombre actualizado ");
        setUsername("");
      } else {
        alert("Error al actualizar el nombre ");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };
  const handleDeleteAccount = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible.")) {
      return;
    }
    try{
      const res = await fetch(`${API_URL}/account/delete/${user?.idUser}`,{
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
        if (res.ok) {
        alert("Cuenta Borrada exitosamente");
        router.push("/login");
      } else {
        alert("Error al borrar la cuenta");
      }
    }catch(error){
      console.error("Error:", error);
    }
  }
  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto p-6 mt-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-[#65558F]">Configuración de la Cuenta</h1>

        {/* Cambiar contraseña */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Cambiar Contraseña</h2>
          <input
            type="password"
            placeholder="Contraseña actual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="block w-full mb-3 px-4 py-2 border rounded-lg"
          />
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="block w-full mb-3 px-4 py-2 border rounded-lg"
          />
          <button
            onClick={handleChangePassword}
            className="px-4 py-2 bg-[#65558F] text-white rounded-lg hover:bg-[#7a68b3]"
          >
            Guardar cambios
          </button>
        </div>

        {/* Borrar Cuenta */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Eliminar Cuenta</h2>
          <button
            onClick={handleDeleteAccount}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Trash className="inline-block mr-2" />
            Borrar
          </button>
        </div>
      </div>
    </>
  );
}
