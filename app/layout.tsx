// app/layout.tsx
import type { Metadata } from "next";
// import { GeistSans } from "geist/font/sans"; // Removido se não usado
// import { GeistMono } from "geist/font/mono"; // Removido se não usado
import "./globals.css";
import { AuthProvider } from "../context/AuthContext"; // Ajuste o caminho se necessário
import Header from "../components/Header";       // Ajuste o caminho se necessário

// Se GeistSans e GeistMono não são usados, não precisa adicioná-los às classes do body
// const inter = Inter({ subsets: ["latin"] }); // Exemplo se fosse usar Inter

export const metadata: Metadata = {
  title: "Site de Sorteios",
  description: "Participe dos nossos sorteios e ganhe prêmios incríveis!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className="h-full bg-white"> {/* Removido: ${GeistSans.variable} ${GeistMono.variable} se não usados */}
      <body className="h-full flex flex-col"> {/* Removido: inter.className se não usado */}
        <AuthProvider>
          <Header />
          <main className="flex-grow container mx-auto p-4 w-full">
            {children}
          </main>
          {/* Footer opcional */}
        </AuthProvider>
      </body>
    </html>
  );
}
