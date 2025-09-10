import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeFirebase } from './lib/firebase';

// Garantir que o Firebase seja inicializado antes da aplicação
initializeFirebase();

createRoot(document.getElementById('root')!).render(<App />);
