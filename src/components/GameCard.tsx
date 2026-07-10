import React from 'react';
import { motion } from "motion/react";
import { Clock, X, ExternalLink, Sparkles, Music } from "lucide-react";

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
  const steamUrl = appId ? `https://store.steampowered.com/app/${appId}` : undefined;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
      whileHover={{ y: -6, boxShadow: "0 0 25px rgba(57, 197, 187, 0.25)" }}
      className="bg-[#101726]/90 rounded-2xl overflow-hidden border border-[#39C5BB]/15 hover:border-[#39C5BB] flex flex-col h-full relative group transition-colors duration-300 shadow-lg shadow-black/40"
    >
      {/* Discard Button (Top Right) */}
      {onDiscard && (
        <button
          onClick={onDiscard}
          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-[#FF007F] text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all z-10 flex items-center justify-center border border-white/10"
          title={discardLabel || "Descartar recomendação"}
        >
          {discardIcon || <X className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Game Image Header with Miku Wave overlay */}
      <div className="relative h-32 w-full overflow-hidden shrink-0 bg-[#080d1a]">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/101726/39C5BB?text=' + encodeURIComponent(name);
            }} 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#39C5BB]/20 to-[#FF007F]/20 flex items-center justify-center">
            <span className="text-3xl font-extrabold text-[#39C5BB]/30">{name[0]}</span>
          </div>
        )}
        {/* Hologram lines effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#101726] to-transparent opacity-60 pointer-events-none" />
        <div className="absolute bottom-2 left-2 flex gap-1 pointer-events-none">
          {genres && genres.slice(0, 2).map(g => (
            <span key={g} className="text-[9px] bg-black/60 text-[#39C5BB] px-1.5 py-0.5 rounded-md border border-[#39C5BB]/30 font-mono">
              {g}
            </span>
          ))}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3 font-sans">
        <div className="space-y-1.5">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-gray-100 group-hover:text-[#39C5BB] transition-colors line-clamp-1 text-sm sm:text-base">
              {name}
            </h3>
            {match !== undefined && (
              <div className="text-[10px] font-extrabold px-1.5 py-0.5 bg-[#39C5BB]/10 text-[#39C5BB] rounded border border-[#39C5BB]/30 whitespace-nowrap flex items-center gap-0.5 shadow-[0_0_8px_rgba(57,197,187,0.1)]">
                <Music className="w-2.5 h-2.5 animate-bounce" />
                <span>{match}%</span>
              </div>
            )}
          </div>

          {/* Matches Rating Reason */}
          {reason && (
            <div className="bg-[#080d1a]/60 p-2.5 rounded-xl border border-white/5 text-[11px] leading-relaxed text-gray-300 font-mono italic relative group-hover:bg-[#080d1a] transition-colors">
              <span className="text-[#39C5BB] font-semibold text-[10px] uppercase block not-italic mb-0.5 tracking-wider">Miku Review ♫</span>
              "{reason}"
            </div>
          )}
        </div>

        {/* Footer info & Buttons */}
        <div className="pt-2 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            {playtime !== undefined ? (
              <div className="flex items-center gap-1 text-gray-400">
                <Clock className="w-3 h-3 text-[#39C5BB]" />
                <span>{Math.round(playtime / 60)}h jogadas</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[#FF007F]/80">
                <Sparkles className="w-3 h-3" />
                <span>Nova Recomendação!</span>
              </div>
            )}

            {appId && (
              <span className="text-[10px] text-gray-500 font-mono">
                ID: {appId}
              </span>
            )}
          </div>

          {steamUrl && (
            <a
              href={steamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#39C5BB]/10 hover:bg-[#39C5BB] hover:text-[#060913] text-[#39C5BB] rounded-xl font-bold text-xs transition-all duration-200 border border-[#39C5BB]/30 shadow-[0_0_10px_rgba(57,197,187,0.05)] active:scale-95"
            >
              <span>Ver na Steam</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
