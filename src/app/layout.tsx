// app/layout.tsx
import "./globals.css";
import { UserProvider } from "@/app/context/userContext"; 

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
        </UserProvider>
      </body>
    </html>
  );
}
