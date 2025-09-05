import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Configuração padrão (será substituída pelas configurações do usuário)
const defaultFirebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Função para obter configuração do Firebase do localStorage
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
  return defaultFirebaseConfig;
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
    if (config.apiKey && config.projectId) {
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
  return !!(config.apiKey && config.projectId);
};

// Função para reinicializar Firebase após mudança de configuração
export const reinitializeFirebase = () => {
  return initializeFirebase();
};

// Inicializar na primeira carga
initializeFirebase();

export { db, auth, storage };
export default app;