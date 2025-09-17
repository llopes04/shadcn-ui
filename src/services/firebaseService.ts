import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
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

// Cache simples para dados frequentemente acessados
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCachedData = (key: string, data: any, ttl = CACHE_TTL) => {
  cache.set(key, { data, timestamp: Date.now(), ttl });
};

const clearCache = (pattern?: string) => {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

// Verificar se Firebase está configurado antes de usar
const checkFirebaseConfig = () => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase não está configurado. Configure as credenciais primeiro.');
  }
  if (!db) {
    throw new Error('Firestore não inicializado.');
  }
  console.log('Firebase configurado e Firestore inicializado corretamente');
};

// Função para converter Timestamps do Firebase para strings e normalizar dados
const convertTimestamps = (data: Record<string, unknown>): Record<string, unknown> => {
  if (!data) return data;
  
  const converted = { ...data };
  
  // Converter timestamps para strings
  Object.keys(converted).forEach(key => {
    if (converted[key] && typeof converted[key] === 'object' && (converted[key] as Record<string, unknown>).toDate) {
      // É um Timestamp do Firebase
      converted[key] = ((converted[key] as Record<string, unknown>).toDate as () => Date)().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    } else if (converted[key] && typeof converted[key] === 'object' && (converted[key] as Record<string, unknown>).seconds) {
      // É um Timestamp serializado
      converted[key] = new Date(((converted[key] as Record<string, unknown>).seconds as number) * 1000).toISOString().split('T')[0];
    }
  });
  
  return converted;
};

// Função para normalizar ServiceOrder importada do Firebase
const normalizeServiceOrder = (data: Record<string, unknown>): Record<string, unknown> => {
  if (!data) return data;
  
  const normalized = { ...data };
  
  // Garantir que campos obrigatórios existam
  if (!normalized.tecnico) normalized.tecnico = '';
  if (!normalized.data) normalized.data = new Date().toISOString().split('T')[0];
  if (!normalized.cliente_id) normalized.cliente_id = '';
  
  // Normalizar array de geradores
  if (!normalized.geradores || !Array.isArray(normalized.geradores)) {
    // Se é uma OS legacy com gerador_id único
    if (normalized.gerador_id) {
      normalized.geradores = [{
        gerador_id: normalized.gerador_id,
        tipo_manutencao: normalized.tipo_manutencao || 'Preventiva',
        verificacoes: normalized.verificacoes || [],
        observacoes: normalized.observacoes || '',
        tempo_funcionamento: normalized.tempo_funcionamento || ''
      }];
      // Limpar campos legacy
      delete normalized.gerador_id;
      delete normalized.tipo_manutencao;
      delete normalized.verificacoes;
      delete normalized.tempo_funcionamento;
    } else {
      // OS sem geradores
      normalized.geradores = [];
    }
  }
  
  // Garantir que cada gerador tem verificacoes array
  normalized.geradores = normalized.geradores.map((gen: Record<string, unknown>) => ({
    gerador_id: gen.gerador_id || '',
    tipo_manutencao: gen.tipo_manutencao || 'Preventiva',
    verificacoes: Array.isArray(gen.verificacoes) ? gen.verificacoes : [],
    observacoes: gen.observacoes || '',
    ...gen
  }));
  
  // Mover observacoes gerais para lugar correto se necessário
  if (normalized.observacoes && !normalized.observacoes_gerais) {
    normalized.observacoes_gerais = normalized.observacoes;
    delete normalized.observacoes;
  }
  
  return normalized;
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
    console.log('📋 Buscando todos os usuários...');
    const querySnapshot = await getDocs(collection(db, 'users'));
    
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as User[];
    
    console.log('👥 Usuários encontrados:', users.length);
    console.log('📊 Lista de usuários:', users.map(u => ({
      id: u.id,
      nome: u.nome,
      usuario: u.usuario
    })));
    
    return users;
  },

  // Função removida - agora usamos getByUsuario

  async getByUsuario(usuario: string) {
    checkFirebaseConfig();
    const q = query(collection(db, 'users'), where('usuario', '==', usuario));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...convertTimestamps(doc.data())
    } as User;
  },

  async getByCredentials(usuario: string, password: string) {
    checkFirebaseConfig();
    console.log('🔍 Buscando usuário com credenciais:', { usuario, password: '***' });
    
    const q = query(
      collection(db, 'users'), 
      where('usuario', '==', usuario),
      where('senha', '==', password)
    );
    
    console.log('📊 Executando query no Firestore...');
    const querySnapshot = await getDocs(q);
    
    console.log('📋 Resultado da query:', {
      empty: querySnapshot.empty,
      size: querySnapshot.size,
      docs: querySnapshot.docs.length
    });
    
    if (querySnapshot.empty) {
      console.log('❌ Nenhum usuário encontrado com essas credenciais');
      
      // Verificar se existe usuário com esse nome de usuário
      const usuarioQuery = query(collection(db, 'users'), where('usuario', '==', usuario));
      const usuarioSnapshot = await getDocs(usuarioQuery);
      
      if (usuarioSnapshot.empty) {
        console.log('❌ Usuário não encontrado no banco de dados');
      } else {
        console.log('✅ Usuário encontrado, mas senha incorreta');
        console.log('👤 Usuários com esse nome:', usuarioSnapshot.docs.map(doc => ({
          id: doc.id,
          usuario: doc.data().usuario,
          nome: doc.data().nome
        })));
      }
      
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    const userData = {
      id: doc.id,
      ...convertTimestamps(doc.data())
    } as User;
    
    console.log('✅ Usuário encontrado:', {
      id: userData.id,
      usuario: userData.usuario,
      nome: userData.nome
    });
    
    return userData;
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
    
    // Limpar cache relacionado
    clearCache('clients');
    
    return docRef.id;
  },

  async getAll() {
    checkFirebaseConfig();
    
    const cacheKey = 'clients_all';
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    
    const querySnapshot = await getDocs(
      query(collection(db, 'clients'), orderBy('createdAt', 'desc'))
    );
    const clients = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Client[];
    
    setCachedData(cacheKey, clients);
    return clients;
  },

  async getById(id: string) {
    checkFirebaseConfig();
    try {
      const docRef = doc(db, 'clients', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.log('🔍 Cliente não encontrado no Firebase:', id);
        return null;
      }
      
      const clientData = {
        id: docSnap.id,
        ...convertTimestamps(docSnap.data())
      } as Client;
      
      console.log('✅ Cliente encontrado no Firebase:', clientData.nome);
      return clientData;
    } catch (error) {
      console.error('❌ Erro ao buscar cliente por ID:', error);
      return null;
    }
  },

  async update(id: string, data: Partial<Client>) {
    checkFirebaseConfig();
    try {
      const docRef = doc(db, 'clients', id);
      const updateData = {
        ...data,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(docRef, updateData);
    } catch (error: any) {
      console.error('Erro ao atualizar cliente:', error);
      
      if (error.code === 'permission-denied') {
        throw new Error('❌ ERRO DE PERMISSÃO: As regras de segurança do Firestore estão bloqueando esta operação. Você precisa atualizar as regras no Console do Firebase para permitir operações de escrita na coleção "clients".');
      } else if (error.code === 'not-found') {
        throw new Error('Cliente não encontrado no Firebase.');
      } else if (error.code === 'unavailable') {
        throw new Error('Serviço Firebase temporariamente indisponível. Tente novamente em alguns minutos.');
      } else {
        throw new Error(`Erro ao atualizar cliente: ${error.message || 'Erro desconhecido'}`);
      }
    }
  },

  async delete(id: string) {
    console.log('clientService.delete chamado com ID:', id);
    try {
      checkFirebaseConfig();
      console.log('Firebase configurado, executando deleteDoc para cliente');
      
      const docRef = doc(db, 'clients', id);
      console.log('Referência do documento criada:', docRef.path);
      
      await deleteDoc(docRef);
      console.log('Cliente excluído do Firestore com sucesso');
      
      return { success: true };
    } catch (error: unknown) {
      console.error('Erro detalhado no clientService.delete:', error);
      const firebaseError = error as { code?: string; message?: string };
      
      // Tratar erros específicos do Firebase
      if (firebaseError.code === 'permission-denied') {
        throw new Error('Permissão negada para excluir cliente. Verifique as regras do Firestore.');
      } else if (firebaseError.code === 'not-found') {
        throw new Error('Cliente não encontrado no Firebase.');
      } else if (firebaseError.code === 'unavailable') {
        throw new Error('Serviço Firebase temporariamente indisponível. Tente novamente.');
      } else {
        throw new Error(`Erro ao excluir cliente: ${firebaseError.message || 'Erro desconhecido'}`);
      }
    }
  },

  onSnapshot(callback: (clients: Client[]) => void) {
    try {
      checkFirebaseConfig();
      console.log('Iniciando listener para clientes...');
      
      return onSnapshot(
        query(collection(db, 'clients'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          console.log('Snapshot recebido para clientes:', snapshot.size, 'documentos');
          const clients = snapshot.docs.map(doc => ({
            id: doc.id,
            ...convertTimestamps(doc.data())
          })) as Client[];
          callback(clients);
        },
        (error) => {
          console.error('Erro no listener de clientes:', error);
          console.error('Código do erro:', error.code);
          console.error('Mensagem do erro:', error.message);
          // Em caso de erro, tenta carregar dados do cache local
          const cachedClients = JSON.parse(localStorage.getItem('clients') || '[]');
          if (cachedClients.length > 0) {
            console.log('Carregando clientes do cache local');
            callback(cachedClients);
          }
        }
      );
    } catch (error) {
      console.error('Erro ao configurar listener de clientes:', error);
      return () => {};
    }
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
    
    // Limpar cache relacionado
    clearCache('serviceOrders');
    
    return docRef.id;
  },

  async getAll() {
    try {
      checkFirebaseConfig();
      
      const cacheKey = 'serviceOrders_all';
      const cached = getCachedData(cacheKey);
      if (cached) return cached;
      
      const querySnapshot = await getDocs(
        query(collection(db, 'serviceOrders'), orderBy('data', 'desc'))
      );
      
      const orders = querySnapshot.docs.map((doc) => {
        try {
          const rawData = doc.data();
          const convertedData = convertTimestamps(rawData);
          const normalizedData = normalizeServiceOrder(convertedData);
          
          return {
            id: doc.id,
            ...normalizedData
          } as ServiceOrder;
        } catch (docError) {
          console.error(`Erro ao processar documento ${doc.id}:`, docError);
          throw docError;
        }
      });
      
      setCachedData(cacheKey, orders);
      
      console.log('✅ serviceOrderService.getAll() - Concluído com sucesso');
      console.log('📊 Total de ordens processadas:', orders.length);
      return orders;
      
    } catch (error) {
      console.error('❌ serviceOrderService.getAll() - Erro:', error);
      console.error('❌ Detalhes do erro:', error.message);
      console.error('❌ Stack trace:', error.stack);
      throw error;
    }
  },

  async getById(id: string) {
    checkFirebaseConfig();
    try {
      const docRef = doc(db, 'serviceOrders', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.log('🔍 Ordem de serviço não encontrada no Firebase:', id);
        return null;
      }
      
      const data = convertTimestamps(docSnap.data());
      const orderData = {
        id: docSnap.id,
        ...normalizeServiceOrder(data)
      } as ServiceOrder;
      
      console.log('✅ Ordem de serviço encontrada no Firebase:', orderData.id);
      return orderData;
    } catch (error) {
      console.error('❌ Erro ao buscar ordem de serviço por ID:', error);
      return null;
    }
  },

  async getByClientId(clientId: string) {
    checkFirebaseConfig();
    const q = query(
      collection(db, 'serviceOrders'), 
      where('cliente_id', '==', clientId),
      orderBy('data', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = convertTimestamps(doc.data());
      return {
        id: doc.id,
        ...normalizeServiceOrder(data)
      } as ServiceOrder;
    });
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
    console.log('serviceOrderService.delete chamado com ID:', id);
    try {
      checkFirebaseConfig();
      console.log('Firebase configurado, executando deleteDoc para OS');
      
      const docRef = doc(db, 'serviceOrders', id);
      console.log('Referência do documento criada:', docRef.path);
      
      await deleteDoc(docRef);
      console.log('OS excluída do Firestore com sucesso');
      
      return { success: true };
    } catch (error: unknown) {
      console.error('Erro detalhado no serviceOrderService.delete:', error);
      const firebaseError = error as { code?: string; message?: string };
      
      // Tratar erros específicos do Firebase
      if (firebaseError.code === 'permission-denied') {
        throw new Error('Permissão negada para excluir OS. Verifique as regras do Firestore.');
      } else if (firebaseError.code === 'not-found') {
        throw new Error('Ordem de serviço não encontrada no Firebase.');
      } else if (firebaseError.code === 'unavailable') {
        throw new Error('Serviço Firebase temporariamente indisponível. Tente novamente.');
      } else {
        throw new Error(`Erro ao excluir OS: ${firebaseError.message || 'Erro desconhecido'}`);
      }
    }
  },

  onSnapshot(callback: (orders: ServiceOrder[]) => void) {
    try {
      checkFirebaseConfig();
      console.log('Iniciando listener para ordens de serviço...');
      
      return onSnapshot(
        query(collection(db, 'serviceOrders'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          console.log('Snapshot recebido para ordens:', snapshot.size, 'documentos');
          const orders = snapshot.docs.map(doc => {
            const data = convertTimestamps(doc.data());
            return {
              id: doc.id,
              ...normalizeServiceOrder(data)
            } as ServiceOrder;
          });
          callback(orders);
        },
        (error) => {
          console.error('Erro no listener de ordens:', error);
          console.error('Código do erro:', error.code);
          console.error('Mensagem do erro:', error.message);
          // Em caso de erro, tenta carregar dados do cache local
          const cachedOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]');
          if (cachedOrders.length > 0) {
            console.log('Carregando ordens do cache local');
            callback(cachedOrders);
          }
        }
      );
    } catch (error) {
      console.error('Erro ao configurar listener de ordens:', error);
      return () => {};
    }
  }
};

// Serviços de autenticação
export const authService = {
  async login(usuario: string, password: string) {
    try {
      // Garantir que o Firebase esteja inicializado antes do login
      if (!isFirebaseConfigured()) {
        console.error('❌ Firebase não está configurado');
        return { success: false, message: 'Firebase não está configurado. Configure primeiro.' };
      }
      
      console.log('🔐 Tentando fazer login:', usuario);
      const user = await userService.getByCredentials(usuario, password);
      
      if (user) {
        // Salvar sessão no localStorage
        localStorage.setItem('currentUser', JSON.stringify({
          id: user.id,
          usuario: user.usuario,
          nome: user.nome,
          loginTime: new Date().toISOString()
        }));
        console.log('✅ Login realizado com sucesso:', user.nome);
        return { success: true, user };
      } else {
        console.log('❌ Credenciais inválidas');
        return { success: false, message: 'Usuário ou senha incorretos' };
      }
    } catch (error) {
      console.error('❌ Erro no login:', error);
      return { success: false, message: 'Erro ao fazer login' };
    }
  },

  async register(userData: { nome: string; usuario: string; senha: string; telefone?: string }) {
    try {
      console.log('📝 Registrando novo usuário:', userData.usuario);
      
      // Verificar se usuário já existe
      const existingUser = await userService.getByUsuario(userData.usuario);
      if (existingUser) {
        return { success: false, message: 'Usuário já cadastrado' };
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
      // Carregar dados remotos para evitar duplicatas
      const [firebaseClients, firebaseOrders, firebaseUsers] = await Promise.all([
        clientService.getAll(),
        serviceOrderService.getAll(),
        userService.getAll().catch(() => []) // segurança caso coleção não exista
      ]);

      // Criar mapas para busca eficiente
      const clientByNome = new Map<string, { id: string }>();
      firebaseClients.forEach(c => {
        const nomeNormalizado = (c.nome || '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        clientByNome.set(nomeNormalizado, { id: c.id });
      });

      const userByUsuario = new Map<string, { id: string }>();
      (firebaseUsers as User[]).forEach(u => userByUsuario.set((u.usuario || '').toLowerCase(), { id: u.id }));

      const orderKey = (o: ServiceOrder) => {
        const gCount = Array.isArray(o.geradores) ? o.geradores.length : 0;
        return `${o.cliente_id}|${o.data}|${o.tecnico}|${gCount}`;
      };
      const orderByKey = new Map<string, { id: string }>();
      firebaseOrders.forEach(o => orderByKey.set(orderKey(o), { id: o.id }));
      
      // Sincronizar clientes
      const localClients = JSON.parse(localStorage.getItem('clients') || '[]') as Client[];
      let clientsUploaded = 0;
      let clientsLinked = 0;
      
      for (let i = 0; i < localClients.length; i++) {
        const client = localClients[i];
        if (!client || (client.id && client.id.includes('firebase_'))) continue;
        
        const nomeNormalizado = (client.nome || '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const remoteClient = clientByNome.get(nomeNormalizado);
        
        if (remoteClient) {
          localClients[i] = { ...client, id: `firebase_${remoteClient.id}` } as Client;
          clientsLinked++;
        } else {
          const { id: _drop, ...clientData } = client as Client;
          const newId = await clientService.create(clientData as Omit<Client, 'id'>);
          localClients[i] = { ...client, id: `firebase_${newId}` } as Client;
          clientsUploaded++;
        }
      }
      localStorage.setItem('clients', JSON.stringify(localClients));

      // Sincronizar ordens de serviço
      const localOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      let ordersUploaded = 0;
      let ordersLinked = 0;
      
      for (let i = 0; i < localOrders.length; i++) {
        const order = localOrders[i];
        if (!order || (order.id && order.id.includes('firebase_'))) continue;

        const key = orderKey(order);
        const remoteOrder = orderByKey.get(key);
        
        if (remoteOrder) {
          localOrders[i] = { ...order, id: `firebase_${remoteOrder.id}` } as ServiceOrder;
          ordersLinked++;
        } else {
          const { id: _omit, ...orderData } = order as ServiceOrder;
          const newOrderId = await serviceOrderService.create(orderData as Omit<ServiceOrder, 'id'>);
          localOrders[i] = { ...order, id: `firebase_${newOrderId}` } as ServiceOrder;
          ordersUploaded++;
        }
      }
      // Persistir alterações locais de ordens
      localStorage.setItem('serviceOrders', JSON.stringify(localOrders));

      // Sincronizar usuários (se houverem no localStorage)
      const localUsers = JSON.parse(localStorage.getItem('users') || '[]') as User[];
      let usersUploaded = 0;
      let usersLinked = 0;
      if (localUsers.length > 0) {
        for (let i = 0; i < localUsers.length; i++) {
          const user = localUsers[i];
          if (!user) continue;
          const usuarioKey = (user.usuario || '').toLowerCase();
          if (user.id && user.id.includes('firebase_')) continue;

          const remoteUser = userByUsuario.get(usuarioKey);
          if (remoteUser) {
            localUsers[i] = { ...user, id: `firebase_${remoteUser.id}` } as User;
            usersLinked++;
            continue;
          }

          const { id: _idDrop, ...userData } = user as User;
          console.log('📤 Enviando usuário:', user.usuario);
          const newUserId = await userService.create(userData as Omit<User, 'id'>);
          localUsers[i] = { ...user, id: `firebase_${newUserId}` } as User;
          usersUploaded++;
        }
        localStorage.setItem('users', JSON.stringify(localUsers));
      }

      const summary = [
        `${clientsUploaded} clientes enviados` + (clientsLinked ? `, ${clientsLinked} vinculados` : ''),
        `${ordersUploaded} ordens enviadas` + (ordersLinked ? `, ${ordersLinked} vinculadas` : ''),
      ];
      if (localUsers.length > 0) {
        summary.push(`${usersUploaded} usuários enviados` + (usersLinked ? `, ${usersLinked} vinculados` : ''));
      }

      return { 
        success: true, 
        message: `Sincronização concluída! ${summary.join(' · ')}` 
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

  // Função para corrigir cliente_id nas ordens de serviço existentes
  async fixClientIds() {
    try {
      console.log('🔧 Iniciando correção de cliente_id nas ordens de serviço...');
      
      // Carregar ordens locais
      const localOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      let ordersFixed = 0;
      
      // Corrigir ordens que têm cliente_id com prefixo firebase_
      const correctedOrders = localOrders.map(order => {
        if (order.cliente_id && order.cliente_id.startsWith('firebase_')) {
          ordersFixed++;
          return {
            ...order,
            cliente_id: order.cliente_id.replace(/^firebase_/, '')
          };
        }
        return order;
      });
      
      // Salvar ordens corrigidas
      if (ordersFixed > 0) {
        localStorage.setItem('serviceOrders', JSON.stringify(correctedOrders));
        console.log(`✅ ${ordersFixed} ordens de serviço corrigidas`);
        return { success: true, message: `${ordersFixed} ordens de serviço foram corrigidas` };
      } else {
        console.log('ℹ️ Nenhuma ordem precisava de correção');
        return { success: true, message: 'Nenhuma ordem precisava de correção' };
      }
    } catch (error) {
      console.error('❌ Erro ao corrigir cliente_id:', error);
      return { success: false, message: 'Erro ao corrigir cliente_id das ordens' };
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
        if (!firebaseClients.find(fc => fc.nome === localClient.nome)) {
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
          fo.cliente_id === localOrder.cliente_id &&
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
