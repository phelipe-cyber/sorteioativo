// app/payment/success/page.jsx
'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from 'context/AuthContext'; // Ajuste o caminho
import Link from 'next/link';
import Spinner from 'components/Spinner'; // Ajuste o caminho

// Componente interno que usa useSearchParams
function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, isAuthenticated, loading: authLoading } = useAuth();

  const orderId = searchParams.get('order_id');
  const paymentId = searchParams.get('payment_id');
  const mpStatus = searchParams.get('status');
  // const externalReference = searchParams.get('external_reference'); // Pode ser útil para verificação

  const [isLoadingPage, setIsLoadingPage] = useState(true); // Renomeado para evitar conflito com authLoading
  const [message, setMessage] = useState('Processando a confirmação do seu pedido...');
  const [error, setError] = useState('');

  useEffect(() => {
    console.log("Página de Sucesso (Conteúdo) - Order ID:", orderId);
    console.log("Página de Sucesso (Conteúdo) - Payment ID (MP):", paymentId);
    console.log("Página de Sucesso (Conteúdo) - Status (MP):", mpStatus);

    if (authLoading) {
      // Aguarda a autenticação carregar antes de prosseguir
      return;
    }

    if (!isAuthenticated || !token) {
      setError("Sessão inválida. Por favor, faça login para confirmar seu pedido ou verifique 'Meus Números'.");
      setIsLoadingPage(false);
      return;
    }
    
    if (!orderId) {
      setError("ID do pedido não encontrado na URL de retorno. Não é possível finalizar.");
      setIsLoadingPage(false);
      return;
    }

    const finalizeOrderInSystem = async () => {
      setIsLoadingPage(true);
      setError('');
      setMessage(`Confirmando pedido ${orderId} em nosso sistema...`);
      try {
        // A API /api/orders (POST) é responsável por:
        // 1. Verificar se o pedido (internalOrderId) existe e pertence ao usuário.
        // 2. Verificar a disponibilidade final dos números (caso o webhook ainda não tenha processado ou como dupla checagem).
        // 3. Marcar os números como 'sold' na tabela raffle_numbers.
        // 4. Atualizar o status do pedido para 'completed' na tabela orders.
        const response = await fetch(`/api/orders`, { // Chamando a API que finaliza a compra
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            internalOrderId: parseInt(orderId), // Passa o ID do pedido que foi criado como 'pending'
            // A API /api/orders deve ser capaz de buscar productId e selectedNumbers
            // a partir do internalOrderId (que foram salvos quando o pedido foi para 'pending'
            // e os números foram reservados).
            paymentDetails: `Mercado Pago Payment ID: ${paymentId}, Status MP: ${mpStatus} (retorno success)`
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Erro ao finalizar o pedido em nosso sistema.");
        }
        setMessage(data.message || `Pedido ${orderId} finalizado com sucesso! Seus números foram garantidos.`);

      } catch (err) {
        console.error("Erro ao tentar finalizar pedido no frontend (success page):", err);
        setError(`Pagamento aprovado pelo Mercado Pago, mas houve um erro ao finalizar o pedido em nosso sistema: ${err.message}. Contate o suporte com o ID do pedido ${orderId}.`);
        setMessage(''); 
      } finally {
        setIsLoadingPage(false);
      }
    };

    finalizeOrderInSystem();

  }, [orderId, paymentId, mpStatus, token, isAuthenticated, authLoading, router]); // Adicionado authLoading

  if (isLoadingPage || authLoading) { // Verifica ambos os loadings
    return (
        <div className="flex flex-col items-center justify-center p-4">
            <Spinner size="h-10 w-10 text-green-500"/>
            <p className="mt-3 text-gray-600">{message || "Carregando..."}</p>
        </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full">
      {error ? (
        <>
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h1 className="text-2xl sm:text-3xl font-bold text-red-600 mb-3">Erro ao Finalizar Pedido</h1>
          <p className="text-gray-700 mb-6">{error}</p>
        </>
      ) : (
        <>
          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-3">Pagamento Aprovado!</h1>
          <p className="text-gray-700 mb-6">{message}</p>
        </>
      )}
      
      <p className="text-gray-600 mb-6">
        Obrigado por participar do nosso sorteio!
      </p>

      <div className="space-y-3">
        {isAuthenticated && (
             <Link href="/my-numbers" className="block w-full text-center bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors">
                Ver Meus Números
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


export default function PaymentSuccessPage() {
  // Este componente pai agora só envolve o SuccessContent com Suspense
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-xl max-w-lg w-full">
          <Spinner size="h-10 w-10 text-green-500" />
          <p className="mt-3 text-gray-600">Carregando confirmação do pagamento...</p>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
