import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2, Gamepad2, LogOut, ChevronRight, History, Settings, Key, AlertTriangle, Music, Search, Plus, Volume2 } from "lucide-react";
import GameCard from './GameCard';
import mikuAvatar from "../assets/images/miku_avatar_1783645686031.jpg";

interface User {
  id: string;
  displayName: string;
  photos: { value: string }[];
}

interface Game {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url: string;
  playtime_2weeks?: number;
}

interface Recommendation {
  name: string;
  reason: string;
  genres: string[];
  estimatedMatch: number;
  appId?: number;
}

export default function Dashboard({ user }: { user: User }) {
  const [ownedGames, setOwnedGames] = useState<Game[]>([]);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [discardedRecommendations, setDiscardedRecommendations] = useState<Recommendation[]>([]);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'library' | 'discarded'>('recommendations');
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
  
  // Library search filter state for practicality
  const [librarySearchFilter, setLibrarySearchFilter] = useState('');

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

  const generateRecommendations = async () => {
    setGenerating(true);
    setGenerationError('');
    try {
      const token = localStorage.getItem('steam_auth_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          ownedGames: ownedGames.slice(0, 50), 
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

  const handleDiscard = (index: number) => {
    setRecommendations(prev => {
      const updated = [...prev];
      const [discarded] = updated.splice(index, 1);
      setDiscardedRecommendations(d => [...d, discarded]);
      return updated;
    });
  };

  const handleRestore = (index: number) => {
    setDiscardedRecommendations(prev => {
      const updated = [...prev];
      const [restored] = updated.splice(index, 1);
      setRecommendations(r => [...r, restored]);
      return updated;
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

  const handleAddGame = (app: any) => {
    if (!ownedGames.some(g => g.appid === app.id)) {
      const newGame: Game = {
        appid: app.id,
        name: app.name,
        playtime_forever: 0,
        img_icon_url: '' 
      };
      setOwnedGames(prev => [newGame, ...prev]);
    }
    setSearchQuery('');
    setSearchResults([]);
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
  const totalPlaytimeHours = Math.round(ownedGames.reduce((acc, g) => acc + g.playtime_forever, 0) / 60);
  const recentPlaytimeHours = (recentGames.reduce((acc, g) => acc + (g.playtime_2weeks || 0), 0) / 60).toFixed(1);

  // Dynamic Miku bubble text based on current state
  const getMikuMessage = () => {
    if (generating) {
      return "Sintonizando sintetizadores virtuais! Analisando seus dados e sincronizando melodias com o Google Gemini... ♪ Aguarde um instante! (★ω★)";
    }
    if (generationError) {
      return `Puxa, o sintetizador deu uma desafinada... ＞﹏＜ Erro: ${generationError}. Que tal tentar de novo ou verificar sua chave de API?`;
    }
    if (recommendations.length > 0) {
      return `Tcharam! Encontrei ${recommendations.length} jogos que combinam perfeitamente com sua playlist de jogos! Qual melodia vamos testar hoje? ♪`;
    }
    if (ownedGames.length === 0) {
      return "Hum... sua biblioteca parece vazia! Se seu perfil for privado, siga os avisos abaixo. Se não, adicione alguns jogos manualmente para mim! ♪";
    }
    return `Olá! Eu analisei seus ${ownedGames.length} jogos e seu histórico recente. Que tal sintonizar um algoritmo mágico para encontrar sua próxima obsessão? ♪`;
  };

  // Filtered owned games inside the library tab
  const filteredOwnedGames = ownedGames.filter(game => 
    game.name.toLowerCase().includes(librarySearchFilter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060913] flex flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-[#39C5BB] border-t-transparent rounded-full animate-spin" />
          <Music className="w-6 h-6 text-[#39C5BB] absolute animate-pulse" />
        </div>
        <p className="text-[#39C5BB] font-mono text-xs tracking-widest uppercase animate-pulse">Sintonizando com a Steam... ♪</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060913] text-gray-100 font-sans relative overflow-hidden pb-16">
      {/* High-tech grid background overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f2fe08_1px,transparent_1px),linear-gradient(to_bottom,#00f2fe08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] pointer-events-none" />

      {/* Floating neon glow circles */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#39C5BB]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#FF007F]/3 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <nav className="border-b border-[#39C5BB]/15 bg-[#060913]/90 backdrop-blur-md sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[#39C5BB] shadow-[0_0_10px_rgba(57,197,187,0.3)]">
              <img src={mikuAvatar} alt="Hatsune Miku" className="w-full h-full object-cover animate-pulse" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-[#060913]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-[#39C5BB] to-white bg-clip-text text-transparent">Miku Recomenda!</span>
              <span className="text-[10px] text-gray-400 font-mono tracking-widest">Vocaloid Sync v0.1</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-400 hover:text-[#39C5BB] hover:bg-[#39C5BB]/10 rounded-xl p-2 transition-all border border-transparent hover:border-[#39C5BB]/20"
              title="Configurações (Chave da API)"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[#101726]/60 border border-white/5 rounded-2xl">
              <img src={user.photos[0].value} alt={user.displayName} className="w-6 h-6 rounded-full border border-[#FF007F]/30" />
              <span className="text-xs font-semibold text-gray-200 hidden sm:inline">{user.displayName}</span>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('steam_auth_token');
                window.location.href = '/api/auth/logout';
              }}
              className="text-gray-400 hover:text-[#FF007F] hover:bg-[#FF007F]/10 rounded-xl p-2 transition-all border border-transparent hover:border-[#FF007F]/20" 
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10 relative z-10">
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[#101726]/90 p-6 rounded-3xl border border-[#39C5BB]/20 mb-8 shadow-xl shadow-black/30">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#39C5BB]/10 rounded-2xl text-[#39C5BB] border border-[#39C5BB]/20">
                    <Key className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-100 font-sans">Sua Própria Chave da Gemini API</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Deseja utilizar sua própria chave da Gemini API? Insira-a abaixo para salvar no seu navegador (localStorage) de forma segura.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="password"
                        value={customApiKey}
                        onChange={(e) => handleSaveApiKey(e.target.value)}
                        placeholder="AIzaSyB..."
                        className="flex-1 bg-[#080d1a] border border-[#39C5BB]/15 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#39C5BB] transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isProfilePrivate && (
          <div className="bg-yellow-500/5 border border-yellow-500/20 text-yellow-200 p-6 rounded-3xl flex items-start gap-4 shadow-lg">
            <AlertTriangle className="w-6 h-6 shrink-0 mt-1 text-yellow-500" />
            <div>
              <h3 className="text-base font-bold text-yellow-500">Perfil Privado?</h3>
              <p className="text-xs mt-1.5 opacity-90 leading-relaxed text-gray-300">
                Não conseguimos encontrar nenhum jogo na sua biblioteca. Isso geralmente acontece quando as configurações de privacidade do seu perfil da Steam estão privadas.
              </p>
              <p className="text-xs mt-1 opacity-90 leading-relaxed text-gray-300">
                Para que a IA consiga analisar seus jogos, vá até seu perfil da Steam {"->"} Editar perfil {"->"} Configurações de privacidade {"->"} Defina "Detalhes dos jogos" como "Público". E desmarque a opção "Sempre manter meu tempo total de jogo privado". Depois disso, recarregue a página!
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation with dynamic neon slides */}
        <div className="relative flex space-x-1 border-b border-[#39C5BB]/15 overflow-x-auto pb-1 mb-8">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`relative px-5 py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'recommendations' 
                ? 'text-[#39C5BB]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2 font-sans font-extrabold">
              <Music className="w-4 h-4 animate-pulse" />
              Melodias Recomendadas
            </span>
            {activeTab === 'recommendations' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#39C5BB] to-[#FF007F]"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`relative px-5 py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'library' 
                ? 'text-[#39C5BB]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2 font-sans font-extrabold">
              <Gamepad2 className="w-4 h-4" />
              Sua Biblioteca ({ownedGames.length})
            </span>
            {activeTab === 'library' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#39C5BB] to-[#FF007F]"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('discarded')}
            className={`relative px-5 py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'discarded' 
                ? 'text-[#39C5BB]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2 font-sans font-extrabold">
              <History className="w-4 h-4" />
              Descartados ({discardedRecommendations.length})
            </span>
            {activeTab === 'discarded' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#39C5BB] to-[#FF007F]"
              />
            )}
          </button>
        </div>

        {/* Tab contents wrapped with gorgeous fluid slide / blur transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -20, filter: "blur(6px)" }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="space-y-10 focus:outline-none"
          >
            {activeTab === 'recommendations' && (
              <div className="space-y-12">
                
                {/* Visual novel / conversation style bubble with Miku */}
                <div className="bg-[#101726]/80 backdrop-blur-xl p-6 rounded-3xl border border-[#39C5BB]/20 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#39C5BB]/10 to-transparent rounded-bl-full pointer-events-none" />
                  
                  {/* Vocaloid character element */}
                  <div className="relative group shrink-0">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#39C5BB] to-[#FF007F] rounded-full blur opacity-50 group-hover:opacity-70 transition duration-300 animate-pulse" />
                    <div className="relative w-20 h-20 bg-[#080d1a] rounded-full overflow-hidden border-2 border-[#39C5BB] flex items-center justify-center">
                      <img src={mikuAvatar} alt="Hatsune Miku Chibi" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-[#FF007F] text-[9px] font-bold text-white rounded-full uppercase border border-white/10 shadow-md">
                      01
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <div className="space-y-1">
                      <div className="flex flex-col sm:flex-row items-center gap-2 justify-center md:justify-start">
                        <span className="font-extrabold text-lg text-[#39C5BB]">Hatsune Miku</span>
                        <div className="px-2 py-0.5 bg-[#39C5BB]/10 border border-[#39C5BB]/30 rounded-md text-[9px] font-mono text-[#39C5BB] uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#39C5BB] animate-ping" />
                          Sintetizador Online ♪
                        </div>
                      </div>
                      
                      {/* Dynamic message */}
                      <p className="text-sm font-medium text-cyan-50 leading-relaxed font-mono">
                        "{getMikuMessage()}"
                      </p>
                    </div>

                    {/* Quick synthesizer stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                      <div className="bg-[#080d1a]/80 p-2.5 rounded-2xl border border-white/5">
                        <span className="text-[10px] text-gray-400 block uppercase font-mono">Frequência Total</span>
                        <span className="text-sm font-bold text-[#39C5BB] font-mono">{totalPlaytimeHours}h ouvidas</span>
                      </div>
                      <div className="bg-[#080d1a]/80 p-2.5 rounded-2xl border border-white/5">
                        <span className="text-[10px] text-gray-400 block uppercase font-mono">Ritmo Recente</span>
                        <span className="text-sm font-bold text-[#FF007F] font-mono">{recentPlaytimeHours}h / 2sem</span>
                      </div>
                      <div className="bg-[#080d1a]/80 p-2.5 rounded-2xl border border-white/5 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-gray-400 block uppercase font-mono">Banco de Sons</span>
                        <span className="text-sm font-bold text-gray-100 font-mono">{ownedGames.length} Músicas</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generator controls card */}
                <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#101726] to-[#080d1a] border border-[#39C5BB]/15 p-8 sm:p-10 shadow-2xl">
                  {/* Holographic background waves */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(57,197,187,0.02)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
                  
                  <div className="relative z-10 max-w-2xl space-y-6">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#39C5BB]/10 text-[#39C5BB] border border-[#39C5BB]/20 rounded-full text-xs font-bold font-mono uppercase tracking-wider">
                        <Volume2 className="w-3.5 h-3.5" />
                        Ajuste de Equalização
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">O que vamos sintonizar hoje?</h2>
                      <p className="text-xs sm:text-sm text-gray-400">
                        Insira filtros específicos para calibrar o algoritmo do sintetizador. Miku analisará seu gosto gamer para criar a partitura ideal!
                      </p>
                    </div>
                    
                    <div className="space-y-4 bg-[#080d1a]/80 p-5 rounded-2xl border border-white/5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-[#39C5BB] uppercase tracking-wider font-mono">Quero MAIS disso (Aumentar Som):</label>
                          <input 
                            type="text" 
                            placeholder="Ex: RPG, Terror, Mundo Aberto"
                            value={prefsMoreOf}
                            onChange={(e) => setPrefsMoreOf(e.target.value)}
                            className="w-full bg-[#101726] border border-[#39C5BB]/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#39C5BB] placeholder-gray-600 transition-colors"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-[#FF007F] uppercase tracking-wider font-mono">Quero MENOS disso (Diminuir Som):</label>
                          <input 
                            type="text" 
                            placeholder="Ex: Puzzle, FPS, Esportes"
                            value={prefsLessOf}
                            onChange={(e) => setPrefsLessOf(e.target.value)}
                            className="w-full bg-[#101726] border border-[#FF007F]/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF007F] placeholder-gray-600 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <button
                        onClick={generateRecommendations}
                        disabled={generating || (ownedGames.length === 0 && recentGames.length === 0 && !prefsMoreOf)}
                        className="flex items-center gap-2.5 bg-gradient-to-r from-[#39C5BB] to-[#FF007F] hover:from-[#47dcd1] hover:to-[#ff2893] text-[#060913] font-extrabold py-3.5 px-8 rounded-xl transition-all disabled:opacity-40 active:scale-95 shadow-lg shadow-[#39C5BB]/20"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-[#060913]" />
                            <span>Sintonizando perfil...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-[#060913]" />
                            <span>Sintonizar Recomendações!</span>
                          </>
                        )}
                      </button>

                      {generating && (
                        /* Beautiful CSS wave visualizer */
                        <div className="flex items-center gap-1 h-6 px-4 bg-[#39C5BB]/5 border border-[#39C5BB]/10 rounded-xl">
                          <span className="w-1 bg-[#39C5BB] rounded-full animate-bounce h-3" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }} />
                          <span className="w-1 bg-[#39C5BB] rounded-full animate-bounce h-5" style={{ animationDelay: '0.3s', animationDuration: '0.5s' }} />
                          <span className="w-1 bg-[#FF007F] rounded-full animate-bounce h-4" style={{ animationDelay: '0.2s', animationDuration: '0.7s' }} />
                          <span className="w-1 bg-[#39C5BB] rounded-full animate-bounce h-2" style={{ animationDelay: '0.4s', animationDuration: '0.4s' }} />
                          <span className="text-[10px] font-mono text-[#39C5BB] ml-2">Mixando frequências...</span>
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
                  
                  {/* Aesthetic decoration vector */}
                  <div className="absolute top-0 right-0 w-1/2 h-full bg-[#39C5BB]/5 -skew-x-12 transform origin-top translate-x-1/4 pointer-events-none" />
                </section>

                {/* Recommendations List section */}
                <AnimatePresence mode="wait">
                  {recommendations.length > 0 && (
                    <motion.section
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h3 className="text-lg font-extrabold flex items-center gap-2 font-sans tracking-wide">
                          <Sparkles className="w-5 h-5 text-[#39C5BB] animate-spin" style={{ animationDuration: '4s' }} />
                          Recomendado por Miku (01)
                        </h3>
                        <span className="text-xs text-[#39C5BB] font-mono">Suas Melodias Ativas</span>
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

                {/* History section / Recent activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <section className="lg:col-span-2 space-y-6">
                    <h3 className="text-lg font-extrabold flex items-center gap-2">
                      <History className="w-5 h-5 text-[#39C5BB]" />
                      Tocadas Recentemente na Steam
                    </h3>
                    
                    {recentGames.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {recentGames.slice(0, 4).map((game) => (
                          <div 
                            key={game.appid} 
                            onClick={() => handleRecommendSimilar(game.name)}
                            className="group flex items-center gap-4 bg-[#101726]/60 p-4 rounded-2xl border border-white/5 hover:bg-[#101726] hover:border-[#39C5BB]/30 transition-all cursor-pointer relative overflow-hidden shadow-md"
                            title="Ver jogos similares"
                          >
                             {/* Small hover music note indicator */}
                             <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#39C5BB]">
                               <Music className="w-3.5 h-3.5 animate-bounce" />
                             </div>

                             <div className="w-14 h-14 bg-black/30 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-inner border border-white/5">
                              {game.img_icon_url ? (
                                <img src={`http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`} alt={game.name} className="w-full h-full object-cover" />
                              ) : (
                                <Gamepad2 className="w-6 h-6 text-[#39C5BB]/40" />
                              )}
                             </div>
                             <div className="flex-1 min-w-0">
                               <h4 className="font-extrabold text-sm sm:text-base truncate text-gray-200 group-hover:text-[#39C5BB] transition-colors">{game.name}</h4>
                               <p className="text-xs text-[#39C5BB] font-mono mt-0.5">
                                 {game.playtime_2weeks ? `${(game.playtime_2weeks / 60).toFixed(1)}h` : '< 1h'} <span className="text-gray-500 font-normal">nas últimas 2 semanas</span>
                               </p>
                             </div>
                             <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#39C5BB] group-hover:translate-x-1 transition-all" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-[#101726]/40 border border-white/5 p-8 rounded-3xl flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 bg-[#39C5BB]/15 rounded-full flex items-center justify-center text-[#39C5BB]/60">
                          <Gamepad2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-300 text-sm">Nenhuma atividade recente</h4>
                          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
                            {isProfilePrivate 
                              ? "O perfil está configurado como privado. Torne-o público para podermos ler sua atividade!"
                              : "Nenhuma atividade de jogo registrada nas duas últimas semanas."}
                          </p>
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="space-y-6">
                    <h3 className="text-lg font-extrabold flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-[#FF007F]" />
                      Sua Equalização
                    </h3>
                    <div className="bg-[#101726]/60 p-6 rounded-3xl border border-white/5 space-y-6 shadow-md">
                      <div className="flex justify-between items-center pb-3 border-b border-white/5">
                        <span className="text-gray-400 text-xs uppercase tracking-wider font-mono">Faixas Possuídas</span>
                        <span className="text-xl font-extrabold text-[#39C5BB] font-mono">{ownedGames.length}</span>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Mais Tocados (Seus Favoritos)</p>
                        <div className="space-y-3">
                          {ownedGames
                            .sort((a, b) => b.playtime_forever - a.playtime_forever)
                            .slice(0, 3)
                            .map(game => (
                              <div 
                                key={game.appid} 
                                className="flex justify-between items-center text-xs cursor-pointer group hover:bg-[#39C5BB]/5 p-1.5 -mx-1.5 rounded-lg border border-transparent hover:border-[#39C5BB]/10 transition-all" 
                                onClick={() => handleRecommendSimilar(game.name)} 
                                title="Ver similares"
                              >
                                <span className="text-gray-300 truncate max-w-[150px] font-medium group-hover:text-[#39C5BB] transition-colors">{game.name}</span>
                                <span className="text-[#39C5BB] font-mono text-xs">{Math.round(game.playtime_forever / 60)}h</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'library' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-extrabold">Seu Repertório Musical ({ownedGames.length})</h3>
                    <p className="text-xs text-gray-400">Aqui estão todas as faixas registradas na sua conta. Clique em qualquer um para achar similares ou adicione novos títulos!</p>
                  </div>
                  
                  {/* Practical library search input */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text" 
                        value={librarySearchFilter}
                        onChange={(e) => setLibrarySearchFilter(e.target.value)}
                        placeholder="Filtrar biblioteca..."
                        className="bg-[#101726] border border-[#39C5BB]/15 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#39C5BB] w-full sm:w-48 placeholder-gray-600 font-mono"
                      />
                    </div>
                    
                    <form onSubmit={handleSearchGames} className="flex gap-2">
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Adicionar jogo..."
                        className="bg-[#101726] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 flex-1 sm:w-44 placeholder-gray-600"
                      />
                      <button 
                        type="submit"
                        disabled={searching || !searchQuery}
                        className="bg-gradient-to-r from-[#39C5BB] to-[#FF007F] text-[#060913] hover:opacity-90 px-4 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-1 shrink-0"
                      >
                        {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        <span>Buscar</span>
                      </button>
                    </form>
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div className="bg-[#101726]/80 border border-[#39C5BB]/20 p-4 rounded-2xl space-y-3 shadow-lg">
                    <h4 className="text-xs font-extrabold text-gray-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#39C5BB] animate-pulse" />
                      Resultados Encontrados na Steam:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {searchResults.map(app => (
                        <div key={app.id} className="flex justify-between items-center bg-[#080d1a] p-2 px-3 border border-white/5 rounded-xl">
                          <span className="text-xs truncate mr-2 font-medium">{app.name}</span>
                          <button 
                            onClick={() => handleAddGame(app)}
                            className="bg-[#39C5BB]/15 hover:bg-[#39C5BB] hover:text-[#060913] text-[#39C5BB] px-3 py-1 rounded-lg text-xs font-bold transition-all border border-[#39C5BB]/30 active:scale-95"
                          >
                            Adicionar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredOwnedGames.length === 0 ? (
                  <div className="bg-[#101726]/40 border border-white/5 p-12 rounded-3xl text-center max-w-md mx-auto space-y-3">
                    <p className="text-gray-400 text-sm">Nenhum jogo encontrado com os filtros atuais.</p>
                    {librarySearchFilter && (
                      <button onClick={() => setLibrarySearchFilter('')} className="text-[#39C5BB] font-bold text-xs underline">Limpar busca</button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredOwnedGames
                      .sort((a, b) => b.playtime_forever - a.playtime_forever)
                      .map(game => (
                        <div 
                          key={game.appid} 
                          className="bg-[#101726]/60 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#101726] hover:border-[#39C5BB]/40 transition-all group relative overflow-hidden h-36"
                          onClick={() => handleRecommendSimilar(game.name)}
                          title="Encontrar jogos similares"
                        >
                          <div className="absolute right-2 top-2 p-1 bg-[#39C5BB]/10 text-[#39C5BB] border border-[#39C5BB]/20 rounded-md text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                            Sintonizar
                          </div>

                          <div className="w-12 h-12 bg-black/30 rounded-xl flex items-center justify-center overflow-hidden mb-2 border border-white/5 shadow-inner">
                            {game.img_icon_url ? (
                              <img src={`http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`} alt={game.name} className="w-full h-full object-cover" />
                            ) : (
                              <Gamepad2 className="w-6 h-6 text-[#39C5BB]/30" />
                            )}
                          </div>
                          <span className="font-bold text-gray-200 text-xs sm:text-sm group-hover:text-[#39C5BB] transition-colors truncate max-w-full px-2">{game.name}</span>
                          {game.playtime_forever > 0 && (
                             <span className="text-[10px] text-gray-500 mt-1 font-mono">{Math.round(game.playtime_forever / 60)}h jogadas</span>
                          )}
                        </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'discarded' && (
              <div className="space-y-6">
                <div className="space-y-1 border-b border-white/5 pb-4">
                  <h3 className="text-lg font-extrabold flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-400" />
                    Partituras Descartadas
                  </h3>
                  <p className="text-xs text-gray-400">Aqui ficam guardados os jogos que você descartou das recomendações. Você pode restaurá-los ao seu repertório a qualquer momento!</p>
                </div>
                
                {discardedRecommendations.length === 0 ? (
                  <div className="bg-[#101726]/40 border border-white/5 p-12 rounded-3xl text-center max-w-md mx-auto">
                    <p className="text-gray-400 text-sm">Nenhuma melodia descartada na memória virtual.</p>
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
                            discardIcon={<History className="w-4 h-4 text-[#39C5BB]" />}
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
