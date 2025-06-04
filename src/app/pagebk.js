// app/page.js
'use client'; // Necessário para usar hooks como useState e useEffect

import { useState, useEffect } from 'react';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products'); // Chama a API que criamos
        const data = await response.json();
        setProducts(data.products);
      } catch (error) {
        console.error("Falha ao buscar produtos:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (loading) {
    return <p>Carregando produtos...</p>;
  }

  return (
    <div>
      <h1>Nosso Site de Sorteios</h1>
      <h2>Produtos Disponíveis:</h2>
      <ul>
        {products.map((product) => (
          <li key={product.id}>{product.name} - R$ {product.price_per_number}</li>
        ))}
      </ul>
    </div>
  );
}