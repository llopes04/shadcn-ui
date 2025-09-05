import { useState, useEffect } from 'react';
import { 
  initializeApp, 
  FirebaseApp, 
  getApps, 
  FirebaseOptions 
} from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  child, 
  Database 
} from 'firebase/database';

const firebaseConfig: FirebaseOptions = {
  // Estas configurações devem ser fornecidas pelo usuário
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

let app: FirebaseApp;
let database: Database;

export const initializeFirebase = () => {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
  }
  return { app, database };
};

export const useFirebase = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      initializeFirebase();
      setIsInitialized(true);
    } catch (error) {
      console.error('Erro ao inicializar Firebase:', error);
    }
  }, []);

  const saveData = async (path: string, data: unknown) => {
    try {
      await set(ref(database, path), data);
      return true;
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      return false;
    }
  };

  const loadData = async (path: string) => {
    try {
      const snapshot = await get(child(ref(database), path));
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      return null;
    }
  };

  return {
    isInitialized,
    saveData,
    loadData,
    database
  };
};

// Hook específico para dados estruturados
export const useFirebaseData = <T>(path: string, initialValue: T) => {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const { isInitialized, loadData, saveData } = useFirebase();

  useEffect(() => {
    if (isInitialized) {
      loadData(path).then((result) => {
        if (result) {
          setData(result);
        }
        setLoading(false);
      });
    }
  }, [isInitialized, path]);

  const updateData = async (newData: T) => {
    const success = await saveData(path, newData);
    if (success) {
      setData(newData);
    }
    return success;
  };

  return {
    data,
    loading,
    updateData,
    setData
  };
};