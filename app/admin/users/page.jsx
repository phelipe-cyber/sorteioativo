// app/admin/users/page.jsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext'; 
import Link from 'next/link'; // Importar Link
import Spinner from '@/components/Spinner'; 
import { useRouter } from 'next/navigation';

// Ícones
const IconUserPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="22" y1="8" x2="22" y2="14"></line><line x1="19" y1="11" x2="25" y2="11"></line>
  </svg>
);
const IconEdit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);
const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);
const IconFilter = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);


export default function AdminUsersPage() {
const { token, user: adminUser } = useAuth(); 
const [allUsers, setAllUsers] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

// --- ESTADOS PARA FILTROS ---
const [filterRole, setFilterRole] = useState('all');
const [filterClientName, setFilterClientName] = useState('');

const fetchUsers = useCallback(async () => {
  if (!token) return;
  setLoading(true);
  setError('');
  try {
    const response = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || `Erro ao buscar utilizadores.`);
    }
    const data = await response.json();
    setAllUsers(data.users || []);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, [token]);

useEffect(() => {
  fetchUsers();
}, [fetchUsers]);

// --- LÓGICA DE FILTRAGEM ATUALIZADA ---
const filteredUsers = useMemo(() => {
  return allUsers.filter(user => {
      const roleMatch = filterRole === 'all' || user.role === filterRole;
      const nameMatch = !filterClientName || (user.name && user.name.toLowerCase().includes(filterClientName.toLowerCase()));
      return roleMatch && nameMatch;
  });
}, [allUsers, filterRole, filterClientName]);


const handleDeleteUser = async (userId, userName) => {
  if (!confirm(`Tem a certeza que deseja excluir o utilizador "${userName}" (ID: ${userId})? Esta ação é irreversível.`)) {
    return;
  }
  setActionMessage({ type: '', text: '' });
  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Falha ao excluir utilizador.');
    }
    setActionMessage({ type: 'success', text: data.message || 'Utilizador excluído com sucesso!' });
    fetchUsers();
  } catch (err) {
    console.error(`Erro ao excluir utilizador ${userId}:`, err);
    setActionMessage({ type: 'error', text: err.message });
  }
};

const handleClearFilters = () => {
  setFilterRole('all');
  setFilterClientName('');
};

if (loading) {
  return ( <div className="flex justify-center items-center h-full py-10"><Spinner size="h-10 w-10" /><p className="ml-3">A carregar utilizadores...</p></div> );
}

if (error) {
  return <p className="text-center text-red-500 bg-red-100 p-4 rounded-md">Erro ao carregar utilizadores: {error}</p>;
}

return (
  <div className="bg-gray-50 p-4 sm:p-6 rounded-xl">
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <h1 className="text-2xl font-bold text-gray-800">
        Gestão de Utilizadores
      </h1>
      <div className="flex items-center gap-4">
          <Link 
            href="/admin/users/new" 
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm flex items-center text-sm"
          >
            <IconUserPlus /> 
            <span className="ml-2 hidden sm:inline">Adicionar Utilizador</span>
          </Link>
      </div>
    </div>

    {/* --- BARRA DE FILTROS --- */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg bg-white shadow-sm">
      <div className="md:col-span-1">
          <label htmlFor="clientNameFilter" className="block text-sm font-medium text-gray-700">Filtrar por Nome</label>
          <input type="text" id="clientNameFilter" value={filterClientName} onChange={(e) => setFilterClientName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 sm:text-sm"
              placeholder="Digite o nome do cliente..." />
      </div>
      <div className="md:col-span-1">
          <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700">Filtrar por Função</label>
          <select 
              id="roleFilter"
              value={filterRole} 
              onChange={(e) => setFilterRole(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
              <option value="all">Todas as Funções</option>
              <option value="admin">Administradores</option>
              <option value="user">Utilizadores</option>
          </select>
      </div>
      <div className="flex items-end">
          <button onClick={handleClearFilters} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium">Limpar Filtros</button>
      </div>
    </div>


    {actionMessage.text && (
      <div className={`p-3 mb-4 rounded-md text-sm ${actionMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {actionMessage.text}
      </div>
    )}
    
    {filteredUsers.length === 0 ? (
      <div className="text-center text-gray-500 py-10 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-medium">Nenhum utilizador encontrado</h3>
          <p className="mt-1 text-sm">Não há utilizadores que correspondam aos filtros selecionados.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map((userItem) => (
          <div key={userItem.id} className="bg-white p-5 rounded-lg shadow-md border border-gray-200 flex flex-col justify-between">
              <div>
                  <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0">
                          <p className="text-xs text-gray-500">Utilizador #{userItem.id}</p>
                          <h3 className="font-semibold text-gray-800 truncate" title={userItem.name}>
                              {userItem.name}
                          </h3>
                          <p className="text-sm text-gray-500 truncate" title={userItem.email}>{userItem.email}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${userItem.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {userItem.role}
                      </span>
                  </div>
                  <p className="text-xs text-gray-400 border-t pt-2 mt-2">
                      Registado em: {new Date(userItem.created_at).toLocaleDateString('pt-BR')}
                  </p>
              </div>

              <div className="flex items-center gap-4 mt-4 border-t pt-3">
                  <button 
                      onClick={() => alert(`Editar utilizador ID: ${userItem.id} (não implementado)`)} 
                      className="flex-1 text-center text-indigo-600 hover:text-indigo-900 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-md hover:bg-indigo-50 transition-colors text-sm font-medium"
                      title="Editar Utilizador"
                  >
                    <IconEdit />
                    <span>Editar</span>
                  </button>
                  <button 
                      onClick={() => handleDeleteUser(userItem.id, userItem.name)} 
                      className="flex-1 text-center text-red-600 hover:text-red-900 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-md hover:bg-red-50 transition-colors text-sm font-medium"
                      title="Excluir Utilizador"
                      disabled={adminUser?.id === userItem.id} 
                  >
                    <IconTrash />
                    <span>Excluir</span>
                  </button>
              </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
}

