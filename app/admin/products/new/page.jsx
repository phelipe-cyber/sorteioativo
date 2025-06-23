// app/admin/products/new/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; 
import { useRouter } from 'next/navigation';
import Spinner from '@/components/Spinner'; 
import Link from 'next/link'; 

const IconArrowLeft = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
);

export default function AdminCreateProductPage() {
  const { token, user, isAuthenticated, loading: authLoading } = useAuth(); 
  const router = useRouter();

  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerNumber, setPricePerNumber] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  // --- NOVO ESTADO PARA A QUANTIDADE DE NÚMEROS ---
  const [totalNumbers, setTotalNumbers] = useState(''); 

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Proteção de rota
  useEffect(() => {
    if (!authLoading) { 
      if (!isAuthenticated || user?.role !== 'admin') {
        router.push('/login');
      }
    }
  }, [user, authLoading, isAuthenticated, router]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    if (!token) {
        setError('Você não está autenticado.');
        setIsLoading(false);
        return;
    }

    // --- VALIDAÇÃO DOS CAMPOS ---
    if (!productName.trim() || !pricePerNumber.trim() || !totalNumbers.trim()) {
        setError('Nome, preço por número e último número são obrigatórios.');
        setIsLoading(false);
        return;
    }
    const numTotalNumbers = parseInt(totalNumbers);
    if (isNaN(numTotalNumbers) || numTotalNumbers < 1 || numTotalNumbers > 10000) { // Exemplo de limite
        setError('O último número deve ser um valor entre 1 e 10.000.');
        setIsLoading(false);
        return;
    }
    if (parseFloat(pricePerNumber) <= 0) {
        setError('O preço por número deve ser maior que zero.');
        setIsLoading(false);
        return;
    }


    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        // --- ADICIONADO total_numbers AO CORPO DA REQUISIÇÃO ---
        body: JSON.stringify({
          name: productName,
          description: description,
          price_per_number: parseFloat(pricePerNumber),
          image_url: imageUrl,
          total_numbers: numTotalNumbers, 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao criar o produto.');
      }

      setSuccessMessage(`Produto "${productName}" (ID: ${data.productId}) criado com sucesso com números de 0 a ${numTotalNumbers}!`);
      // Limpar o formulário
      setProductName('');
      setDescription('');
      setPricePerNumber('');
      setImageUrl('');
      setTotalNumbers('100'); // Reset para o padrão

    } catch (err) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (authLoading || !isAuthenticated || user?.role !== 'admin') {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <Spinner size="h-10 w-10" />
            <p className="mt-4 text-gray-600">Verificando acesso...</p>
        </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-start pt-8 md:pt-2">
      <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl max-w-2xl w-full">
        <div className="mb-6">
          <Link href="/admin/dashboard" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium group">
              <IconArrowLeft />
              <span className="group-hover:underline ml-1.5">Voltar ao Dashboard</span>
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-8">
          Cadastrar Novo Produto de Sorteio
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1.5">Nome do Produto/Sorteio <span className="text-red-500">*</span></label>
            <input
              type="text" id="productName" value={productName} onChange={(e) => setProductName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required disabled={isLoading} placeholder="Ex: Rifa de um Smartphone XPTO"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
            <textarea
              id="description" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows="4" disabled={isLoading} placeholder="Detalhes sobre o produto, regras do sorteio, etc."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
                <label htmlFor="pricePerNumber" className="block text-sm font-medium text-gray-700 mb-1.5">Preço por Número (R$) <span className="text-red-500">*</span></label>
                <input
                type="number" id="pricePerNumber" value={pricePerNumber} onChange={(e) => setPricePerNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required step="0.01" min="0.01" disabled={isLoading} placeholder="Ex: 10.00"
                />
            </div>
            {/* --- NOVO CAMPO PARA QUANTIDADE DE NÚMEROS --- */}
            <div>
                <label htmlFor="totalNumbers" className="block text-sm font-medium text-gray-700 mb-1.5">Último Número do Sorteio <span className="text-red-500">*</span></label>
                <input
                type="number" id="totalNumbers" value={totalNumbers} onChange={(e) => setTotalNumbers(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required min="1" disabled={isLoading} placeholder="Ex: 100"
                />
                <p className="text-xs text-gray-500 mt-1">Isso criará números de 0 até o valor digitado.</p>
            </div>
          </div>

          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1.5">URL da Imagem (opcional)</label>
            <input
              type="url" id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading} placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>

          {error && <p className="text-red-600 text-center text-sm p-3 bg-red-50 rounded-lg border border-red-200">{error}</p>}
          {successMessage && <p className="text-green-600 text-center text-sm p-3 bg-green-50 rounded-lg border border-green-200">{successMessage}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-semibold py-3.5 px-5 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-base"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner size="h-5 w-5" />
                <span className="ml-2">Cadastrando...</span>
              </>
            ) : (
              'Cadastrar Produto'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}