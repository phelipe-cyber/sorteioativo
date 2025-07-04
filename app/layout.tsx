// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext"; // Ajuste o caminho se necessário
import Header from "@/components/Header";       // Ajuste o caminho se necessário
import WhatsAppButton from '@/components/WhatsAppButton'; // <-- Importar o novo componente

const imageUrl = '/logosorteioativo7.jpeg';
const icon = '/favicon.ico'
const title = 'Site de Sorteios';
const description = 'Participe dos nossos sorteios e ganhe prêmios incríveis!';
const siteName = 'Site de Sorteios';

export const metadata: Metadata = {
  title: title,
  description: description,
  icons: { // Recomendo esta estrutura para `icons`
    icon: icon, // URL para o favicon principal
    // Você pode adicionar outros tamanhos ou tipos aqui, se tiver:
    // apple: '/apple-icon.png',
    // shortcut: '/shortcut-icon.png',
  },
  openGraph: {
    title: title,
    description: description,
    images: [{ url: imageUrl, width: 800, height: 'auto',alt: title }], // Correção principal aqui
    // Removidas as linhas 'images width:1200,' e 'image height:630,' que estavam duplicadas e com sintaxe incorreta.
    // As dimensões (width e height) devem estar DENTRO do objeto da imagem no array 'images'.
    siteName: siteName,
    locale: 'pt_BR',
    type: 'website',
    url: 'https://www.sorteioativo.com.br',
  },
  twitter: {
    card: 'summary_large_image',
    title: title, // Melhor explicitar, embora `title` e `description` funcionem se forem variáveis no escopo
    description: description, // Melhor explicitar
    images: [{ url: imageUrl, width: 1200, height: 675, alt: title }], // Recomendo adicionar width/height também para o Twitter para otimização
  },
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
          <main className="flex-grow container mx-auto p-2 w-full">
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
