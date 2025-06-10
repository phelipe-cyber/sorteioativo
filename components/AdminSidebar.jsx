// components/AdminSidebar.jsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/products/new', label: 'Cadastrar Produto' },
  { href: '/admin/products', label: 'Listar Produtos' }, // Página que criaremos no futuro
  { href: '/admin/users', label: 'Gerenciar Usuários' },
  { href: '/admin/orders', label: 'Gerenciar Pedidos' },

  // Adicione mais links aqui conforme necessário
  // { href: '/admin/users', label: 'Gerenciar Usuários' },
  // { href: '/admin/orders', label: 'Ver Pedidos' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-800 text-white p-6 "> {/* Garante altura total */}
      <h2 className="text-2xl font-semibold mb-8">Admin</h2>
      <nav>
        <ul>
          {menuItems.map((item) => (
            <li key={item.href} className="mb-3">
              <Link 
                href={item.href}
                className={`block py-2 px-3 rounded-md hover:bg-gray-700 transition-colors
                            ${pathname === item.href ? 'bg-indigo-600 font-semibold' : ''}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}