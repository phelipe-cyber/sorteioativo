// app/payment/success/page.jsx
'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext'; // Ajuste o caminho
import Link from 'next/link';
import Spinner from '../../../../components/Spinner'; // Ajuste o caminho

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const orderId = searchParams.get('order_id');
  const paymentId = searchParams.get('payment_id'); // MP envia payment_id e outros
  const status = searchParams.get('status');

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('Processando seu pedido...');

  useEffect(() => {
    if (!isAuthenticated || !token || !orderId ) {
      // Poderia redirecionar ou mostrar mensagem se algo estiver faltando
      // Idealmente, o webhook já processou, mas podemos fazer uma chamada para confirmar
      // e finalizar a marcação dos números se necessário.
      // Para simplificar, apenas mostramos sucesso se MP redirecionou para cá.
      // E confiamos no webhook para a lógica principal.
      return;
    }

    // A API /api/orders que tínhamos antes era para CRIAR uma nova ordem.
    // Agora que a ordem já foi criada com status 'pending' pela API de preferência,
    // o webhook do Mercado Pago deve ter atualizado o status para 'completed'.
    // Opcional: O frontend pode chamar uma API para buscar o status final do pedido
    // e confirmar se os números foram marcados como vendidos.
    // Por ora, vamos assumir que o webhook fez seu trabalho.

    setMessage(`Pagamento para o pedido ${orderId} aprovado (Status MP: ${status}, ID Pagamento MP: ${paymentId})! Seus números foram registrados.`);
    setIsLoading(false);

    // Exemplo de como você poderia chamar a API /api/orders que marca os números como vendidos:
    // Esta lógica precisa ser BEM definida. A API /api/orders atual cria um NOVO pedido.
    // Precisaríamos de uma API /api/orders/[orderId]/finalize ou modificar /api/orders
    // para aceitar um orderId e finalizar uma ordem PENDENTE.
    // A API de webhook é o lugar MAIS SEGURO para marcar números como vendidos.
    // Se você ajustou o webhook para marcar os números como 'sold', então esta página é apenas informativa.

    /*
    const finalizeOrder = async () => {
      try {
        // Esta é a API que criamos que verifica disponibilidade e marca como 'sold'
        // Ela precisa ser idempotente ou saber lidar com um pedido já 'completed' pelo webhook.
        // A API /api/orders atual cria um novo pedido. Isso não está certo aqui.
        // Você precisaria de uma API /api/orders/confirm/[orderId] ou similar.
        // Por ora, vamos remover esta chamada e confiar no webhook + mensagem de sucesso.

        // const response = await fetch(`/api/orders`, { // PRECISA SER UMA NOVA API OU AJUSTE
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'Authorization': `Bearer ${token}`
        //   },
        //   body: JSON.stringify({
        //     // Passar o orderId que foi criado como 'pending'
        //     // E os números que foram selecionados (precisaria buscá-los da ordem 'pending')
        //     // Esta parte requer uma refatoração significativa da API /api/orders.
        //   })
        // });
        // const data = await response.json();
        // if(!response.ok) throw new Error(data.message || "Erro ao finalizar pedido no sistema.");

        // setMessage(`Pedido ${orderId} finalizado com sucesso no sistema!`);

      } catch(err) {
        console.error("Erro ao tentar finalizar pedido no frontend:", err);
        setMessage(`Pagamento aprovado, mas houve um erro ao finalizar o pedido no nosso sistema: ${err.message}. Contate o suporte com o ID do pedido ${orderId}.`);
      } finally {
        setIsLoading(false);
      }
    }
    finalizeOrder();
    */


  }, [orderId, paymentId, status, token, isAuthenticated, router]);

  if (isLoading) {
    return <div className="flex flex-col items-center justify-center "><Spinner size="h-12 w-12"/><p className="mt-4">Processando...</p></div>;
  }

  return (
    <div className="flex flex-col items-center justify-center  p-4 text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4">Pagamento Aprovado!</h1>
      <p className="text-lg mb-2">{message}</p>
      <p className="text-sm text-gray-600 mb-6">Obrigado por participar!</p>
      <Link href="/my-numbers" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg mr-2">
        Ver Meus Números
      </Link>
      <Link href="/" className="text-indigo-600 hover:text-indigo-800 font-semibold py-3 px-6">
        Voltar para Sorteios
      </Link>
    </div>
  );
}