// app/layout.tsx
import "./globals.css";
import { UserProvider } from "./context/userContext"; // ajusta la ruta

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
