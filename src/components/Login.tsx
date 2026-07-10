import { motion } from "motion/react";
import { Gamepad2, Sparkles, Music } from "lucide-react";
import mikuAvatar from "../assets/images/miku_avatar_1783645686031.jpg";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#060913] text-white p-4 relative overflow-hidden font-sans">
      {/* High-tech grid background overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f2fe10_1px,transparent_1px),linear-gradient(to_bottom,#00f2fe10_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      
      {/* Floating neon light circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#39C5BB]/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF007F]/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-md w-full text-center space-y-8 relative z-10"
      >
        <div className="flex flex-col items-center">
          {/* Neon avatar frame representing Hatsune Miku */}
          <div className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-[#39C5BB] to-[#FF007F] rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <div className="relative w-28 h-28 bg-[#101726] rounded-full overflow-hidden border-2 border-[#39C5BB] flex items-center justify-center shadow-lg shadow-[#39C5BB]/20">
              <img 
                src={mikuAvatar} 
                alt="Hatsune Miku Chibi" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* Cute floating music notes */}
            <motion.div 
              animate={{ y: [0, -10, 0], rotate: [0, 15, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="absolute -top-1 -right-2 p-1.5 bg-[#FF007F] text-white rounded-full shadow-md text-xs font-bold"
            >
              <Music className="w-3.5 h-3.5" />
            </motion.div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#39C5BB]/10 text-[#39C5BB] border border-[#39C5BB]/20 text-xs font-bold tracking-wider uppercase font-mono shadow-[0_0_10px_rgba(57,197,187,0.15)]">
            <Sparkles className="w-3 h-3 text-[#39C5BB] animate-spin" style={{ animationDuration: '3s' }} />
            Miku Steam AI Sync
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[#39C5BB] via-[#fff] to-[#FF007F] bg-clip-text text-transparent">
            Miku Recomenda!
          </h1>
          <p className="text-gray-400 max-w-sm mx-auto text-sm leading-relaxed">
            Deixe a maior idol virtual sincronizar com sua biblioteca Steam e cantar a melodia do seu próximo jogo favorito!
          </p>
        </div>

        <div className="bg-[#101726]/80 backdrop-blur-xl p-8 rounded-3xl border border-[#39C5BB]/15 space-y-6 shadow-2xl shadow-[#39C5BB]/5 relative font-sans">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-[#101726] border border-[#39C5BB]/20 rounded-full text-[11px] text-[#39C5BB] font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#39C5BB] animate-ping" />
            Vocaloid Terminal Active
          </div>

          {/* Dialog Bubble */}
          <div className="bg-[#080d1a] border border-[#39C5BB]/10 rounded-2xl p-4 text-xs text-left relative text-cyan-100 font-mono leading-relaxed">
            <span className="text-[#39C5BB] font-bold">Miku (01):</span> "Olá! Eu analiso os seus jogos salvos e as suas estatísticas na Steam para cantar um algoritmo mágico de sugestões! É super seguro e rápido. Vamos começar? ♪"
            <div className="absolute -top-2 left-6 w-3 h-3 bg-[#080d1a] border-t border-l border-[#39C5BB]/10 transform rotate-45" />
          </div>
          
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center hover:opacity-90 transition-opacity active:scale-95 duration-150"
          >
            <img 
              src="https://community.akamai.steamstatic.com/public/images/signinthroughsteam/sits_02.png" 
              alt="Sign in through Steam"
              className="hover:shadow-[0_0_20px_rgba(57,197,187,0.4)] rounded-lg transition-shadow duration-300"
            />
          </button>
          
          <div className="pt-4 border-t border-white/5">
            <p className="text-[11px] text-gray-500 leading-normal">
              A autenticação é feita diretamente através do <span className="text-gray-300">Steam Secure OpenID</span>. Nós não salvamos ou temos acesso aos seus dados de login.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
