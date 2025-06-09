// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext"; // Ajuste o caminho se necessário
import Header from "@/components/Header";       // Ajuste o caminho se necessário
import WhatsAppButton from '@/components/WhatsAppButton'; // <-- Importar o novo componente


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
    <html lang="pt-br" className="h-full bg-white"> 
      <body className="h-full flex flex-col">
        <AuthProvider>
          <Header />
          <main className="flex-grow container mx-auto p-4 w-full">
            {children}
          </main>
          <WhatsAppButton />
          {/* Footer opcional */}
          { <footer className="bg-gray-800 text-white text-center p-4">
            © {new Date().getFullYear()} Site de Sorteios. Todos os direitos reservados.
          </footer> }
        </AuthProvider>
      </body>
    </html>
  );
}
