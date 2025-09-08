import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Configuração padrão usando variáveis de ambiente como fallback
const getDefaultConfig = () => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
});

// Função para obter configuração do Firebase (localStorage tem prioridade)
const getFirebaseConfig = () => {
  try {
    const storedConfig = localStorage.getItem('firebaseConfig');
    if (storedConfig) {
      const config = JSON.parse(storedConfig);
      // Verificar se todas as chaves necessárias estão presentes
      if (config.apiKey && config.authDomain && config.projectId) {
        return config;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar configuração do Firebase:', error);
  }
  
  // Fallback para configuração padrão das variáveis de ambiente
  const defaultConfig = getDefaultConfig();
  if (defaultConfig.apiKey && defaultConfig.projectId) {
    return defaultConfig;
  }
  
  return null;
};

// Inicializar Firebase
let app;
let db;
let auth;
let storage;

const initializeFirebase = () => {
  try {
    const config = getFirebaseConfig();
    
    // Só inicializar se tiver configuração válida
    if (config && config.apiKey && config.projectId) {
      app = initializeApp(config);
      db = getFirestore(app);
      auth = getAuth(app);
      storage = getStorage(app);
      
      console.log('Firebase inicializado com sucesso');
      return true;
    } else {
      console.warn('Firebase não configurado. Configure as credenciais primeiro.');
      return false;
    }
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
    return false;
  }
};

// Função para verificar se Firebase está configurado
export const isFirebaseConfigured = () => {
  const config = getFirebaseConfig();
  return !!(config && config.apiKey && config.projectId);
};

// Função para reinicializar Firebase após mudança de configuração
export const reinitializeFirebase = () => {
  return initializeFirebase();
};

// Inicializar na primeira carga
initializeFirebase();

export { db, auth, storage };
export default app;