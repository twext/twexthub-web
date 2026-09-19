import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { getAppConfig } from './config/settings';
import { api } from './services/api';
import './index.css';

api.configure(getAppConfig());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
