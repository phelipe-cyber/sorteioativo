// app/payment/pending/page.jsx
'use client';

import { useEffect, useState, Suspense } from 'react'; // Adicionado Suspense
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Spinner from '@/components/Spinner'; // Ajuste o caminho se necessário
import { useAuth } from '@/context/AuthContext'; // Ajuste o caminho se necessário

// Componente interno que usa useSearchParams
function PendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter(); // Se precisar de router aqui dentro
  const { isAuthenticated, loading: authLoading } = useAuth(); // Se precisar de auth aqui dentro

  const orderId = searchParams.get('order_id');
  const paymentId = searchParams.get('payment_id'); 
  const mpStatus = searchParams.get('status'); 
  const collectionStatus = searchParams.get('collection_status'); 

  const [displayMessage, setDisplayMessage] = useState('Seu pagamento está sendo processado ou aguardando ação.');
  
  useEffect(() => {
    console.log("Página Pendente (Conteúdo) - Order ID:", orderId);
    console.log("Página Pendente (Conteúdo) - Payment ID (MP):", paymentId);
    console.log("Página Pendente (Conteúdo) - Status (MP):", mpStatus);
    console.log("Página Pendente (Conteúdo) - Collection Status (MP):", collectionStatus);

    if (orderId) {
      setDisplayMessage(`O pagamento para o pedido ${orderId} está pendente ou em processamento.`);
    }
  }, [orderId, paymentId, mpStatus, collectionStatus]);

  // Exemplo de como lidar com o loading da autenticação dentro deste componente filho
  if (authLoading && !isAuthenticated) { 
    return (
        <div className="flex flex-col items-center justify-center p-4">
            <Spinner size="h-8 w-8 text-yellow-500"/>
            <p className="mt-2 text-sm text-gray-600">Verificando sessão...</p>
        </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
      <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>

      <h1 className="text-2xl sm:text-3xl font-bold text-yellow-600 mb-3">Pagamento Pendente</h1>
      <p className="text-gray-700 mb-2">{displayMessage}</p>
      {mpStatus && <p className="text-sm text-gray-500 mb-1">Status Mercado Pago: {mpStatus}</p>}
      {collectionStatus && collectionStatus !== mpStatus && <p className="text-sm text-gray-500 mb-4">Status Coleção MP: {collectionStatus}</p>}
      
      <p className="text-gray-600 mb-6">
        Aguarde a confirmação do pagamento. Você pode verificar o status do seu pedido na seção "Meus Números".
        Se você pagou via boleto, pode levar alguns dias para ser processado.
      </p>

      <div className="space-y-3">
        {isAuthenticated ? (
          <Link
            href="/my-numbers?filter=pending" 
            className="block w-full text-center bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors"
          >
            Ver Meus Pedidos
          </Link>
        ) : (
          <Link href="/login" className="block w-full text-center bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors">
              Fazer Login para Ver Meus Pedidos
          </Link>
        )}

        <Link 
          href="/" 
          className="block w-full text-center text-gray-700 hover:text-gray-900 font-semibold py-3 px-6 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
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

export default function PaymentPendingPage() {
  // Este componente pai agora só envolve o PendingContent com Suspense
  return (
    <div className="flex flex-col items-center justify-center  p-4 bg-gray-50">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-xl max-w-md w-full">
          <Spinner size="h-10 w-10 text-yellow-500" />
          <p className="mt-3 text-gray-600">Carregando informações do pagamento...</p>
        </div>
      }>
        <PendingContent />
      </Suspense>
    </div>
  );
}
