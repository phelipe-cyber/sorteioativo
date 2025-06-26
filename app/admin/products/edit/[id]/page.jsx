// app/admin/products/edit/[id]/page.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext'; 
import { useRouter, useParams } from 'next/navigation';
import Spinner from '@/components/Spinner'; 
import Link from 'next/link';

const IconArrowLeft = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
);

export default function AdminEditProductPage() {
  const { token, user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id;

  // Estados para os campos do formulário
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerNumber, setPricePerNumber] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('upcoming'); 
  const [totalNumbers, setTotalNumbers] = useState(''); 
  const [isTotalNumbersEditable, setIsTotalNumbersEditable] = useState(false);

  // --- NOVOS ESTADOS PARA DESCONTO ---
  const [discountQuantity, setDiscountQuantity] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const fetchProduct = useCallback(async () => {
    if (!productId || !token) return;
    setLoadingInitial(true);
    setError('');
    try {
      // Usar a API de admin para buscar o produto é mais seguro e consistente
      const response = await fetch(`/api/admin/products/${productId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        let errorMsg = `Erro ${response.status}: ${response.statusText}`;
        try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
        } catch (e) {
            errorMsg = `O servidor respondeu com um erro inesperado.`;
        }
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      if (data.product) {
        setProductName(data.product.name || '');
        setDescription(data.product.description || '');
        setPricePerNumber(data.product.price_per_number?.toString() || '');
        setImageUrl(data.product.image_url || '');
        setStatus(data.product.status || 'upcoming');
        setTotalNumbers(data.product.total_numbers?.toString() || '100');
        // --- PREENCHER OS DADOS DE DESCONTO ---
        setDiscountQuantity(data.product.discount_quantity?.toString() || '');
        setDiscountPercentage(data.product.discount_percentage?.toString() || '');
        setIsTotalNumbersEditable(data.product.status === 'upcoming');
      } else {
        throw new Error('Dados do produto não encontrados na resposta da API.');
      }
    } catch (err) {
      console.error("Falha ao buscar produto para edição:", err);
      setError(err.message);
    } finally {
      setLoadingInitial(false);
    }
  }, [productId, token]);


  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
        fetchProduct();
    } else if (!authLoading && !isAuthenticated) {
        router.push('/login');
    }
  }, [isAuthenticated, user, authLoading, router, fetchProduct]);

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
          total_numbers: parseInt(totalNumbers, 10),
          // --- ENVIAR OS NOVOS DADOS DE DESCONTO ---
          discount_quantity: parseInt(discountQuantity) || null,
          discount_percentage: parseInt(discountPercentage) || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao atualizar o produto.');
      }

      setSuccessMessage(`Produto ID ${productId} "${productName}" atualizado com sucesso!`);
      fetchProduct();

    } catch (err) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading || loadingInitial) {
    return (
        <div className="flex flex-col items-center justify-center h-full py-10">
            <Spinner size="h-10 w-10" />
            <p className="mt-4 text-gray-600">Carrengando dados do produto...</p>
        </div>
    );
  }

  if (error && !productName) {
    return (
        <div className="w-full flex flex-col items-center justify-start pt-8 md:pt-12">
            <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl max-w-2xl w-full">
                <p className="text-center text-red-600 bg-red-100 p-4 rounded-lg border border-red-200">Erro ao carregar produto: {error}</p>
            </div>
        </div>
    );
  }


  return (
    <div className="w-full flex flex-col items-center justify-start pt-8 md:pt-2"> 
      <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl max-w-2xl w-full">
        <div className="mb-6">
          <Link href="/admin/products" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium group">
              <IconArrowLeft />
              <span className="group-hover:underline ml-1.5">Voltar para a Lista de Produtos</span>
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-2">
          Editar Produto de Sorteio
        </h1>
        <p className="text-center text-gray-500 text-sm mb-8">ID do Produto: {productId}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1.5">Nome do Produto/Sorteio <span className="text-red-500">*</span></label>
            <input type="text" id="productName" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" required disabled={isSubmitting} placeholder="Ex: Rifa de um Smartphone XPTO" />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" rows="4" disabled={isSubmitting} placeholder="Detalhes sobre o produto, regras do sorteio, etc." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="pricePerNumber" className="block text-sm font-medium text-gray-700 mb-1.5">Preço por Número (R$) <span className="text-red-500">*</span></label>
              <input type="number" id="pricePerNumber" value={pricePerNumber} onChange={(e) => setPricePerNumber(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" required step="0.01"  min="0.01" disabled={isSubmitting} placeholder="Ex: 10.00" />
            </div>
          
            <div>
                <label htmlFor="totalNumbers" className="block text-sm font-medium text-gray-700 mb-1.5">Último Número do Sorteio <span className="text-red-500">*</span></label>
                <input type="number" id="totalNumbers" value={totalNumbers} onChange={(e) => setTotalNumbers(e.target.value)} className={`w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${!isTotalNumbersEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`} required min="1" disabled={isSubmitting || !isTotalNumbersEditable} placeholder="Ex: 100" />
                {!isTotalNumbersEditable && <p className="text-xs text-gray-500 mt-1">Não pode ser alterado para sorteios ativos ou finalizados.</p>}
            </div>
          </div>

          {/* --- SECÇÃO DE DESCONTO ADICIONADA --- */}
          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-md font-medium text-gray-700 mb-2">Configuração de Desconto (Opcional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="discountQuantity" className="block text-sm font-medium text-gray-700 mb-1.5">Nº Mínimo para Desconto</label>
                    <input
                    type="number" id="discountQuantity" value={discountQuantity} onChange={(e) => setDiscountQuantity(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    disabled={isSubmitting} placeholder="Ex: 5"
                    />
                </div>
                <div>
                    <label htmlFor="discountPercentage" className="block text-sm font-medium text-gray-700 mb-1.5">Percentagem de Desconto (%)</label>
                    <input
                    type="number" id="discountPercentage" value={discountPercentage} onChange={(e) => setDiscountPercentage(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    disabled={isSubmitting} placeholder="Ex: 10"
                    />
                </div>
            </div>
          </div>

          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1.5">URL da Imagem (opcional)</label>
            <input type="url" id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" disabled={isSubmitting} placeholder="https://exemplo.com/imagem.jpg" />
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1.5">Status do Sorteio <span className="text-red-500">*</span></label>
            <select
              id="status" value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white"
              required disabled={isSubmitting}
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
