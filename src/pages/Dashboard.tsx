import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ServiceOrder, Client } from '@/types';
import { Settings, Database, FileText, UserPlus, ClipboardList, User, Image, Mail } from 'lucide-react';
import SyncControls from '@/components/SyncControls';

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentUser] = useLocalStorage('currentUser', null);
  const [serviceOrders] = useLocalStorage<ServiceOrder[]>('serviceOrders', []);
  const [clients] = useLocalStorage<Client[]>('clients', []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  const totalOrders = serviceOrders.length;
  const totalClients = clients.length;
  const pendingOrders = serviceOrders.filter(order => !order.assinatura).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <img 
              src="/images/SERMAG.jpg" 
              alt="SERMAG Logo" 
              className="h-12 w-auto object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold">SERMAG Dashboard</h1>
              <p className="text-gray-600">Bem-vindo, {currentUser?.nome}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de OS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClients}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">OS Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingOrders}</div>
            </CardContent>
          </Card>
        </div>

        {/* Sync Controls */}
        <div className="mb-6">
          <SyncControls />
        </div>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Gerencie seu sistema rapidamente</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              className="w-full flex justify-start items-center gap-2" 
              onClick={() => navigate('/service-orders')}
            >
              <FileText size={18} />
              Nova OS
            </Button>
            <Button 
              variant="outline" 
              className="w-full flex justify-start items-center gap-2"
              onClick={() => navigate('/clients')}
            >
              <User size={18} />
              Clientes
            </Button>
            <Button 
              variant="outline" 
              className="w-full flex justify-start items-center gap-2"
              onClick={() => navigate('/orders')}
            >
              <ClipboardList size={18} />
              Ver Ordens
            </Button>
            <Button 
              variant="outline" 
              className="w-full flex justify-start items-center gap-2"
              onClick={() => navigate('/clients/new')}
            >
              <UserPlus size={18} />
              Novo Cliente
            </Button>
          </CardContent>
        </Card>

        {/* Configuration Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
            <CardDescription>Personalize seu sistema</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button 
              variant="outline"
              className="w-full flex justify-start items-center gap-2" 
              onClick={() => navigate('/config/logo')}
            >
              <Image size={18} />
              Logo e Marca d'água
            </Button>
            <Button 
              variant="outline"
              className="w-full flex justify-start items-center gap-2" 
              onClick={() => navigate('/config/email')}
            >
              <Mail size={18} />
              Configurar Email
            </Button>
            <Button 
              variant="outline"
              className="w-full flex justify-start items-center gap-2" 
              onClick={() => navigate('/config/firebase')}
            >
              <Database size={18} />
              Configurar Firebase
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Últimas Ordens</CardTitle>
            <CardDescription>As 5 ordens mais recentes</CardDescription>
          </CardHeader>
          <CardContent>
            {serviceOrders.slice(-5).reverse().map((order) => (
              <div key={order.id} className="border-b py-2 last:border-b-0">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">OS #{order.id.slice(-4)}</p>
                    <p className="text-sm text-gray-600">
                      {order.tipo_manutencao} - {order.data}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    order.assinatura 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.assinatura ? 'Concluída' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
            {serviceOrders.length === 0 && (
              <p className="text-gray-500 text-center py-4">Nenhuma ordem cadastrada</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
