// app/admin/orders/page.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Spinner from '@/components/Spinner';

const IconEdit = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
);
const IconReminder = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
);
const IconTrophy = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
);


export default function AdminOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/orders', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Erro ao buscar pedidos.');
      }
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSendReminder = async (orderId) => {
    // ... lógica para enviar lembrete ...
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return ( <div className="flex justify-center items-center h-full py-10"><Spinner size="h-10 w-10" /><p className="ml-3">Carregando pedidos...</p></div> );
  }

  if (error) {
    return <p className="text-center text-red-500 bg-red-100 p-4 rounded-md">Erro ao carregar pedidos: {error}</p>;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold text-indigo-700 mb-6">Gerenciar Pedidos</h1>

      {actionMessage.text && (
        <div className={`p-3 mb-4 rounded-md text-sm ${actionMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {actionMessage.text}
        </div>
      )}
      
      {orders.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Nenhum pedido encontrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Pedido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Números Associados</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => {
                const isWinningOrder = order.product_status === 'drawn' && order.winner_user_id === order.user_id;

                return (
                <tr key={order.id} className={`${isWinningOrder ? 'bg-green-50' : 'hover:bg-gray-50'} transition-colors`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.id}
                    {isWinningOrder && <IconTrophy className="inline-block ml-2 text-yellow-500" title="Pedido Ganhador"/>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.created_at).toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div className={`font-medium ${isWinningOrder ? 'text-green-700' : ''}`}>{order.user_name || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{order.user_email || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 truncate" title={order.product_name}>{order.product_name || 'N/A'}</td>
                  
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {order.associatedNumbers && order.associatedNumbers.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-sm">
                            {order.associatedNumbers.map(num => (
                                <span key={num} className={`px-2 py-0.5 text-xs rounded-full font-medium 
                                    ${isWinningOrder && num === order.winning_number 
                                        ? 'bg-green-500 text-white ring-2 ring-green-300' 
                                        : 'bg-indigo-100 text-indigo-800'}`
                                }>
                                    {String(num).padStart(2, '0')}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span className="text-gray-400 italic">Nenhum</span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{parseFloat(order.total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-4">
                    <Link href={`/admin/orders/edit/${order.id}`} className="text-indigo-600 hover:text-indigo-900 inline-flex items-center">
                      <IconEdit />
                      <span className="ml-1.5">Editar</span>
                    </Link>
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleSendReminder(order.id)}
                        disabled={actionLoadingId === order.id}
                        className="text-yellow-600 hover:text-yellow-900 inline-flex items-center disabled:opacity-50 disabled:cursor-wait"
                        title="Enviar lembrete de pagamento"
                      >
                        {actionLoadingId === order.id ? (
                            <Spinner size="h-4 w-4" color="border-yellow-600" />
                        ) : (
                            <IconReminder />
                        )}
                        <span className="ml-1.5">Lembrar</span>
                      </button>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
