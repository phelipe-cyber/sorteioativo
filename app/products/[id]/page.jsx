import ProductDetailsClient from '@/components/ProductDetailsClient';

async function getProductData(productId) {
  const response = await fetch(`${process.env.APP_URL}/api/products/${productId}`);
  if (!response.ok) return null;
  return response.json();
}

export async function generateMetadata({ params }) {
  const data = await getProductData(params.id);
  const product = data?.product;

  if (!product) {
    return {
      title: 'Sorteio Não Encontrado',
      description: 'Este sorteio pode ter sido removido.',
    };
  }

  const title = `${product.name} - Participe Agora!`;
  const description = product.description?.slice(0, 155) || `Não perca ${product.name}`;
  const imageUrl = product.image_url || `${process.env.APP_URL}/logo.jpg`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
      siteName: 'Site de Sorteios',
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductDetailPage({ params }) {
  const data = await getProductData(params.id);
  // console.log(data);
  return (
    <ProductDetailsClient 
      product={data?.product || null} 
      initialNumbers={data?.numbers || []} 
    />
  );
}
