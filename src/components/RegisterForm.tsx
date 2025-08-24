"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"
import UserSelectionForm from "@/components/UserSelectionForm";


export default function RegisterForm() {
  const [stage, setStage] = useState<"form" | "pick">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("El email no es válido");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setStage("pick");
  };

  const handleRegistered = (resp: any) => {
    setSuccess("✅ Registro exitoso. Ya puedes iniciar sesión.");
    // redirección login
    router.push(`/login`); 
  };

  if (stage === "pick") {
    return (
      <div className="w-full flex items-center justify-center p-6">
        <UserSelectionForm
          email={email}
          password={password}
          onRegistered={handleRegistered}
        />
        {/* Botón para volver a editar email/contraseña si quiere */}
        <button
          className="ml-4 text-sm text-[#65558F] underline"
          onClick={() => setStage("form")}
        >
          ← Volver
        </button>
      </div>
    );
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-2xl shadow-md w-96"
    >
      <h2 className="text-xl font-bold mb-4 text-[#65558F]">Registro</h2>

      {error && <p className="text-red-500 mb-3">{error}</p>}

      <div className="mb-3">
        <label className="block text-[#65558F] mb-1">Correo electrónico</label>
        <input
          type="email"
          className="w-full border rounded-lg p-2 text-[#65558F]"
          placeholder="tuemail@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="block text-[#65558F] mb-1">Contraseña</label>
        <input
          type="password"
          className="w-full border rounded-lg p-2 text-[#65558F]"
          placeholder="********"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="block text-[#65558F] mb-1">Repetir contraseña</label>
        <input
          type="password"
          className="w-full border rounded-lg p-2 text-[#65558F]"
          placeholder="********"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-[#65558F] text-white py-2 rounded-lg hover:bg-[#51447a] transition"
      >
        Registrarse
      </button>
    </form>
  );
}
