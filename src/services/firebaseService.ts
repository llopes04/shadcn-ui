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
      let clientsUploaded = 0;
      let ordersUploaded = 0;

      // Sincronizar clientes
      const localClients = JSON.parse(localStorage.getItem('clients') || '[]') as Client[];
      const firebaseClients = await clientService.getAll();
      
      for (const client of localClients) {
        // Verificar se o cliente já existe no Firebase
        const existsInFirebase = firebaseClients.find(fc => 
          (fc.nome === client.nome && fc.email === client.email) ||
          (fc.cpf && client.cpf && fc.cpf === client.cpf) ||
          (fc.telefone && client.telefone && fc.telefone === client.telefone)
        );
        
        // Só enviar se não existir no Firebase e não for um registro já do Firebase
        if (!existsInFirebase && (!client.id || !client.id.includes('firebase_'))) {
          const { id, ...clientData } = client;
          await clientService.create(clientData);
          clientsUploaded++;
        }
      }

      // Sincronizar ordens de serviço
      const localOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const firebaseOrders = await serviceOrderService.getAll();
      
      for (const order of localOrders) {
        // Verificar se a OS já existe no Firebase
        const existsInFirebase = firebaseOrders.find(fo => 
          (fo.numeroOS === order.numeroOS) ||
          (fo.tecnico === order.tecnico && fo.data === order.data && fo.cliente?.nome === order.cliente?.nome)
        );
        
        // Só enviar se não existir no Firebase e não for um registro já do Firebase
        if (!existsInFirebase && (!order.id || !order.id.includes('firebase_'))) {
          const { id, ...orderData } = order;
          await serviceOrderService.create(orderData);
          ordersUploaded++;
        }
      }

      return { 
        success: true, 
        message: `Sincronização concluída! ${clientsUploaded} clientes e ${ordersUploaded} ordens enviadas.` 
      };
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return { success: false, message: 'Erro ao sincronizar dados.' };
    }
  },

  // Sincronizar dados do Firebase para localStorage
  async syncFromFirebase() {
    checkFirebaseConfig();
    
    try {
      let clientsDownloaded = 0;
      let ordersDownloaded = 0;

      // Buscar clientes do Firebase
      const firebaseClients = await clientService.getAll();
      const localClients = JSON.parse(localStorage.getItem('clients') || '[]') as Client[];
      
      // Criar mapa de clientes locais para verificação rápida
      const localClientsMap = new Map();
      localClients.forEach(client => {
        const key = `${client.nome}_${client.email}_${client.cpf || ''}_${client.telefone || ''}`;
        localClientsMap.set(key, client);
      });
      
      // Adicionar clientes do Firebase que não existem localmente
      const mergedClients = [...localClients];
      firebaseClients.forEach(firebaseClient => {
        const key = `${firebaseClient.nome}_${firebaseClient.email}_${firebaseClient.cpf || ''}_${firebaseClient.telefone || ''}`;
        if (!localClientsMap.has(key)) {
          // Marcar como vindo do Firebase
          mergedClients.push({ ...firebaseClient, id: `firebase_${firebaseClient.id}` });
          clientsDownloaded++;
        }
      });
      
      localStorage.setItem('clients', JSON.stringify(mergedClients));

      // Buscar ordens do Firebase
      const firebaseOrders = await serviceOrderService.getAll();
      const localOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      
      // Criar mapa de ordens locais para verificação rápida
      const localOrdersMap = new Map();
      localOrders.forEach(order => {
        const key = `${order.numeroOS}_${order.tecnico}_${order.data}_${order.cliente?.nome || ''}`;
        localOrdersMap.set(key, order);
      });
      
      // Adicionar ordens do Firebase que não existem localmente
      const mergedOrders = [...localOrders];
      firebaseOrders.forEach(firebaseOrder => {
        const key = `${firebaseOrder.numeroOS}_${firebaseOrder.tecnico}_${firebaseOrder.data}_${firebaseOrder.cliente?.nome || ''}`;
        if (!localOrdersMap.has(key)) {
          // Marcar como vindo do Firebase
          mergedOrders.push({ ...firebaseOrder, id: `firebase_${firebaseOrder.id}` });
          ordersDownloaded++;
        }
      });
      
      localStorage.setItem('serviceOrders', JSON.stringify(mergedOrders));

      return { 
        success: true, 
        message: `Download concluído! ${clientsDownloaded} clientes e ${ordersDownloaded} ordens baixadas.` 
      };
    } catch (error) {
      console.error('Erro ao baixar dados:', error);
      return { success: false, message: 'Erro ao baixar dados do Firebase.' };
    }
  },

  // Limpar duplicatas existentes
  async cleanDuplicates() {
    try {
      // Limpar duplicatas de clientes
      const clients = JSON.parse(localStorage.getItem('clients') || '[]') as Client[];
      const uniqueClients = clients.filter((client, index, self) => {
        return index === self.findIndex(c => 
          c.nome === client.nome && 
          c.email === client.email &&
          (c.cpf === client.cpf || (!c.cpf && !client.cpf)) &&
          (c.telefone === client.telefone || (!c.telefone && !client.telefone))
        );
      });
      
      // Limpar duplicatas de ordens
      const orders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const uniqueOrders = orders.filter((order, index, self) => {
        return index === self.findIndex(o => 
          o.numeroOS === order.numeroOS ||
          (o.tecnico === order.tecnico && 
           o.data === order.data && 
           o.cliente?.nome === order.cliente?.nome)
        );
      });
      
      localStorage.setItem('clients', JSON.stringify(uniqueClients));
      localStorage.setItem('serviceOrders', JSON.stringify(uniqueOrders));
      
      const clientsRemoved = clients.length - uniqueClients.length;
      const ordersRemoved = orders.length - uniqueOrders.length;
      
      return {
        success: true,
        message: `Limpeza concluída! ${clientsRemoved} clientes e ${ordersRemoved} ordens duplicadas removidas.`
      };
    } catch (error) {
      console.error('Erro ao limpar duplicatas:', error);
      return { success: false, message: 'Erro ao limpar duplicatas.' };
    }
  }
};