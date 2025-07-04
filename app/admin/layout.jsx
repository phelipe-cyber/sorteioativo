// app/admin/layout.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext'; // Ajuste o caminho se necessário
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../components/AdminSidebar'; // Ajuste o caminho se necessário
import Spinner from '../../components/Spinner'; // Ajuste o caminho se necessário

// Ícones para o botão do menu mobile
const IconMenu = () => (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
);
const IconClose = () => (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
);


export default function AdminLayout({ children }) {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Estado para o menu mobile

  // Proteção da rota
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'admin') {
        console.log("AdminLayout: Utilizador não é admin ou não está autenticado. A redirecionar...");
        router.push('/login'); 
      }
    }
  }, [user, authLoading, isAuthenticated, router]);

  // Ecrã de carregamento enquanto se verifica a autenticação
  if (authLoading || !isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="flex justify-center items-center min-h-screen ">
        <Spinner size="h-10 w-10 text-indigo-600" />
        <p className="ml-3 text-gray-600">Verficando acesso...</p>
      </div>
    );
  }

  // Layout principal do painel de administração
  return (
    // --- ALTERAÇÃO AQUI: Removido 'h-screen' e 'overflow-hidden' ---
    // 'flex-1' faz com que este container cresça para preencher o espaço do <main> do layout principal
    <div className="flex flex-1 ">
      
      {/* Conteúdo Principal */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        {/* O scroll agora acontece apenas aqui dentro */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none p-2 sm:p-2 md:p-1">
          {children}
        </main>
      </div>
    </div>
  );
}
