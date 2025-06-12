// app/admin/products/edit/[id]/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; // Ajuste o caminho se necessário
import { useRouter, useParams } from 'next/navigation';
import Spinner from '@/components/Spinner'; // Ajuste o caminho se necessário
import Link from 'next/link';

const IconArrowLeft = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
);

export default function AdminEditProductPage() {
  const { token, user, isAuthenticated, loading: authLoading } = useAuth(); // Adicionado para proteção de rota
  const router = useRouter();
  const params = useParams();
  const productId = params.id;

  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerNumber, setPricePerNumber] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('upcoming'); 

  const [loadingInitial, setLoadingInitial] = useState(true); // Loading para buscar dados do produto
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading para o submit do formulário
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Proteção de rota (se AdminLayout não estiver cuidando exclusivamente)
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'admin') {
        router.push('/login'); 
      }
    }
  }, [user, authLoading, isAuthenticated, router]);

  // Carregar dados do produto para edição
  useEffect(() => {
    if (!productId || !token) {
      if (!authLoading && !token && isAuthenticated) { // Se auth carregou, está autenticado mas sem token (improvável)
        setError("Sessão inválida. Por favor, faça login novamente.");
        setLoadingInitial(false);
      } else if (!authLoading && !isAuthenticated) {
        // Já será redirecionado pelo useEffect acima
      }
      return;
    }

    const fetchProduct = async () => {
      setLoadingInitial(true);
      setError('');
      try {
        // Usar a API pública para buscar detalhes é ok, mas uma API admin GET /api/admin/products/[id] seria mais consistente
        const response = await fetch(`/api/products/${productId}`); // API pública de detalhes
        
        if (!response.ok) {
          let errorMsg = `Produto ID ${productId} não encontrado`;
          try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
          } catch (e) { /* Mantém a mensagem padrão */ }
          throw new Error(errorMsg);
        }
        const data = await response.json();
        if (data.product) {
          setProductName(data.product.name || '');
          setDescription(data.product.description || '');
          setPricePerNumber(data.product.price_per_number?.toString() || '');
          setImageUrl(data.product.image_url || '');
          setStatus(data.product.status || 'upcoming');
        } else {
          throw new Error('Dados do produto não encontrados na resposta da API.');
        }
      } catch (err) {
        console.error("Falha ao buscar produto para edição:", err);
        setError(err.message);
      } finally {
        setLoadingInitial(false);
      }
    };
    
    if (isAuthenticated && user?.role === 'admin') { // Só busca se for admin
        fetchProduct();
    }

  }, [productId, token, isAuthenticated, user, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    if (!token) {
      setError('Você não está autenticado.');
      setIsSubmitting(false);
      return;
    }
    if (!productName.trim() || !pricePerNumber.trim() || !status.trim()) {
        setError('Nome, preço por número e status são obrigatórios.');
        setIsSubmitting(false);
        return;
    }
     if (parseFloat(pricePerNumber) <= 0) {
        setError('O preço por número deve ser maior que zero.');
        setIsSubmitting(false);
        return;
    }

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: productName,
          description: description,
          price_per_number: parseFloat(pricePerNumber),
          image_url: imageUrl,
          status: status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao atualizar o produto.');
      }

      setSuccessMessage(`Produto ID ${productId} "${productName}" atualizado com sucesso!`);
      // Opcional: redirecionar após um tempo
      setTimeout(() => router.push('/admin/products'), 2000);

    } catch (err) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading || (!isAuthenticated && !loadingInitial) || (isAuthenticated && user?.role !== 'admin' && !loadingInitial)) {
    return (
        <div className="flex flex-col items-center justify-center bg-gray-100">
            <Spinner size="h-10 w-10" />
            <p className="mt-4 text-gray-600">Verificando acesso...</p>
        </div>
    );
  }
  
  if (loadingInitial) {
    return (
        <div className="flex flex-col items-center justify-center h-full py-10"> {/* Ajuste para centralizar dentro do main */}
            <Spinner size="h-10 w-10" />
            <p className="mt-4 text-gray-600">Carregando dados do produto...</p>
        </div>
    );
  }

  if (error && !productName && !loadingInitial) { // Se houve erro ao carregar e não temos nome (produto não carregou)
    return (
        <div className="w-full flex flex-col items-center justify-start pt-8 md:pt-12">
            <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl max-w-2xl w-full">
                <div className="mb-6">
                    <Link href="/admin/products" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium group">
                        <IconArrowLeft />
                        <span className="group-hover:underline ml-1.5">Voltar para Lista de Produtos</span>
                    </Link>
                </div>
                <p className="text-center text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">Erro ao carregar produto: {error}</p>
            </div>
        </div>
    );
  }


  return (
    <div className="w-full flex flex-col items-center justify-start pt-8 md:pt-12"> 
      <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl max-w-2xl w-full">
        <div className="mb-6">
          <Link href="/admin/products" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium group">
              <IconArrowLeft />
              <span className="group-hover:underline ml-1.5">Voltar para Lista de Produtos</span>
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-2">
          Editar Produto de Sorteio
        </h1>
        <p className="text-center text-gray-500 text-sm mb-8">ID do Produto: {productId}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1.5">Nome do Produto/Sorteio <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              required
              disabled={isSubmitting}
              placeholder="Ex: Rifa de um Smartphone XPTO"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              rows="4"
              disabled={isSubmitting}
              placeholder="Detalhes sobre o produto, regras do sorteio, etc."
            />
          </div>

          <div>
            <label htmlFor="pricePerNumber" className="block text-sm font-medium text-gray-700 mb-1.5">Preço por Número (R$) <span className="text-red-500">*</span></label>
            <input
              type="number"
              id="pricePerNumber"
              value={pricePerNumber}
              onChange={(e) => setPricePerNumber(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              required
              step="0.01" 
              min="0.01"
              disabled={isSubmitting}
              placeholder="Ex: 10.00"
            />
          </div>

          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1.5">URL da Imagem (opcional)</label>
            <input
              type="url"
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              disabled={isSubmitting}
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1.5">Status do Sorteio <span className="text-red-500">*</span></label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white"
              required
              disabled={isSubmitting}
            >
              <option value="upcoming">Próximo (Upcoming)</option>
              <option value="active">Ativo (Active)</option>
              <option value="drawn">Sorteado (Drawn)</option>
              <option value="cancelled">Cancelado (Cancelled)</option>
            </select>
          </div>

          {error && !successMessage && <p className="text-red-600 text-center text-sm p-3 bg-red-50 rounded-lg border border-red-200">{error}</p>}
          {successMessage && <p className="text-green-600 text-center text-sm p-3 bg-green-50 rounded-lg border border-green-200">{successMessage}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-semibold py-3.5 px-5 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-base"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner size="h-5 w-5" />
                <span className="ml-2">Salvando Alterações...</span>
              </>
            ) : (
              'Salvar Alterações'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
