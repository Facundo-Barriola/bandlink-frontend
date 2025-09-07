"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/userContext";
import Link from "next/link";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LoginForm() {
  const router = useRouter();
  const { setUser } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem("bandlink:rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, rememberMe }),
      });
      if (!res.ok) throw new Error("Credenciales incorrectas");
      
      const data = await res.json();
      console.log("Login exitoso:", data.user.idUserGroup);
      setUser(data.user);

      if (rememberMe) {
        localStorage.setItem("bandlink:rememberedEmail", email);
      } else {
        localStorage.removeItem("bandlink:rememberedEmail");
      }
      switch (data.user.idUserGroup) {
        case 2: //Musico
          router.push(`/home/${data.user.idUser}`);
        break;
        case 3: //Estudio
          router.push(`/home/${data.user.idUser}`);
        break;
        default:
          router.push("/login");
        break;

      }

    } catch (err: any) {
      setError(err.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <form
        onSubmit={onSubmit}
        className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md flex flex-col gap-5"
      >
        {/* Logo arriba */}
        <div className="flex justify-center">
          <Image
            src="/logo-bandlink.png"
            alt="BandLink logo"
            width={120}
            height={120}
            priority
            className="object-contain"
          />
        </div>

        <h2 className="text-3xl font-bold text-center" style={{ color: "#65558F" }}>
          Iniciar sesión
        </h2>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65558F] border-[#65558F] placeholder-gray-400"
          required
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          type="password"
          className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65558F] border-[#65558F] placeholder-gray-400"
          required
        />
        
        <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 accent-[#65558F] cursor-pointer"
          />
          Recordar sesión
        </label>

        <button
          disabled={loading}
          className="w-full py-3 rounded-full font-semibold transition-colors duration-200 disabled:opacity-50 text-white hover:brightness-95 active:scale-[0.99]"
          style={{ backgroundColor: "#65558F" }}
        >
          {loading ? "Ingresando…" : "Entrar"}
        </button>

        {error && <p className="text-red-600 text-sm text-center mt-2">{error}</p>}

        <p className="text-center text-sm mt-2 text-gray-700">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-semibold underline" style={{ color: "#65558F" }}>
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  );
}
