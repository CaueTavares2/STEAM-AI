import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2, Gamepad2, LogOut, ChevronRight, History, Settings, Key, AlertTriangle } from "lucide-react";
import GameCard from './GameCard';

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
}

interface Recommendation {
  name: string;
  reason: string;
  genres: string[];
  estimatedMatch: number;
}

export default function Dashboard({ user }: { user: User }) {
  const [ownedGames, setOwnedGames] = useState<Game[]>([]);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(localStorage.getItem('custom_gemini_api_key') || '');
  const [isProfilePrivate, setIsProfilePrivate] = useState(false);
  const [prefsMoreOf, setPrefsMoreOf] = useState('');
  const [prefsLessOf, setPrefsLessOf] = useState('');
  const [generationError, setGenerationError] = useState('');

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

        // Detect private profile: if there's no error, but also no game_count or games array in the response object
        // Usually, a public profile with 0 games still returns game_count: 0. 
        // A private profile often returns an empty response object {} for GetOwnedGames.
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
    try {
      const token = localStorage.getItem('steam_auth_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          ownedGames: ownedGames.slice(0, 50), // Send top 50 to avoid payload limits
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
    setRecommendations(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1121] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1121] text-white">
      {/* Header */}
      <nav className="border-b border-white/5 bg-[#0b1121]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg hidden sm:inline">Steam IA</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-400 hover:text-white transition-colors p-2"
              title="Configurações (Chave da API)"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 pr-4 border-r border-white/10">
              <img src={user.photos[0].value} alt={user.displayName} className="w-8 h-8 rounded-full border border-white/10" />
              <span className="text-sm font-medium hidden sm:inline">{user.displayName}</span>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('steam_auth_token');
                window.location.href = '/api/auth/logout';
              }}
              className="text-gray-400 hover:text-white transition-colors p-2" 
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[#161f35] p-6 rounded-3xl border border-white/5 mb-8">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <Key className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold">Sua Própria Chave da Gemini API</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Para não utilizar a chave padrão, você pode inserir a sua própria API Key do Google Gemini. 
                        Ela será salva no seu navegador (localStorage).
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="password"
                        value={customApiKey}
                        onChange={(e) => handleSaveApiKey(e.target.value)}
                        placeholder="AIzaSyB..."
                        className="flex-1 bg-[#0b1121] border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isProfilePrivate && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 p-6 rounded-3xl flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 shrink-0 mt-1 text-yellow-500" />
            <div>
              <h3 className="text-lg font-bold text-yellow-500">Perfil Privado?</h3>
              <p className="text-sm mt-2 opacity-90 leading-relaxed">
                Não conseguimos encontrar nenhum jogo na sua biblioteca. Isso geralmente acontece quando as configurações de privacidade do seu perfil da Steam estão definidas como privadas.
              </p>
              <p className="text-sm mt-2 opacity-90 leading-relaxed">
                Para que a IA consiga analisar seus jogos, vá até seu perfil da Steam {"->"} Editar perfil {"->"} Configurações de privacidade {"->"} Defina "Detalhes dos jogos" como "Público". E também desmarque a opção "Sempre manter meu tempo total de jogo privado". Depois disso, recarregue a página.
              </p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-900 p-8 sm:p-12">
          <div className="relative z-10 max-w-2xl space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-sm"
            >
              <Sparkles className="w-3 h-3" />
              POWERED BY GEMINI AI
            </motion.div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">O que vamos jogar hoje?</h2>
            <p className="text-blue-100/80 text-lg">
              Analisamos seus {ownedGames.length} jogos e seu histórico recente para encontrar o par perfeito para seu estilo.
            </p>
            
            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
              <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider">Refinar Buscas (Opcional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-blue-200 mb-1">Quero jogar MAIS disso:</label>
                  <input 
                    type="text" 
                    placeholder="Ex: RPG, Terror, Mundo Aberto"
                    value={prefsMoreOf}
                    onChange={(e) => setPrefsMoreOf(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400 placeholder-white/30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-blue-200 mb-1">Quero jogar MENOS disso:</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Puzzle, FPS, Esportes"
                    value={prefsLessOf}
                    onChange={(e) => setPrefsLessOf(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400 placeholder-white/30"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={generateRecommendations}
              disabled={generating || (ownedGames.length === 0 && recentGames.length === 0)}
              className="flex items-center gap-2 bg-white text-blue-900 font-bold py-3 px-8 rounded-xl hover:bg-blue-50 transition-all disabled:opacity-50 active:scale-95 mt-4"
            >
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {generating ? 'Analisando perfil...' : 'Gerar Recomendações'}
            </button>

            {generationError && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{generationError}</p>
              </div>
            )}
          </div>
          
          {/* Abstract decoration */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 -skew-x-12 transform origin-top translate-x-1/4 pointer-events-none" />
        </section>

        {/* Recommendations Section */}
        <AnimatePresence mode="wait">
          {recommendations.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  Especialmente para você
                </h3>
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

        {/* History Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" />
              Jogados Recentemente
            </h3>
            
            {recentGames.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentGames.slice(0, 4).map((game) => (
                  <div key={game.appid} className="flex items-center gap-4 bg-[#161f35] p-4 rounded-2xl border border-white/5 hover:bg-[#1a2540] transition-colors">
                     <div className="w-14 h-14 bg-black/30 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                      {game.img_icon_url ? (
                        <img src={`http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`} alt={game.name} className="w-full h-full object-cover" />
                      ) : (
                        <Gamepad2 className="w-6 h-6 text-blue-400/30" />
                      )}
                     </div>
                     <div className="flex-1 min-w-0">
                       <h4 className="font-semibold text-base truncate text-gray-100">{game.name}</h4>
                       <p className="text-sm text-blue-400 font-medium">
                         {game.playtime_2weeks ? `${(game.playtime_2weeks / 60).toFixed(1)}h` : '< 1h'} <span className="text-gray-500 text-xs font-normal">nas últimas 2 semanas</span>
                       </p>
                     </div>
                     <ChevronRight className="w-5 h-5 text-gray-600" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#161f35] border border-white/5 p-8 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Gamepad2 className="w-8 h-8 text-blue-400/50" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-300">Nenhuma atividade recente</h4>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                    {isProfilePrivate 
                      ? "Parece que seu perfil está privado. Torne-o público para visualizarmos."
                      : "Você não jogou nada nas últimas duas semanas, ou seus dados de jogo estão privados na Steam."}
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <h3 className="text-xl font-bold">Resumo da Biblioteca</h3>
            <div className="bg-[#161f35] p-6 rounded-3xl border border-white/5 space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Total de Jogos</span>
                <span className="text-2xl font-bold text-blue-400">{ownedGames.length}</span>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mais Jogados</p>
                <div className="space-y-3">
                  {ownedGames
                    .sort((a, b) => b.playtime_forever - a.playtime_forever)
                    .slice(0, 3)
                    .map(game => (
                      <div key={game.appid} className="flex justify-between items-center text-sm">
                        <span className="text-gray-300 truncate max-w-[150px]">{game.name}</span>
                        <span className="text-gray-500 font-mono text-xs">{Math.round(game.playtime_forever / 60)}h</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
