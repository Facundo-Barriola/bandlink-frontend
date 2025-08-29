"use client"
import MusicianProfile from "@/components/MusicianProfile";
import Navbar from "@/components/ui/navbar";
import StudioProfile from "@/components/StudioProfile";
import { useUser } from "@/app/context/userContext";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ProfileKind = "studio" | "musician" | "none" | "loading";
export default function dashboardPage() {
    const { user, ready } = useUser();
    const router = useRouter();
    const [kind, setKind] = useState<ProfileKind>("loading");
    const { id } = useParams<{ id: string }>();

    useEffect(() => {
        if (!ready) return;
        if (!user?.idUser) { setKind("none"); return; }

        const ac = new AbortController();
        (async () => {
            try {
                // Probamos en paralelo
                const [s, m] = await Promise.allSettled([
                    fetch(`${API_URL}/directory/studios/${id}/profile`, {
                        credentials: "include", headers: { Accept: "application/json" }, signal: ac.signal, cache: "no-store",
                    }),
                    fetch(`${API_URL}/directory/${id}/profile`, {
                        credentials: "include", headers: { Accept: "application/json" }, signal: ac.signal, cache: "no-store",
                    }),
                ]);

                const ok = async (r: any) => r.status === "fulfilled" && r.value.ok ? (await r.value.json())?.data ?? null : null;
                const sData = await ok(s);
                const mData = await ok(m);

                if (sData?.studio) setKind("studio");
                else if (mData?.musician || mData?.userData) setKind("musician");
                else setKind("none");
            } catch (e) {
                console.error(e);
                setKind("none");
            }
        })();

        return () => ac.abort();
    }, [ready, user?.idUser]);
    return (
        <main className="min-h-screen flex flex-col bg-gray-100">
            <Navbar />
            <div className="flex flex-1 items-start justify-center pt-5 w-full">
                {kind === "loading" && (
                    <div className="max-w-6xl mx-auto p-6 animate-pulse w-full">
                        <div className="h-32 bg-muted rounded-2xl mb-6" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="h-64 bg-muted rounded-2xl" />
                            <div className="h-64 bg-muted rounded-2xl" />
                        </div>
                    </div>
                )}

                {kind === "studio" && <StudioProfile viewUserId={Number(id)} />}
                {kind === "musician" && <MusicianProfile viewUserId={Number(id)} />}

                {kind === "none" && (
                    <div className="w-full flex justify-center">
                        <Card className="rounded-2xl">
                            <CardContent className="p-6 text-muted-foreground">
                                No encontramos un perfil asociado.{" "}
                                <button
                                    className="text-[#65558F] underline ml-1"
                                    onClick={() => router.push(`/home/${user?.idUser ?? ""}`)}
                                >
                                    Volver al home
                                </button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </main>
    );
}