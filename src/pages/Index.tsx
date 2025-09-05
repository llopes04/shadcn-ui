import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/assets/logo.png" 
              alt="SERMAG Logo" 
              className="h-20 w-auto object-contain"
              onError={(e) => {
                console.error('Logo failed to load:', e);
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => console.log('Logo loaded successfully')}
            />
          </div>
          <CardTitle className="text-3xl font-bold text-blue-600">SERMAG</CardTitle>
          <CardDescription className="text-lg">
            Sistema de Gerenciamento de Ordens de Serviço
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3"
            onClick={() => navigate('/login')}
          >
            Fazer Login
          </Button>
          <Button 
            variant="outline" 
            className="w-full text-lg py-3"
            onClick={() => navigate('/register')}
          >
            Cadastrar-se
          </Button>
          <div className="text-center text-sm text-gray-600 mt-4">
            <p>Sistema completo para gerenciamento de</p>
            <p>ordens de serviço com PWA e sincronização</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}