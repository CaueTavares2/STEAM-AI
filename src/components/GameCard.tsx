import React, { useState } from 'react';
import { motion } from "motion/react";
import { Clock, X, ExternalLink, Sparkles, Coffee, Edit3, Trash2, Check, Crown, Award } from "lucide-react";

interface GameCardProps {
  name: string;
  image?: string;
  appId?: number;
  playtime?: number; // in minutes
  reason?: string;
  match?: number; // 0-100 percentage
  genres?: string[];
  onDiscard?: () => void;
  discardIcon?: React.ReactNode;
  discardLabel?: string;
  
  // Manual additions support
  isManual?: boolean;
  onEditPlaytime?: (minutes: number) => void;
  onRemoveManual?: () => void;
}

export default function GameCard({ 
  name, 
  image, 
  appId, 
  playtime = 0, 
  reason, 
  match, 
  genres, 
  onDiscard, 
  discardIcon, 
  discardLabel,
  isManual,
  onEditPlaytime,
  onRemoveManual
}: GameCardProps) {
  
  const [isEditing, setIsEditing] = useState(false);
  const [editHours, setEditHours] = useState(Math.round(playtime / 60).toString());

  // Use Steam standard image if appId is available, else premium dynamic gradients or placehold
  const imageUrl = image || (appId ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg` : undefined);
  const steamUrl = appId ? `https://store.steampowered.com/app/${appId}` : undefined;

  const handleSavePlaytime = () => {
    const hours = parseFloat(editHours);
    if (!isNaN(hours) && hours >= 0) {
      onEditPlaytime?.(Math.round(hours * 60));
    }
    setIsEditing(false);
  };

  const isLegendaryMatch = match !== undefined && match >= 95;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
      whileHover={{ 
        y: -8, 
        boxShadow: isLegendaryMatch 
          ? "0 0 35px rgba(245, 158, 11, 0.35), 0 0 15px rgba(217, 119, 6, 0.15)" 
          : "0 0 25px rgba(217, 119, 6, 0.15)" 
      }}
      className={`rounded-2xl overflow-hidden flex flex-col h-full relative group transition-all duration-300 shadow-lg shadow-black/60 ${
        isLegendaryMatch 
          ? "bg-gradient-to-b from-[#2d1c15] via-[#201815] to-[#14100e] border-2 border-amber-500 hover:border-amber-400"
          : "bg-[#201815]/95 border border-amber-500/10 hover:border-amber-500/30"
      }`}
    >
      {/* Legendary background sparkle glow overlay */}
      {isLegendaryMatch && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.1),transparent_60%)] pointer-events-none z-0 animate-pulse" />
      )}

      {/* Remove / Discard Button (Top Right) */}
      {onDiscard && (
        <button
          onClick={onDiscard}
          className="absolute top-2 right-2 p-1.5 bg-[#14100e]/80 hover:bg-red-500 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all z-20 flex items-center justify-center border border-white/5 cursor-pointer"
          title={discardLabel || "Descartar recomendação"}
        >
          {discardIcon || <X className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Manual Delete Button */}
      {isManual && onRemoveManual && (
        <button
          onClick={onRemoveManual}
          className="absolute top-2 right-2 p-1.5 bg-[#14100e]/80 hover:bg-red-500 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all z-20 flex items-center justify-center border border-white/5 cursor-pointer"
          title="Remover Jogo Manual"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover:text-white" />
        </button>
      )}

      {/* Game Image Header */}
      <div className="relative h-32 w-full overflow-hidden shrink-0 bg-[#14100e]">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Custom premium canvas fallback instead of ugly default text
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                const fallbackDiv = parent.querySelector('.cover-fallback');
                if (fallbackDiv) fallbackDiv.classList.remove('hidden');
              }
            }} 
          />
        ) : null}

        {/* Premium Graphic Fallback Cover */}
        <div className={`cover-fallback ${imageUrl ? 'hidden' : ''} absolute inset-0 bg-gradient-to-br from-amber-950/40 via-stone-900 to-orange-950/30 flex flex-col items-center justify-center p-3 text-center`}>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.02)_1px,transparent_1px)] bg-[size:100%_6px] pointer-events-none" />
          <Coffee className="w-6 h-6 text-amber-500/40 mb-1" />
          <span className="font-extrabold text-[11px] text-amber-200 tracking-wide line-clamp-2 uppercase font-mono">{name}</span>
        </div>

        {/* Dynamic Badges Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#201815] via-transparent to-transparent opacity-80 pointer-events-none" />
        
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 pointer-events-none z-10">
          {isManual && (
            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-mono uppercase tracking-wider font-bold">
              Manual
            </span>
          )}
          {genres && genres.slice(0, 2).map(g => (
            <span key={g} className="text-[9px] bg-black/60 text-amber-200 px-1.5 py-0.5 rounded border border-amber-500/30 font-mono">
              {g}
            </span>
          ))}
        </div>

        {/* Legendary Crown badge */}
        {isLegendaryMatch && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[9px] font-extrabold rounded-md flex items-center gap-1 shadow-lg shadow-amber-500/20 animate-bounce z-10">
            <Crown className="w-3 h-3 text-black animate-spin" style={{ animationDuration: '6s' }} />
            <span>MÁXIMA SINTONIA</span>
          </div>
        )}
      </div>
      
      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3 font-sans z-10">
        <div className="space-y-1.5">
          <div className="flex justify-between items-start gap-2">
            <h3 className={`font-bold transition-colors line-clamp-1 text-sm sm:text-base ${
              isLegendaryMatch ? "text-amber-300 group-hover:text-amber-200" : "text-[#f4efe9] group-hover:text-amber-400"
            }`}>
              {name}
            </h3>
            {match !== undefined && (
              <div className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border whitespace-nowrap flex items-center gap-0.5 ${
                isLegendaryMatch
                  ? "bg-amber-500/25 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/20 shadow-[0_0_8px_rgba(217,119,6,0.1)]"
              }`}>
                <Sparkles className={`w-2.5 h-2.5 animate-pulse ${isLegendaryMatch ? 'text-amber-400' : 'text-orange-400'}`} />
                <span>{match}% Match</span>
              </div>
            )}
          </div>

          {/* Verdict / Recommendation Reason */}
          {reason && (
            <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed font-mono italic relative transition-colors ${
              isLegendaryMatch
                ? "bg-amber-950/20 border-amber-500/10 text-amber-200/90 group-hover:bg-[#14100e]"
                : "bg-[#14100e]/60 border border-white/5 text-[#e1dbd2] group-hover:bg-[#14100e]"
            }`}>
              <span className={`font-bold text-[9px] uppercase block not-italic mb-0.5 tracking-wider font-sans ${
                isLegendaryMatch ? "text-amber-400" : "text-amber-300"
              }`}>Sabor de Aventura //</span>
              "{reason}"
            </div>
          )}
        </div>

        {/* Footer info & Buttons */}
        <div className="pt-2 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            {isEditing ? (
              <div className="flex items-center gap-1.5 w-full">
                <input 
                  type="text" 
                  value={editHours} 
                  onChange={(e) => setEditHours(e.target.value)}
                  className="bg-stone-950 border border-amber-500/30 rounded px-1.5 py-0.5 text-[11px] w-16 text-white focus:outline-none focus:border-amber-400 font-mono text-center"
                  placeholder="Horas"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-gray-400 font-mono text-[10px]">hs</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleSavePlaytime(); }}
                  className="p-1 bg-amber-500/20 hover:bg-amber-500 hover:text-black rounded text-amber-300 transition-colors"
                  title="Salvar"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
                  className="p-1 bg-red-500/10 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                  title="Cancelar"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1 text-amber-200/60">
                  <Clock className={`w-3 h-3 ${isLegendaryMatch ? 'text-amber-400' : 'text-amber-300'}`} />
                  <span className="font-mono">
                    {playtime > 0 ? `${Math.round(playtime / 60)}h` : '0h'}{' '}
                    <span className="text-amber-200/40 text-[10px]">jogadas</span>
                  </span>
                  
                  {/* Edit hours button for manual games */}
                  {isManual && onEditPlaytime && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                      className="ml-1 p-0.5 text-gray-400 hover:text-amber-400 rounded transition-colors"
                      title="Editar horas jogadas"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {appId ? (
                  <span className="text-[10px] text-amber-200/30 font-mono">ID: {appId}</span>
                ) : (
                  <span className={`text-[9px] font-mono uppercase tracking-wider font-bold ${
                    isLegendaryMatch ? "text-amber-400" : "text-amber-300"
                  }`}>Custom</span>
                )}
              </div>
            )}
          </div>

          {steamUrl && !isEditing && (
            <a
              href={steamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl font-bold text-xs transition-all duration-200 border shadow-[0_0_10px_rgba(217,119,6,0.03)] active:scale-95 ${
                isLegendaryMatch
                  ? "bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-300 border-amber-500/20"
                  : "bg-amber-500/5 hover:bg-amber-500 hover:text-black text-amber-300 border-amber-500/10"
              }`}
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
