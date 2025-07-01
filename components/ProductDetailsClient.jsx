// app/components/ProductDetailsClient.jsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; 
import Link from 'next/link';
import Spinner from '@/components/Spinner'; 

// Ícones
const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 group-hover:text-indigo-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);
const DiceIcon = ({ className = "w-4 h-4 mr-2" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M16 8h.01"></path><path d="M12 12h.01"></path><path d="M8 16h.01"></path><path d="M8 8h.01"></path><path d="M16 16h.01"></path>
    </svg>
);
const ClearIcon = ({ className = "w-4 h-4 mr-2" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line>
    </svg>
);

// Este componente recebe os dados iniciais do produto como props
export default function ProductDetailsClient({ product, initialNumbers }) {
  const [numbers, setNumbers] = useState(initialNumbers || []); 
  const [selectedNumbers, setSelectedNumbers] = useState([]); 
  const [actionLoading, setActionLoading] = useState(false); 
  const { token, isAuthenticated, user } = useAuth(); 
  const router = useRouter();
  const [userFeedback, setUserFeedback] = useState('');
  const topOfPageRef = useRef(null);

  // Esta função pode ser mantida para recarregar os dados após uma ação
//   const fetchProductData = useCallback(async () => {
//     if (!product?.id) return;
//     try {
//       const response = await fetch(`/api/products/${product.id}`); 
//       if (!response.ok) throw new Error('Falha ao recarregar os dados dos números.');
//       const data = await response.json();
//       console.log("initialNumbers", data);
//       setNumbers(data.numbers || []); 
//     } catch (error) {
//       setUserFeedback(`Erro ao atualizar a lista de números: ${error.message}`);
//     }
//   }, [product?.id]);

  useEffect(() => {
    if (product && isAuthenticated) {
      const pendingPurchaseRaw = localStorage.getItem('pendingPurchase');
      if (pendingPurchaseRaw) {
        const pendingPurchase = JSON.parse(pendingPurchaseRaw);
        if (String(pendingPurchase.productId) === String(product.id)) { 
          setSelectedNumbers(pendingPurchase.numbers);
          setUserFeedback("A sua seleção anterior foi restaurada. Prossiga para o pagamento se desejar.");
          topOfPageRef.current?.scrollIntoView({ behavior: 'smooth' });
          localStorage.removeItem('pendingPurchase');
        } else {
          localStorage.removeItem('pendingPurchase');
        }
      }
    }
  }, [product, isAuthenticated]);

  const handleNumberClick = (numberData) => { 
    setUserFeedback(''); 
    if (numberData.status !== 'available' && !selectedNumbers.includes(numberData.number_value)) return;
    setSelectedNumbers(prev => 
      prev.includes(numberData.number_value)
        ? prev.filter(n => n !== numberData.number_value)
        : [...prev, numberData.number_value]
    );
  };
  
  const getNumberClass = (numberData) => {
    if (selectedNumbers.includes(numberData.number_value)) return 'bg-indigo-600 text-white ring-2 ring-offset-1 ring-indigo-500'; 
    switch (numberData.status) {
      case 'sold': return 'bg-red-500 text-white cursor-not-allowed opacity-70'; 
      case 'reserved': return user?.id === numberData.user_id ? 'bg-yellow-300 text-black' : 'bg-yellow-500 text-white cursor-not-allowed';
      default: return 'bg-green-500 hover:bg-green-600 text-white'; 
    }
  };

  const handleSelectRandomNumbers = (count) => {
    setUserFeedback('');
    const availableNumbers = numbers.filter(num => num.status === 'available').map(num => num.number_value); 
    if (availableNumbers.length < count) {
      setUserFeedback(`Apenas ${availableNumbers.length} números estão disponíveis.`);
      return;
    }
    const shuffled = availableNumbers.sort(() => 0.5 - Math.random());
    setSelectedNumbers(shuffled.slice(0, count)); 
  };

  const initiateMercadoPagoPayment = async () => {
    if (selectedNumbers.length === 0) { 
        setUserFeedback("Selecione pelo menos um número para continuar.");
        topOfPageRef.current?.scrollIntoView({ behavior: 'smooth' });
        return;
    }
    if (!product) { 
        setUserFeedback("Detalhes do produto não carregados. Tente recarregar a página.");
        return;
    }
    if (!isAuthenticated) { 
        localStorage.setItem('pendingPurchase', JSON.stringify({ productId: product.id, numbers: selectedNumbers }));
        router.push(`/login?redirect=/products/${product.id}`);
        return;
    }
    
    setActionLoading(true);
    setUserFeedback('');
    setTimeout(async () => {
        try {
            const subtotal = parseFloat(product.price_per_number) * selectedNumbers.length;
            const discountQuantity = product?.discount_quantity;
            const discountPercentage = product?.discount_percentage;
            let discount = 0;
            if (discountQuantity && discountPercentage && selectedNumbers.length >= discountQuantity) {
                discount = subtotal * (discountPercentage / 100);
            }
            const finalTotal = subtotal - discount;

            const paddedSelectedNumbers = selectedNumbers.map(num =>String(num).padStart(3, '0') );

            const response = await fetch('/api/payments/mercadopago/create-preference', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  productId: product.id,
                  selectedNumbers: paddedSelectedNumbers,
                  subtotal: subtotal,
                  discountAmount: discount,
                  totalAmount: finalTotal,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
              // Se a API retornar erro de números indisponíveis (status 409)
              if (response.status === 409 && data.unavailable_numbers) {
                  // --- LÓGICA CORRIGIDA ---
                  // 1. Define a mensagem de feedback.
                  setUserFeedback(`Os seguintes números não estão mais disponíveis: ${data.unavailable_numbers.join(', ')}. A sua seleção foi atualizada.`);
                  // 2. Remove os números indisponíveis da seleção do utilizador.
                  setSelectedNumbers(currentSelection => 
                      currentSelection.filter(num => !data.unavailable_numbers.includes(num))
                  );
                  // 3. Rola a página para o topo para que a mensagem seja vista.
                  topOfPageRef.current?.scrollIntoView({ behavior: 'smooth' });
                  // 4. Recarrega os dados da grelha para mostrar os novos estados (vendido/reservado).
                  // await fetchProductData();
                  setTimeout(() => fetchProductData(), 4000);
              } else {
                  // Para outros erros, lança a exceção para ser apanhada pelo catch
                  throw new Error(data.message || 'Falha ao iniciar o pagamento com Mercado Pago.');
              }
          } else if (data.init_point) {
              window.location.href = data.init_point;
          } else {
              throw new Error('Link de pagamento do Mercado Pago não recebido.');
          }
              
        } catch (err) {
            console.error("Erro ao iniciar pagamento com MP:", err);
            setUserFeedback(err.message || "Erro ao contatar o Mercado Pago. Tente novamente.");
            topOfPageRef.current?.scrollIntoView({ behavior: 'smooth' });
        } finally {
            setActionLoading(false);
        }
    }, 1000); // Pequeno delay para simular chamada de API
  };

  if (!product) {
    return (
      <div className="text-center mt-10 p-6">
        <h2 className="text-xl font-semibold text-red-600">Sorteio Não Encontrado</h2>
        <p className="text-gray-700 mt-2">Este sorteio pode ter sido removido ou está indisponível.</p>
        <Link href="/" className="mt-6 inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700">Voltar para a Página Principal</Link>
      </div>
    );
  }

  return (
    <div ref={topOfPageRef} className="pb-24">
      {/* Todo o seu JSX da página de detalhes (o que estava no seu ficheiro) vem para aqui */}
      <Link href="/" className="inline-flex items-center text-indigo-600 hover:underline mb-4">
        <ArrowLeftIcon /> Voltar para todos os sorteios
      </Link>
     
      {userFeedback && (
             <div className={`p-4 mb-6 text-sm rounded-lg ${userFeedback.toLowerCase().includes('erro') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`} role="alert">
                 {userFeedback}
             </div>
        )}

        {/* --- NOVO LAYOUT DE DUAS COLUNAS PARA DESKTOP --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12">
            {/* Coluna da Imagem e Detalhes */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden sticky top-24">
                    <img 
                        src={product.image_url || '/logo.jpg'}
                        alt={product.name}
                        className="w-full h-auto object-cover aspect-w-1 aspect-h-1"
                    />
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">{product.name}</h1>
                        <p className="text-xl font-semibold text-green-600 mb-4">
                            {parseFloat(product.price_per_number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            <span className="text-sm text-gray-500 font-normal"> por número</span>
                        </p>
                        <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
                    </div>
                </div>
            </div>

            {/* Coluna da Seleção de Números */}
            <div className="lg:col-span-2">
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl">
                <h3 className="text-xl font-semibold text-center text-gray-700 mb-6">Escolha os seus números:</h3>
                
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8">
                    {[5, 10, 15, 20].map(numCount => (
                    <button
                        key={numCount}
                        onClick={() => handleSelectRandomNumbers(numCount)}
                        className="bg-gray-700 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg text-sm inline-flex items-center shadow-md hover:shadow-lg transition-all"
                        title={`Selecionar ${numCount} números aleatórios`}
                    >
                        <DiceIcon className="w-5 h-5 mr-2" />
                        {numCount} Aleatórios
                    </button>
                    ))}
                    <button
                        onClick={() => { setSelectedNumbers([]); }}
                        className="bg-red-200 hover:bg-red-300 text-red-700 font-medium py-2 px-4 rounded-lg text-sm inline-flex items-center shadow-md hover:shadow-lg transition-colors"
                        title="Limpar seleção atual"
                    >
                        <ClearIcon className="w-5 h-5 mr-2" />
                        Limpar
                    </button>
                </div>

                <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 sm:gap-2">
                    {numbers.map(numberData => ( 
                        <button
                            key={numberData.number_value}
                            onClick={() => handleNumberClick(numberData)}
                            disabled={(numberData.status !== 'available' && !selectedNumbers.includes(numberData.number_value))}
                            className={`p-2 rounded-md text-center font-bold transition-all duration-150 ease-in-out text-xs sm:text-sm border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${getNumberClass(numberData)} ${(numberData.status !== 'available' && !selectedNumbers.includes(numberData.number_value)) ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 hover:shadow-md'}`}
                        >
                            {String(numberData.number_value).padStart(3, '0')}
                        </button>
                    ))}
                </div>
                </div>
            </div>
        </div>

        {selectedNumbers.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-2xl border-t-2 border-gray-200 z-30">
                 <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
                    {(() => {
                        const count = selectedNumbers.length;
                        const subtotal = parseFloat(product?.price_per_number || 0) * count;
                        const discountQuantity = product?.discount_quantity;
                        const discountPercentage = product?.discount_percentage;
                        let discount = 0;
                        if (discountQuantity && discountPercentage && count >= discountQuantity) {
                            discount = subtotal * (discountPercentage / 100);
                        }
                        const finalTotal = subtotal - discount;

                        return (
                            <div className="text-center sm:text-left">
                                <p className="font-semibold text-gray-800">{count} número(s) selecionado(s)</p>
                                {discount > 0 ? (
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-lg text-gray-500 line-through">{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        <p className="text-xl sm:text-2xl font-bold text-green-600">{finalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">{discountPercentage}% OFF</span>
                                    </div>
                                ) : (
                                     <p className="text-xl sm:text-2xl font-bold text-green-600">Total: {finalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                )}
                            </div>
                        );
                    })()}
                    <button 
                        onClick={initiateMercadoPagoPayment} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all w-full sm:w-auto flex items-center justify-center text-base"
                        disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <>
                          <Spinner size="h-5 w-5" /> <span className="ml-2">Indo para Pagamento...</span>
                        </>
                      ) : (
                        'Ir para Pagamento' 
                      )}
                    </button>
                </div>
            </div>
        )}

    </div>
  );
}
