// components/Header.jsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext'; // Ajuste o caminho se necessário
import { useRouter, usePathname } from 'next/navigation'; // Importado usePathname

// Ícones para o menu hambúrguer
const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Ícone de Usuário
const UserCircleIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

// Ícone para "Meus Números" (Ticket)
const TicketIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
    <path d="M13 5v2"></path>
    <path d="M13 17v2"></path>
    <path d="M13 11v2"></path>
  </svg>
);

// Ícone para "Painel Admin" (Sliders/Configurações)
const SettingsIcon = ({ className = "w-5 h-5" }) => (
   <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10H3"/>
    <path d="M21 6H3"/>
    <path d="M21 14H3"/>
    <path d="M21 18H3"/>
  </svg>
);


export default function Header() {
  const { user, isAuthenticated, logout, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname(); 

  const handleLogout = async () => {
    await logout(); 
    setMobileMenuOpen(false); 
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { 
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (href) => pathname === href;

  // Definições de classes
  const navLinkBaseClasses = "inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white";
  const navLinkDesktopIdleClasses = "text-indigo-100 hover:bg-indigo-500 hover:text-white";
  const navLinkDesktopActiveClasses = "bg-indigo-700 text-white";
  
  const navLinkMobileBaseClasses = "flex items-center px-3 py-2 rounded-md text-base font-medium";
  const navLinkMobileIdleClasses = "text-gray-200 hover:bg-indigo-700 hover:text-white";
  const navLinkMobileActiveClasses = "bg-indigo-700 text-white";

  const adminLinkBaseClasses = `font-semibold ${navLinkBaseClasses}`;
  const adminLinkDesktopIdleClasses = `text-yellow-300 hover:text-yellow-100 border border-transparent hover:border-yellow-300`;
  const adminLinkDesktopActiveClasses = `text-yellow-200 bg-indigo-700 border border-yellow-400`;
  
  const adminLinkMobileIdleClasses = `text-yellow-400 hover:bg-indigo-700 hover:text-yellow-300 ${navLinkMobileBaseClasses}`;
  const adminLinkMobileActiveClasses = `bg-indigo-700 text-yellow-300 ${navLinkMobileBaseClasses}`;


  if (authLoading) {
    return (
      <header className="bg-indigo-600 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="h-8 w-32 bg-indigo-500 rounded-md animate-pulse"></div>
            </div>
            <div className="h-8 w-24 md:w-32 bg-indigo-500 rounded-md animate-pulse"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-indigo-600 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            {/* --- LOGO ATUALIZADO PARA USAR IMAGEM LOCAL --- */}
            <Link href="/" className="flex items-center gap-2 text-white hover:text-indigo-200 transition-colors">
              {/* Para usar sua imagem, coloque-a na pasta 'public' na raiz do projeto.
                  Exemplo: public/logo-sorteios.png
                  E então use o caminho '/logo-sorteios.png' no src.
              */}
              <img 
                src="/sorteioativo_logo.svg" // <-- CAMINHO PARA A IMAGEM NA PASTA 'public'
                alt="Logo Site de Sorteios" 
                className="h-8 md:h-9 w-auto" // Ajuste a altura conforme necessário
              />
              {/* O texto pode ser removido se o logo já contiver o nome */}
              <span className="hidden sm:block text-xl lg:text-2xl font-bold">
                Site de Sorteios
              </span>
            </Link>
          </div>

          {/* Menu Desktop */}
          <nav className="hidden md:flex md:items-center md:space-x-2 lg:space-x-3">
            {isAuthenticated && user ? (
              <>
                <Link href="/my-numbers" className={`${navLinkBaseClasses} ${isActive('/my-numbers') ? navLinkDesktopActiveClasses : navLinkDesktopIdleClasses}`}>
                  <TicketIcon className="w-4 h-4 mr-1.5" />
                  Meus Números
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin/dashboard" className={`${adminLinkBaseClasses} ${isActive('/admin/dashboard') || pathname.startsWith('/admin/') ? adminLinkDesktopActiveClasses : adminLinkDesktopIdleClasses}`}>
                    <SettingsIcon className="w-4 h-4 mr-1.5" />
                    Painel Admin
                  </Link>
                )}
                <div className="flex items-center space-x-3 pl-3 pr-2 py-1.5 bg-indigo-500/60 rounded-full text-indigo-100 text-sm">
                  <UserCircleIcon className="w-6 h-6 text-indigo-200 flex-shrink-0" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-white leading-tight">{user.name}</span>
                    <span className="text-xs text-indigo-200 leading-tight truncate max-w-[150px] lg:max-w-[200px]">{user.email}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-red-400"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link href="/login" className={`${navLinkBaseClasses} ${isActive('/login') ? navLinkDesktopActiveClasses : navLinkDesktopIdleClasses} bg-green-500 hover:bg-green-600`}>
                Login / Registrar
              </Link>
            )}
          </nav>

          {/* Botão do Menu Mobile */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-indigo-200 hover:text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Abrir menu principal</span>
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Mobile (dropdown) */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute w-full bg-indigo-600 shadow-lg z-40 border-t border-indigo-500" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {isAuthenticated && user ? (
              <>
                <Link href="/my-numbers" onClick={() => setMobileMenuOpen(false)} className={`${navLinkMobileBaseClasses} ${isActive('/my-numbers') ? navLinkMobileActiveClasses : navLinkMobileIdleClasses}`}>
                  <TicketIcon className="w-5 h-5 mr-3" />
                  Meus Números
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className={`${isActive('/admin/dashboard') || pathname.startsWith('/admin/') ? adminLinkMobileActiveClasses : adminLinkMobileIdleClasses}`}>
                    <SettingsIcon className="w-5 h-5 mr-3" />
                    Painel Admin
                  </Link>
                )}
                 <div className="border-t border-indigo-500/50 my-2 pt-2">
                    <div className="flex items-center px-3 mb-2">
                        <UserCircleIcon className="w-8 h-8 text-indigo-200 mr-3 flex-shrink-0" />
                        <div>
                            <p className="text-base font-medium text-white">{user.name}</p>
                            <p className="text-sm font-medium text-indigo-300">{user.email}</p>
                        </div>
                    </div>
                    <button
                    onClick={handleLogout}
                    className={`w-full text-left ${navLinkMobileBaseClasses} bg-red-500 hover:bg-red-600 text-white mt-1`}
                    >
                    Sair
                    </button>
                 </div>
              </>
            ) : (
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className={`${navLinkMobileBaseClasses} ${isActive('/login') ? navLinkMobileActiveClasses : navLinkMobileIdleClasses} bg-green-500 hover:bg-green-600 text-white`}>
                Login / Registrar
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
