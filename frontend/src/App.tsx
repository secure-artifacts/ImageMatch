import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import SearchView from './pages/SearchView';
import LibraryView from './pages/LibraryView';
import PasswordGate from './components/PasswordGate';
import { getStats } from './api';

type ViewType = 'search' | 'library';

function App() {
  const [activeView, setActiveView] = useState<ViewType>('search');
  const [libraryCount, setLibraryCount] = useState(0);

  const fetchStats = useCallback(async () => {
    try {
      const stats = await getStats();
      setLibraryCount(stats.library_size);
    } catch {
      // Backend might not be running yet
      console.warn('Could not fetch stats — is the backend running?');
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLibraryChange = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <PasswordGate>
      <div className="min-h-screen bg-gradient-main">
        {/* Ambient background effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px]" />
        </div>

        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          libraryCount={libraryCount}
        />

        {/* Main Content */}
        <main className="ml-72 min-h-screen relative">
          <div className="max-w-6xl mx-auto p-8">
            {activeView === 'search' ? (
              <SearchView libraryCount={libraryCount} />
            ) : (
              <LibraryView onLibraryChange={handleLibraryChange} />
            )}
          </div>
        </main>
      </div>
    </PasswordGate>
  );
}

export default App;
