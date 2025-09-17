import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeFirebase } from './lib/firebase';
import emailjs from '@emailjs/browser';
import { defaultEmailJSConfig } from './utils/emailJSService';

// Garantir que o Firebase seja inicializado antes da aplicação
initializeFirebase();

// Inicializar EmailJS com as configurações padrão
emailjs.init(defaultEmailJSConfig.publicKey);

// Registrar Service Worker para funcionalidade offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registrado com sucesso:', registration);
      })
      .catch((registrationError) => {
        console.log('Falha no registro do SW:', registrationError);
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
