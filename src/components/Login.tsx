import { motion } from "motion/react";
import { Gamepad2, Sparkles, Cpu, Library, Zap } from "lucide-react";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#07070a] text-white p-4 relative overflow-hidden font-sans">
      {/* High-tech matrix grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#a855f705_1px,transparent_1px),linear-gradient(to_bottom,#a855f705_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      
      {/* Floating high-end neon light fields */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />

      <motion.div 
         initial={{ opacity: 0, y: 30 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.8, ease: "easeOut" }}
         className="max-w-md w-full text-center space-y-8 relative z-10"
      >
        <div className="flex flex-col items-center">
          {/* Holographic Quantum Core instead of Miku */}
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-400 rounded-full blur-xl opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-300 animate-pulse" />
            <div className="relative w-28 h-28 bg-[#0f0f16]/90 rounded-full flex items-center justify-center border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20 backdrop-blur-md">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                className="absolute inset-2 border border-dashed border-cyan-400/30 rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                className="absolute inset-4 border border-purple-400/20 rounded-full"
              />
              <Cpu className="w-10 h-10 text-purple-400 group-hover:text-cyan-300 transition-colors duration-300 relative z-10" />
              
              {/* Core active pulse indicator */}
              <span className="absolute bottom-2 right-2 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-bold tracking-wider uppercase font-mono shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
            Synapse Engine v2.0
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-purple-400 via-fuchsia-200 to-cyan-400 bg-clip-text text-transparent uppercase">
            Steam Synapse
          </h1>
          <p className="text-gray-400 max-w-sm mx-auto text-sm leading-relaxed">
            Sincronize sua conta Steam com nosso mecanismo de inteligência artificial para mapear seus padrões e revelar suas próximas obsessões gamers.
          </p>
        </div>

        <div className="bg-[#0f0f16]/85 backdrop-blur-xl p-8 rounded-3xl border border-purple-500/10 space-y-6 shadow-2xl relative font-sans">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-[#0f0f16] border border-purple-500/20 rounded-full text-[10px] text-purple-300 font-mono flex items-center gap-1.5 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            Core Analytics Link
          </div>

          {/* Core Introduction */}
          <div className="bg-[#07070a]/80 border border-purple-500/10 rounded-2xl p-4 text-xs text-left relative text-purple-100 font-mono leading-relaxed shadow-inner">
            <span className="text-cyan-400 font-bold block mb-1">SYNAPSE-SYSTEM //</span>
            "Bem-vindo ao Steam Synapse. Nosso sistema de rede neural analisa dinamicamente sua biblioteca de jogos e estatísticas de jogo em tempo real para projetar conexões inteligentes. Inscreva-se com segurança para iniciar o escaneamento."
          </div>
          
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center hover:opacity-95 transition-all active:scale-[0.98] duration-150 group"
          >
            <div className="relative rounded-xl overflow-hidden shadow-lg shadow-purple-950/40">
              <img 
                src="https://community.akamai.steamstatic.com/public/images/signinthroughsteam/sits_02.png" 
                alt="Sign in through Steam"
                className="group-hover:shadow-[0_0_25px_rgba(168,85,247,0.35)] rounded-lg transition-all duration-300"
              />
            </div>
          </button>
          
          <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4 text-left">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-cyan-400 font-bold flex items-center gap-1">
                <Library className="w-3 h-3" />
                Durable Scan
              </span>
              <p className="text-[10px] text-gray-500 leading-normal">
                Suporte para adição manual, ajuste de filtros e persistência.
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-purple-400 font-bold flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Seguro & Privado
              </span>
              <p className="text-[10px] text-gray-500 leading-normal">
                Autenticação direta via Steam OpenID. Seus dados protegidos.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
