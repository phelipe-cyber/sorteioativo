// app/layout.js
import { AuthProvider } from '../context/AuthContext'; // Ajuste o caminho se necessário
import Header from '../components/Header'; // Ajuste o caminho se necessário
import './globals.css'; // Seu CSS global

export const metadata = {
  title: 'Site de Sorteios',
  description: 'Participe dos nossos sorteios e ganhe prêmios incríveis!',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br" className="h-full bg-white">
      {/* Removido bg-gray-100 do body para um fundo branco padrão */}
      <body className="h-full flex flex-col"> 
        <AuthProvider>
          <Header /> 
          <main className="flex-grow container mx-auto p-4 w-full"> 
            {children}
          </main>
          {/* Você pode adicionar um Footer aqui no futuro */}
          { <footer className="bg-gray-800 text-white text-center p-4">
            © {new Date().getFullYear()} Site de Sorteios. Todos os direitos reservados.
          </footer> }
        </AuthProvider>
      </body>
    </html>
  );
}
