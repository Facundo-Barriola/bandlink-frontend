// app/layout.tsx
import "./globals.css";
import { UserProvider } from "@/app/context/userContext";
import { Toaster } from "sonner";

export const metadata = {
  title: "BandLink",
  description: "Conecta músicos y bandas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </UserProvider>
      </body>
    </html>
  );
}
