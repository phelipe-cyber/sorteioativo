// app/payment/failure/page.jsx
'use client';

import { useEffect, useState, Suspense } from 'react'; // Adicionado Suspense
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Spinner from 'components/Spinner'; // Ajuste o caminho se necessário
import { useAuth } from 'context/AuthContext'; // Ajuste o caminho se necessário

// Componente interno que usa useSearchParams
function FailureContent() {
  const searchParams = useSearchParams();
  const router = useRouter(); // Se precisar de router aqui dentro
  const { isAuthenticated, loading: authLoading } = useAuth(); // Se precisar de auth aqui dentro

  const orderId = searchParams.get('order_id');
  const paymentId = searchParams.get('payment_id'); 
  const mpStatus = searchParams.get('status'); 
  const collectionStatus = searchParams.get('collection_status'); 

  const [displayMessage, setDisplayMessage] = useState('Seu pagamento não pôde ser processado.');
  
  // Este useEffect agora está dentro do componente que pode usar useSearchParams
  useEffect(() => {
    console.log("Página de Falha (Conteúdo) - Order ID:", orderId);
    console.log("Página de Falha (Conteúdo) - Payment ID (MP):", paymentId);
    console.log("Página de Falha (Conteúdo) - Status (MP):", mpStatus);
    console.log("Página de Falha (Conteúdo) - Collection Status (MP):", collectionStatus);

    if (orderId) {
      setDisplayMessage(`O pagamento para o pedido ${orderId} falhou ou foi cancelado.`);
    }
  }, [orderId, paymentId, mpStatus, collectionStatus]);

  // A lógica de loading de autenticação pode ser tratada no componente pai ou aqui
  // Se authLoading for true, pode-se mostrar um spinner específico para este conteúdo.
  if (authLoading && !isAuthenticated) { // Exemplo: se ainda não sabemos o status de auth
    return (
        <div className="flex flex-col items-center justify-center p-4">
            <Spinner size="h-8 w-8 text-orange-500"/>
            <p className="mt-2 text-sm text-gray-600">Verificando sessão...</p>
        </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
      <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        {/* <circle cx="12" cy="16" r="1" fill="currentColor" />  Removido, o ícone de erro já é expressivo */}
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
            onClick={() => router.push(`/my-numbers?filter=pending`)} 
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors"
          >
            Ver Meus Pedidos e Tentar Novamente
          </button>
        ) : isAuthenticated && !orderId ? (
           <Link href="/my-numbers" className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors">
              Ver Meus Pedidos
          </Link>
        ) : (
          <Link href="/login" className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors">
              Fazer Login para Tentar Novamente
          </Link>
        )}

        <Link 
          href="/" 
          className="block w-full text-center text-indigo-600 hover:text-indigo-800 font-semibold py-3 px-6 border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
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
  );
}


export default function PaymentFailurePage() {
  // Este componente pai agora só envolve o FailureContent com Suspense
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-xl max-w-md w-full">
          <Spinner size="h-10 w-10 text-red-500" />
          <p className="mt-3 text-gray-600">Carregando informações do pagamento...</p>
        </div>
      }>
        <FailureContent />
      </Suspense>
    </div>
  );
}
