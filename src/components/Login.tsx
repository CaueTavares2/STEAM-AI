import { motion } from "motion/react";
import { Gamepad2 } from "lucide-react";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b1121] text-white p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <div className="flex justify-center">
          <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20">
            <Gamepad2 className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Steam IA</h1>
          <p className="text-gray-400">Descubra sua próxima obsessão gamer através de inteligência artificial.</p>
        </div>

        <div className="bg-[#161f35] p-8 rounded-3xl border border-white/5 space-y-6">
          <p className="text-sm text-gray-400">
            Conecte sua conta Steam para analisarmos seu histórico de jogos e reviews.
          </p>
          
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-4 px-6 rounded-xl hover:bg-gray-200 transition-all active:scale-95"
          >
            <img 
              src="https://community.akamai.steamstatic.com/public/images/signinthroughsteam/sits_01.png" 
              alt="Steam Login"
              className="h-6"
            />
          </button>
          
          <div className="pt-4 border-t border-white/5">
            <p className="text-xs text-gray-500">
              Não armazenamos sua senha. A autenticação é feita diretamente pelos servidores da Steam.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
