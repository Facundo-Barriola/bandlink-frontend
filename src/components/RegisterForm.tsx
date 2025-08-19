"use client";

import { useState } from "react";

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

    try {
      const res = await fetch("http://localhost:4000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || "Error en el registro");
      }

      setSuccess("✅ Registro exitoso. Ya puedes iniciar sesión.");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    }
  };

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
