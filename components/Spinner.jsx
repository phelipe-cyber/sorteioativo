// components/Spinner.jsx

import React from 'react';

// Este é um componente de spinner simples e reutilizável
// Aceita props para customizar o tamanho e a cor, usando classes do Tailwind.
export default function Spinner({ size = 'h-5 w-5', color = 'border-white' }) {
  return (
    <div
      className={`inline-block ${size} animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]`}
      role="status"
    >
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
        Loading...
      </span>
    </div>
  );
}