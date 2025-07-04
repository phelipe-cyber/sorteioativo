// app/admin/products/page.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext'; // Ajuste o caminho
import Link from 'next/link';
import Spinner from '@/components/Spinner'; // Ajuste o caminho
import { useRouter } from 'next/navigation';

// --- ÍCONES PARA A PÁGINA ---
const IconEdit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);
const IconDraw = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);
const IconProductPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <path d="M16 10a4 4 0 0 1-8 0"></path>
      <line x1="12" y1="14" x2="12" y2="22"></line>
      <line x1="9" y1="18" x2="15" y2="18"></line>
  </svg>
);
const IconCheckCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconAlertCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconFilter = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);
const IconArrowLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);
const Notification = ({ title, message, type, onDismiss }) => {
const isError = type === 'error';
const bgColor = isError ? 'bg-red-50' : 'bg-green-50';
const borderColor = isError ? 'border-red-200' : 'border-green-200';
const textColor = isError ? 'text-red-800' : 'text-green-800';
const iconColor = isError ? 'text-red-500' : 'text-green-500';

return (
  <div className={`flex items-start justify-between gap-4 p-4 mb-6 rounded-lg border ${bgColor} ${borderColor} shadow-md`}>
    <div className="flex items-start gap-3">
      <div className={`flex-shrink-0 ${iconColor}`}>{isError ? <IconAlertCircle /> : <IconCheckCircle />}</div>
      <div className={`text-sm ${textColor}`}><p className="font-semibold">{title}</p><p>{message}</p></div>
    </div>
    <button onClick={onDismiss} className={`text-2xl font-bold opacity-70 hover:opacity-100 ${textColor}`} aria-label="Fechar notificação">&times;</button>
  </div>
);
};


export default function AdminProductsListPage() {
const { token } = useAuth();
const [allProducts, setAllProducts] = useState([]); // Armazena todos os produtos
const [filteredProducts, setFilteredProducts] = useState([]); // Armazena os produtos filtrados
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [drawingProductId, setDrawingProductId] = useState(null); 
const [drawResult, setDrawResult] = useState(null); 
const [drawError, setDrawError] = useState(null);
// --- NOVO ESTADO PARA O FILTRO ---
const [filterStatus, setFilterStatus] = useState('all');

const fetchProducts = useCallback(async () => {
  if (!token) return; 
  setLoading(true);
  setError(''); 
  try {
    const response = await fetch('/api/admin/products', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || `Erro ${response.status}`);
    }
    const data = await response.json();
    setAllProducts(data.products || []); // Guarda a lista completa
    setFilteredProducts(data.products || []); // Inicialmente mostra todos
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

// --- EFEITO PARA APLICAR O FILTRO ---
useEffect(() => {
  if (filterStatus === 'all') {
    setFilteredProducts(allProducts);
  } else {
    setFilteredProducts(allProducts.filter(p => p.status === filterStatus));
  }
}, [filterStatus, allProducts]);


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
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const data = await response.json(); 
    if (!response.ok) {
      throw new Error(data.message || `Falha ao realizar o sorteio. Status: ${response.status}`);
    }
    setDrawResult({ 
      productId, 
      message: data.message, 
      winningNumber: data.winningNumber, 
      winnerName: data.winnerName,
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

const getStatusClass = (status) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'upcoming': return 'bg-yellow-100 text-yellow-800';
    case 'drawn': return 'bg-blue-100 text-blue-800';
    default: return 'bg-red-100 text-red-800';
  }
};

if (loading) { 
  return (
    <div className="flex justify-center items-center h-full py-10">
      <Spinner size="h-10 w-10" />
      <p className="ml-3 text-lg">Carrengando produtos...</p>
    </div>
  );
}

return (
  <div className="bg-gray-50 p-4 sm:p-6 rounded-xl">
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Gerenciar Produtos</h1>
        <div className="mb-6">
          <Link href="/admin/dashboard" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium group">
              <IconArrowLeft />
              <span className="group-hover:underline ml-1.5">Voltar ao Dashboard</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <IconFilter className="text-gray-500" />
                <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-white border border-gray-300 rounded-md shadow-sm py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="all">Todos os Status</option>
                    <option value="active">Ativos</option>
                    <option value="upcoming">Próximos</option>
                    <option value="drawn">Sorteados</option>
                    <option value="cancelled">Cancelados</option>
                </select>
            </div>

            {/* --- BOTÃO "ADICIONAR PRODUTO" AJUSTADO --- */}
            <Link 
              href="/admin/products/new" 
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg shadow-md flex items-center text-sm transition-colors"
            >
              <IconProductPlus />
              {/* O texto "Adicionar Novo Produto" agora só aparece em ecrãs maiores que 'sm' */}
              <span className="ml-2 hidden sm:inline">Adicionar Novo</span>
            </Link>
        </div>
      </div>


    {drawError && <Notification type="error" title="Ocorreu um Erro" message={`Ao sortear produto ID ${drawError.productId}: ${drawError.message}`} onDismiss={() => setDrawError(null)} />}
    {drawResult && <Notification type="success" title="Sorteio Realizado!" message={`O ganhador do produto ID ${drawResult.productId} é ${drawResult.winnerName} (ID: ${drawResult.winningUserId}) com o número ${String(drawResult.winningNumber).padStart(2,'0')}. Notificação enviada.`} onDismiss={() => setDrawResult(null)} />}
    {error && <p className="text-center text-red-500 bg-red-100 p-4 rounded-md mb-4">Erro ao carregar lista de produtos: {error}</p>}

    {filteredProducts.length === 0 && !loading ? (
      <div className="text-center text-gray-500 py-10 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-medium">Nenhum produto encontrado</h3>
          <p className="mt-1 text-sm">Não há produtos que correspondam ao filtro selecionado.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
           <div key={product.id} className="bg-white p-5 rounded-lg shadow-md border border-gray-200 flex flex-col justify-between">
           <div>
             <div className="flex justify-between items-start mb-3">
               <h3 className="font-semibold text-gray-800 truncate pr-2" title={product.name}>
                   {product.name}
               </h3>
               <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(product.status)}`}>
                   {product.status}
               </span>
             </div>
             <img 
                 src={product.image_url || '/logosorteioativo.png'}
                 alt={product.name}
                 className="w-full h-32 object-cover rounded-md mb-3 bg-gray-100"
             />
             <div className="text-sm text-gray-600 space-y-1 mb-4 border-t pt-3">
                 <p><strong>Preço/Nº:</strong> {parseFloat(product.price_per_number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                 <p><strong>Total de Números:</strong> 0 a {product.total_numbers}</p>
                 <p><strong>Criado em:</strong> {new Date(product.created_at).toLocaleDateString('pt-BR')}</p>
                 {product.status === 'drawn' && (
                     <p className="font-semibold"><strong>Ganhador:</strong> <span className="text-green-600">{product.winner_name || 'N/A'}</span> com o nº <span className="text-indigo-600">{String(product.winning_number).padStart(2,'0')}</span></p>
                 )}
             </div>
           </div>

           <div className="flex items-center gap-4 mt-auto border-t pt-3">
             <Link href={`/admin/products/edit/${product.id}`} className="flex-1 text-center text-indigo-600 hover:text-indigo-900 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-md hover:bg-indigo-50 transition-colors text-sm font-medium">
               <IconEdit /><span>Editar</span>
             </Link>
             {product.status === 'active' && (
               <button
                 onClick={() => handleDraw(product.id)}
                 disabled={drawingProductId === product.id}
                 className="flex-1 text-center text-purple-600 hover:text-purple-900 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-md hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-wait text-sm font-medium"
               >
                 {drawingProductId === product.id ? <Spinner size="h-4 w-4" color="border-purple-600" /> : <IconDraw />}
                 <span>{drawingProductId === product.id ? 'Sorteando...' : 'Sortear'}</span>
               </button>
             )}
           </div>
         </div>
        ))}
      </div>
    )}
  </div>
);
}
