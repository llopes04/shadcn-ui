import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { ServiceOrder, Client, User } from '@/types';

// Verificar se Firebase está configurado antes de usar
const checkFirebaseConfig = () => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase não está configurado. Configure as credenciais primeiro.');
  }
  if (!db) {
    throw new Error('Firestore não inicializado.');
  }
};

// Serviços para Usuários
export const userService = {
  async create(user: Omit<User, 'id'>) {
    checkFirebaseConfig();
    const docRef = await addDoc(collection(db, 'users'), {
      ...user,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  },

  async getAll() {
    checkFirebaseConfig();
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
  },

  async getByEmail(email: string) {
    checkFirebaseConfig();
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as User;
  },

  async update(id: string, data: Partial<User>) {
    checkFirebaseConfig();
    const docRef = doc(db, 'users', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  },

  async delete(id: string) {
    checkFirebaseConfig();
    await deleteDoc(doc(db, 'users', id));
  }
};

// Serviços para Clientes
export const clientService = {
  async create(client: Omit<Client, 'id'>) {
    checkFirebaseConfig();
    const docRef = await addDoc(collection(db, 'clients'), {
      ...client,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  },

  async getAll() {
    checkFirebaseConfig();
    const querySnapshot = await getDocs(
      query(collection(db, 'clients'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Client[];
  },

  async getById(id: string) {
    checkFirebaseConfig();
    const docRef = doc(db, 'clients', id);
    const docSnap = await getDocs(query(collection(db, 'clients'), where('__name__', '==', id)));
    if (docSnap.empty) return null;
    
    const clientDoc = docSnap.docs[0];
    return {
      id: clientDoc.id,
      ...clientDoc.data()
    } as Client;
  },

  async update(id: string, data: Partial<Client>) {
    checkFirebaseConfig();
    const docRef = doc(db, 'clients', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  },

  async delete(id: string) {
    checkFirebaseConfig();
    await deleteDoc(doc(db, 'clients', id));
  },

  // Listener em tempo real
  onSnapshot(callback: (clients: Client[]) => void) {
    checkFirebaseConfig();
    return onSnapshot(
      query(collection(db, 'clients'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const clients = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Client[];
        callback(clients);
      }
    );
  }
};

// Serviços para Ordens de Serviço
export const serviceOrderService = {
  async create(order: Omit<ServiceOrder, 'id'>) {
    checkFirebaseConfig();
    const docRef = await addDoc(collection(db, 'serviceOrders'), {
      ...order,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  },

  async getAll() {
    checkFirebaseConfig();
    const querySnapshot = await getDocs(
      query(collection(db, 'serviceOrders'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ServiceOrder[];
  },

  async getById(id: string) {
    checkFirebaseConfig();
    const docSnap = await getDocs(query(collection(db, 'serviceOrders'), where('__name__', '==', id)));
    if (docSnap.empty) return null;
    
    const orderDoc = docSnap.docs[0];
    return {
      id: orderDoc.id,
      ...orderDoc.data()
    } as ServiceOrder;
  },

  async getByClientId(clientId: string) {
    checkFirebaseConfig();
    const q = query(
      collection(db, 'serviceOrders'), 
      where('cliente_id', '==', clientId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ServiceOrder[];
  },

  async update(id: string, data: Partial<ServiceOrder>) {
    checkFirebaseConfig();
    const docRef = doc(db, 'serviceOrders', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  },

  async delete(id: string) {
    checkFirebaseConfig();
    await deleteDoc(doc(db, 'serviceOrders', id));
  },

  // Listener em tempo real
  onSnapshot(callback: (orders: ServiceOrder[]) => void) {
    checkFirebaseConfig();
    return onSnapshot(
      query(collection(db, 'serviceOrders'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ServiceOrder[];
        callback(orders);
      }
    );
  }
};

// Serviço de sincronização entre localStorage e Firebase
export const syncService = {
  // Sincronizar dados do localStorage para Firebase
  async syncToFirebase() {
    checkFirebaseConfig();
    
    try {
      // Sincronizar clientes
      const localClients = JSON.parse(localStorage.getItem('clients') || '[]') as Client[];
      for (const client of localClients) {
        if (client.id && !client.id.includes('firebase_')) {
          const { id, ...clientData } = client;
          await clientService.create(clientData);
        }
      }

      // Sincronizar ordens de serviço
      const localOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      for (const order of localOrders) {
        if (order.id && !order.id.includes('firebase_')) {
          const { id, ...orderData } = order;
          await serviceOrderService.create(orderData);
        }
      }

      return { success: true, message: 'Dados sincronizados com sucesso!' };
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return { success: false, message: 'Erro ao sincronizar dados.' };
    }
  },

  // Sincronizar dados do Firebase para localStorage
  async syncFromFirebase() {
    checkFirebaseConfig();
    
    try {
      // Buscar clientes do Firebase
      const firebaseClients = await clientService.getAll();
      const localClients = JSON.parse(localStorage.getItem('clients') || '[]') as Client[];
      
      // Mesclar dados (Firebase tem prioridade)
      const mergedClients = [...firebaseClients];
      localClients.forEach(localClient => {
        if (!firebaseClients.find(fc => fc.nome === localClient.nome && fc.email === localClient.email)) {
          mergedClients.push(localClient);
        }
      });
      
      localStorage.setItem('clients', JSON.stringify(mergedClients));

      // Buscar ordens do Firebase
      const firebaseOrders = await serviceOrderService.getAll();
      const localOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      
      // Mesclar dados (Firebase tem prioridade)
      const mergedOrders = [...firebaseOrders];
      localOrders.forEach(localOrder => {
        if (!firebaseOrders.find(fo => fo.tecnico === localOrder.tecnico && fo.data === localOrder.data)) {
          mergedOrders.push(localOrder);
        }
      });
      
      localStorage.setItem('serviceOrders', JSON.stringify(mergedOrders));

      return { success: true, message: 'Dados baixados do Firebase com sucesso!' };
    } catch (error) {
      console.error('Erro ao baixar dados:', error);
      return { success: false, message: 'Erro ao baixar dados do Firebase.' };
    }
  }
};