// app/admin/orders/edit/[id]/page.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext'; // Ajuste o caminho
import { useRouter, useParams } from 'next/navigation';
import Spinner from '@/components/Spinner'; // Ajuste o caminho
import Link from 'next/link';


const IconArrowLeft = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
);

export default function AdminEditOrderPage() {

  const params = useParams();
  const orderId = params.id;

  const { token, user, isAuthenticated, loading: authLoading } = useAuth(); 
  const router = useRouter();
  useEffect(() => {
    if (!authLoading) { 
      if (!isAuthenticated || user?.role !== 'admin') {
        router.push('/login');
      }
    }
  }, [user, authLoading, isAuthenticated, router]);

  const [order, setOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchOrder = useCallback(async () => {
    if (!orderId || !token) return;
    setLoadingInitial(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || `Pedido ID ${orderId} não encontrado.`);
      }
      const data = await response.json();
      setOrder(data.order); // A API retorna { order: ..., numbers: ... }
      setNewStatus(data.order?.status || '');
    } catch (err) {
      console.error("Falha ao buscar pedido para edição:", err);
      setError(err.message);
    } finally {
      setLoadingInitial(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newStatus === order.status) {
      setError("Você não alterou o status do pedido.");
      return;
    }
    
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Falha ao atualizar o pedido.');
      }
      setSuccessMessage(data.message || 'Status do pedido atualizado com sucesso!');
      // Recarregar os dados para refletir o novo estado
      fetchOrder(); 
    } catch (err) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loadingInitial) {
    return ( <div className="flex justify-center items-center h-full py-10"><Spinner size="h-10 w-10" /><p className="ml-3">Carregando dados do pedido...</p></div> );
  }

  if (error && !order) { 
    return (
        <div className="w-full flex flex-col items-center justify-start pt-8 md:pt-2">
            <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl max-w-2xl w-full">
                 <div className="mb-6">
                    <Link href="/admin/orders" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium group">
                        <IconArrowLeft /> <span className="group-hover:underline ml-1.5">Voltar para a Lista de Pedidos</span>
                    </Link>
                </div>
                <p className="text-center text-red-600 bg-red-100 p-4 rounded-lg border border-red-200">Erro ao carregar o pedido: {error}</p>
            </div>
        </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-start pt-8 md:pt-2"> 
      <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl max-w-3xl w-full">
        <div className="mb-6">
          <Link href="/admin/orders" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium group">
              <IconArrowLeft />
              <span className="group-hover:underline ml-1.5">Voltar para a Lista de Pedidos</span>
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-2">
          Editar Pedido
        </h1>
        <p className="text-center text-gray-500 text-sm mb-8">ID do Pedido: {orderId}</p>

        {/* Detalhes não editáveis do pedido */}
        <div className="mb-8 p-4 border rounded-lg bg-gray-50 space-y-2 text-sm">
            <p><strong>Cliente:</strong> {order.user_name} ({order.user_email})</p>
            <p><strong>Produto:</strong> {order.product_name} (ID: {order.product_id})</p>
            <p><strong>Valor Total:</strong> {parseFloat(order.final_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p><strong>Data do Pedido:</strong> {new Date(order.created_at).toLocaleString('pt-BR')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1.5">Alterar Status do Pedido <span className="text-red-500">*</span></label>
            <select
              id="status"
              name="status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              required
              disabled={isSubmitting}
            >
              <option value="pending">Pendente (Pending)</option>
              <option value="completed">Completo (Completed)</option>
              <option value="failed">Falhou (Failed)</option>
              <option value="cancelled">Cancelado (Cancelled)</option>
            </select>
            { order.status === 'completed' && <p className="text-xs text-green-600 mt-1">Este pedido já está completo.</p> }
            { order.status === 'failed' && <p className="text-xs text-red-600 mt-1">Este pedido já falhou.</p> }
          </div>

          {error && !successMessage && <p className="text-red-600 text-center text-sm p-3 bg-red-50 rounded-lg border border-red-200">{error}</p>}
          {successMessage && <p className="text-green-600 text-center text-sm p-3 bg-green-50 rounded-lg border border-green-200">{successMessage}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-semibold py-3.5 px-5 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 flex items-center justify-center"
            disabled={isSubmitting || newStatus === order.status}
          >
            {isSubmitting ? <><Spinner size="h-5 w-5 mr-2" /> Salvando alterações...</> : 'Salvar Alterações'}
          </button>
        </form>
      </div>
    </div>
  );
}
