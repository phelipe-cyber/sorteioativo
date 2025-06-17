// app/admin/dashboard/page.jsx
'use client';
import Link from 'next/link';

/// Ícones SVG para os cards
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

const IconFileText = () => ( // Novo ícone para Logs
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <line x1="10" y1="9" x2="8" y2="9"></line>
    </svg>
);


export default function AdminDashboardPage() {
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
        <Link href="/admin/products/new" className={cardClasses}>
          <div className={iconWrapperClasses}><IconFilePlus /></div>
          <h2 className={titleClasses}>Cadastrar Produto</h2>
          <p className={descriptionClasses}>Adicione um novo item para sorteio.</p>
        </Link>
        <Link href="/admin/products" className={cardClasses}>
          <div className={iconWrapperClasses}><IconListChecks /></div>
          <h2 className={titleClasses}>Gerenciar Produtos</h2>
          <p className={descriptionClasses}>Visualize, edite ou sorteie produtos.</p>
        </Link>
        <Link href="/admin/users" className={cardClasses}>
          <div className={iconWrapperClasses}><IconUsers /></div>
          <h2 className={titleClasses}>Gerenciar Utilizadores</h2>
          <p className={descriptionClasses}>Visualize e gira os utilizadores registados.</p>
        </Link>
        <Link href="/admin/orders" className={cardClasses}>
          <div className={iconWrapperClasses}><IconShoppingBag /></div>
          <h2 className={titleClasses}>Gerenciar Pedidos</h2>
          <p className={descriptionClasses}>Visualize e altere o estado dos pedidos.</p>
        </Link>
        {/* --- NOVO CARD PARA CONSULTAR LOGS --- */}
        <Link href="/admin/logs" className={cardClasses}>
          <div className={iconWrapperClasses}><IconFileText /></div>
          <h2 className={titleClasses}>Logs do Sistema</h2>
          <p className={descriptionClasses}>Consulte eventos e erros do sistema.</p>
        </Link>
      </div>
    </div>
  );
}
