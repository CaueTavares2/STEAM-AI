import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Loader2, 
  Gamepad2, 
  LogOut, 
  ChevronRight, 
  History, 
  Settings, 
  Key, 
  AlertTriangle, 
  Music, 
  Search, 
  Plus, 
  Volume2, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Cpu, 
  Clock, 
  Compass, 
  Layers,
  HelpCircle,
  Database
} from "lucide-react";
import GameCard from './GameCard';

interface User {
  id: string;
  displayName: string;
  photos: { value: string }[];
}

interface Game {
  appid: number;
  name: string;
  playtime_forever: number; // in minutes
  img_icon_url: string;
  playtime_2weeks?: number;
  isManual?: boolean;
}

interface Recommendation {
  name: string;
  reason: string;
  genres: string[];
  estimatedMatch: number;
  appId?: number;
}

export default function Dashboard({ user }: { user: User }) {
  // Primary States
  const [ownedGames, setOwnedGames] = useState<Game[]>([]);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [discardedRecommendations, setDiscardedRecommendations] = useState<Recommendation[]>([]);
  
  // Tab configuration
  const [activeTab, setActiveTab] = useState<'recommendations' | 'library' | 'manual' | 'discarded'>('recommendations');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(localStorage.getItem('custom_gemini_api_key') || '');
  const [isProfilePrivate, setIsProfilePrivate] = useState(false);
  const [prefsMoreOf, setPrefsMoreOf] = useState('');
  const [prefsLessOf, setPrefsLessOf] = useState('');
  const [generationError, setGenerationError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [librarySearchFilter, setLibrarySearchFilter] = useState('');

  // ----------------------------------------------------
  // Manual Games Persistence State
  // ----------------------------------------------------
  const [manualGames, setManualGames] = useState<Game[]>(() => {
    const saved = localStorage.getItem('manual_games');
    return saved ? JSON.parse(saved) : [];
  });

  // Manual game form input states
  const [manualGameName, setManualGameName] = useState('');
  const [manualGameHours, setManualGameHours] = useState('');
  const [manualAppId, setManualAppId] = useState<number | undefined>(undefined);
  const [isSearchingManual, setIsSearchingManual] = useState(false);
  const [manualSearchResults, setManualSearchResults] = useState<any[]>([]);
  const [manualSearchQuery, setManualSearchQuery] = useState('');

  // Save manual games to localStorage and server
  const saveManualGamesToServer = async (games: Game[]) => {
    try {
      const token = localStorage.getItem('steam_auth_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/steam/manual-games', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ games })
      });
    } catch (err) {
      console.error("Failed to save manual games to server:", err);
    }
  };

  useEffect(() => {
    localStorage.setItem('manual_games', JSON.stringify(manualGames));
    saveManualGamesToServer(manualGames);
  }, [manualGames]);

  // Synchronize manual games from server on mount
  useEffect(() => {
    async function fetchManualGames() {
      try {
        const token = localStorage.getItem('steam_auth_token');
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/steam/manual-games', { headers, credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const serverGames = data.games || [];
          
          setManualGames(prevLocal => {
            const merged = [...serverGames];
            prevLocal.forEach(localGame => {
              const exists = merged.some(g => g.appid === localGame.appid || g.name.toLowerCase() === localGame.name.toLowerCase());
              if (!exists) {
                merged.push({ ...localGame, isManual: true });
              }
            });
            
            if (merged.length !== serverGames.length) {
              saveManualGamesToServer(merged);
            }
            return merged;
          });
        }
      } catch (err) {
        console.error("Failed to fetch manual games from server:", err);
      }
    }
    fetchManualGames();
  }, []);

  // Fetch Steam Library
  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem('steam_auth_token');
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [ownedRes, recentRes] = await Promise.all([
          fetch('/api/steam/owned-games', { headers, credentials: 'include' }),
          fetch('/api/steam/recent-games', { headers, credentials: 'include' })
        ]);
        
        const ownedData = await ownedRes.json();
        const recentData = await recentRes.json();
        
        if (ownedData.error || recentData.error) {
          console.error("Steam API error:", ownedData.error || recentData.error);
        }
        
        const owned = ownedData.games || [];
        const recent = recentData.games || [];
        
        setOwnedGames(owned);
        setRecentGames(recent);

        if (!ownedData.error && !recentData.error && typeof ownedData.game_count === 'undefined' && owned.length === 0) {
          setIsProfilePrivate(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSaveApiKey = (key: string) => {
    setCustomApiKey(key);
    if (key) {
      localStorage.setItem('custom_gemini_api_key', key);
    } else {
      localStorage.removeItem('custom_gemini_api_key');
    }
  };

  // Generate recommendations merging Steam and manual library
  const generateRecommendations = async () => {
    setGenerating(true);
    setGenerationError('');
    try {
      const token = localStorage.getItem('steam_auth_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Combine Steam games with manual games to feed the AI
      const combinedLibrary = [...manualGames, ...ownedGames];

      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          ownedGames: combinedLibrary.slice(0, 50), 
          recentGames: recentGames,
          customGeminiKey: customApiKey || undefined,
          preferences: {
            moreOf: prefsMoreOf,
            lessOf: prefsLessOf
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRecommendations(data.recommendations || []);
        setGenerationError('');
      } else {
        setGenerationError(data.error || 'Ocorreu um erro ao gerar recomendações.');
      }
    } catch (err) {
      console.error(err);
      setGenerationError('Erro de conexão ao gerar recomendações.');
    } finally {
      setGenerating(false);
    }
  };

  // ----------------------------------------------------
  // Pure State Handlers - Avoiding duplicate anti-pattern
  // ----------------------------------------------------
  const handleDiscard = (index: number) => {
    const item = recommendations[index];
    if (!item) return;

    setRecommendations(prev => prev.filter((_, i) => i !== index));
    setDiscardedRecommendations(prev => {
      if (prev.some(x => x.name === item.name)) return prev;
      return [...prev, item];
    });
  };

  const handleRestore = (index: number) => {
    const item = discardedRecommendations[index];
    if (!item) return;

    setDiscardedRecommendations(prev => prev.filter((_, i) => i !== index));
    setRecommendations(prev => {
      if (prev.some(x => x.name === item.name)) return prev;
      return [...prev, item];
    });
  };

  const handleSearchGames = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/search-games?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  // Add Steam game to own library (Steam search addition)
  const handleAddGame = (app: any) => {
    const exists = manualGames.some(g => g.appid === app.id || g.name.toLowerCase() === app.name.toLowerCase());
    if (!exists) {
      const newGame: Game = {
        appid: app.id,
        name: app.name,
        playtime_forever: 0,
        img_icon_url: '',
        isManual: true
      };
      setManualGames(prev => [newGame, ...prev]);
    }
    setSearchQuery('');
    setSearchResults([]);
    setActiveTab('manual');
  };

  // ----------------------------------------------------
  // Manual Addition Controls
  // ----------------------------------------------------
  const handleSearchManualGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSearchQuery) return;
    setIsSearchingManual(true);
    try {
      const res = await fetch(`/api/search-games?q=${encodeURIComponent(manualSearchQuery)}`);
      const data = await res.json();
      setManualSearchResults(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingManual(false);
    }
  };

  const handleSelectManualSearchResult = (app: any) => {
    setManualGameName(app.name);
    setManualAppId(app.id);
    setManualSearchResults([]);
    setManualSearchQuery('');
  };

  const handleAddManualGameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualGameName) return;

    const hours = parseFloat(manualGameHours) || 0;
    const playtime_forever = Math.round(hours * 60);

    // Guard duplication
    const exists = manualGames.some(g => 
      g.name.toLowerCase() === manualGameName.toLowerCase() || 
      (manualAppId && g.appid === manualAppId)
    );

    if (exists) {
      alert('Este jogo já foi adicionado manualmente!');
      return;
    }

    const newGame: Game = {
      appid: manualAppId || Math.floor(Math.random() * -1000000), // unique negative key for fully custom
      name: manualGameName,
      playtime_forever,
      img_icon_url: '',
      isManual: true
    };

    setManualGames(prev => [newGame, ...prev]);
    
    // Clear fields
    setManualGameName('');
    setManualGameHours('');
    setManualAppId(undefined);
  };

  const handleRemoveManualGame = (idOrName: number | string) => {
    setManualGames(prev => prev.filter(g => g.appid !== idOrName && g.name !== idOrName));
  };

  const handleEditManualPlaytime = (idOrName: number | string, minutes: number) => {
    setManualGames(prev => prev.map(g => {
      if (g.appid === idOrName || g.name === idOrName) {
        return { ...g, playtime_forever: minutes };
      }
      return g;
    }));
  };

  const handleRecommendSimilar = async (gameName: string) => {
    setActiveTab('recommendations');
    setGenerating(true);
    setGenerationError('');
    try {
      const token = localStorage.getItem('steam_auth_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/recommend-similar', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          gameName,
          customGeminiKey: customApiKey || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRecommendations(data.recommendations || []);
      } else {
        setGenerationError(data.error || 'Erro ao gerar recomendações similares.');
      }
    } catch (err) {
      console.error(err);
      setGenerationError('Erro de conexão.');
    } finally {
      setGenerating(false);
    }
  };

  // Helper metrics
  const combinedTotalGames = ownedGames.length + manualGames.length;
  const totalPlaytimeMinutes = ownedGames.reduce((acc, g) => acc + g.playtime_forever, 0) + 
                               manualGames.reduce((acc, g) => acc + g.playtime_forever, 0);
  const totalPlaytimeHours = Math.round(totalPlaytimeMinutes / 60);
  
  const recentPlaytimeHours = (recentGames.reduce((acc, g) => acc + (g.playtime_2weeks || 0), 0) / 60).toFixed(1);

  // Dynamic console messages based on current system state
  const getCoreMessage = () => {
    if (generating) {
      return "Sincronizando com a inteligência do Google Gemini... Analisando bibliotecas Steam e registros manuais para computar matches precisos de recomendação. Aguarde um instante...";
    }
    if (generationError) {
      return `Ocorreu um erro no pipeline de rede neural: "${generationError}". Por favor, verifique as configurações ou tente novamente.`;
    }
    if (recommendations.length > 0) {
      return `Sucesso! O algoritmo calculou ${recommendations.length} recomendações com alto nível de afinidade. Sinta-se livre para explorar os detalhes ou ajustar a calibração de som e gênero.`;
    }
    if (combinedTotalGames === 0) {
      return "Sua biblioteca parece vazia! Se o seu perfil Steam for privado, utilize as instruções de privacidade ou comece adicionando jogos manualmente na aba 'Adicionados Manuais' para recalibrar o sistema.";
    }
    return `Mecanismo Synapse conectado. Analisando ${combinedTotalGames} jogos em seu repertório (incluindo ${manualGames.length} registros manuais). Sintonize uma recomendação para encontrar seu próximo jogo!`;
  };

  // Combined library games (Steam + Manually added)
  const combinedLibraryGames = [
    ...ownedGames.map(g => ({ ...g, isManual: false })),
    ...manualGames.map(g => ({ ...g, isManual: true }))
  ];

  const filteredLibraryGames = combinedLibraryGames.filter(game => 
    game.name.toLowerCase().includes(librarySearchFilter.toLowerCase())
  );

  const handleLogout = () => {
    localStorage.removeItem('steam_auth_token');
    window.location.href = '/api/auth/logout';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070a] flex flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <Cpu className="w-6 h-6 text-purple-400 absolute animate-pulse" />
        </div>
        <p className="text-purple-400 font-mono text-xs tracking-widest uppercase animate-pulse">Estabelecendo Link Neural... ♪</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-gray-100 font-sans pb-16 relative">
      {/* Structural ambient styling grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#a855f702_1px,transparent_1px),linear-gradient(to_bottom,#a855f702_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Header */}
      <header className="border-b border-purple-500/10 bg-[#0f0f16]/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Cpu className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-sm tracking-widest uppercase bg-gradient-to-r from-purple-400 to-cyan-300 bg-clip-text text-transparent">
                Steam Synapse
              </h1>
              <p className="text-[9px] font-mono text-purple-400/80 -mt-0.5 tracking-wider uppercase">AI Gaming Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User Profile */}
            <div className="flex items-center gap-3 bg-[#07070a]/60 border border-purple-500/10 px-3.5 py-1.5 rounded-full">
              {user.photos && user.photos[0] ? (
                <img src={user.photos[0].value} alt={user.displayName} className="w-6 h-6 rounded-full border border-purple-500/30" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
                </div>
              )}
              <span className="text-xs font-bold text-gray-200 hidden sm:inline">{user.displayName}</span>
            </div>

            {/* Config & Logout Buttons */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${showSettings ? 'bg-purple-600/20 border-purple-400 text-purple-300' : 'bg-[#0f0f16] border-purple-500/10 text-gray-400 hover:text-purple-400'}`}
                title="Configurações de API"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              <button 
                onClick={handleLogout}
                className="p-2 rounded-xl bg-[#0f0f16] border border-red-500/15 text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                title="Desconectar da Steam"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 relative z-10">
        
        {/* API Settings Panel inside collapsing space */}
        <AnimatePresence>
          {showSettings && (
            <motion.section 
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="bg-[#0f0f16]/90 border border-purple-500/15 rounded-3xl p-6 shadow-xl space-y-4 overflow-hidden"
            >
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Key className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-purple-200">Gabinete de Credenciais</h3>
              </div>
              
              <div className="max-w-xl space-y-3">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Por padrão, utilizamos uma chave corporativa do Gemini. Se preferir rodar sob sua própria cota ou encontrar limites de requisição, você pode inserir sua chave pessoal do Google Gemini abaixo. Ela é salva estritamente no seu navegador.
                </p>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    value={customApiKey}
                    onChange={(e) => handleSaveApiKey(e.target.value)}
                    placeholder="Chave de API do Gemini..."
                    className="flex-1 bg-[#07070a] border border-purple-500/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-400 font-mono"
                  />
                  {customApiKey && (
                    <button 
                      onClick={() => handleSaveApiKey('')}
                      className="px-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl text-red-400 text-xs font-bold transition-all"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Private Profile Warning Banner */}
        {isProfilePrivate && (
          <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
            <div className="flex gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-300">Sua conta Steam parece Privada ou sem jogos disponíveis</h4>
                <p className="text-xs text-amber-200/80 leading-relaxed mt-0.5">
                  Não conseguimos importar jogos automaticamente. Torne seus "Detalhes dos Jogos" públicos na Steam ou <span className="font-bold underline text-amber-300">adicione jogos manualmente</span> na nova aba de registros para alimentar o sistema de IA!
                </p>
              </div>
            </div>
            <a 
              href="https://help.steampowered.com/pt-br/faqs/view/4F0A-111A-2324-85F0" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-amber-500 hover:bg-amber-600 text-black px-4 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors"
            >
              Como Configurar
            </a>
          </div>
        )}

        {/* Primary Tab Navigation */}
        <div className="flex border-b border-purple-500/10 overflow-x-auto pb-px gap-2 scrollbar-none">
          <button 
            onClick={() => setActiveTab('recommendations')}
            className={`relative py-3.5 px-5 text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'recommendations' ? 'text-purple-300' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <span className="relative z-10 flex items-center gap-2 font-sans font-extrabold">
              <Compass className="w-4 h-4 text-purple-400" />
              Recomendações
            </span>
            {activeTab === 'recommendations' && (
              <motion.div 
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-400"
              />
            )}
          </button>

          <button 
            onClick={() => setActiveTab('library')}
            className={`relative py-3.5 px-5 text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'library' ? 'text-purple-300' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <span className="relative z-10 flex items-center gap-2 font-sans font-extrabold">
              <Layers className="w-4 h-4 text-purple-400" />
              Biblioteca Steam ({ownedGames.length})
            </span>
            {activeTab === 'library' && (
              <motion.div 
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-400"
              />
            )}
          </button>

          {/* New Custom Tab for Manually Added Games */}
          <button 
            onClick={() => setActiveTab('manual')}
            className={`relative py-3.5 px-5 text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'manual' ? 'text-purple-300' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <span className="relative z-10 flex items-center gap-2 font-sans font-extrabold">
              <Database className="w-4 h-4 text-amber-400" />
              Adicionados Manuais ({manualGames.length})
            </span>
            {activeTab === 'manual' && (
              <motion.div 
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-purple-500"
              />
            )}
          </button>

          <button 
            onClick={() => setActiveTab('discarded')}
            className={`relative py-3.5 px-5 text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'discarded' ? 'text-purple-300' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <span className="relative z-10 flex items-center gap-2 font-sans font-extrabold">
              <History className="w-4 h-4 text-purple-400" />
              Descartados ({discardedRecommendations.length})
            </span>
            {activeTab === 'discarded' && (
              <motion.div 
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-400"
              />
            )}
          </button>
        </div>

        {/* Tab contents wrapped with beautiful fluid transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="space-y-10 focus:outline-none"
          >
            {/* RECOMMENDATIONS TAB */}
            {activeTab === 'recommendations' && (
              <div className="space-y-12">
                
                {/* Visual Novel Style Quantum System Console Box */}
                <div className="bg-[#0f0f16]/90 backdrop-blur-xl p-6 rounded-3xl border border-purple-500/10 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full pointer-events-none" />
                  
                  {/* Neon Reactor Orb */}
                  <div className="relative group shrink-0">
                    <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-400 rounded-full blur opacity-60 group-hover:opacity-80 transition duration-300 animate-pulse" />
                    <div className="relative w-20 h-20 bg-[#07070a] rounded-full overflow-hidden border border-purple-500/30 flex items-center justify-center">
                      <Cpu className="w-9 h-9 text-purple-400 animate-pulse" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-purple-600 text-[8px] font-bold text-white rounded-full uppercase border border-purple-400/20 shadow-md font-mono">
                      CORE-01
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <div className="space-y-1">
                      <div className="flex flex-col sm:flex-row items-center gap-2 justify-center md:justify-start">
                        <span className="font-extrabold text-lg text-purple-300 uppercase tracking-wider font-mono">Synapse Core System</span>
                        <div className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded-md text-[9px] font-mono text-purple-300 uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          Algoritmo Ativo
                        </div>
                      </div>
                      
                      {/* Dynamic Core messages */}
                      <p className="text-sm font-medium text-purple-100 leading-relaxed font-mono">
                        "{getCoreMessage()}"
                      </p>
                    </div>

                    {/* Quick core metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div className="bg-[#07070a]/80 p-2.5 rounded-2xl border border-white/5">
                        <span className="text-[9px] text-gray-500 block uppercase font-mono tracking-wider">Frequência Total</span>
                        <span className="text-xs font-bold text-purple-300 font-mono">{totalPlaytimeHours}h ouvidas</span>
                      </div>
                      <div className="bg-[#07070a]/80 p-2.5 rounded-2xl border border-white/5">
                        <span className="text-[9px] text-gray-500 block uppercase font-mono tracking-wider">Ritmo Recente</span>
                        <span className="text-xs font-bold text-cyan-400 font-mono">{recentPlaytimeHours}h / 2sem</span>
                      </div>
                      <div className="bg-[#07070a]/80 p-2.5 rounded-2xl border border-white/5">
                        <span className="text-[9px] text-gray-500 block uppercase font-mono tracking-wider">Biblioteca Steam</span>
                        <span className="text-xs font-bold text-gray-300 font-mono">{ownedGames.length} Jogos</span>
                      </div>
                      <div className="bg-[#07070a]/80 p-2.5 rounded-2xl border border-white/5">
                        <span className="text-[9px] text-gray-500 block uppercase font-mono tracking-wider">Adicionados Manuais</span>
                        <span className="text-xs font-bold text-amber-400 font-mono">{manualGames.length} Jogos</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Equalizer Controller calibrator */}
                <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0f0f16] to-[#07070a] border border-purple-500/10 p-8 sm:p-10 shadow-2xl">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.01)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
                  
                  <div className="relative z-10 max-w-2xl space-y-6">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full text-xs font-bold font-mono uppercase tracking-wider">
                        <Volume2 className="w-3.5 h-3.5" />
                        Ajuste de Calibração
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">O que vamos sintonizar hoje?</h2>
                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                        Defina preferências para moldar a rede neural. O mecanismo Synapse analisará seus jogos favoritos juntamente com suas diretrizes para projetar matches cirúrgicos.
                      </p>
                    </div>
                    
                    <div className="space-y-4 bg-[#07070a]/80 p-5 rounded-2xl border border-white/5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">Quero MAIS disso (Filtro Amplificador):</label>
                          <input 
                            type="text" 
                            placeholder="Ex: RPG de Turno, Metroidvania, Rogue-lite"
                            value={prefsMoreOf}
                            onChange={(e) => setPrefsMoreOf(e.target.value)}
                            className="w-full bg-[#0f0f16] border border-purple-500/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 placeholder-gray-600 transition-colors"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-purple-400 uppercase tracking-wider font-mono">Quero MENOS disso (Filtro Atenuador):</label>
                          <input 
                            type="text" 
                            placeholder="Ex: FPS frenético, Esporte, Pay-to-win"
                            value={prefsLessOf}
                            onChange={(e) => setPrefsLessOf(e.target.value)}
                            className="w-full bg-[#0f0f16] border border-purple-500/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 placeholder-gray-600 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <button
                        onClick={generateRecommendations}
                        disabled={generating || (combinedTotalGames === 0 && !prefsMoreOf)}
                        className="flex items-center gap-2.5 bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-400 hover:to-cyan-300 text-black font-black py-3.5 px-8 rounded-xl transition-all disabled:opacity-40 active:scale-95 shadow-lg shadow-purple-500/20 cursor-pointer"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                            <span>Projetando Rede Neural...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-black animate-pulse" />
                            <span>Sintonizar Recomendações!</span>
                          </>
                        )}
                      </button>

                      {generating && (
                        <div className="flex items-center gap-1 h-6 px-4 bg-purple-500/5 border border-purple-500/15 rounded-xl">
                          <span className="w-1 bg-purple-400 rounded-full animate-bounce h-3" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }} />
                          <span className="w-1 bg-cyan-400 rounded-full animate-bounce h-5" style={{ animationDelay: '0.3s', animationDuration: '0.5s' }} />
                          <span className="w-1 bg-purple-400 rounded-full animate-bounce h-4" style={{ animationDelay: '0.2s', animationDuration: '0.7s' }} />
                          <span className="w-1 bg-cyan-400 rounded-full animate-bounce h-2" style={{ animationDelay: '0.4s', animationDuration: '0.4s' }} />
                          <span className="text-[10px] font-mono text-purple-400 ml-2">Analisando sinapses...</span>
                        </div>
                      )}
                    </div>

                    {generationError && (
                      <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-200 leading-normal font-mono">{generationError}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="absolute top-0 right-0 w-1/2 h-full bg-purple-500/5 -skew-x-12 transform origin-top translate-x-1/4 pointer-events-none" />
                </section>

                {/* Recommendations List Container */}
                <AnimatePresence mode="wait">
                  {recommendations.length > 0 && (
                    <motion.section
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h3 className="text-lg font-extrabold flex items-center gap-2 font-sans tracking-wide">
                          <Sparkles className="w-5 h-5 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
                          Matches Ativos do Sistema
                        </h3>
                        <span className="text-xs text-purple-400 font-mono tracking-widest uppercase">Calculado em Tempo Real</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <AnimatePresence>
                          {recommendations.map((rec: any, i) => (
                            <motion.div key={rec.name} layout>
                              <GameCard 
                                name={rec.name}
                                appId={rec.appId}
                                reason={rec.reason}
                                match={rec.estimatedMatch}
                                genres={rec.genres}
                                onDiscard={() => handleDiscard(i)}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.section>
                  )}
                </AnimatePresence>

                {/* Recent Steam Activity History */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <section className="lg:col-span-2 space-y-6">
                    <h3 className="text-lg font-extrabold flex items-center gap-2">
                      <History className="w-5 h-5 text-purple-400" />
                      Atividade Recente da Steam
                    </h3>
                    
                    {recentGames.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {recentGames.slice(0, 4).map((game) => (
                          <div 
                            key={game.appid} 
                            onClick={() => handleRecommendSimilar(game.name)}
                            className="group flex items-center gap-4 bg-[#0f0f16]/60 p-4 rounded-2xl border border-white/5 hover:bg-[#0f0f16] hover:border-purple-500/30 transition-all cursor-pointer relative overflow-hidden shadow-md"
                            title="Ver jogos similares"
                          >
                             <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400">
                               <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                             </div>

                             <div className="w-14 h-14 bg-black/30 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-inner border border-white/5">
                              {game.img_icon_url ? (
                                <img src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`} alt={game.name} className="w-full h-full object-cover" />
                              ) : (
                                <Gamepad2 className="w-6 h-6 text-purple-400/40" />
                              )}
                             </div>
                             <div className="flex-1 min-w-0">
                               <h4 className="font-extrabold text-sm sm:text-base truncate text-gray-200 group-hover:text-purple-400 transition-colors">{game.name}</h4>
                               <p className="text-xs text-purple-400 font-mono mt-0.5">
                                 {game.playtime_2weeks ? `${(game.playtime_2weeks / 60).toFixed(1)}h` : '< 1h'} <span className="text-gray-500 font-normal">nas últimas 2 semanas</span>
                               </p>
                             </div>
                             <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-[#0f0f16]/40 border border-white/5 p-8 rounded-3xl flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400/60">
                          <Gamepad2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-300 text-sm">Nenhuma atividade recente</h4>
                          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed font-mono">
                            {isProfilePrivate 
                              ? "Perfil configurado como privado. Ative a publicidade nos detalhes de privacidade da Steam para sincronizar."
                              : "Nenhum histórico de jogo capturado nas duas últimas semanas."}
                          </p>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Equalizer Profile Metrics */}
                  <section className="space-y-6">
                    <h3 className="text-lg font-extrabold flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-cyan-400" />
                      Assinatura de Tempo
                    </h3>
                    <div className="bg-[#0f0f16]/60 p-6 rounded-3xl border border-white/5 space-y-6 shadow-md">
                      <div className="flex justify-between items-center pb-3 border-b border-white/5">
                        <span className="text-gray-400 text-xs uppercase tracking-wider font-mono">Total de Jogos</span>
                        <span className="text-xl font-extrabold text-purple-300 font-mono">{combinedTotalGames}</span>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-mono">Frequência Máxima (Seus Destaques)</p>
                        <div className="space-y-3">
                          {[...manualGames, ...ownedGames]
                            .sort((a, b) => b.playtime_forever - a.playtime_forever)
                            .slice(0, 3)
                            .map((game, idx) => (
                              <div 
                                key={game.appid || game.name + idx} 
                                className="flex justify-between items-center text-xs cursor-pointer group hover:bg-purple-500/5 p-1.5 -mx-1.5 rounded-lg border border-transparent hover:border-purple-500/10 transition-all" 
                                onClick={() => handleRecommendSimilar(game.name)} 
                                title="Ver similares"
                              >
                                <span className="text-gray-300 truncate max-w-[150px] font-medium group-hover:text-purple-400 transition-colors font-mono">{game.name}</span>
                                <span className="text-purple-300 font-mono text-xs">{Math.round(game.playtime_forever / 60)}h</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* STEAM LIBRARY TAB */}
            {activeTab === 'library' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-extrabold">Seu Catálogo ({combinedLibraryGames.length})</h3>
                    <p className="text-xs text-gray-400">Pressione qualquer título para obter recomendações equivalentes baseadas nos parâmetros de rede neural.</p>
                  </div>
                  
                  {/* Search box filters */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text" 
                        value={librarySearchFilter}
                        onChange={(e) => setLibrarySearchFilter(e.target.value)}
                        placeholder="Filtrar biblioteca..."
                        className="bg-[#0f0f16] border border-purple-500/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400 w-full sm:w-48 placeholder-gray-600 font-mono"
                      />
                    </div>
                    
                    <form onSubmit={handleSearchGames} className="flex gap-2">
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Injetar App ID/Título..."
                        className="bg-[#0f0f16] border border-purple-500/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400 flex-1 sm:w-44 placeholder-gray-600 font-mono"
                      />
                      <button 
                        type="submit"
                        disabled={searching || !searchQuery}
                        className="bg-gradient-to-r from-purple-500 to-cyan-400 text-black hover:opacity-90 px-4 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        <span>Buscar</span>
                      </button>
                    </form>
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div className="bg-[#0f0f16]/90 border border-purple-500/20 p-4 rounded-2xl space-y-3 shadow-lg">
                    <h4 className="text-xs font-extrabold text-gray-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                      Resultados Steam Detectados:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {searchResults.map(app => (
                        <div key={app.id} className="flex justify-between items-center bg-[#07070a] p-2 px-3 border border-white/5 rounded-xl">
                          <span className="text-xs truncate mr-2 font-medium font-mono">{app.name}</span>
                          <button 
                            onClick={() => handleAddGame(app)}
                            className="bg-purple-500/15 hover:bg-purple-500 hover:text-black text-purple-300 px-3 py-1 rounded-lg text-xs font-bold transition-all border border-purple-500/20 active:scale-95 cursor-pointer"
                          >
                            Adicionar à Biblioteca
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredLibraryGames.length === 0 ? (
                  <div className="bg-[#0f0f16]/40 border border-white/5 p-12 rounded-3xl text-center max-w-md mx-auto space-y-3">
                    <p className="text-gray-400 text-sm">Nenhum registro encontrado com a filtragem aplicada.</p>
                    {librarySearchFilter && (
                      <button onClick={() => setLibrarySearchFilter('')} className="text-purple-400 font-bold text-xs underline cursor-pointer">Limpar busca</button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredLibraryGames
                      .sort((a, b) => b.playtime_forever - a.playtime_forever)
                      .map(game => (
                        <div 
                          key={game.appid} 
                          className="bg-[#0f0f16]/60 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#0f0f16] hover:border-purple-500/30 transition-all group relative overflow-hidden h-36"
                          onClick={() => handleRecommendSimilar(game.name)}
                          title="Encontrar jogos similares"
                        >
                          {/* Delete Button for manual games */}
                          {game.isManual && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // prevent find similar trigger
                                handleRemoveManualGame(game.appid);
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 rounded-lg transition-all z-10 border border-red-500/20 cursor-pointer"
                              title="Remover Jogo Manual"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {game.isManual ? (
                            <div className="absolute left-2 top-2 px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md text-[8px] font-mono uppercase tracking-wider font-bold">
                              Manual
                            </div>
                          ) : (
                            <div className="absolute right-2 top-2 p-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider font-bold">
                              Sintonizar
                            </div>
                          )}

                          <div className="w-12 h-12 bg-black/30 rounded-xl flex items-center justify-center overflow-hidden mb-2 border border-white/5 shadow-inner mt-2">
                            {game.isManual && game.appid > 0 ? (
                              <img 
                                src={`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appid}/header.jpg`} 
                                alt={game.name} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            ) : game.img_icon_url ? (
                              <img src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`} alt={game.name} className="w-full h-full object-cover" />
                            ) : (
                              <Gamepad2 className="w-6 h-6 text-purple-400/30" />
                            )}
                          </div>
                          <span className="font-extrabold text-gray-200 text-xs sm:text-sm group-hover:text-purple-400 transition-colors truncate max-w-full px-2 font-mono">{game.name}</span>
                          {game.playtime_forever > 0 && (
                             <span className="text-[9px] text-gray-500 mt-1 font-mono">{Math.round(game.playtime_forever / 60)}h registradas</span>
                          )}
                        </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NEW MANUALLY ADDED GAMES TAB */}
            {activeTab === 'manual' && (
              <div className="space-y-8">
                
                {/* Visual Novel style informative header */}
                <div className="bg-[#0f0f16]/90 p-6 rounded-3xl border border-amber-500/10 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 relative overflow-hidden">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 shrink-0 border border-amber-500/20">
                    <Database className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1 text-center sm:text-left flex-1">
                    <h3 className="text-base font-extrabold text-amber-300 flex items-center gap-1.5 justify-center sm:justify-start">
                      Registro de Catálogo Manual
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed font-mono">
                      Aqui você pode injetar jogos que possui fora da Steam (Console, Epic Games, GOG, etc.). Você pode definir horas jogadas e buscar correspondentes na Steam automaticamente para obter a capa do jogo na interface!
                    </p>
                  </div>
                </div>

                {/* Form to manual injection */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Manual Creation Input panel */}
                  <form onSubmit={handleAddManualGameSubmit} className="bg-[#0f0f16]/70 border border-purple-500/10 p-6 rounded-3xl space-y-5 h-fit shadow-md">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Injetar Jogo Manual
                    </h4>

                    {/* Step 1: Search Steam to Auto-resolve Cover */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-extrabold text-purple-300 uppercase tracking-wider font-mono">1. Buscar capa na Steam (Recomendado):</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={manualSearchQuery}
                          onChange={(e) => setManualSearchQuery(e.target.value)}
                          placeholder="Ex: Elden Ring..."
                          className="flex-1 bg-[#07070a] border border-purple-500/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-400 font-mono"
                        />
                        <button 
                          type="button"
                          onClick={handleSearchManualGame}
                          disabled={isSearchingManual || !manualSearchQuery}
                          className="px-3 bg-purple-500/15 hover:bg-purple-500 hover:text-black border border-purple-500/30 text-purple-300 text-xs font-bold rounded-xl transition-all disabled:opacity-40 flex items-center justify-center cursor-pointer"
                        >
                          {isSearchingManual ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Show automated search selections */}
                    <AnimatePresence>
                      {manualSearchResults.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-[#07070a] border border-purple-500/15 p-3 rounded-xl max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin"
                        >
                          <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase border-b border-white/5 pb-1 mb-1">
                            <span>Selecione para Autocompletar:</span>
                            <button type="button" onClick={() => setManualSearchResults([])} className="text-red-400 hover:underline">Fechar</button>
                          </div>
                          {manualSearchResults.slice(0, 5).map(app => (
                            <div 
                              key={app.id} 
                              onClick={() => handleSelectManualSearchResult(app)}
                              className="text-xs py-1 px-2 hover:bg-purple-500/10 rounded text-gray-300 hover:text-purple-300 cursor-pointer font-mono truncate"
                            >
                              {app.name} <span className="text-[9px] text-gray-500">(ID: {app.id})</span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="border-t border-white/5 pt-4 space-y-4">
                      {/* Name input */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider font-mono">Nome do Jogo (Obrigatório):</label>
                        <input 
                          type="text" 
                          required
                          value={manualGameName}
                          onChange={(e) => setManualGameName(e.target.value)}
                          placeholder="Ex: Minecraft..."
                          className="w-full bg-[#07070a] border border-purple-500/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-400 font-mono font-bold"
                        />
                        {manualAppId && (
                          <p className="text-[9px] font-mono text-cyan-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                            Capa e ID {manualAppId} vinculados com sucesso!
                          </p>
                        )}
                      </div>

                      {/* Hours input */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider font-mono">Horas Jogadas (Opcional):</label>
                        <input 
                          type="number" 
                          min="0"
                          step="0.5"
                          value={manualGameHours}
                          onChange={(e) => setManualGameHours(e.target.value)}
                          placeholder="Ex: 120.5..."
                          className="w-full bg-[#07070a] border border-purple-500/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-400 font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!manualGameName}
                      className="w-full bg-gradient-to-r from-amber-500 to-purple-500 text-black py-3 rounded-xl font-extrabold text-xs tracking-wider uppercase disabled:opacity-40 active:scale-95 transition-all shadow-md hover:opacity-95 shadow-amber-500/10 cursor-pointer"
                    >
                      Injetar no Banco de Dados
                    </button>
                  </form>

                  {/* Manual List Output */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <h4 className="text-sm font-extrabold font-sans">Seus Jogos Cadastrados ({manualGames.length})</h4>
                      <p className="text-[10px] text-gray-500 font-mono">Registros duráveis em cache local</p>
                    </div>

                    {manualGames.length === 0 ? (
                      <div className="bg-[#0f0f16]/40 border border-white/5 p-12 rounded-3xl text-center space-y-3">
                        <Database className="w-8 h-8 text-purple-500/40 mx-auto" />
                        <div>
                          <p className="text-gray-400 text-xs">Nenhum jogo inserido manualmente ainda.</p>
                          <p className="text-[10px] text-gray-600 mt-1 max-w-sm mx-auto font-mono">Injete acima para enriquecer suas diretrizes de IA caso sua conta Steam esteja oculta ou incompleta!</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                          {manualGames.map((game) => (
                            <motion.div key={game.appid || game.name} layout>
                              <GameCard 
                                name={game.name}
                                appId={game.appid > 0 ? game.appid : undefined}
                                playtime={game.playtime_forever}
                                isManual={true}
                                onEditPlaytime={(mins) => handleEditManualPlaytime(game.appid, mins)}
                                onRemoveManual={() => handleRemoveManualGame(game.appid)}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* DISCARDED TAB */}
            {activeTab === 'discarded' && (
              <div className="space-y-6">
                <div className="space-y-1 border-b border-white/5 pb-4">
                  <h3 className="text-lg font-extrabold flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-400" />
                    Sinapses Descartadas
                  </h3>
                  <p className="text-xs text-gray-400">Jogos que você retirou das recomendações ativas. Pressione o botão circular de restauração para reinseri-los no pipeline de afinidade.</p>
                </div>
                
                {discardedRecommendations.length === 0 ? (
                  <div className="bg-[#0f0f16]/40 border border-white/5 p-12 rounded-3xl text-center max-w-md mx-auto">
                    <p className="text-gray-400 text-sm">Nenhum registro descartado sob o cache ativo.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <AnimatePresence>
                      {discardedRecommendations.map((rec: any, i) => (
                        <motion.div key={rec.name} layout>
                          <GameCard 
                            name={rec.name}
                            appId={rec.appId}
                            reason={rec.reason}
                            match={rec.estimatedMatch}
                            genres={rec.genres}
                            onDiscard={() => handleRestore(i)}
                            discardIcon={<History className="w-3.5 h-3.5 text-cyan-400" />}
                            discardLabel="Restaurar recomendação"
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </main>
    </div>
  );
}
