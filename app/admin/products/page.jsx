// app/admin/products/page.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext'; // Ajuste o caminho
import Link from 'next/link';
import Spinner from '../../../components/Spinner'; // Ajuste o caminho

// Ícone SVG para Editar (reutilizado da página de usuários)
const IconEdit = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
);

// Ícone SVG para Sortear (exemplo: um ícone de "play" ou "estrela/presente")
const IconDraw = () => ( // Usando um ícone de "play" como exemplo para "iniciar sorteio"
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
);

// Ícone SVG para Adicionar Produto (exemplo)
const IconProductPlus = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
        <line x1="12" y1="14" x2="12" y2="22"></line> {/* Simbolizando adição para baixo, como em uma caixa */}
        <line x1="9" y1="18" x2="15" y2="18"></line>
    </svg>
);


export default function AdminProductsListPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawingProductId, setDrawingProductId] = useState(null); 
  const [drawResult, setDrawResult] = useState(null); 
  const [drawError, setDrawError] = useState(null);   

  const fetchProducts = useCallback(async () => {
    if (!token) return; 

    setLoading(true);
    setError('');
    setDrawResult(null); 
    setDrawError(null);
    try {
      const response = await fetch('/api/admin/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || `Erro ${response.status}`);
      }
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error("Falha ao buscar produtos para admin:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]); 

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]); 

  const handleDraw = async (productId) => {
    if (!confirm(`Você tem certeza que deseja realizar o sorteio para o produto ID ${productId}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setDrawingProductId(productId);
    setDrawResult(null);
    setDrawError(null);

    try {
      const response = await fetch(`/api/admin/products/${productId}/draw`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json', 
        },
      });

      const data = await response.json(); 

      if (!response.ok) {
        throw new Error(data.message || `Falha ao realizar o sorteio. Status: ${response.status}`);
      }

      setDrawResult({ 
        productId, 
        message: data.message, 
        winningNumber: data.winningNumber, 
        winningUserId: data.winningUserId 
      });
      fetchProducts(); 

    } catch (err) {
      console.error("Erro ao sortear:", err);
      setDrawError({ productId, message: err.message });
    } finally {
      setDrawingProductId(null);
    }
  };
  
  if (loading && products.length === 0) { 
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Spinner size="h-12 w-12" />
        <p className="ml-3 text-lg">Carregando produtos...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-indigo-700">
          Gerenciar Produtos e Sorteios
        </h1>
        {/* --- BOTÃO MELHORADO --- */}
        <Link 
          href="/admin/products/new" 
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md flex items-center text-base transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <IconProductPlus />
          <span className="ml-2">Adicionar Novo Produto</span>
        </Link>
      </div>

      {drawError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          Erro ao sortear produto ID {drawError.productId}: {drawError.message}
        </div>
      )}
      {drawResult && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {drawResult.message} Produto ID: {drawResult.productId}. Número Sorteado: <strong>{String(drawResult.winningNumber).padStart(2,'0')}</strong> (Usuário ID: {drawResult.winningUserId}).
        </div>
      )}
      {error && products.length === 0 && ( 
         <p className="text-center text-red-500 bg-red-100 p-4 rounded-md">Erro ao carregar produtos: {error}</p>
      )}


      {products.length === 0 && !loading && !error ? (
        <p className="text-center text-gray-500 py-8">Nenhum produto cadastrado ainda.</p>
      ) : products.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço/Nº</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criação</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {parseFloat(product.price_per_number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${product.status === 'active' ? 'bg-green-100 text-green-800' : 
                        product.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' : 
                        product.status === 'drawn' ? 'bg-blue-100 text-blue-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {product.status}
                    </span>
                     {product.status === 'drawn' && product.winning_number !== null && (
                        <span className="ml-2 text-xs text-blue-700">(Nº {String(product.winning_number).padStart(2, '0')})</span>
                     )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(product.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link 
                        href={`/admin/products/edit/${product.id}`} 
                        className="text-indigo-600 hover:text-indigo-900 mr-3 transition-colors inline-flex items-center"
                        title="Editar Produto"
                    >
                      <IconEdit />
                      <span className="ml-1 sm:ml-2 hidden sm:inline">Editar</span>
                    </Link>
                    
                    {product.status === 'active' && (
                      <button 
                        onClick={() => handleDraw(product.id)} 
                        className="text-purple-600 hover:text-purple-900 disabled:text-gray-400 disabled:cursor-not-allowed inline-flex items-center"
                        disabled={drawingProductId === product.id} 
                        title="Sortear Vencedor"
                      >
                        {drawingProductId === product.id ? (
                          <>
                            <Spinner size="h-4 w-4" color="border-purple-600" />
                            <span className="ml-1 sm:ml-2">Sorteando...</span>
                          </>
                        ) : (
                          <>
                            <IconDraw />
                            <span className="ml-1 sm:ml-2 hidden sm:inline">Sortear</span>
                          </>
                        )}
                      </button>
                    )}
                    {product.status === 'drawn' && (
                        <span className="text-gray-500 text-xs italic">Sorteado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
