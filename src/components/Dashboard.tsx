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
  Database,
  Award,
  Shield,
  Zap,
  Target,
  Coffee
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

  // Dynamic Gamer Archetype calculations based on genres of their games library (both steam and manually added)
  const getGamerArchetype = () => {
    const allGames = [...ownedGames, ...manualGames];
    if (allGames.length === 0) {
      return {
        title: "Pioneiro da Fronteira",
        description: "Seu link neural está dormente por enquanto. Adicione alguns jogos ou conecte seu perfil Steam para revelar sua verdadeira assinatura cibernética!",
        metrics: { focus: 25, tactic: 25, explore: 25, cozy: 25 },
        colorClass: "from-blue-600 via-purple-600 to-amber-500",
        accentText: "text-purple-400"
      };
    }

    // Keyword mapping to detect core elements
    let rpgFocus = 0;
    let strategyTactics = 0;
    let actionAdventure = 0;
    let cozyCasual = 0;

    allGames.forEach(game => {
      const name = game.name.toLowerCase();
      const weight = Math.max(1, Math.log10(game.playtime_forever / 60 || 1) * 2.2);

      if (name.includes("elden") || name.includes("ring") || name.includes("souls") || name.includes("witcher") || name.includes("scrolls") || name.includes("skyrim") || name.includes("fantasy") || name.includes("cyberpunk") || name.includes("rpg") || name.includes("dragon") || name.includes("monster") || name.includes("persona") || name.includes("fallout") || name.includes("baldurs") || name.includes("gate") || name.includes("final") || name.includes("diablo")) {
        rpgFocus += 10 * weight;
      }
      if (name.includes("civilization") || name.includes("total war") || name.includes("crusader") || name.includes("hearts of") || name.includes("age of") || name.includes("starcraft") || name.includes("dota") || name.includes("league") || name.includes("tactics") || name.includes("chess") || name.includes("manager") || name.includes("sim") || name.includes("tycoon") || name.includes("factorio") || name.includes("cities") || name.includes("rimworld")) {
        strategyTactics += 10 * weight;
      }
      if (name.includes("counter") || name.includes("strike") || name.includes("cs:") || name.includes("call of") || name.includes("duty") || name.includes("halo") || name.includes("doom") || name.includes("borderlands") || name.includes("grand theft") || name.includes("gta") || name.includes("resident") || name.includes("evil") || name.includes("dead") || name.includes("hades") || name.includes("dead cells") || name.includes("cyber") || name.includes("combat") || name.includes("battlefield") || name.includes("apex") || name.includes("fortnite")) {
        actionAdventure += 10 * weight;
      }
      if (name.includes("stardew") || name.includes("valley") || name.includes("animal") || name.includes("crossing") || name.includes("minecraft") || name.includes("terrar") || name.includes("cozy") || name.includes("sims") || name.includes("lego") || name.includes("overcooked") || name.includes("fall guys") || name.includes("subnautica") || name.includes("portal") || name.includes("slay the spire") || name.includes("farm") || name.includes("harvest") || name.includes("slime")) {
        cozyCasual += 10 * weight;
      }
    });

    const totalPoints = rpgFocus + strategyTactics + actionAdventure + cozyCasual;
    
    let rPct = 25, sPct = 25, aPct = 25, cPct = 25;
    if (totalPoints > 0) {
      rPct = Math.round((rpgFocus / totalPoints) * 100);
      sPct = Math.round((strategyTactics / totalPoints) * 100);
      aPct = Math.round((actionAdventure / totalPoints) * 100);
      cPct = Math.round((cozyCasual / totalPoints) * 100);
    }

    const maxVal = Math.max(rPct, sPct, aPct, cPct);

    if (maxVal === rPct) {
      return {
        title: "Conquistador de Mundos (RPG)",
        description: "Você respira fantasia e narrativas imersivas. Suas escolhas moldam heróis e reinos, otimizando builds ultra complexas em mundos fascinantes.",
        metrics: { focus: rPct, tactic: sPct, explore: aPct, cozy: cPct },
        colorClass: "from-amber-500 via-purple-600 to-blue-500",
        accentText: "text-amber-400"
      };
    } else if (maxVal === sPct) {
      return {
        title: "Estrategista de Elite",
        description: "Decisões calculadas, logística infalível e mentes frias. Seja erguendo impérios ou otimizando fábricas de automação, sua maior arma é o intelecto.",
        metrics: { focus: rPct, tactic: sPct, explore: aPct, cozy: cPct },
        colorClass: "from-blue-500 via-indigo-600 to-purple-500",
        accentText: "text-blue-400"
      };
    } else if (maxVal === aPct) {
      return {
        title: "Predador do Caos (Ação & Reflexos)",
        description: "Velocidade pura, adrenalina constante e precisão absoluta. Você brilha em combates ágeis, tiroteios viscerais e na maestria de reflexos.",
        metrics: { focus: rPct, tactic: sPct, explore: aPct, cozy: cPct },
        colorClass: "from-purple-600 via-fuchsia-500 to-amber-500",
        accentText: "text-purple-400"
      };
    } else {
      return {
        title: "Arquiteto do Zen (Cozy Explorer)",
        description: "Seu foco é relaxar, progredir sem pressão e expressar sua criatividade. Mundos aconchegantes e tarefas ritmadas são sua verdadeira terapia.",
        metrics: { focus: rPct, tactic: sPct, explore: aPct, cozy: cPct },
        colorClass: "from-yellow-400 via-amber-500 to-purple-600",
        accentText: "text-yellow-400"
      };
    }
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
      <div className="min-h-screen bg-[#14100e] flex flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <Coffee className="w-6 h-6 text-amber-400 absolute animate-bounce" />
        </div>
        <p className="text-amber-300 font-mono text-xs tracking-widest uppercase animate-pulse">Passando o café e organizando sua estante... ☕✨</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#14100e] text-[#f4efe9] font-sans pb-16 relative">
      {/* Structural ambient styling grids */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.02),transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-gradient-to-br from-amber-600/5 via-orange-500/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-gradient-to-tr from-orange-600/5 via-yellow-500/5 to-transparent rounded-full blur-[120px] pointer-events-none" />

      {/* Main Header */}
      <header className="border-b border-amber-500/10 bg-[#201815]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base tracking-widest uppercase bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-300 bg-clip-text text-transparent font-serif">
                Steam Synapse
              </h1>
              <p className="text-[9px] font-mono text-amber-400/80 -mt-0.5 tracking-widest uppercase">Seu Canto de Curadoria ☕</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User Profile */}
            <div className="flex items-center gap-3 bg-[#201815]/60 border border-amber-500/15 px-3.5 py-1.5 rounded-full">
              {user.photos && user.photos[0] ? (
                <img src={user.photos[0].value} alt={user.displayName} className="w-6 h-6 rounded-full border border-amber-500/30" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                </div>
              )}
              <span className="text-xs font-bold text-[#e1dbd2] hidden sm:inline">{user.displayName}</span>
            </div>

            {/* Config & Logout Buttons */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${showSettings ? 'bg-amber-600/20 border-amber-400 text-amber-300' : 'bg-[#201815] border-amber-500/10 text-gray-400 hover:text-amber-400'}`}
                title="Configurações de API"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              <button 
                onClick={handleLogout}
                className="p-2 rounded-xl bg-[#201815] border border-red-500/15 text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
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
              className="bg-[#201815]/95 border border-amber-500/20 rounded-3xl p-6 shadow-xl space-y-4 overflow-hidden"
            >
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-200">Ajustes de Chave de API</h3>
              </div>
              
              <div className="max-w-xl space-y-3">
                <p className="text-xs text-amber-100/60 leading-relaxed">
                  Por padrão, utilizamos uma chave corporativa do Gemini. Se preferir rodar sob sua própria cota ou encontrar limites de requisição, você pode inserir sua chave pessoal do Google Gemini abaixo. Ela é salva estritamente no seu navegador.
                </p>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    value={customApiKey}
                    onChange={(e) => handleSaveApiKey(e.target.value)}
                    placeholder="Chave de API do Gemini..."
                    className="flex-1 bg-[#14100e] border border-amber-500/15 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono"
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

        {/* Modern Intro / Value Proposition Hero Banner */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#201815]/95 via-[#14100e]/95 to-[#14100e]/95 border border-amber-500/15 rounded-[32px] p-6 sm:p-8 shadow-2xl">
          {/* Neon background decorations */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-600/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-orange-600/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.02),transparent_50%)] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12">
            <div className="space-y-4 max-w-3xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/20 rounded-full text-xs font-bold font-mono text-amber-300 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Curadoria Acolhedora via IA
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight font-serif">
                Sua biblioteca sintonizada no <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent italic">ritmo mais aconchegante</span>
              </h2>
              <p className="text-xs sm:text-sm text-amber-100/75 leading-relaxed">
                O <strong className="text-amber-300">Steam Synapse</strong> analisa gentilmente sua biblioteca de jogos e tempos de jogatina para traçar seu perfil de afinidade. Se sua conta Steam for privada ou se joga em outros consoles, adicione seus títulos preferidos manualmente para alimentar nosso motor inteligente. Ajuste os filtros e projete recomendações customizadas instantaneamente.
              </p>
              
              {/* Quick Pillars Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left font-sans">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">Curadoria Leve</h5>
                    <p className="text-[10px] text-amber-100/50">Chega de perder horas escolhendo o que jogar na biblioteca.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20 text-orange-400 shrink-0 mt-0.5">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">Afinidade Genuína</h5>
                    <p className="text-[10px] text-amber-100/50">Sugestões baseadas nas mecânicas e estilos que você mais ama.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">Qualquer Plataforma</h5>
                    <p className="text-[10px] text-amber-100/50">Adicione jogos do seu Switch, PlayStation, Xbox ou PC facilmente.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cozy tea kettle visualizer */}
            <div className="relative shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center group pointer-events-none hidden md:flex">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-500 rounded-full blur opacity-30 group-hover:opacity-50 transition duration-500 animate-pulse" />
              <div className="relative w-28 h-28 md:w-36 md:h-36 bg-[#201815]/90 rounded-full border border-amber-500/20 flex flex-col items-center justify-center text-center p-4 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.02)_1px,transparent_1px)] bg-[size:100%_4px]" />
                <Coffee className="w-8 h-8 text-amber-400 animate-bounce" style={{ animationDuration: '3s' }} />
                <span className="text-[9px] font-mono text-amber-300 mt-2 uppercase tracking-widest font-bold">BULI QUENTE ☕</span>
                <span className="text-[8px] font-mono text-amber-200/50 mt-0.5 uppercase">Model: Gemini</span>
              </div>
            </div>
          </div>
        </section>

        {/* Private Warning Banner */}
        {isProfilePrivate && (
          <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
            <div className="flex gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-300">Sua conta Steam parece Privada ou sem jogos disponíveis</h4>
                <p className="text-xs text-amber-200/80 leading-relaxed mt-0.5">
                  Não conseguimos importar seus jogos automaticamente. Torne seus "Detalhes dos Jogos" públicos na Steam ou <span className="font-bold underline text-amber-300">adicione jogos manualmente</span> na nova aba de registros para alimentar o sistema de IA!
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
        <div className="flex border-b border-amber-500/10 overflow-x-auto pb-px gap-2 scrollbar-none">
          <button 
            onClick={() => setActiveTab('recommendations')}
            className={`relative py-3.5 px-5 text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'recommendations' ? 'text-amber-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <span className="relative z-10 flex items-center gap-2 font-sans font-extrabold">
              <Compass className="w-4 h-4 text-amber-500" />
              Recomendações
            </span>
            {activeTab === 'recommendations' && (
              <motion.div 
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500"
              />
            )}
          </button>
 
          <button 
            onClick={() => setActiveTab('library')}
            className={`relative py-3.5 px-5 text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'library' ? 'text-orange-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <span className="relative z-10 flex items-center gap-2 font-sans font-extrabold">
              <Layers className="w-4 h-4 text-orange-400" />
              Biblioteca Steam ({ownedGames.length})
            </span>
            {activeTab === 'library' && (
              <motion.div 
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500"
              />
            )}
          </button>
 
          {/* New Custom Tab for Manually Added Games */}
          <button 
            onClick={() => setActiveTab('manual')}
            className={`relative py-3.5 px-5 text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'manual' ? 'text-yellow-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <span className="relative z-10 flex items-center gap-2 font-sans font-extrabold">
              <Database className="w-4 h-4 text-yellow-400" />
              Adicionados Manuais ({manualGames.length})
            </span>
            {activeTab === 'manual' && (
              <motion.div 
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-400"
              />
            )}
          </button>
 
          <button 
            onClick={() => setActiveTab('discarded')}
            className={`relative py-3.5 px-5 text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'discarded' ? 'text-amber-500' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <span className="relative z-10 flex items-center gap-2 font-sans font-extrabold">
              <History className="w-4 h-4 text-amber-500" />
              Descartados ({discardedRecommendations.length})
            </span>
            {activeTab === 'discarded' && (
              <motion.div 
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-500"
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
                <div className="bg-[#201815]/90 backdrop-blur-xl p-6 rounded-3xl border border-amber-500/10 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
                  
                  {/* Cozy fireplace / candle glow */}
                  <div className="relative group shrink-0">
                    <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 rounded-full blur opacity-50 group-hover:opacity-70 transition duration-300 animate-pulse" />
                    <div className="relative w-20 h-20 bg-[#14100e] rounded-full overflow-hidden border border-amber-500/20 flex items-center justify-center">
                      <Coffee className="w-9 h-9 text-amber-400 animate-bounce" style={{ animationDuration: '3s' }} />
                    </div>
                    <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-[8px] font-bold text-white rounded-full uppercase border border-amber-400/20 shadow-md font-mono">
                      CANTO ☕
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <div className="space-y-1">
                      <div className="flex flex-col sm:flex-row items-center gap-2 justify-center md:justify-start">
                        <span className="font-extrabold text-lg text-amber-300 uppercase tracking-wider font-serif">Curador de Jogos Synapse</span>
                        <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/25 rounded-md text-[9px] font-mono text-amber-300 uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Espírito Cozy Ativo ✨
                        </div>
                      </div>
                      
                      {/* Dynamic Core messages */}
                      <p className="text-sm font-medium text-amber-100/90 leading-relaxed font-mono">
                        "{getCoreMessage()}"
                      </p>
                    </div>

                    {/* Quick core metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div className="bg-[#14100e]/80 p-2.5 rounded-2xl border border-white/5">
                        <span className="text-[9px] text-amber-200/40 block uppercase font-mono tracking-wider">Tempo Dedicado</span>
                        <span className="text-xs font-bold text-amber-300 font-mono">{totalPlaytimeHours}h jogadas</span>
                      </div>
                      <div className="bg-[#14100e]/80 p-2.5 rounded-2xl border border-white/5">
                        <span className="text-[9px] text-amber-200/40 block uppercase font-mono tracking-wider">Jogatina Recente</span>
                        <span className="text-xs font-bold text-orange-400 font-mono">{recentPlaytimeHours}h / 2sem</span>
                      </div>
                      <div className="bg-[#14100e]/80 p-2.5 rounded-2xl border border-white/5">
                        <span className="text-[9px] text-amber-200/40 block uppercase font-mono tracking-wider">Biblioteca Steam</span>
                        <span className="text-xs font-bold text-[#e1dbd2] font-mono">{ownedGames.length} Jogos</span>
                      </div>
                      <div className="bg-[#14100e]/80 p-2.5 rounded-2xl border border-white/5">
                        <span className="text-[9px] text-amber-200/40 block uppercase font-mono tracking-wider">Registros Manuais</span>
                        <span className="text-xs font-bold text-yellow-400 font-mono">{manualGames.length} Jogos</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cozy Clima calibrator */}
                <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#201815] to-[#14100e] border border-amber-500/15 p-8 sm:p-10 shadow-2xl">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.03),transparent_70%)] pointer-events-none" />
                  
                  <div className="relative z-10 max-w-2xl space-y-6">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full text-xs font-bold font-mono uppercase tracking-wider">
                        <Volume2 className="w-3.5 h-3.5" />
                        Ajuste de Clima 🕯️
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#f4efe9] font-serif">O que vamos sintonizar hoje?</h2>
                      <p className="text-xs sm:text-sm text-amber-100/70 leading-relaxed">
                        Ajuste as preferências abaixo para direcionar nosso curador. O mecanismo analisará seus jogos favoritos juntamente com essas diretrizes para sugerir experiências impecáveis.
                      </p>
                    </div>
                    
                    <div className="space-y-4 bg-[#14100e]/80 p-5 rounded-2xl border border-white/5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2 font-sans">
                          <label className="block text-xs font-bold text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            Mais disso (Gêneros, mecânicas ou estéticas que quer ver):
                          </label>
                          <input 
                            type="text" 
                            placeholder="Ex: RPG de Turno, Metroidvania, Rogue-lite"
                            value={prefsMoreOf}
                            onChange={(e) => setPrefsMoreOf(e.target.value)}
                            className="w-full bg-[#1c1614] border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 transition-all font-mono font-medium"
                          />
                          <p className="text-[10px] text-amber-100/40 leading-normal">Injete gêneros, modos ou estéticas para ver com mais destaque.</p>
                        </div>
                        <div className="space-y-2 font-sans">
                          <label className="block text-xs font-bold text-orange-300 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
                            Menos disso (Estilos ou mecânicas que prefere evitar):
                          </label>
                          <input 
                            type="text" 
                            placeholder="Ex: FPS frenético, Esporte, Pay-to-win"
                            value={prefsLessOf}
                            onChange={(e) => setPrefsLessOf(e.target.value)}
                            className="w-full bg-[#1c1614] border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 transition-all font-mono font-medium"
                          />
                          <p className="text-[10px] text-amber-100/40 leading-normal">Oclua modos competitivos estressantes ou estilos que você não queira ver agora.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <button
                        onClick={generateRecommendations}
                        disabled={generating || (combinedTotalGames === 0 && !prefsMoreOf)}
                        className="flex items-center gap-2.5 bg-gradient-to-r from-amber-500 via-orange-600 to-yellow-500 hover:opacity-95 text-white font-black py-3.5 px-8 rounded-xl transition-all disabled:opacity-40 active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Preparando o café com jogos...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-white animate-pulse" />
                            <span>Sintonizar Recomendações! ☕</span>
                          </>
                        )}
                      </button>

                      {generating && (
                        <div className="flex items-center gap-1 h-6 px-4 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                          <span className="w-1 bg-amber-400 rounded-full animate-bounce h-3" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }} />
                          <span className="w-1 bg-orange-400 rounded-full animate-bounce h-5" style={{ animationDelay: '0.3s', animationDuration: '0.5s' }} />
                          <span className="w-1 bg-yellow-400 rounded-full animate-bounce h-4" style={{ animationDelay: '0.2s', animationDuration: '0.7s' }} />
                          <span className="w-1 bg-amber-300 rounded-full animate-bounce h-2" style={{ animationDelay: '0.4s', animationDuration: '0.4s' }} />
                          <span className="text-[10px] font-mono text-amber-400 ml-2">Moendo grãos de ideias...</span>
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
                  
                  <div className="absolute top-0 right-0 w-1/2 h-full bg-amber-500/5 -skew-x-12 transform origin-top translate-x-1/4 pointer-events-none" />
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
                        <h3 className="text-lg font-bold flex items-center gap-2 font-serif tracking-wide text-amber-200">
                          <Sparkles className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                          Sua Seleção de Jogos Customizada
                        </h3>
                        <span className="text-xs text-amber-400/60 font-mono tracking-widest uppercase">Parceria com a IA</span>
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
                    <h3 className="text-lg font-bold flex items-center gap-2 font-serif text-amber-200">
                      <History className="w-5 h-5 text-amber-400" />
                      Atividade Recente da Steam
                    </h3>
                    
                    {recentGames.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {recentGames.slice(0, 4).map((game) => (
                          <div 
                            key={game.appid} 
                            onClick={() => handleRecommendSimilar(game.name)}
                            className="group flex items-center gap-4 bg-[#201815]/60 p-4 rounded-2xl border border-amber-500/10 hover:bg-[#201815] hover:border-amber-500/30 transition-all cursor-pointer relative overflow-hidden shadow-md"
                            title="Ver jogos similares"
                          >
                             <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400">
                               <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                             </div>

                             <div className="w-14 h-14 bg-black/30 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-inner border border-white/5">
                              {game.img_icon_url ? (
                                <img src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`} alt={game.name} className="w-full h-full object-cover" />
                               ) : (
                                 <Gamepad2 className="w-6 h-6 text-amber-500/40" />
                              )}
                             </div>
                             <div className="flex-1 min-w-0">
                               <h4 className="font-bold text-sm sm:text-base truncate text-gray-200 group-hover:text-amber-400 transition-colors font-serif">{game.name}</h4>
                               <p className="text-xs text-amber-400 font-mono mt-0.5">
                                 {game.playtime_2weeks ? `${(game.playtime_2weeks / 60).toFixed(1)}h` : '< 1h'} <span className="text-amber-100/50 font-normal">nas últimas 2 semanas</span>
                               </p>
                             </div>
                             <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-[#201815]/40 border border-amber-500/10 p-8 rounded-3xl flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-400/60">
                          <Gamepad2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-amber-200 text-sm font-serif">Nenhuma atividade recente</h4>
                          <p className="text-xs text-amber-100/50 mt-1 max-w-sm mx-auto leading-relaxed font-mono">
                            {isProfilePrivate 
                              ? "Perfil configurado como privado. Ative a publicidade nos detalhes de privacidade da Steam para sincronizar."
                              : "Nenhum histórico de jogo capturado nas duas últimas semanas."}
                          </p>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Profile Metrics and AI Gamer Archetype */}
                  <section className="space-y-6">
                    {/* Dynamic Archetype Analysis Card */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold flex items-center gap-2 font-serif text-amber-200">
                        <Award className="w-5 h-5 text-amber-400 animate-pulse" />
                        Arquétipo de Jogador
                      </h3>
                      
                      {(() => {
                        const archetype = getGamerArchetype();
                        return (
                          <div className="bg-gradient-to-b from-[#201815] to-[#14100e] p-6 rounded-3xl border border-amber-500/10 shadow-xl relative overflow-hidden group">
                            {/* Accent lighting glow */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/5 via-amber-600/5 to-transparent rounded-bl-full pointer-events-none" />
                            
                            <div className="space-y-4 relative z-10">
                              <div className="space-y-1">
                                <span className="text-[10px] font-extrabold font-mono text-amber-400 uppercase tracking-widest block font-serif">Análise de Gosto</span>
                                <h4 className={`text-base font-black tracking-wide uppercase ${archetype.accentText}`}>
                                  {archetype.title}
                                </h4>
                                <p className="text-xs text-amber-100/70 leading-relaxed font-mono">
                                  {archetype.description}
                                </p>
                              </div>

                              {/* Progress Stats */}
                              <div className="space-y-2.5 pt-2 border-t border-white/5">
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-amber-300 font-bold">Foco Narrativo (RPG)</span>
                                    <span className="text-gray-400">{archetype.metrics.focus}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${archetype.metrics.focus}%` }}
                                      transition={{ duration: 1, ease: "easeOut" }}
                                      className="h-full bg-amber-500 rounded-full" 
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-orange-300 font-bold">Estratégia e Tática</span>
                                    <span className="text-gray-400">{archetype.metrics.tactic}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${archetype.metrics.tactic}%` }}
                                      transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                                      className="h-full bg-orange-500 rounded-full" 
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-[#f59e0b] font-bold">Desafio & Ação</span>
                                    <span className="text-gray-400">{archetype.metrics.explore}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${archetype.metrics.explore}%` }}
                                      transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                                      className="h-full bg-amber-500 rounded-full" 
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-yellow-400 font-bold">Exploração / Cozy</span>
                                    <span className="text-gray-400">{archetype.metrics.cozy}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${archetype.metrics.cozy}%` }}
                                      transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                                      className="h-full bg-yellow-500 rounded-full" 
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Time Signature list */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold flex items-center gap-2 font-serif text-amber-200">
                        <History className="w-5 h-5 text-amber-400" />
                        Assinatura de Tempo
                      </h3>
                      <div className="bg-[#201815]/60 p-6 rounded-3xl border border-amber-500/10 space-y-6 shadow-md">
                        <div className="flex justify-between items-center pb-3 border-b border-white/5">
                          <span className="text-amber-100/40 text-xs uppercase tracking-wider font-mono">Total de Jogos</span>
                          <span className="text-xl font-extrabold text-amber-400 font-mono">{combinedTotalGames}</span>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider font-mono">Frequência Máxima (Seus Destaques)</p>
                          <div className="space-y-3">
                            {[...manualGames, ...ownedGames]
                              .sort((a, b) => b.playtime_forever - a.playtime_forever)
                              .slice(0, 4)
                              .map((game, idx) => (
                                <div 
                                  key={game.appid || game.name + idx} 
                                  className="flex justify-between items-center text-xs cursor-pointer group hover:bg-amber-500/5 p-1.5 -mx-1.5 rounded-lg border border-transparent hover:border-amber-500/10 transition-all" 
                                  onClick={() => handleRecommendSimilar(game.name)} 
                                  title="Ver similares"
                                >
                                  <span className="text-gray-300 truncate max-w-[150px] font-medium group-hover:text-amber-400 transition-colors font-mono">{game.name}</span>
                                  <span className="text-amber-400 font-mono text-xs font-bold">{Math.round(game.playtime_forever / 60)}h</span>
                                </div>
                              ))}
                          </div>
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
                    <h3 className="text-lg font-bold font-serif text-amber-200">Seu Catálogo ({combinedLibraryGames.length})</h3>
                    <p className="text-xs text-amber-100/60 font-mono">Pressione qualquer título para obter recomendações equivalentes baseadas nos seus parâmetros de gosto e clima.</p>
                  </div>
                  
                  {/* Search box filters */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/40" />
                      <input 
                        type="text" 
                        value={librarySearchFilter}
                        onChange={(e) => setLibrarySearchFilter(e.target.value)}
                        placeholder="Filtrar biblioteca..."
                        className="bg-[#201815] border border-amber-500/20 rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#f4efe9] focus:outline-none focus:border-amber-400 w-full sm:w-48 placeholder-amber-100/30 font-mono"
                      />
                    </div>
                    
                    <form onSubmit={handleSearchGames} className="flex gap-2">
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Injetar App ID/Título..."
                        className="bg-[#201815] border border-amber-500/20 rounded-xl px-3 py-1.5 text-xs text-[#f4efe9] focus:outline-none focus:border-amber-400 flex-1 sm:w-44 placeholder-amber-100/30 font-mono"
                      />
                      <button 
                        type="submit"
                        disabled={searching || !searchQuery}
                        className="bg-amber-600 text-white hover:bg-amber-700 active:scale-95 px-4 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
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
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      Resultados Steam Detectados:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {searchResults.map(app => (
                        <div key={app.id} className="flex justify-between items-center bg-[#07070a] p-2 px-3 border border-white/5 rounded-xl">
                          <span className="text-xs truncate mr-2 font-medium font-mono">{app.name}</span>
                          <button 
                            onClick={() => handleAddGame(app)}
                            className="bg-amber-500/15 hover:bg-amber-500 hover:text-black text-amber-300 px-3 py-1 rounded-lg text-xs font-bold transition-all border border-amber-500/20 active:scale-95 cursor-pointer"
                          >
                            Adicionar à Biblioteca
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredLibraryGames.length === 0 ? (
                  <div className="bg-[#201815]/40 border border-amber-500/10 p-12 rounded-3xl text-center max-w-md mx-auto space-y-3">
                    <p className="text-amber-100/60 text-sm">Nenhum registro encontrado com a filtragem aplicada.</p>
                    {librarySearchFilter && (
                      <button onClick={() => setLibrarySearchFilter('')} className="text-amber-400 font-bold text-xs underline cursor-pointer">Limpar busca</button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredLibraryGames
                      .sort((a, b) => b.playtime_forever - a.playtime_forever)
                      .map(game => (
                        <div 
                          key={game.appid} 
                          className="bg-[#201815]/60 border border-amber-500/10 p-4 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#201815] hover:border-amber-500/30 transition-all group relative overflow-hidden h-36"
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
                            <div className="absolute right-2 top-2 p-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-md text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider font-bold">
                              Sintonizar
                            </div>
                          )}

                          <div className="w-12 h-12 bg-black/30 rounded-xl flex items-center justify-center overflow-hidden mb-2 border border-amber-500/10 shadow-inner mt-2">
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
                              <Gamepad2 className="w-6 h-6 text-amber-500/30" />
                            )}
                          </div>
                          <span className="font-bold text-[#f4efe9] text-xs sm:text-sm group-hover:text-amber-400 transition-colors truncate max-w-full px-2 font-serif">{game.name}</span>
                          {game.playtime_forever > 0 && (
                             <span className="text-[9px] text-amber-200/50 mt-1 font-mono">{Math.round(game.playtime_forever / 60)}h registradas</span>
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
                  <form onSubmit={handleAddManualGameSubmit} className="bg-[#201815]/70 border border-amber-500/10 p-6 rounded-3xl space-y-5 h-fit shadow-md">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest font-serif flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Injetar Jogo Manual
                    </h4>

                    {/* Step 1: Search Steam to Auto-resolve Cover */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-extrabold text-amber-300 uppercase tracking-widest font-mono">1. Buscar capa na Steam (Recomendado):</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={manualSearchQuery}
                          onChange={(e) => setManualSearchQuery(e.target.value)}
                          placeholder="Ex: Elden Ring..."
                          className="flex-1 bg-[#14100e] border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-white placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 font-mono transition-all"
                        />
                        <button 
                          type="button"
                          onClick={handleSearchManualGame}
                          disabled={isSearchingManual || !manualSearchQuery}
                          className="px-4 bg-amber-500/10 hover:bg-amber-500 hover:text-black border border-amber-500/30 text-amber-300 text-xs font-bold rounded-xl transition-all disabled:opacity-40 flex items-center justify-center cursor-pointer"
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
                          className="bg-[#07070a] border border-amber-500/15 p-3 rounded-xl max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin"
                        >
                          <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase border-b border-white/5 pb-1 mb-1">
                            <span>Selecione para Autocompletar:</span>
                            <button type="button" onClick={() => setManualSearchResults([])} className="text-red-400 hover:underline">Fechar</button>
                          </div>
                          {manualSearchResults.slice(0, 5).map(app => (
                            <div 
                              key={app.id} 
                              onClick={() => handleSelectManualSearchResult(app)}
                              className="text-xs py-1 px-2 hover:bg-amber-500/10 rounded text-gray-300 hover:text-amber-300 cursor-pointer font-mono truncate"
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
                        <label className="block text-[10px] font-bold text-amber-200 uppercase tracking-widest font-mono">Nome do Jogo (Obrigatório):</label>
                        <input 
                          type="text" 
                          required
                          value={manualGameName}
                          onChange={(e) => setManualGameName(e.target.value)}
                          placeholder="Ex: Minecraft..."
                          className="w-full bg-[#14100e] border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-[#f4efe9] placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 font-mono font-bold transition-all"
                        />
                        {manualAppId && (
                          <p className="text-[9px] font-mono text-amber-400 flex items-center gap-1 mt-1 font-serif">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            Capa e ID {manualAppId} vinculados com sucesso!
                          </p>
                        )}
                      </div>

                      {/* Hours input */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-amber-200 uppercase tracking-widest font-mono">Horas Jogadas (Opcional):</label>
                        <input 
                          type="number" 
                          min="0"
                          step="0.5"
                          value={manualGameHours}
                          onChange={(e) => setManualGameHours(e.target.value)}
                          placeholder="Ex: 120.5..."
                          className="w-full bg-[#14100e] border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-[#f4efe9] placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 font-mono transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!manualGameName}
                      className="w-full bg-amber-600 text-[#f4efe9] py-3 rounded-xl font-bold text-xs tracking-wider uppercase disabled:opacity-40 active:scale-95 transition-all shadow-md hover:bg-amber-700 cursor-pointer"
                    >
                      Injetar no Catálogo
                    </button>
                  </form>

                  {/* Manual List Output */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <h4 className="text-sm font-bold font-serif text-amber-200">Seus Jogos Cadastrados ({manualGames.length})</h4>
                      <p className="text-[10px] text-amber-100/40 font-mono">Registros duráveis em cache local</p>
                    </div>

                    {manualGames.length === 0 ? (
                      <div className="bg-[#201815]/40 border border-amber-500/10 p-12 rounded-3xl text-center space-y-3">
                        <Database className="w-8 h-8 text-amber-500/40 mx-auto" />
                        <div>
                          <p className="text-amber-100/60 text-xs">Nenhum jogo inserido manualmente ainda.</p>
                          <p className="text-[10px] text-amber-100/30 mt-1 max-w-sm mx-auto font-mono">Injete acima para enriquecer suas diretrizes de IA caso sua conta Steam esteja oculta ou incompleta!</p>
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
                  <h3 className="text-lg font-bold flex items-center gap-2 font-serif text-amber-200">
                    <History className="w-5 h-5 text-amber-400" />
                    Recomendações Ocultadas
                  </h3>
                  <p className="text-xs text-amber-100/60 font-mono">Jogos que você retirou das recomendações ativas. Pressione o botão circular de restauração para reinseri-los nas recomendações futuras.</p>
                </div>
                
                {discardedRecommendations.length === 0 ? (
                  <div className="bg-[#201815]/40 border border-amber-500/10 p-12 rounded-3xl text-center max-w-md mx-auto">
                    <p className="text-amber-100/60 text-sm">Nenhum registro descartado sob o cache ativo.</p>
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
                            discardIcon={<History className="w-3.5 h-3.5 text-amber-400" />}
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
