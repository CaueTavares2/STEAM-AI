import { motion } from "motion/react";
import { Star, Clock, X } from "lucide-react";

interface GameCardProps {
  name: string;
  image?: string;
  appId?: number;
  playtime?: number;
  reason?: string;
  match?: number;
  genres?: string[];
  onDiscard?: () => void;
  discardIcon?: React.ReactNode;
  discardLabel?: string;
}

export default function GameCard({ name, image, appId, playtime, reason, match, genres, onDiscard, discardIcon, discardLabel }: GameCardProps) {
  const imageUrl = image || (appId ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg` : undefined);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
      whileHover={{ y: -4 }}
      className="bg-[#161f35] rounded-2xl overflow-hidden border border-white/5 flex flex-col h-full relative group"
    >
      {onDiscard && (
        <button
          onClick={onDiscard}
          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-blue-500/80 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all z-10 flex items-center justify-center"
          title={discardLabel || "Descartar recomendação"}
        >
          {discardIcon || <X className="w-4 h-4" />}
        </button>
      )}

      {imageUrl ? (
        <img src={imageUrl} alt={name} className="w-full h-32 object-cover" onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/161f35/FFF?text=' + encodeURIComponent(name);
        }} />
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
          <span className="text-2xl font-bold text-white/20">{name[0]}</span>
        </div>
      )}
      
      <div className="p-4 flex-1 flex flex-col space-y-3">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-white line-clamp-2">{name}</h3>
          {match !== undefined && (
            <span className="text-xs font-bold px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/20 whitespace-nowrap">
              {match}% Match
            </span>
          )}
        </div>

        {playtime !== undefined && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{Math.round(playtime / 60)}h jogadas</span>
          </div>
        )}

        {genres && (
          <div className="flex flex-wrap gap-1">
            {genres.map(g => (
              <span key={g} className="text-[10px] bg-white/5 text-gray-300 px-1.5 py-0.5 rounded">
                {g}
              </span>
            ))}
          </div>
        )}

        {reason && (
          <p className="text-xs text-gray-400 leading-relaxed italic">
            "{reason}"
          </p>
        )}
      </div>
    </motion.div>
  );
}
