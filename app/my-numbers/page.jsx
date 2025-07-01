// app/my-numbers/page.jsx
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Spinner from '@/components/Spinner';

// --- COMPONENTE INTERNO PARA USAR useSearchParams ---
function MyNumbersContent() {
    const { token, isAuthenticated, loading: authLoading, user } = useAuth(); // Adicionado 'user'
    const router = useRouter();
    const searchParams = useSearchParams();
  
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(false); // Adicionado para o botão de pagar
  
    // Lê o filtro da URL ou usa 'all' como padrão
    const initialFilter = searchParams.get('filter') || 'all';
    const [filterStatus, setFilterStatus] = useState(initialFilter);
  
    useEffect(() => {
      if (!authLoading) {
        if (!isAuthenticated) {
          router.push('/login');
          return;
        }
        if (token) {
          const fetchMyOrders = async () => {
            setLoading(true);
            setError('');
            try {
              const response = await fetch('/api/orders/my-orders', {
                headers: { 'Authorization': `Bearer ${token}` },
              });
              if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || `Erro ${response.status} ao buscar pedidos.`);
              }
              const data = await response.json();
              setAllOrders(data.orders || []);
            } catch (err) {
              console.error("Falha ao buscar meus números:", err);
              setError(err.message);
            } finally {
              setLoading(false);
            }
          };
          fetchMyOrders();
        }
      }
    }, [token, isAuthenticated, authLoading, router]);
  
    const filteredOrders = useMemo(() => {
      if (!allOrders) return [];
      if (filterStatus === 'all') {
        return allOrders;
      }
      return allOrders.filter(order => order.status === filterStatus);
    }, [allOrders, filterStatus]);
  
    const handleRetryPayment = async (order) => {
        if (!order || order.status !== 'pending' || !order.purchasedNumbers || order.purchasedNumbers.length === 0) {
            alert("Não é possível processar o pagamento. Por favor, tente novamente na página do produto.");
            router.push(`/products/${order.product_id}`);
            return;
        }

        setActionLoading(true);
        setError(''); 
        try {
            const response = await fetch('/api/payments/mercadopago/create-preference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    orderId: order.order_id,
                    productId: order.product_id,
                    selectedNumbers: order.purchasedNumbers,
                    totalAmount: parseFloat(order.final_total),
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                if (response.status === 409) {
                    alert(data.message); // Ex: "Números não estão mais disponíveis"
                    router.push(`/products/${order.product_id}`);
                } else {
                    throw new Error(data.message || 'Falha ao iniciar novo pagamento.');
                }
            } else if (data.init_point) {
                window.location.href = data.init_point;
            } else {
                throw new Error('Link de pagamento não recebido.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                <Spinner size="h-12 w-12" />
                <p className="ml-3 text-lg">Carregando os seus números...</p>
            </div>
        );
    }
  
    if (error) {
      return <p className="text-center text-red-500 bg-red-100 p-4 rounded-md">Erro ao carregar os seus números: {error}</p>;
    }
  
    const filterButtonClasses = (status) => 
      `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        filterStatus === status 
          ? 'bg-indigo-600 text-white shadow' 
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`;

    const getStatusClass = (statusValue) => {
        switch (statusValue) {
            case 'completed': return 'text-green-600 bg-green-100';
            case 'pending': return 'text-yellow-600 bg-yellow-100';
            case 'failed':
            case 'cancelled': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };
  
    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-indigo-700 mb-4 sm:mb-0">Meus Sorteios</h1>
                {/* --- CONTAINER DO FILTRO ATUALIZADO --- */}
                <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                    <button onClick={() => setFilterStatus('all')} className={filterButtonClasses('all')}>Todos</button>
                    <button onClick={() => setFilterStatus('pending')} className={filterButtonClasses('pending')}>Pendentes</button>
                    <button onClick={() => setFilterStatus('completed')} className={filterButtonClasses('completed')}>Pagos</button>
                    <button onClick={() => setFilterStatus('failed')} className={filterButtonClasses('failed')}>Falhados</button>
                    <button onClick={() => setFilterStatus('cancelled')} className={filterButtonClasses('cancelled')}>Cancelados</button>
                </div>
            </div>
    
            {filteredOrders.length === 0 ? (
                <p className="text-center text-gray-600 py-10">
                    {filterStatus === 'all' ? "Você ainda não participou de nenhum sorteio." : `Nenhum pedido com status "${filterStatus}".`}
                </p>
            ) : (
                <div className="space-y-6">
                {filteredOrders.map((order) => (
                    <div key={order.order_id} className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4">
                            <img 
                                src={order.product?.image_url || 'logo.jpg' || `Produto`} 
                                alt={order.product?.name}
                                className="w-full sm:w-32 h-auto sm:h-20 object-cover rounded-md mb-3 sm:mb-0 sm:mr-4"
                            />
                            <div>
                                <h2 className="text-xl font-semibold text-indigo-600">{order.product?.name || 'Produto não encontrado'}</h2>
                                <p className="text-sm text-gray-500">Pedido ID: {order.order_id} | Data: {new Date(order.order_date).toLocaleDateString('pt-BR')}</p>
                                <p className="text-sm text-gray-500">Total: {parseFloat(order.final_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                <p className="text-sm text-gray-700">
                                    Status do Pedido: 
                                    <span className={`ml-1 font-semibold px-2 py-0.5 rounded-full text-xs ${getStatusClass(order.status)}`}>
                                      {order.status?.toUpperCase()}
                                    </span>
                                </p>
                            </div>
                        </div>
                        
                        {order.purchasedNumbers && order.purchasedNumbers.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-sm font-medium text-gray-600 mb-2">{order.status === 'pending' ? 'Números Reservados:' : 'Seus Números:'}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {order.purchasedNumbers.map(num => (
                                    <span key={num} className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold ${order.product?.status === 'drawn' && num === order.product?.winning_number ? 'bg-green-500 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                                        {String(num).padStart(3, '0')}
                                    </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {order.product?.status === 'drawn' && order.status === 'completed' && order.purchasedNumbers?.includes(order.product.winning_number) && (
                            <div className="mt-3 pt-3 border-t">
                                <p className="text-lg font-bold text-green-600 mt-1">🎉 Parabéns! Você ganhou neste sorteio! 🎉</p>
                            </div>
                        )}

                        {order.status === 'pending' && (
                            <div className="mt-4 pt-4 border-t">
                            <button onClick={() => handleRetryPayment(order)} className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm" disabled={actionLoading}>
                                {actionLoading ? <Spinner size="h-5 w-5" /> : 'Pagar Agora'}
                            </button>
                            </div>
                        )}
                    </div>
                ))}
                </div>
            )}
            <div className="mt-8 text-center">
                <Link href="/" className="text-indigo-600 hover:text-indigo-800 font-semibold">
                &larr; Voltar para todos os sorteios
                </Link>
            </div>
        </div>
    );
}

// --- COMPONENTE PAI QUE USA SUSPENSE ---
export default function MyNumbersPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Spinner size="h-12 w-12 text-indigo-600"/></div>}>
            <MyNumbersContent />
        </Suspense>
    );
}
