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

// Função para converter Timestamps do Firebase para strings
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  
  // Converter timestamps para strings
  Object.keys(converted).forEach(key => {
    if (converted[key] && typeof converted[key] === 'object' && converted[key].toDate) {
      // É um Timestamp do Firebase
      converted[key] = converted[key].toDate().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    } else if (converted[key] && typeof converted[key] === 'object' && converted[key].seconds) {
      // É um Timestamp serializado
      converted[key] = new Date(converted[key].seconds * 1000).toISOString().split('T')[0];
    }
  });
  
  return converted;
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
      ...convertTimestamps(doc.data())
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
      ...convertTimestamps(doc.data())
    } as User;
  },

  async getByCredentials(email: string, password: string) {
    checkFirebaseConfig();
    const q = query(
      collection(db, 'users'), 
      where('email', '==', email),
      where('password', '==', password)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...convertTimestamps(doc.data())
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
      ...convertTimestamps(doc.data())
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
      ...convertTimestamps(clientDoc.data())
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
          ...convertTimestamps(doc.data())
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
      ...convertTimestamps(doc.data())
    })) as ServiceOrder[];
  },

  async getById(id: string) {
    checkFirebaseConfig();
    const docSnap = await getDocs(query(collection(db, 'serviceOrders'), where('__name__', '==', id)));
    if (docSnap.empty) return null;
    
    const orderDoc = docSnap.docs[0];
    return {
      id: orderDoc.id,
      ...convertTimestamps(orderDoc.data())
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
      ...convertTimestamps(doc.data())
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
          ...convertTimestamps(doc.data())
        })) as ServiceOrder[];
        callback(orders);
      }
    );
  }
};

// Serviços de autenticação
export const authService = {
  async login(email: string, password: string) {
    try {
      console.log('🔐 Tentando fazer login:', email);
      const user = await userService.getByCredentials(email, password);
      
      if (user) {
        // Salvar sessão no localStorage
        localStorage.setItem('currentUser', JSON.stringify({
          id: user.id,
          email: user.email,
          nome: user.nome,
          loginTime: new Date().toISOString()
        }));
        console.log('✅ Login realizado com sucesso:', user.nome);
        return { success: true, user };
      } else {
        console.log('❌ Credenciais inválidas');
        return { success: false, message: 'Email ou senha incorretos' };
      }
    } catch (error) {
      console.error('❌ Erro no login:', error);
      return { success: false, message: 'Erro ao fazer login' };
    }
  },

  async register(userData: { nome: string; email: string; password: string; telefone?: string }) {
    try {
      console.log('📝 Registrando novo usuário:', userData.email);
      
      // Verificar se email já existe
      const existingUser = await userService.getByEmail(userData.email);
      if (existingUser) {
        return { success: false, message: 'Email já cadastrado' };
      }

      // Criar usuário
      const userId = await userService.create(userData);
      console.log('✅ Usuário criado com sucesso:', userId);
      
      return { success: true, message: 'Usuário cadastrado com sucesso' };
    } catch (error) {
      console.error('❌ Erro no registro:', error);
      return { success: false, message: 'Erro ao cadastrar usuário' };
    }
  },

  getCurrentUser() {
    try {
      const userData = localStorage.getItem('currentUser');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      return null;
    }
  },

  logout() {
    localStorage.removeItem('currentUser');
    console.log('👋 Logout realizado');
  },

  isLoggedIn() {
    return this.getCurrentUser() !== null;
  }
};

// Serviço de sincronização entre localStorage e Firebase
export const syncService = {
  // Sincronizar dados do localStorage para Firebase (apenas novos dados)
  async syncToFirebase() {
    checkFirebaseConfig();
    
    try {
      console.log('🚀 Iniciando sincronização para Firebase...');
      
      // Buscar dados existentes no Firebase para comparação
      const firebaseClients = await clientService.getAll();
      const firebaseOrders = await serviceOrderService.getAll();
      
      console.log('📊 Dados existentes no Firebase:', {
        clientes: firebaseClients.length,
        ordens: firebaseOrders.length
      });
      
      // Sincronizar clientes
      const localClients = JSON.parse(localStorage.getItem('clients') || '[]') as Client[];
      console.log('📊 Clientes locais encontrados:', localClients.length);
      
      let clientsUploaded = 0;
      for (const client of localClients) {
        // Verificar se o cliente já existe no Firebase (por email)
        const existsInFirebase = firebaseClients.some(fc => 
          fc.email === client.email || 
          (fc.nome === client.nome && fc.telefone === client.telefone)
        );
        
        if (!existsInFirebase && client.id && !client.id.includes('firebase_')) {
          const { id, ...clientData } = client;
          console.log('📤 Enviando cliente novo:', client.nome);
          await clientService.create(clientData);
          clientsUploaded++;
        } else if (existsInFirebase) {
          console.log('⏭️ Cliente já existe no Firebase:', client.nome);
        }
      }

      // Sincronizar ordens de serviço
      const localOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      console.log('📊 Ordens locais encontradas:', localOrders.length);
      
      let ordersUploaded = 0;
      for (const order of localOrders) {
        // Verificar se a ordem já existe no Firebase (por combinação de campos únicos)
        const existsInFirebase = firebaseOrders.some(fo => 
          fo.tecnico === order.tecnico && 
          fo.data === order.data && 
          fo.cliente_nome === order.cliente_nome &&
          fo.equipamento === order.equipamento
        );
        
        if (!existsInFirebase && order.id && !order.id.includes('firebase_')) {
          const { id, ...orderData } = order;
          console.log('📤 Enviando ordem nova:', `${order.tecnico} - ${order.data}`);
          await serviceOrderService.create(orderData);
          ordersUploaded++;
        } else if (existsInFirebase) {
          console.log('⏭️ Ordem já existe no Firebase:', `${order.tecnico} - ${order.data}`);
        }
      }

      const skippedClients = localClients.length - clientsUploaded;
      const skippedOrders = localOrders.length - ordersUploaded;
      
      return { 
        success: true, 
        message: `Sincronização concluída! ${clientsUploaded} clientes e ${ordersUploaded} ordens enviadas. ${skippedClients + skippedOrders > 0 ? `(${skippedClients} clientes e ${skippedOrders} ordens já existiam)` : ''}` 
      };
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      return { success: false, message: 'Erro ao sincronizar dados.' };
    }
  },

  // Baixar APENAS dados do Firebase (sem mesclar)
  async syncFromFirebase() {
    checkFirebaseConfig();
    
    try {
      console.log('⬇️ Iniciando download do Firebase...');
      
      // Buscar clientes do Firebase
      const firebaseClients = await clientService.getAll();
      console.log('📊 Clientes do Firebase:', firebaseClients.length);
      
      // SUBSTITUIR completamente os dados locais pelos do Firebase
      localStorage.setItem('clients', JSON.stringify(firebaseClients));
      console.log('✅ Clientes substituídos pelos dados do Firebase');

      // Buscar ordens do Firebase
      const firebaseOrders = await serviceOrderService.getAll();
      console.log('📊 Ordens do Firebase:', firebaseOrders.length);
      
      // Log das primeiras ordens para debug
      if (firebaseOrders.length > 0) {
        console.log('📋 Primeira ordem do Firebase:', firebaseOrders[0]);
      }
      
      // SUBSTITUIR completamente os dados locais pelos do Firebase
      localStorage.setItem('serviceOrders', JSON.stringify(firebaseOrders));
      console.log('✅ Ordens substituídas pelos dados do Firebase');

      return { 
        success: true, 
        message: `Dados do Firebase carregados! ${firebaseClients.length} clientes e ${firebaseOrders.length} ordens de serviço.` 
      };
    } catch (error) {
      console.error('❌ Erro ao baixar dados:', error);
      return { success: false, message: 'Erro ao baixar dados do Firebase.' };
    }
  },

  // Mesclar dados (manter função antiga para compatibilidade)
  async mergeFromFirebase() {
    checkFirebaseConfig();
    
    try {
      console.log('🔄 Iniciando mesclagem com Firebase...');
      
      // Buscar clientes do Firebase
      const firebaseClients = await clientService.getAll();
      const localClients = JSON.parse(localStorage.getItem('clients') || '[]') as Client[];
      
      console.log('📊 Dados para mesclagem:', {
        clientesFirebase: firebaseClients.length,
        clientesLocais: localClients.length
      });
      
      // Mesclar dados (Firebase tem prioridade)
      const mergedClients = [...firebaseClients];
      let addedClients = 0;
      
      localClients.forEach(localClient => {
        // Usar a mesma lógica de detecção de duplicatas melhorada
        const existsInFirebase = firebaseClients.some(fc => 
          fc.email === localClient.email || 
          (fc.nome === localClient.nome && fc.telefone === localClient.telefone)
        );
        
        if (!existsInFirebase) {
          mergedClients.push(localClient);
          addedClients++;
          console.log('➕ Cliente local adicionado:', localClient.nome);
        } else {
          console.log('⏭️ Cliente local já existe no Firebase:', localClient.nome);
        }
      });
      
      localStorage.setItem('clients', JSON.stringify(mergedClients));

      // Buscar ordens do Firebase
      const firebaseOrders = await serviceOrderService.getAll();
      const localOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      
      console.log('📊 Ordens para mesclagem:', {
        ordensFirebase: firebaseOrders.length,
        ordensLocais: localOrders.length
      });
      
      // Mesclar dados (Firebase tem prioridade)
      const mergedOrders = [...firebaseOrders];
      let addedOrders = 0;
      
      localOrders.forEach(localOrder => {
        // Usar a mesma lógica de detecção de duplicatas melhorada
        const existsInFirebase = firebaseOrders.some(fo => 
          fo.tecnico === localOrder.tecnico && 
          fo.data === localOrder.data && 
          fo.cliente_nome === localOrder.cliente_nome &&
          fo.equipamento === localOrder.equipamento
        );
        
        if (!existsInFirebase) {
          mergedOrders.push(localOrder);
          addedOrders++;
          console.log('➕ Ordem local adicionada:', `${localOrder.tecnico} - ${localOrder.data}`);
        } else {
          console.log('⏭️ Ordem local já existe no Firebase:', `${localOrder.tecnico} - ${localOrder.data}`);
        }
      });
      
      localStorage.setItem('serviceOrders', JSON.stringify(mergedOrders));

      return { 
        success: true, 
        message: `Dados mesclados! ${mergedClients.length} clientes e ${mergedOrders.length} ordens totais. (${addedClients} clientes e ${addedOrders} ordens locais adicionadas)` 
      };
    } catch (error) {
      console.error('❌ Erro ao mesclar dados:', error);
      return { success: false, message: 'Erro ao mesclar dados do Firebase.' };
    }
  }
};