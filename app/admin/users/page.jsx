// app/admin/users/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from 'context/AuthContext'; 
import Link from 'next/link'; // Importar Link
import Spinner from 'components/Spinner'; 

// Ícones SVG
const IconUserPlus = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> {/* Ajustado width e height para consistência */}
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <line x1="22" x2="22" y1="8" y2="14"></line>
        <line x1="19" x2="25" y1="11" y2="11"></line>
    </svg>
);
const IconEdit = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
);
const IconTrash = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
);


export default function AdminUsersPage() {
  const { token } = useAuth(); 
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
          const response = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!response.ok) { 
            const errData = await response.json();
            throw new Error(errData.message || `Erro ${response.status} ao buscar usuários.`);
          }
          const data = await response.json();
          setUsers(data.users || []);
        } catch (err) { 
            console.error("Falha ao buscar usuários para admin:", err);
            setError(err.message);
        }
        finally { setLoading(false); }
      };
      fetchUsers();
    }
  }, [token]);

  if (loading) { 
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"> 
          <Spinner size="h-12 w-12" />
          <p className="ml-3 text-lg text-gray-700">Carregando usuários...</p>
        </div>
      );
  }
  if (error) { 
    return <p className="text-center text-red-500 bg-red-100 p-4 rounded-md">Erro ao carregar usuários: {error}</p>;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-indigo-700">
          Gerenciar Usuários
        </h1>
        {/* --- BOTÃO "ADICIONAR USUÁRIO" AGORA É UM LINK --- */}
        <Link 
          href="/admin/users/new" // Link para a nova página de cadastro
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md flex items-center text-sm transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <IconUserPlus /> 
          <span className="ml-2">Adicionar Usuário</span>
        </Link>
      </div>

      {users.length === 0 ? ( 
        <p className="text-center text-gray-500 py-8">Nenhum usuário cadastrado no sistema.</p>
       ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função (Role)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data de Criação</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((userItem) => (
                <tr key={userItem.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{userItem.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{userItem.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{userItem.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${userItem.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {userItem.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(userItem.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                        onClick={() => alert(`Editar usuário ID: ${userItem.id} (não implementado)`)} 
                        className="text-indigo-600 hover:text-indigo-900 mr-3 transition-colors inline-flex items-center"
                        title="Editar Usuário"
                    >
                      <IconEdit />
                      <span className="ml-1 sm:ml-2 hidden sm:inline">Editar</span>
                    </button>
                    <button 
                        onClick={() => alert(`Excluir usuário ID: ${userItem.id} (não implementado)`)} 
                        className="text-red-600 hover:text-red-900 transition-colors inline-flex items-center"
                        title="Excluir Usuário"
                    >
                      <IconTrash />
                      <span className="ml-1 sm:ml-2 hidden sm:inline">Excluir</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
