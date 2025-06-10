// app/admin/layout.jsx
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; // Ajuste o caminho conforme necessário
import { useRouter } from 'next/navigation';
// import AdminSidebar from 'components/AdminSidebar'; // Ajuste o caminho
import { useState } from 'react';

export default function AdminLayout({ children }) {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  

  useEffect(() => {
    // Espera o estado de autenticação carregar
    if (!authLoading) {
      // Se não estiver autenticado OU se não for admin, redireciona
      if (!isAuthenticated || user?.role !== 'admin') {
        console.log("AdminLayout: Usuário não é admin ou não está autenticado. Redirecionando...");
        router.push('/login'); // Ou para uma página inicial, ou página de acesso negado
      }
    }
  }, [user, authLoading, isAuthenticated, router]);

  // Enquanto carrega a autenticação ou se o usuário não for admin (antes do redirect efetivar),
  // pode mostrar um loader ou null para evitar flash de conteúdo.
  if (authLoading || !isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="flex justify-center items-center ">
        <p>Verificando acesso...</p>
        {/* Ou um componente de Spinner aqui */}
      </div>
    );
  };

  return (
    <div className="flex ">
        {children}
    </div>
  );
}