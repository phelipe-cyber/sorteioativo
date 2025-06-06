// app/my-numbers/page.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Spinner from '@/components/Spinner';

// Ícone de Seta para a Esquerda
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

export default function MyNumbersPage() {
  const { token, isAuthenticated, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true); // Loading da página
  const [actionLoading, setActionLoading] = useState(false); // Loading para ações (como pagar)
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
// Ícone de Seta para a Esquerda
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

  useEffect(() => {
    // ... (useEffect para buscar pedidos, como antes) ...
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
           }
          finally { setLoading(false); }
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

  // --- FUNÇÃO ATUALIZADA PARA TENTAR PAGAMENTO ---
  const handleRetryPayment = async (order) => {
    console.log("FUNÇÃO handleRetryPayment INICIADA para o pedido:", order); // LOG 1
    
    if (!order || order.status !== 'pending' || !order.purchasedNumbers || order.purchasedNumbers.length === 0) {
      alert("Não é possível processar o pagamento para este pedido ou os números selecionados não foram encontrados.");
      console.log("handleRetryPayment: Condições não atendidas, redirecionando para página do produto ID:", order?.product_id);
      // Se não houver purchasedNumbers, talvez redirecionar para a página do produto
      // router.push(`/products/${order.product_id}`);
      return;
    }
    
    setActionLoading(true);
    setError(''); // Limpa erros anteriores
    console.log(`handleRetryPayment: actionLoading=true, processingOrderId=${order.order_id}`); // LOG 2


    try {
      // Chamar a API para criar uma nova preferência de pagamento do Mercado Pago
      // Usando os dados do pedido pendente (productId, números, total)
      const response = await fetch('/api/payments/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: order.product_id,
          selectedNumbers: order.purchasedNumbers, // Usa os números salvos do pedido pendente
          totalAmount: parseFloat(order.total_amount), // Usa o total salvo do pedido pendente
          orderId: order.order_id,
        }),
      });
      console.log("handleRetryPayment: Resposta da API create-preference status:", response.status); // LOG 3
      const data = await response.json();
      console.log("handleRetryPayment: Dados da API create-preference:", data); // LOG 4


      if (!response.ok) {
        // Se a API de criar preferência retornar erro de números indisponíveis (409)
        if (response.status === 409 && data.unavailable_numbers) {
            alert(`Os seguintes números não estão mais disponíveis: ${data.unavailable_numbers.join(', ')}. Por favor, vá para a página do produto para selecionar novos números.`);
            router.push(`/products/${order.product_id}`); // Redireciona para a página do produto
        } else {
            throw new Error(data.message || 'Falha ao iniciar o novo pagamento com Mercado Pago.');
        }
      } else if (data.init_point) {
        console.log("handleRetryPayment: Redirecionando para Mercado Pago:", data.init_point); // LOG 5
        window.location.href = data.init_point; // Redireciona para o checkout do MP
      } else {
        throw new Error('Link de pagamento do Mercado Pago não recebido.');
      }

    } catch (err) {
      console.error("Erro ao tentar novo pagamento com MP:", err);
      setError(err.message || "Erro ao contatar o Mercado Pago. Tente novamente.");
    } finally {
      setActionLoading(false);
    }
  };


  if (authLoading || loading) { 
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
          <Spinner size="h-12 w-12" />
          <p className="ml-3 text-lg">Carregando seus números...</p>
        </div>
      );
   }
  if (error && !loading) { // Mostra erro apenas se o loading terminou
    return <p className="text-center text-red-500 bg-red-100 p-4 rounded-md">Erro ao carregar seus números: {error}</p>;
   }

  const filterButtonClasses = (statusValue) => 
    `px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
      filterStatus === statusValue 
        ? 'bg-indigo-600 text-white shadow-md' 
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`;

  const getStatusClass = (statusValue) => {
    switch (statusValue) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600';
    }
  };
  
  const getProductStatusClass = (statusValue) => {
    switch (statusValue) {
      case 'active': return 'text-green-700';
      case 'upcoming': return 'text-blue-700';
      case 'drawn': return 'text-purple-700';
      case 'cancelled': return 'text-red-700';
      default: return 'text-gray-700';
    }
  };


  return (
    <div className="max-w-4xl mx-auto p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-700 mb-4 sm:mb-0">Meus Sorteios</h1>
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => setFilterStatus('all')} className={filterButtonClasses('all')}>Todos</button>
          <button onClick={() => setFilterStatus('pending')} className={filterButtonClasses('pending')}>Pendentes</button>
          <button onClick={() => setFilterStatus('completed')} className={filterButtonClasses('completed')}>Pagos</button>
          <button onClick={() => setFilterStatus('failed')} className={filterButtonClasses('failed')}>Falhados</button>
        </div>
      </div>
      {error && <p className="text-center text-red-500 bg-red-100 p-4 rounded-md mb-4">Erro: {error}</p>}

      <div className="mt-8 text-center">
         {/* --- BOTÃO MELHORADO --- */}
         <Link 
          href="/" 
          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-semibold py-2 px-3 mb-6 rounded-md hover:bg-indigo-100 transition-colors duration-150 group"
        >
          <ArrowLeftIcon />
          Voltar para todos os sorteios
        </Link>
      </div>

      {filteredOrders.length === 0 ? (
         <div className="text-center text-gray-500 py-10 bg-white rounded-lg shadow">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
                {filterStatus === 'all' ? "Você ainda não participou de nenhum sorteio." : `Nenhum sorteio com status "${filterStatus}".`}
            </h3>
            {filterStatus === 'all' && ( <p className="mt-1 text-sm text-gray-500">Explore os sorteios ativos!</p> )}
            <div className="mt-6">
                <Link href="/" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Ver Sorteios Ativos
                </Link>
            </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <div key={order.order_id} className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-gray-200">
              <div className="flex flex-col md:flex-row gap-4">
                <img 
                  src={order.product?.image_url || `https://placehold.co/200x150/E2E8F0/4A5568?text=${encodeURIComponent(order.product?.name || 'Produto')}`} 
                  alt={order.product?.name || 'Imagem do Produto'}
                  className="w-full md:w-40 h-auto md:h-28 object-cover rounded-md self-center md:self-start"
                />
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-indigo-700 hover:text-indigo-800">
                    <Link href={`/products/${order.product_id}`}>{order.product?.name || 'Produto não disponível'}</Link>
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">Pedido ID: {order.order_id} | Data: {new Date(order.order_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  <p className="text-sm sm:text-base text-gray-700 font-medium">Total: {parseFloat(order.total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 items-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(order.status)}`}>
                      Pedido: {order.status?.toUpperCase() || 'N/A'}
                    </span>
                    <span className={`text-xs font-medium ${getProductStatusClass(order.product?.status)}`}>
                      Sorteio: {order.product?.status?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lógica para exibir número sorteado (se o sorteio ocorreu e o pedido está completo) */}
              {order.product?.status === 'drawn' && order.product.winning_number !== null && order.status === 'completed' && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-semibold">
                    Número Sorteado: 
                    <span className="ml-2 text-lg text-blue-600 font-bold">
                        {String(order.product.winning_number).padStart(2, '0')}
                    </span>
                  </p>
                  {order.purchasedNumbers?.includes(order.product.winning_number) && (
                    <p className="text-md font-bold text-green-600 mt-1">🎉 Parabéns! Você ganhou neste sorteio! 🎉</p>
                  )}
                </div>
              )}

              {/* Exibir números associados (sejam 'pending' ou 'completed') */}
              {order.purchasedNumbers && order.purchasedNumbers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1.5">
                    {order.status === 'pending' ? 'Números Selecionados (Pagamento Pendente):' : 'Seus Números Comprados:'}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {order.purchasedNumbers.map(num => (
                      <span 
                        key={num} 
                        className={`px-2.5 py-1 rounded-md text-xs sm:text-sm font-medium shadow-sm
                          ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                            (order.product?.status === 'drawn' && num === order.product?.winning_number 
                              ? 'bg-green-500 text-white ring-2 ring-offset-1 ring-green-400 animate-pulse' 
                              : 'bg-indigo-100 text-indigo-700')}`}
                      >
                        {String(num).padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Botão para pagar pedido pendente */}
              {order.status === 'pending' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button 
                    onClick={() => {
                      console.log(`Botão Pagar Agora CLICADO para pedido ID: ${order.order_id}`); // LOG NO CLIQUE
                      handleRetryPayment(order);
                    }}
                    className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm text-sm flex items-center justify-center"
                    disabled={actionLoading && order.order_id === allOrders.find(o => o.status === 'pending' && actionLoading)?.order_id} // Desabilita apenas o botão do pedido em ação
                  >
                    {actionLoading && order.order_id === allOrders.find(o => o.status === 'pending' && actionLoading)?.order_id ? (<><Spinner size="h-4 w-4 mr-2"/> Processando...</>) : 'Pagar Agora'}
                  </button>
                </div>
              )}


            </div>
          ))}
        </div>
      )}
     
    </div>
  );
}
