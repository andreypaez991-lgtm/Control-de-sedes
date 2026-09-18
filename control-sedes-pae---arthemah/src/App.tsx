import { useState, useEffect } from 'react';
import { Sede } from './types';
import { storage } from './lib/storage';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { Header } from './components/Header';
import { LoginScreen } from './screens/LoginScreen';
import { WorkspaceScreen } from './screens/WorkspaceScreen';
import { AdminScreen } from './screens/AdminScreen';

type ScreenType = 'login' | 'workspace' | 'admin';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('login');
  const [activeSede, setActiveSede] = useState<Sede | null>(null);
  const [activeManipuladora, setActiveManipuladora] = useState<string>('');

  const { isOnline, pendingCount, isSyncing, syncNow } = useOnlineStatus();

  // Initialize storage (IndexedDB + LocalStorage) and restore active fichaje
  useEffect(() => {
    storage.init().then(() => {
      const activeSedes = storage.getActiveSedes();
      const savedSedeId = localStorage.getItem('arthemah_fichada_sede_id');
      // Default to first active sede (La Linda) unless explicitly desfichado
      if (savedSedeId !== 'none' && activeSedes.length > 0) {
        const targetId = savedSedeId ? Number(savedSedeId) : activeSedes[0].id;
        const targetSede = activeSedes.find((s) => s.id === targetId) || activeSedes[0];
        if (targetSede) {
          setActiveSede(targetSede);
          setActiveManipuladora(targetSede.manipuladoraName);
          setCurrentScreen('workspace');
        }
      }
    }).catch((err) => {
      console.warn('Storage init fallback:', err);
    });

    const handleDataUpdate = () => {
      setActiveSede((prev) => {
        if (!prev) return null;
        const fresh = storage.getSedes().find((s) => s.id === prev.id || s.name.toLowerCase() === prev.name.toLowerCase());
        return fresh || prev;
      });
    };

    window.addEventListener('arthemah:data-updated', handleDataUpdate);
    return () => window.removeEventListener('arthemah:data-updated', handleDataUpdate);
  }, []);

  const handleSelectSede = (sede: Sede, manipuladora: string) => {
    localStorage.setItem('arthemah_fichada_sede_id', String(sede.id));
    setActiveSede(sede);
    setActiveManipuladora(manipuladora);
    setCurrentScreen('workspace');
  };

  const handleBackToLogin = () => {
    localStorage.setItem('arthemah_fichada_sede_id', 'none');
    setCurrentScreen('login');
    setActiveSede(null);
    setActiveManipuladora('');
  };

  const handleOpenAdmin = () => {
    setCurrentScreen('admin');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-[#0F172A] selection:bg-[#CCFBF1] selection:text-[#0F3863]">
      {/* Global Header (shown in Login and Admin, Workspace has its custom header matching the reference) */}
      {currentScreen !== 'workspace' && (
        <Header
          isOnline={isOnline}
          pendingCount={pendingCount}
          isSyncing={isSyncing}
          onSync={syncNow}
        />
      )}

      {/* Main Screen Content */}
      <main className="flex-1 flex flex-col">
        {currentScreen === 'login' && (
          <LoginScreen
            onSelectSede={handleSelectSede}
            onOpenAdmin={handleOpenAdmin}
          />
        )}

        {currentScreen === 'workspace' && activeSede && (
          <WorkspaceScreen
            sede={activeSede}
            manipuladoraName={activeManipuladora}
            isOnline={isOnline}
            onBackToLogin={handleBackToLogin}
          />
        )}

        {currentScreen === 'admin' && (
          <AdminScreen
            onBack={handleBackToLogin}
            isOnline={isOnline}
          />
        )}
      </main>
    </div>
  );
}
