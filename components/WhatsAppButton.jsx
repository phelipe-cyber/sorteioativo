// components/WhatsAppButton.jsx
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react'; // Importar useState e useEffect

// Ícone do WhatsApp
const WhatsAppIcon = ({ className = "w-8 h-8" }) => (
    <svg 
        className={className}
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        role="img"
        preserveAspectRatio="xMidYMid meet"
    >
        <path 
            fill="currentColor" 
            d="M16.21,4.4A11.79,11.79,0,0,0,4.41,16.19,11.82,11.82,0,0,0,15.83,28.25l.39.09.09,0a11.8,11.8,0,0,0,12-13.43,11.79,11.79,0,0,0-11.79-10.51ZM22,17.48a3.17,3.17,0,0,1-1.74,1.49,6.73,6.73,0,0,1-1.89.58,11.4,11.4,0,0,1-1.42,0,4,4,0,0,1-1.15-.36c-.36-.18-1.28-1.14-2.1-2.48S12,14,11.9,13.62a3.52,3.52,0,0,1-.21-1.67,2,2,0,0,1,.73-1.6,1.4,1.4,0,0,1,1-.48,1.14,1.14,0,0,1,.8.2,1.3,1.3,0,0,1,.45.8l.21,1a5.45,5.45,0,0,1-.61,2.26c-.1.14-.09.28,0,.42a8.68,8.68,0,0,0,1.38,1.78,9,9,0,0,0,1.9.95,1,1,0,0,0,.46.06.86.86,0,0,0,.7-.49l.36-.6a.69.69,0,0,1,.61-.4.81.81,0,0,1,.53.15L21,16.5a1.18,1.18,0,0,1,.54.9Z" 
        />
    </svg>
);

export default function WhatsAppButton() {
    // Estado para garantir que o componente só renderize no cliente
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        // Este efeito só roda no cliente, após a montagem do componente.
        setIsClient(true);
    }, []);

    // --- IMPORTANTE: SUBSTITUA OS VALORES ABAIXO ---
    const phoneNumber = "5511964081280"; // Coloque seu número de WhatsApp com código do país e DDD
    const defaultMessage = "Olá! Gostaria de mais informações sobre os sorteios."; // Mensagem padrão
  
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;
  
    // Não renderiza nada no servidor ou durante a hidratação inicial para evitar o erro.
    if (!isClient) {
        return null;
    }
  
    return (
      // Container para o botão e sua animação pulsante
      <div className="fixed bottom-6 right-6 z-50">
        <Link 
            href={whatsappUrl} 
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex items-center justify-center p-4 bg-green-500 rounded-full shadow-lg hover:bg-green-600 transition-all duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400"
            aria-label="Entrar em contato pelo WhatsApp"
            title="Fale Conosco no WhatsApp"
        >
            {/* Anel pulsante */}
            <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
            {/* O ícone fica por cima do anel */}
            <WhatsAppIcon className="w-8 h-8 text-white relative z-10" />
        </Link>
      </div>
    );
}
