"use client";

import { useState } from "react";
import Image from "next/image"; 

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor, completa todos los campos.");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error("Credenciales incorrectas");
      }

      const data = await res.json();
      console.log("Usuario logueado:", data);

      // Aquí podrías guardar el token y redirigir
      // localStorage.setItem("token", data.token);
      // router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
<div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="max-w-sm mx-auto mt-20 p-6 bg-white rounded-2xl shadow-lg">
        <div className="flex justify-center mb-4">
          <Image
            src="/logo-bandlink.png"
            alt="Login Icon"
            width={80}
            height={80}
          />
        </div>
      <h2 className="text-[#65558F] font-bold mb-4 text-center">BandLink</h2>
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label htmlFor="email" className="text-[#65558F] font-medium">
            Mail
        </label>
        <input
          type="email"
          placeholder="Correo electrónico"
          className="text-[#65558F] border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="password" className="text-[#65558F] font-medium">
            Contraseña
        </label>
        <input
          type="password"
          placeholder="Contraseña"
          className="text-[#65558F] border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        
        <div className="flex items-center gap-2">
          <input
            id="remember"
            type="checkbox"
            className="h-4 w-4 text-[#65558F] border-gray-300 rounded"
          />
          <label htmlFor="remember" className="text-[#65558F] font-medium">
            Recordar contraseña
          </label>
        </div>

        <button
          type="submit"
          className="bg-[#65558F] text-white py-2 rounded hover:bg-[#564A7A] transition"
        >
          Login
        </button>
      </form>
      <div className="mt-4 text-center">
        <p className="text-[#65558F]">
          ¿No tienes cuenta?{" "}
          <a href="/register" className="text-[#564A7A] hover:underline">
            Regístrate
          </a>
        </p>
      </div>
    </div>
</div>
  );
}
