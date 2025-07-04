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

const TrophyIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
);

const WinnerInfo = ({ winnerName, winningNumber }) => (
  <div className="bg-yellow-50 border border-yellow-200 p-6 sm:p-8 rounded-xl my-8 text-center shadow-lg relative overflow-hidden">
      <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full">
          Sorteio Finalizado!
      </div>
      <div className="flex justify-center items-center">
          <TrophyIcon className="w-32 h-32 sm:w-40 sm:h-40 text-yellow-400 opacity-90" />
      </div>
      <p className="mt-4 text-lg text-gray-700">O ganhador foi:</p>
      <p className="text-2xl sm:text-3xl font-bold text-green-600">{winnerName}</p>
      <p className="mt-2 text-gray-700">Com o número da sorte:</p>
      <p className="font-bold text-4xl sm:text-5xl text-indigo-600">{String(winningNumber).padStart(2, '0')}</p>
  </div>
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
  const fetchProductData = useCallback(async () => {
    if (!product?.id) return;
    try {
      const response = await fetch(`/api/products/${product.id}`); 
      if (!response.ok) throw new Error('Falha ao recarregar os dados dos números.');
      const data = await response.json();
      console.log("initialNumbers", data);
      setNumbers(data.numbers || []); 
    } catch (error) {
      setUserFeedback(`Erro ao atualizar a lista de números: ${error.message}`);
    }
  }, [product?.id]);

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
    const isWinner = product.status === 'drawn' && product.winning_number === numberData.number_value;
    if (isWinner) return 'bg-green-500 text-white ring-2 ring-offset-1 ring-green-400 animate-pulse';
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
      topOfPageRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUserFeedback(`Apenas ${availableNumbers.length} números estão disponíveis.`);
      return;
    }
    const shuffled = availableNumbers.sort(() => 0.5 - Math.random());
    setSelectedNumbers(shuffled.slice(0, count)); 
  };

  const initiateMercadoPagoPayment = async () => {
    if (selectedNumbers.length === 0) { 
         topOfPageRef.current?.scrollIntoView({ behavior: 'smooth' });
        setUserFeedback("Selecione pelo menos um número para continuar.");
        return;
    }
    if (!product) { 
         topOfPageRef.current?.scrollIntoView({ behavior: 'smooth' });
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
                   topOfPageRef.current?.scrollIntoView({ behavior: 'smooth' });
                  // Para outros erros, lança a exceção para ser apanhada pelo catch
                  throw new Error(data.message || 'Falha ao iniciar o pagamento com Mercado Pago.');
              }
          } else if (data.init_point) {
              window.location.href = data.init_point;
          } else {
              topOfPageRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        <p className="text-gray-700 mt-2">Este sorteio não está indisponível.</p>
        <Link href="/" className="mt-6 inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700">Voltar para a Página Principal</Link>
      </div>
    );
  }
  const isSorteioDrawn = product.status === 'drawn';
  return (
    <div ref={topOfPageRef} className="pb-24">
      {/* Todo o seu JSX da página de detalhes (o que estava no seu ficheiro) vem para aqui */}
      <div className="text-center">
      <Link href="/" className="inline-flex items-center text-indigo-600 hover:underline mb-4 inline-flex items-center mb-4 mt-6 inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700">Voltar para a Página Principal</Link>
     </div>
      {userFeedback && (
             <div className={`p-4 mb-6 text-sm rounded-lg ${userFeedback.toLowerCase().includes('erro') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`} role="alert">
                 {userFeedback}
             </div>
        )}
      {isSorteioDrawn && product.winner_name && (
        <WinnerInfo winnerName={product.winner_name} winningNumber={product.winning_number} />
      )}
        {/* --- NOVO LAYOUT DE DUAS COLUNAS PARA DESKTOP --- */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 xl:gap-12">
            {/* Coluna da Esquerda: Imagem e Detalhes */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                    <div className="bg-gray-100 flex items-center justify-center p-4">
                        <img 
                            src={product.image_url || '/logosorteioativo.png' || `https://placehold.co/800x600/CBD5E1/4A5569?text=${encodeURIComponent(product.name)}`} 
                            alt={product.name}
                            className="w-full h-auto object-cover rounded-md max-h-80"
                        />
                    </div>
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

            {/* Coluna da Direita: Seleção de Números */}
            <div className="lg:col-span-3">
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl">
                <h3 className="text-xl font-semibold text-center text-gray-700 mb-6">
                    {isSorteioDrawn ? 'Números do Sorteio:' : 'Escolha os seus números:'}
                </h3>
                
                {!isSorteioDrawn && (
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
                )}

                <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 sm:gap-2">
                    {numbers.map(numberData => ( 
                        <button
                            key={numberData.number_value}
                            onClick={() => handleNumberClick(numberData)}
                            disabled={isSorteioDrawn || (numberData.status !== 'available' && !selectedNumbers.includes(numberData.number_value))}
                            className={`p-2 rounded-md text-center font-bold transition-all duration-150 ease-in-out text-xs sm:text-sm border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${getNumberClass(numberData)} ${isSorteioDrawn ? 'cursor-not-allowed' : ''}`}
                        >
                            {String(numberData.number_value).padStart(2, '0')}
                        </button>
                    ))}
                </div>
                </div>
            </div>
        </div>

        {selectedNumbers.length > 0 && !isSorteioDrawn && (
          <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg border-t-2 z-20">
               <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
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
