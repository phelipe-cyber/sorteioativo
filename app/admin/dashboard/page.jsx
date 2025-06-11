// app/admin/dashboard/page.jsx
'use client';
import Link from 'next/link';
import { FilePlus, ListChecks, Users, ShoppingBag, BarChart3 } from 'lucide-react'; // Ícones para visual

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; 


// Ícones simples como componentes SVG se lucide-react não estiver disponível ou preferir
const IconFilePlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="18" x2="12" y2="12"></line>
    <line x1="9" y1="15" x2="15" y2="15"></line>
  </svg>
);

const IconListChecks = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-1Z"></path>
    <path d="m3 12 2 2 4-4"></path>
    <path d="M10 10.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-1Z"></path>
    <path d="m3 19 2 2 4-4"></path>
    <path d="M10 17.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-1Z"></path>
  </svg>
);

// Novo ícone para Usuários
const IconUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const IconShoppingBag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <path d="M16 10a4 4 0 0 1-8 0"></path>
  </svg>
);


export default function AdminDashboardPage() {

  const { token, user, isAuthenticated, loading: authLoading } = useAuth(); 
  const router = useRouter();
  useEffect(() => {
    if (!authLoading) { 
      if (!isAuthenticated || user?.role !== 'admin') {
        router.push('/login');
      }
    }
  }, [user, authLoading, isAuthenticated, router]);

  const cardClasses = "bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col items-center text-center";
  const iconWrapperClasses = "mb-4 p-3 bg-indigo-100 rounded-full text-indigo-600";
  const titleClasses = "text-lg font-semibold text-gray-800 mb-1";
  const descriptionClasses = "text-sm text-gray-500";

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Painel Administrativo
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card para Cadastrar Produto */}
        <Link href="/admin/products/new" className={cardClasses}>
          <div className={iconWrapperClasses}>
            {/* <FilePlus size={32} /> */} {/* Usando Lucide Icon */}
            <IconFilePlus /> {/* Usando SVG Icon */}
          </div>
          <h2 className={titleClasses}>Cadastrar Novo Produto</h2>
          <p className={descriptionClasses}>Adicione um novo item para sorteio.</p>
        </Link>

        {/* Card para Listar/Gerenciar Produtos */}
        <Link href="/admin/products" className={cardClasses}>
          <div className={iconWrapperClasses}>
            {/* <ListChecks size={32} /> */} {/* Usando Lucide Icon */}
            <IconListChecks /> {/* Usando SVG Icon */}
          </div>
          <h2 className={titleClasses}>Gerenciar Produtos</h2>
          <p className={descriptionClasses}>Visualize, edite ou sorteie produtos existentes.</p>
        </Link>

         {/* Card para Gerenciar Usuários */}
         <Link href="/admin/users" className={cardClasses}> {/* Link para a futura página /admin/users */}
          <div className={iconWrapperClasses}>
            <IconUsers /> {/* Novo ícone */}
            {/* Se usar lucide-react: <Users size={32} /> */}
          </div>
          <h2 className={titleClasses}>Gerenciar Usuários</h2>
          <p className={descriptionClasses}>Visualize e gerencie os usuários cadastrados.</p>
        </Link>

        <Link href="/admin/orders" className={cardClasses}>
          <div className={iconWrapperClasses}><IconShoppingBag /></div>
          <h2 className={titleClasses}>Gerenciar Pedidos</h2>
          <p className={descriptionClasses}>Visualize e altere o estado dos pedidos.</p>
        </Link>

        {/* Você pode adicionar mais cards/links aqui para futuras funcionalidades */}
        {/* Exemplo:
        <div className={`${cardClasses} opacity-50 cursor-not-allowed`}>
          <div className={iconWrapperClasses}>
            <Users size={32} />
          </div>
          <h2 className={titleClasses}>Gerenciar Usuários</h2>
          <p className={descriptionClasses}>(Em breve)</p>
        </div>

        <div className={`${cardClasses} opacity-50 cursor-not-allowed`}>
          <div className={iconWrapperClasses}>
            <ShoppingBag size={32} />
          </div>
          <h2 className={titleClasses}>Ver Pedidos</h2>
          <p className={descriptionClasses}>(Em breve)</p>
        </div>

        <div className={`${cardClasses} opacity-50 cursor-not-allowed`}>
          <div className={iconWrapperClasses}>
            <BarChart3 size={32} />
          </div>
          <h2 className={titleClasses}>Relatórios</h2>
          <p className={descriptionClasses}>(Em breve)</p>
        </div>
        */}
      </div>
    </div>
  );
}
