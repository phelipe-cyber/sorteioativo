// app/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
// Não precisamos mais do useRouter aqui para redirecionar para login imediatamente

function ProductCard({ product }) {
  return (
    // Envolve todo o card com o componente Link
    <Link href={`/products/${product.id}`} className="block bg-white rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50">
      <div className="flex p-4"> {/* Flex container para imagem e texto */}
        {/* Imagem à Esquerda */}
        <div className="w-1/3 sm:w-1/4 flex-shrink-0 mr-4"> {/* Ajuste a largura conforme necessário */}
          <img
            src={product.image_url || `https://placehold.co/200x150/E2E8F0/4A5568?text=${encodeURIComponent(product.name)}`}
            alt={product.name}
            className="w-full h-auto object-cover rounded-md aspect-[4/3]" // Mantém proporção 4:3
          />
        </div>

        {/* Conteúdo à Direita */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-indigo-700 mb-1 sm:mb-2">{product.name}</h3>
            {/* Descrição Curta (opcional) */}
            {product.description && (
                <p className="text-gray-600 text-xs sm:text-sm mb-2 h-12 overflow-hidden">
                    {product.description.substring(0, 70)}{product.description.length > 70 ? '...' : ''}
                </p>
            )}
          </div>
          <div>
            <p className="text-md sm:text-lg font-bold text-green-600 mb-2 sm:mb-3">
              {parseFloat(product.price_per_number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por número
            </p>
            {/* O botão agora é apenas visual, pois o card inteiro é um link.
                Poderia ser removido ou estilizado como um 'div' se desejado,
                mas manter a aparência de botão pode ser bom para a UX.
                Importante: Não aninhar <Link> dentro de <Link>.
            */}
            <div 
                className="block w-full text-center bg-indigo-500 text-white font-bold py-2 px-3 rounded hover:bg-indigo-700 transition-colors text-sm sm:text-base"
            >
              Ver Números disponíveis
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout, loading: authLoading, isAuthenticated } = useAuth(); // Obtemos o usuário para o header

  useEffect(() => {
    // Fetch de produtos agora acontece independentemente do status de autenticação
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        setProducts(data.products || []); // Garante que products seja um array
      } catch (error) {
        console.error("Falha ao buscar produtos:", error);
        setProducts([]); // Em caso de erro, define como array vazio
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []); // Roda apenas uma vez ao montar o componente


  // ADICIONE ESTE CONSOLE.LOG PARA DEBUG
  useEffect(() => {
    if (!authLoading) {
      console.log('Estado do usuário no header/página:', user);
      console.log('Está autenticado?', isAuthenticated);
    }
  }, [user, authLoading, isAuthenticated]);

  if (authLoading) { // Ainda esperamos o auth carregar para saber se mostra "Login" ou "Logout"
    return <p className="text-center mt-10">Carregando...</p>;
  }

  return (
    <div>

      <h2 className="text-2xl font-bold text-center text-gray-800 my-8">Sorteios Ativos</h2>
      {loading && products.length === 0 && <p className="text-center">Carregando sorteios...</p>}
      {!loading && products.length === 0 && (
        <p className="text-center">Nenhum sorteio ativo no momento.</p>
      )}
      {products.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      )}
    </div>
  );
}