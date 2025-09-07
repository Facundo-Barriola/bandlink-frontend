"use client";
import React, { createContext, useContext, useEffect, useState } from "react";


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";


export type AppUser = {
    idUser: number;
    email: string;
    idUserGroup: number;
    idMusician?: number;
    idStudio?: number;
} | null;


interface Ctx {
    user: AppUser;
    setUser: (u: AppUser) => void;
    ready: boolean;
}


const UserContext = createContext<Ctx | null>(null);


export const useUser = () => {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useUser must be used within <UserProvider>");
    return ctx;
};


export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AppUser>(null);
    const [ready, setReady] = useState(false);


    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_URL}/auth/me`, {
                    credentials: "include",
                });
                if (res.ok) {
                    const data = await res.json(); // { user }
                    setUser(data.user ?? null);
                } else {
                    setUser(null);
                }
            } catch (e) {
                setUser(null);
            } finally {
                setReady(true);
            }
        })();
    }, []);


    return (
        <UserContext.Provider value={{ user, setUser, ready }}>
            {children}
        </UserContext.Provider>
    );
}