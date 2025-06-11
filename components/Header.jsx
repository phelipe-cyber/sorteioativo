// components/Header.jsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

// --- ÍCONES ---
const BellIcon = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
);
const MenuIcon = ({ className = "h-6 w-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
  </svg>
);
const CloseIcon = ({ className = "h-6 w-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const UserCircleIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
  </svg>
);
const TicketIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"></path><path d="M13 17v2"></path><path d="M13 11v2"></path>
  </svg>
);
const SettingsIcon = ({ className = "w-5 h-5" }) => (
   <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10H3"/><path d="M21 6H3"/><path d="M21 14H3"/><path d="M21 18H3"/>
  </svg>
);
const KeyIcon = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21 2-2 2-2.5 2.5-2.5 2.5-1.5 1.5L8 16l-2.5 2.5L2 22l5.5-1.5L10 18l1.5-1.5L14 14l2.5-2.5L19 9l2-2z"></path>
    </svg>
);
const LogOutIcon = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
);


// --- HOOK CUSTOMIZADO PARA LIDAR COM CLIQUE FORA ---
const useClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) { return; }
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
};

export default function Header() {
  const { user, isAuthenticated, logout, loading: authLoading, token } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname(); 

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useClickOutside(notificationsRef, () => setIsNotificationsOpen(false));
  useClickOutside(profileMenuRef, () => setIsProfileMenuOpen(false));

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/notifications', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Falha ao buscar notificações.');
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount((data.notifications || []).filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const intervalId = setInterval(fetchNotifications, 60000);
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated, fetchNotifications]);

  const handleMarkAsRead = async (notificationId = null) => {
    const idsToMark = notificationId ? [notificationId] : notifications.filter(n => !n.is_read).map(n => n.id);
    if (idsToMark.length === 0) return;
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;
    setNotifications(prev => 
      prev.map(n => idsToMark.includes(n.id) ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => prev - idsToMark.length);
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(notificationId ? { notificationIds: idsToMark } : { mark_all_as_read: true }),
      });
      if (!response.ok) {
        throw new Error('Falha ao comunicar com o servidor.');
      }
    } catch (error) {
      console.error("Erro ao marcar notificação como lida, revertendo:", error);
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
    }
  };
  
  const handleNotificationClick = (notification) => {
    if (!notification.is_read) { handleMarkAsRead(notification.id); }
    if (notification.link) { router.push(notification.link); }
    setIsNotificationsOpen(false);
  };

  const handleLogout = async () => {
    await logout(); 
    setMobileMenuOpen(false); 
    setIsProfileMenuOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { setMobileMenuOpen(false); }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (href) => pathname === href;
  // ... Definições de classes ...
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

  const NotificationButton = () => (
    <div className="relative" ref={notificationsRef}>
      <button 
        onClick={() => {
            setIsNotificationsOpen(prev => !prev);
            if(!isNotificationsOpen) fetchNotifications();
        }}
        className="p-2 rounded-full text-indigo-200 hover:text-white hover:bg-indigo-500/75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white"
      >
        <span className="sr-only">Ver notificações</span>
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {isNotificationsOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 max-w-sm rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <div className="px-4 py-2 flex justify-between items-center border-b">
                <h3 className="text-sm font-semibold text-gray-800">Notificações</h3>
                {unreadCount > 0 && (
                    <button onClick={() => handleMarkAsRead(null)} className="text-xs text-indigo-600 hover:underline">Marcar todas como lidas</button>
                )}
            </div>
            <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? notifications.map(notification => (
                    <div 
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`block px-4 py-3 hover:bg-gray-100 cursor-pointer border-l-4 ${!notification.is_read ? 'border-indigo-500 bg-indigo-50' : 'border-transparent'}`}
                    >
                        <p className="text-sm text-gray-700">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(notification.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                )) : (
                    <p className="text-sm text-gray-500 text-center py-4">Nenhuma notificação.</p>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (authLoading) {
    return (
      <header className="bg-indigo-600 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center"><div className="h-8 w-32 bg-indigo-500 rounded-md animate-pulse"></div></div>
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
            <Link href="/" className="flex items-center gap-2 text-white hover:text-indigo-200">
              <img src="/sorteioativo_logo.svg" alt="Logo Site de Sorteios" className="h-8 md:h-9 w-auto" />
              <span className="hidden sm:block text-xl font-bold">Site de Sorteios</span>
            </Link>
          </div>

          <div className="flex items-center">
            {/* Menu Desktop */}
            <nav className="hidden md:flex items-center space-x-4">
              {isAuthenticated && user ? (
                <>
                  <Link href="/my-numbers" className={`${navLinkBaseClasses} ${isActive('/my-numbers') ? navLinkDesktopActiveClasses : navLinkDesktopIdleClasses}`} >
                    <TicketIcon className="w-4 h-4 mr-1.5" /> Meus Números
                  </Link>
                  {user.role === 'admin' && (
                    <Link href="/admin/dashboard" className={`${adminLinkBaseClasses} ${isActive('/admin/dashboard') || pathname.startsWith('/admin/') ? adminLinkDesktopActiveClasses : adminLinkDesktopIdleClasses}`} >
                      <SettingsIcon className="w-4 h-4 mr-1.5" /> Painel Admin
                    </Link>
                  )}
                  <NotificationButton />
                  
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileMenuOpen(prev => !prev)}
                      className="flex items-center space-x-3 pl-2 pr-4 py-1.5 bg-indigo-500 hover:bg-indigo-700 transition-colors rounded-full text-indigo-100 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white"
                    >
                      <UserCircleIcon className="w-7 h-7 text-white flex-shrink-0" />
                      <div className="flex flex-col items-start -space-y-1">
                        <span className="font-semibold text-white leading-tight">{user.name}</span>
                        <span className="text-xs text-indigo-300 leading-tight truncate max-w-[150px] lg:max-w-[200px]">{user.email}</span>
                      </div>
                    </button>

                    {isProfileMenuOpen && (
                      <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button">
                          <div className="px-4 py-3 border-b">
                            <p className="text-sm font-medium text-gray-900 truncate" role="none">Logado como</p>
                            <p className="text-sm text-gray-700 font-semibold truncate" role="none">{user.name}</p>
                          </div>
                          <Link
                            href="/profile/change-password"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            role="menuitem"
                          >
                            <KeyIcon className="w-4 h-4 mr-3 text-gray-500"/>
                            Alterar Senha
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                            role="menuitem"
                          >
                            <LogOutIcon className="w-4 h-4 mr-3"/>
                            Sair
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <Link href="/login" className={`${navLinkBaseClasses} ${isActive('/login') ? navLinkDesktopActiveClasses : navLinkDesktopIdleClasses} bg-green-500 hover:bg-green-600`}>Login / Registrar</Link>
              )}
            </nav>

            {/* Container para botões do Mobile */}
            <div className="md:hidden flex items-center">
              {isAuthenticated && <NotificationButton />}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} type="button" className="ml-2 inline-flex items-center justify-center p-2 rounded-md text-indigo-200 hover:text-white hover:bg-indigo-700">
                <span className="sr-only">Abrir menu</span>
                {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- CÓDIGO DO MENU MOBILE RESTAURADO --- */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute w-full bg-indigo-600 shadow-lg z-40 border-t border-indigo-500" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {isAuthenticated && user ? (
              <>
                <Link href="/my-numbers" onClick={() => setMobileMenuOpen(false)} className={`${navLinkMobileBaseClasses} ${isActive('/my-numbers') ? navLinkMobileActiveClasses : navLinkMobileIdleClasses}`}>
                  <TicketIcon className="w-5 h-5 mr-3" /> Meus Números
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className={`${isActive('/admin/dashboard') || pathname.startsWith('/admin/') ? adminLinkMobileActiveClasses : adminLinkMobileIdleClasses}`}>
                    <SettingsIcon className="w-5 h-5 mr-3" /> Painel Admin
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
                    <Link
                      href="/profile/change-password"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`${navLinkMobileBaseClasses} ${navLinkMobileIdleClasses}`}
                    >
                      <KeyIcon className="w-5 h-5 mr-3"/> Alterar Senha
                    </Link>
                    <button
                      onClick={handleLogout}
                      className={`w-full text-left ${navLinkMobileBaseClasses} bg-red-500 hover:bg-red-600 text-white mt-1`}
                    >
                      <LogOutIcon className="w-5 h-5 mr-3"/> Sair
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
