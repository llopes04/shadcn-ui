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
    return docRef.id;
  },

  async getAll() {
    checkFirebaseConfig();
    const querySnapshot = await getDocs(
      query(collection(db, 'serviceOrders'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => {
      const data = convertTimestamps(doc.data());
      return {
        id: doc.id,
        ...normalizeServiceOrder(data)
      } as ServiceOrder;
    });
  },

  async getById(id: string) {
    checkFirebaseConfig();
    const docSnap = await getDocs(query(collection(db, 'serviceOrders'), where('__name__', '==', id)));
    if (docSnap.empty) return null;
    
    const orderDoc = docSnap.docs[0];
    const data = convertTimestamps(orderDoc.data());
    return {
      id: orderDoc.id,
      ...normalizeServiceOrder(data)
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
      console.log('🚀 Iniciando sincronização para Firebase...');

      // Carregar dados remotos para evitar duplicatas
      const [firebaseClients, firebaseOrders, firebaseUsers] = await Promise.all([
        clientService.getAll(),
        serviceOrderService.getAll(),
        userService.getAll().catch(() => []) // segurança caso coleção não exista
      ]);

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
      console.log('📊 Clientes locais encontrados:', localClients.length);
      let clientsUploaded = 0;
      let clientsLinked = 0;
      
      for (let i = 0; i < localClients.length; i++) {
        const client = localClients[i];
        if (!client) continue;
        const nomeNormalizado = (client.nome || '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        
        if (client.id && client.id.includes('firebase_')) {
          // Já sincronizado
          continue;
        }

        // Se já existe no Firebase por nome normalizado, apenas vincular e marcar localmente
        const remoteClient = clientByNome.get(nomeNormalizado);
        if (remoteClient) {
          localClients[i] = { ...client, id: `firebase_${remoteClient.id}` } as Client;
          clientsLinked++;
          continue;
        }

        // Não existe no Firebase: criar e marcar localmente
        const { id: _drop, ...clientData } = client as Client;
        console.log('📤 Enviando cliente:', client.nome);
        const newId = await clientService.create(clientData as Omit<Client, 'id'>);
        localClients[i] = { ...client, id: `firebase_${newId}` } as Client;
        clientsUploaded++;
      }
      // Persistir alterações locais de clientes
      localStorage.setItem('clients', JSON.stringify(localClients));

      // Sincronizar ordens de serviço
      const localOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      console.log('📊 Ordens locais encontradas:', localOrders.length);
      let ordersUploaded = 0;
      let ordersLinked = 0;
      
      for (let i = 0; i < localOrders.length; i++) {
        const order = localOrders[i];
        if (!order) continue;
        if (order.id && order.id.includes('firebase_')) {
          // Já sincronizada
          continue;
        }

        const key = orderKey(order);
        const remoteOrder = orderByKey.get(key);
        if (remoteOrder) {
          // Já existe no Firebase, apenas vincular
          localOrders[i] = { ...order, id: `firebase_${remoteOrder.id}` } as ServiceOrder;
          ordersLinked++;
          continue;
        }

        const { id: _omit, ...orderData } = order as ServiceOrder;
        console.log('📤 Enviando ordem:', order.id);
        const newOrderId = await serviceOrderService.create(orderData as Omit<ServiceOrder, 'id'>);
        localOrders[i] = { ...order, id: `firebase_${newOrderId}` } as ServiceOrder;
        ordersUploaded++;
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
