// app/payment/failure/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Spinner from '../../../../components/Spinner'; // Ajuste o caminho se necessário
import { useAuth } from '../../../../context/AuthContext'; // Ajuste o caminho se necessário

export default function PaymentFailurePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const orderId = searchParams.get('order_id');
  const paymentId = searchParams.get('payment_id'); // ID do pagamento no MP
  const mpStatus = searchParams.get('status'); // Status retornado pelo MP
  const collectionStatus = searchParams.get('collection_status'); // Outro status que o MP pode enviar

  const [displayMessage, setDisplayMessage] = useState('Seu pagamento não pôde ser processado.');
  const [isLoading, setIsLoading] = useState(true); // Para qualquer lógica de carregamento inicial

  useEffect(() => {
    // Apenas para simular um "carregamento" ou se você quisesse buscar mais detalhes
    console.log("Página de Falha - Order ID:", orderId);
    console.log("Página de Falha - Payment ID (MP):", paymentId);
    console.log("Página de Falha - Status (MP):", mpStatus);
    console.log("Página de Falha - Collection Status (MP):", collectionStatus);

    if (orderId) {
      setDisplayMessage(`O pagamento para o pedido ${orderId} falhou ou foi cancelado.`);
    }
    
    // Se houver alguma lógica assíncrona no futuro, ajuste o setIsLoading
    setIsLoading(false); 

  }, [orderId, paymentId, mpStatus, collectionStatus]);


  // Se precisar verificar autenticação antes de mostrar opções específicas
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center ">
        <Spinner size="h-12 w-12" />
        <p className="mt-4">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center  p-4 text-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          <circle cx="12" cy="16" r="1" fill="currentColor" /> 
          {/* Pequeno ajuste para o ponto de exclamação no ícone de erro */}
        </svg>

        <h1 className="text-2xl sm:text-3xl font-bold text-red-600 mb-3">Pagamento Falhou</h1>
        <p className="text-gray-700 mb-2">{displayMessage}</p>
        {mpStatus && <p className="text-sm text-gray-500 mb-1">Status Mercado Pago: {mpStatus}</p>}
        {collectionStatus && collectionStatus !== mpStatus && <p className="text-sm text-gray-500 mb-4">Status Coleção MP: {collectionStatus}</p>}
        
        <p className="text-gray-600 mb-6">
          Por favor, verifique os dados do seu pagamento ou tente um método diferente.
        </p>

        <div className="space-y-3">
          {isAuthenticated && orderId ? (
            <button
              onClick={() => router.push(`/my-numbers?filter=pending`)} // Leva para "Meus Números" filtrando por pendentes
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors"
            >
              Ver Meus Pedidos e Tentar Novamente
            </button>
          ) : isAuthenticated && !orderId ? (
             <Link href="/my-numbers" className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors">
                Ver Meus Pedidos
            </Link>
          ) : (
            <Link href="/login" className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors">
                Fazer Login para Tentar Novamente
            </Link>
          )}

          <Link 
            href="/" 
            className="block w-full text-indigo-600 hover:text-indigo-800 font-semibold py-3 px-6 border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Voltar para a Página Inicial
          </Link>
        </div>
        {paymentId && (
            <p className="text-xs text-gray-400 mt-6">
                ID da transação (MP): {paymentId}
            </p>
        )}
      </div>
    </div>
  );
}
