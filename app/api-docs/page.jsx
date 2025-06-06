'use client';

import 'swagger-ui-react/swagger-ui.css';
import SwaggerUI from 'swagger-ui-react';
import spec from '@/app/public/swagger.json'; 

function ApiDocPage() {
  return <SwaggerUI spec={spec} />;
}

export default ApiDocPage;
