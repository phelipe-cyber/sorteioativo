// app/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/Spinner'; // Ajustado para o alias @

// Ícone para o selo PIX
const PixIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
        <path fill="currentColor" d="M165.53,53.86a8,8,0,0,0-8.23,1.44L95,108.49l-22.3-22.3a8,8,0,0,0-11.31,0L35.06,112.51a8,8,0,0,0,0,11.31l33.25,33.25a8,8,0,0,0,5.66,2.34,8,8,0,0,0,5.66-2.34l26.3-26.3,49.25,49.25a8,8,0,0,0,11.31,0l26.33-26.33a8,8,0,0,0,0-11.31L167,112.51a8,8,0,0,0-1.47-1.12ZM74,141.66,46.34,114.l,20.64-20.65,22.3,22.3a8,8,0,0,0,11.31,0l32.74-32.73L167,116.69,114.34,169.31Zm140-27.59L185.66,142.4,136.4,93.14,169.14,60.4l28.53,28.53a8,8,0,0,1,0,11.31Z"></path>
    </svg>
);


// --- NOVO COMPONENTE PRODUCTCARD ---
function ProductCard({ product, isLoading, onClick }) {
  return (
    <div 
      onClick={onClick} 
      className="bg-white rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 transition-all duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-50 cursor-pointer relative group flex flex-col"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
    >
      <div className={`transition-opacity duration-300 flex-grow ${isLoading ? 'opacity-20' : ''}`}>
        {/* --- CONTAINER DA IMAGEM --- */}
        <div className="w-full h-auto">
          <img 
            src={product.image_url || `https://placehold.co/400x300/E2E8F0/4A5568?text=Imagem`}
            alt={product.name}
            className="w-full h-full object-cover" // object-cover garante que a imagem preencha o container, cortando o excesso
          />
        </div>

        {/* --- CONTEÚDO DE TEXTO --- */}
        <div className="p-5 flex-grow flex flex-col">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 leading-tight group-hover:text-indigo-600 transition-colors flex-grow">
            {product.name}
          </h3>
          
          {product.description && (
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  {product.description.substring(0, 50)}{product.description.length > 50 ? '...' : ''}
              </p>
          )}

          {/* Selo PIX ou Produto */}
          {product.prize_type === 'product_or_pix' && (
            <div className="mt-3">
                <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center">
                    <PixIcon className="w-4 h-4 mr-1.5" />
                    Prêmio em PIX ou Produto
                </span>
            </div>
          )}
          
          <p className="text-base font-semibold text-green-600 mt-3">
            {parseFloat(product.price_per_number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por número
          </p>
        </div>
      </div>
      
      {/* --- BOTÃO NA PARTE INFERIOR DO CARD --- */}
      <div className={`bg-gray-50 px-5 py-3 transition-opacity duration-300 ${isLoading ? 'opacity-20' : ''}`}>
           <div className="block w-full text-center bg-indigo-600 text-white font-bold py-2.5 px-3 rounded-lg group-hover:bg-indigo-700 transition-colors text-sm">
            Ver Números disponíveis
          </div>
      </div>

      {/* Spinner Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex justify-center items-center bg-white bg-opacity-75 rounded-lg">
          <Spinner className="h-8 w-8 text-indigo-600" />
        </div>
      )}
    </div>
  );
}


export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const router = useRouter(); 
  const [loadingProductId, setLoadingProductId] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingPage(true);
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error("Falha ao buscar produtos:", error);
        setProducts([]);
      } finally {
        setLoadingPage(false);
      }
    };
    fetchProducts();
  }, []);

  const handleCardClick = (productId) => {
    setLoadingProductId(productId);
    router.push(`/products/${productId}`);
  };

  if (loadingPage) {
    return (
        <div className="flex justify-center items-center h-64">
            <Spinner className="h-10 w-10 text-indigo-600"/>
            <span className="ml-3 text-lg">Carregando sorteios...</span>
        </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center text-gray-800 my-8">Sorteios Ativos</h2>
      
      {products.length === 0 ? (
        <div className="text-center py-10">
            <p className="text-gray-600">Nenhum sorteio ativo no momento.</p>
            <p className="text-sm text-gray-400 mt-2">Volte mais tarde!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {products.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              isLoading={loadingProductId === product.id} 
              onClick={() => handleCardClick(product.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
