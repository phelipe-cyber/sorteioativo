// app/admin/orders/page.jsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Spinner from '@/components/Spinner';
import { useRouter } from 'next/navigation';


// Ícones
const IconEdit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);
const IconReminder = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);
const IconFilter = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);
const IconDetails = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>
  </svg>
);
const IconClose = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconTrophy = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
);
const IconNotifyWinner = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8"></path><path d="M6 18h2"></path><path d="M12 18h6"></path>
  </svg>
);

const IconCheckSend = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 11.08-3.64-1.29a2.08 2.08 0 0 0-2.07 2.07L16 15.5a2.08 2.08 0 0 0 2.07 2.07L22 18.87"/><path d="M16 15.5a2.08 2.08 0 0 0-2.07-2.07L3 11.08v-1.5a2.08 2.08 0 0 1 2.07-2.07L16 8.87a2.08 2.08 0 0 1 2.07 2.07v1.5a2.08 2.08 0 0 1-2.07 2.07z"/><polyline points="22 11.08 12 7 2 11.08"/>
  </svg>
);

const OrderDetailsModal = ({ order, onClose }) => {
  return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
              <div className="flex justify-between items-center p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-800">Detalhes do Pedido #{order.id}</h3>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><IconClose /></button>
              </div>
              <div className="p-6 space-y-3 text-sm text-gray-700 max-h-[70vh] overflow-y-auto">
                  <p><strong>Status do Pedido:</strong> <span className="font-medium text-indigo-600">{order.status}</span></p>
                  <p><strong>Cliente:</strong> {order.user_name} ({order.user_email})</p>
                  <p><strong>Produto:</strong> {order.product_name}</p>
                  <p><strong>Valor Total:</strong> {parseFloat(order.total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  <p><strong>Data:</strong> {new Date(order.created_at).toLocaleString('pt-BR')}</p>
                  
                  <div className="pt-2">
                      <h4 className="font-semibold text-gray-600 mb-1">Números Associados (JSON):</h4>
                      <pre className="bg-gray-100 p-3 rounded-md text-xs text-gray-800 overflow-x-auto">
                          {JSON.stringify(order.associatedNumbers, null, 2)}
                      </pre>
                  </div>
              </div>
          </div>
      </div>
  );
};

export default function AdminOrdersPage() {
  
  const { token, user, isAuthenticated, loading: authLoading } = useAuth(); 
  const router = useRouter();
  
  useEffect(() => {
    if (!authLoading) { 
      if (!isAuthenticated || user?.role !== 'admin') {
        router.push('/login');
      }
    }
  }, [user, authLoading, isAuthenticated, router]);

  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterOrderId, setFilterOrderId] = useState('');
  const [filterClientName, setFilterClientName] = useState('');

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
      setAllOrders(data.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    return allOrders.filter(order => {
        const statusMatch = filterStatus === 'all' || order.status === filterStatus;
        const userMatch = !filterUserId || String(order.user_id).includes(filterUserId);
        const orderMatch = !filterOrderId || String(order.id).includes(filterOrderId);
        const nameMatch = !filterClientName || (order.user_name && order.user_name.toLowerCase().includes(filterClientName.toLowerCase()));
        return statusMatch && userMatch && orderMatch && nameMatch;
    });
  }, [allOrders, filterStatus, filterUserId, filterOrderId, filterClientName]);

  const handleNotifySuccess = async (orderId) => {
    setActionLoadingId(orderId);
    setActionMessage({ type: '', text: '' });
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/notify-success`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Falha ao enviar notificação.');
        setActionMessage({ type: 'success', text: `Notificação de sucesso para o pedido #${orderId} reenviada!` });
    } catch(err) {
        setActionMessage({ type: 'error', text: `Erro ao notificar sucesso para o pedido #${orderId}: ${err.message}` });
    } finally {
        setActionLoadingId(null);
    }
  };

  const handleSendReminder = async (orderId) => {
    setActionLoadingId(orderId);
    setActionMessage({ type: '', text: '' });
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/remind`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Falha ao enviar lembrete.');
      setActionMessage({ type: 'success', text: `Lembrete para o pedido ${orderId} enviado com sucesso!` });
    } catch(err) {
      setActionMessage({ type: 'error', text: `Erro ao enviar lembrete para o pedido ${orderId}: ${err.message}` });
    } finally {
      setActionLoadingId(null);
    }
  };
  
  const handleNotifyWinner = async (orderId) => {
    setActionLoadingId(orderId);
    setActionMessage({ type: '', text: '' });
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/notify-winner`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Falha ao enviar notificação.');
        setActionMessage({ type: 'success', text: `Notificação para o pedido vencedor #${orderId} reenviada com sucesso!` });
    } catch(err) {
        setActionMessage({ type: 'error', text: `Erro ao notificar ganhador do pedido #${orderId}: ${err.message}` });
    } finally {
        setActionLoadingId(null);
    }
  };


  const getStatusClass = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-200 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  const handleClearFilters = () => {
    setFilterStatus('all');
    setFilterUserId('');
    setFilterOrderId('');
    setFilterClientName('');
  };


  if (loading) {
    return ( <div className="flex justify-center items-center h-full py-10"><Spinner size="h-10 w-10" /><p className="ml-3">Carregando pedidos...</p></div> );
  }

  if (error) {
    return <p className="text-center text-red-500 bg-red-100 p-4 rounded-md">Erro ao carregar pedidos: {error}</p>;
  }

  return (
    <>
      <div className="bg-gray-50 p-4 sm:p-6 rounded-xl">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Gestão de Pedidos
          </h1>
          {/* ... Barra de Filtros ... */}
          
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 border rounded-lg bg-white shadow-sm">
            {/* Filtro por Status */}
            <div>
                <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700">Filtrar por Status</label>
                <select id="statusFilter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 sm:text-sm">
                    <option value="all">Todos</option>
                    <option value="pending">Pendentes</option>
                    <option value="completed">Completos</option>
                    <option value="failed">Falhados</option>
                    <option value="cancelled">Cancelados</option>
                </select>
            </div>
            {/* Filtro por Nome do Cliente */}
            <div>
                <label htmlFor="clientNameFilter" className="block text-sm font-medium text-gray-700">Filtrar por Nome do Cliente</label>
                <input type="text" id="clientNameFilter" value={filterClientName} onChange={(e) => setFilterClientName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    placeholder="Digite o nome do cliente..." />
            </div>
            {/* Filtro por ID Utilizador */}
            <div >
                <label htmlFor="userIdFilter" className="block text-sm font-medium text-gray-700">Filtrar por ID Utilizador</label>
                <input type="number" id="userIdFilter" value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    placeholder="Digite o ID do utilizador..." />
            </div>
            {/* Filtro por ID Pedido */}
            <div>
                <label htmlFor="orderIdFilter" className="block text-sm font-medium text-gray-700">Filtrar por ID Pedido</label>
                <input type="number" id="orderIdFilter" value={filterOrderId} onChange={(e) => setFilterOrderId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    placeholder="Digite o ID do pedido..." />
            </div>
            {/* Botão Limpar Filtros */}
            <div className="flex items-end">
                <button onClick={handleClearFilters} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium">Limpar Filtros</button>
            </div>
        </div>
        
        {actionMessage.text && ( <div className={`p-3 mb-4 rounded-md text-sm ${actionMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{actionMessage.text}</div> )}
        
        {filteredOrders.length === 0 ? (
          <div className="text-center text-gray-500 py-10 bg-white rounded-lg shadow-sm">
              <h3 className="text-lg font-medium">Nenhum pedido encontrado</h3>
              <p className="mt-1 text-sm">Não há pedidos que correspondam aos filtros selecionados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredOrders.map((order) => {
              const isWinningOrder = order.product_status === 'drawn' && order.winner_user_id === order.user_id;

              return (
              <div key={order.id} className={`p-5 rounded-lg shadow-md border flex flex-col justify-between transition-all duration-300 ${isWinningOrder ? 'bg-green-50 border-green-300 shadow-lg' : 'bg-white border-gray-200'}`}>
                  <div>
                      <div className="flex justify-between items-start mb-3">
                          <div>
                              <p className="text-xs text-gray-500">Pedido #{order.id}</p>
                              <h3 className="font-semibold text-gray-800 truncate" title={order.product_name}>
                                  {order.product_name || 'Produto não encontrado'}
                              </h3>
                          </div>
                          <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(order.status)}`}>
                              {order.status}
                          </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1 mb-4 border-t pt-3">
                          <p><strong>Cliente:</strong> <span className={`${isWinningOrder ? 'text-green-700 font-bold' : ''}`}>{order.user_name || 'N/A'}</span></p>
                          <p><strong>Email:</strong> {order.user_email || 'N/A'}</p>
                          <p><strong>Total:</strong> {parseFloat(order.total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          <p><strong>Data:</strong> {new Date(order.created_at).toLocaleString('pt-BR')}</p>
                          <p><strong>Phone:</strong> {order.user_phone}</p>
                      </div>
                      
                      {isWinningOrder && (
                        <div className="p-3 bg-yellow-100 border border-yellow-200 rounded-md mb-4 text-center">
                            <p className="font-bold text-yellow-800 flex items-center justify-center gap-2"><IconTrophy className="text-yellow-500" /> GANHADOR!</p>
                            <p className="text-sm text-yellow-700">Número Sorteado: <span className="font-bold text-xl">{String(order.winning_number).padStart(2,'0')}</span></p>
                        </div>
                      )}

                      {order.associatedNumbers && order.associatedNumbers.length > 0 && (
                          <div className="mb-4">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Números ({order.associatedNumbers.length})</h4>
                              <div className="flex flex-wrap gap-1.5">
                                  {order.associatedNumbers.map(num => (
                                      <span key={num} className={`px-2 py-0.5 text-xs rounded-full font-medium 
                                          ${isWinningOrder && num === order.winning_number 
                                              ? 'bg-green-500 text-white ring-2 ring-offset-1 ring-green-400' 
                                              : 'bg-indigo-100 text-indigo-800'}`
                                      }>
                                          {String(num).padStart(2, '0')}
                                      </span>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="flex items-center flex-wrap gap-2 mt-4 border-t pt-3">
                    <Link href={`/admin/orders/edit/${order.id}`} className="text-indigo-600 hover:text-indigo-900 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-md hover:bg-indigo-50 transition-colors text-sm font-medium">
                      <IconEdit /><span>Editar</span>
                    </Link>
                    <button onClick={() => setViewingOrder(order)} className="text-gray-600 hover:text-gray-900 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium">
                        <IconDetails /><span>Detalhes</span>
                    </button>
                    {order.status === 'pending' && (
                      <button onClick={() => handleSendReminder(order.id)} disabled={actionLoadingId === order.id} className="text-yellow-600 hover:text-yellow-900 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-md hover:bg-yellow-50 transition-colors disabled:opacity-50 disabled:cursor-wait text-sm font-medium" title="Enviar lembrete de pagamento">
                        {actionLoadingId === order.id ? <Spinner size="h-4 w-4" color="border-yellow-600" /> : <IconReminder />}
                        <span>Lembrar</span>
                      </button>
                    )}
                    {order.status === 'completed' && !isWinningOrder && (
                        <button onClick={() => handleNotifySuccess(order.id)} disabled={actionLoadingId === order.id} className="text-green-600 hover:text-green-900 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-wait text-sm font-medium" title="Reenviar Notificação de Pagamento Aprovado">
                            {actionLoadingId === order.id ? <Spinner size="h-4 w-4" color="border-green-600" /> : <IconCheckSend />}
                            <span>Notificar Pgto APRO</span>
                        </button>
                    )}
                    {isWinningOrder && (
                        <button onClick={() => handleNotifyWinner(order.id)} disabled={actionLoadingId === order.id} className="text-green-600 hover:text-green-900 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-wait text-sm font-medium" title="Reenviar Notificação de Ganhador">
                            {actionLoadingId === order.id ? <Spinner size="h-4 w-4" color="border-green-600" /> : <IconTrophy />}
                            <span>Notificar Ganhador</span>
                        </button>
                    )}
                  </div>
              </div>
            )})}
          </div>
        )}
      </div>
      {viewingOrder && <OrderDetailsModal order={viewingOrder} onClose={() => setViewingOrder(null)} />}
    </>
  );
}