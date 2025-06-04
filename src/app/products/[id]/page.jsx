// app/products/[id]/page.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext'; 
import Link from 'next/link';
import Spinner from '../../../../components/Spinner'; 

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 group-hover:text-indigo-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const DiceIcon = ({ className = "w-4 h-4 mr-2" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <path d="M16 8h.01"></path>
        <path d="M12 12h.01"></path>
        <path d="M8 16h.01"></path>
        <path d="M8 8h.01"></path>
        <path d="M16 16h.01"></path>
    </svg>
);

const ClearIcon = ({ className = "w-4 h-4 mr-2" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
        <line x1="18" y1="9" x2="12" y2="15"></line>
        <line x1="12" y1="9" x2="18" y2="15"></line>
    </svg>
);


export default function ProductDetailPage() {
  const { id: productId } = useParams();
  const [product, setProduct] = useState(null);
  const [numbers, setNumbers] = useState([]); 
  const [selectedNumbers, setSelectedNumbers] = useState([]); 
  
  const [loading, setLoading] = useState(true); 
  const [actionLoading, setActionLoading] = useState(false); 
  
  const { token, isAuthenticated, user } = useAuth(); 
  const router = useRouter();
  
  const [userFeedback, setUserFeedback] = useState('');

  const fetchProductData = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setUserFeedback('');
    try {
      const response = await fetch(`/api/products/${productId}`); 
      if (!response.ok) {
        let errorMsg = 'Produto não encontrado';
        try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
        } catch (e) { /* Mantém a mensagem padrão */ }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      setProduct(data.product);
      setNumbers(data.numbers || []); 
    } catch (error) {
      console.error("Erro ao carregar dados do produto:", error);
      setUserFeedback(`Erro ao carregar dados: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProductData();
  }, [fetchProductData]);

  useEffect(() => {
    if (product && isAuthenticated) {
      const pendingPurchaseRaw = localStorage.getItem('pendingPurchase');
      if (pendingPurchaseRaw) {
        const pendingPurchase = JSON.parse(pendingPurchaseRaw);
        if (String(pendingPurchase.productId) === String(product.id)) { 
          setSelectedNumbers(pendingPurchase.numbers);
          setUserFeedback("Sua seleção anterior foi restaurada. Prossiga para o pagamento se desejar.");
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
    if (selectedNumbers.includes(numberData.number_value) && numberData.status !== 'sold') {
      return 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-offset-1 ring-indigo-500'; 
    }
    switch (numberData.status) {
      case 'sold':
        return numberData.user_id === user?.id 
          ? 'bg-yellow-400 text-black font-semibold cursor-not-allowed opacity-80' 
          : 'bg-red-500 text-white cursor-not-allowed opacity-70'; 
      case 'reserved':
        return numberData.user_id === user?.id
          ? 'bg-yellow-300 text-black hover:bg-yellow-400 cursor-not-allowed opacity-90' 
          : 'bg-red-500 text-white cursor-not-allowed opacity-70'; // Cor diferente para reservado por outro usuario
      case 'available':
      default:
        return 'bg-green-500 hover:bg-green-600 text-white'; 
    }
  };

  const handleSelectRandomNumbers = (count) => {
    setUserFeedback('');
    const availableNumbers = numbers
      .filter(num => num.status === 'available') 
      .map(num => num.number_value); 

    if (availableNumbers.length === 0) {
      setUserFeedback(`Não há números disponíveis para seleção.`);
      setSelectedNumbers([]); 
      return;
    }
    
    if (availableNumbers.length < count) {
      setUserFeedback(`Apenas ${availableNumbers.length} números estão disponíveis. Selecionando todos os disponíveis.`);
      setSelectedNumbers([...availableNumbers]); 
      return;
    }

    const shuffledAvailable = [...availableNumbers]; 
    for (let i = shuffledAvailable.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledAvailable[i], shuffledAvailable[j]] = [shuffledAvailable[j], shuffledAvailable[i]];
    }

    const randomSelection = shuffledAvailable.slice(0, count);
    setSelectedNumbers(randomSelection); 
    // setUserFeedback(`${randomSelection.length} números aleatórios selecionados!`);
  };

  const handleInitiatePayment = () => {
    if (selectedNumbers.length === 0) { 
        setUserFeedback("Selecione pelo menos um número para continuar.");
        return;
    }
    if (!product) { 
        setUserFeedback("Detalhes do produto não carregados. Tente recarregar a página.");
        return;
    }
    if (!isAuthenticated) { 
        localStorage.setItem('pendingPurchase', JSON.stringify({ 
            productId: product.id, 
            numbers: selectedNumbers 
        }));
        router.push(`/login?redirect=/products/${product.id}`);
        return;
    
    }
    
    // Aqui você chamaria sua função real que interage com a API /api/payments/mercadopago/create-preference
    // Ex: initiateMercadoPagoPayment(selectedNumbers);
    // Para este exemplo, a função initiateMercadoPagoPayment está definida no Canvas anterior.
    // Vamos simular a chamada dela aqui:
    setActionLoading(true);
    setUserFeedback('');
    console.log("Iniciando pagamento com Mercado Pago para os números:", selectedNumbers);
    
    // Simulação da chamada à API de criação de preferência
    setTimeout(async () => {
        try {
            const totalAmount = parseFloat(product.price_per_number) * selectedNumbers.length;
            const response = await fetch('/api/payments/mercadopago/create-preference', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                productId: product.id,
                selectedNumbers: selectedNumbers,
                totalAmount: totalAmount,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Falha ao iniciar o pagamento com Mercado Pago.');
            }

            if (data.init_point) {
                window.location.href = data.init_point;
            } else {
                throw new Error('Link de pagamento do Mercado Pago não recebido.');
            }
        } catch (err) {
            console.error("Erro ao iniciar pagamento com MP:", err);
            setUserFeedback(err.message || "Erro ao contatar o Mercado Pago. Tente novamente.");
        } finally {
            setActionLoading(false);
        }
    }, 1000); // Pequeno delay para simular chamada de API
  };


  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Spinner size="h-12 w-12 text-indigo-600" />
        <p className="mt-4 text-lg text-gray-700">Carregando detalhes do sorteio...</p>
    </div>
  );
  if (!product) return (
    <div className="text-center mt-10 p-6">
        <p className="text-xl text-red-600">Sorteio não encontrado ou erro ao carregar.</p>
        <Link href="/" className="mt-4 inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700">Voltar</Link>
    </div>
  );


  return (
    <div className="container mx-auto px-4 py-8 pb-32 sm:pb-28"> {/* Aumentado padding bottom */}
        <div className="mb-8">
            <Link 
            href="/" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium group text-sm"
            >
            <ArrowLeftIcon />
            Voltar para todos os sorteios
            </Link>
        </div>
        
        {userFeedback && (
             <div 
             className={`p-4 mb-6 text-sm rounded-lg shadow ${
               userFeedback.toLowerCase().includes('erro') || userFeedback.toLowerCase().includes('não há')
                 ? 'bg-red-50 text-red-700 border border-red-200' 
                 : 'bg-blue-50 text-blue-700 border border-blue-200'
             }`} 
             role="alert"
           >
               {userFeedback}
           </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Coluna da Imagem e Detalhes */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden sticky top-24"> {/* Sticky para imagem */}
                    <img 
                        src={product.image_url || `https://placehold.co/800x600/E2E8F0/4A5568?text=${encodeURIComponent(product.name)}`} 
                        alt={product.name}
                        className="w-full h-auto object-cover aspect-[4/3]"
                    />
                    <div className="p-6">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">{product.name}</h1>
                        <p className="text-2xl font-semibold text-green-600 mb-4">
                            {parseFloat(product.price_per_number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            <span className="text-sm text-gray-500 font-normal"> por número</span>
                        </p>
                        <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
                    </div>
                </div>
            </div>

            {/* Coluna da Seleção de Números */}
            <div className="lg:col-span-3">
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl">
                <h3 className="text-xl font-semibold text-center text-gray-700 mb-6">Escolha seus números:</h3>
                
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8">
                    {[5, 10, 15, 20].map(numCount => ( // Adicionado 20
                    <button
                        key={numCount}
                        onClick={() => handleSelectRandomNumbers(numCount)}
                        className="bg-gray-700 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg text-xs sm:text-sm inline-flex items-center shadow-md hover:shadow-lg transition-all"
                        title={`Selecionar ${numCount} números aleatórios`}
                    >
                        <DiceIcon className="w-5 h-5 mr-2" />
                        {numCount} Aleatórios
                    </button>
                    ))}
                    <button
                        onClick={() => { setSelectedNumbers([]); }}
                        className="bg-red-200 hover:bg-red-300 text-red-700 font-medium py-2 px-4 rounded-lg text-xs sm:text-sm inline-flex items-center shadow-md hover:shadow-lg transition-colors"
                        title="Limpar seleção atual"
                    >
                        <ClearIcon className="w-5 h-5 mr-2" />
                        Limpar
                    </button>
                </div>

                <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 sm:gap-2">
                    {numbers.map(numberDataObj => ( 
                        <button
                            key={numberDataObj.number_value}
                            onClick={() => handleNumberClick(numberDataObj)}
                            disabled={ 
                                (numberDataObj.status === 'sold') || 
                                (numberDataObj.status === 'reserved' && numberDataObj.user_id !== user?.id)
                            }
                            className={`p-2 rounded-md text-center font-bold transition-all duration-150 ease-in-out text-xs sm:text-sm border-2 border-transparent
                                        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500
                                        ${getNumberClass(numberDataObj)}
                                        ${(numberDataObj.status === 'sold' || (numberDataObj.status === 'reserved' && numberDataObj.user_id !== user?.id)) 
                                            ? 'opacity-60 cursor-not-allowed' 
                                            : 'hover:scale-105 hover:shadow-md'}
                                        `}
                        >
                            {String(numberDataObj.number_value).padStart(2, '0')}
                        </button>
                    ))}
                </div>
                </div>
            </div>
        </div>

        {selectedNumbers.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-2xl border-t-2 border-gray-200 z-30">
                 <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="text-center sm:text-left">
                        <p className="font-semibold text-gray-800">{selectedNumbers.length} número(s) selecionado(s)</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-600">
                          Total: {(parseFloat(product?.price_per_number || 0) * selectedNumbers.length).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <button 
                        onClick={handleInitiatePayment} 
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
