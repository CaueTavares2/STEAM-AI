import { motion } from "motion/react";
import { Gamepad2, Sparkles, Coffee, Library, Flame, Heart } from "lucide-react";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#14100e] text-[#f4efe9] p-4 relative overflow-hidden font-sans">
      {/* Soft warm cottage glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.05),transparent_70%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-amber-600/5 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />

      <motion.div 
         initial={{ opacity: 0, y: 30 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.8, ease: "easeOut" }}
         className="max-w-md w-full text-center space-y-8 relative z-10"
      >
        <div className="flex flex-col items-center">
          {/* Steaming Coffee Cup Core */}
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-500 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition duration-1000 group-hover:duration-300 animate-pulse" />
            <div className="relative w-28 h-28 bg-[#201815] rounded-full flex items-center justify-center border-2 border-amber-500/30 shadow-2xl shadow-amber-950/40 backdrop-blur-md">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                className="absolute inset-2 border border-dashed border-amber-400/20 rounded-full"
              />
              <Coffee className="w-10 h-10 text-amber-400 group-hover:text-orange-300 transition-colors duration-300 relative z-10 animate-bounce" style={{ animationDuration: '3s' }} />
              
              {/* Steaming active indicator */}
              <span className="absolute bottom-2 right-2 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold tracking-widest uppercase font-mono shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            Seu Canto Cozy de Jogos ☕
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-orange-200 to-yellow-300 bg-clip-text text-transparent uppercase font-serif">
            Steam Synapse
          </h1>
          <p className="text-amber-200/70 max-w-sm mx-auto text-sm leading-relaxed">
            Sincronize sua conta Steam e relaxe em nosso canto confortável. Deixe o curador inteligente sugerir novas obsessões para suas tardes livres.
          </p>
        </div>

        <div className="bg-[#201815]/95 backdrop-blur-xl p-8 rounded-3xl border border-amber-500/10 space-y-6 shadow-2xl relative font-sans">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-[#201815] border border-amber-500/20 rounded-full text-[10px] text-amber-300 font-mono flex items-center gap-1.5 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Canto de Jogos do Chá & Café
          </div>

          {/* Cozy Introduction */}
          <div className="bg-[#14100e]/90 border border-amber-500/10 rounded-2xl p-4 text-xs text-left relative text-amber-100 font-mono leading-relaxed shadow-inner">
            <span className="text-amber-400 font-bold block mb-1">COZY CORNER //</span>
            "Bem-vindo ao Steam Synapse! Sente-se confortavelmente, prepare sua xícara de chá ou café e deixe nosso curador inteligente analisar seus jogos jogados para encontrar novas experiências perfeitamente adequadas ao seu ritmo atual."
          </div>
          
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center hover:opacity-95 transition-all active:scale-[0.98] duration-150 group"
          >
            <div className="relative rounded-xl overflow-hidden shadow-lg shadow-amber-950/40">
              <img 
                src="https://community.akamai.steamstatic.com/public/images/signinthroughsteam/sits_02.png" 
                alt="Sign in through Steam"
                className="group-hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] rounded-lg transition-all duration-300"
              />
            </div>
          </button>
          
          <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4 text-left">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-amber-400 font-bold flex items-center gap-1">
                <Library className="w-3 h-3" />
                Biblioteca Afetiva
              </span>
              <p className="text-[10px] text-amber-200/50 leading-normal">
                Suporte para adicionar jogos manuais de consoles ou outros launchers com persistência.
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-orange-400 font-bold flex items-center gap-1">
                <Heart className="w-3 h-3" />
                Seguro & Acolhedor
              </span>
              <p className="text-[10px] text-amber-200/50 leading-normal">
                Autenticação direta oficial Steam OpenID. Seus dados lidos com privacidade e proteção.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
