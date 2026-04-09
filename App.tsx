import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Music, 
  Search, 
  Sparkles, 
  Play, 
  Plus, 
  Check, 
  Loader2, 
  LogOut, 
  ExternalLink,
  RefreshCw,
  Info
} from "lucide-react";
import { getAuthUrl, getMe, getRecommendations, createPlaylist } from "./lib/spotify";
import { parseMood, MoodParameters } from "./lib/gemini";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState("");
  const [generating, setGenerating] = useState(false);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [moodParams, setMoodParams] = useState<MoodParameters | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  useEffect(() => {
    checkAuth();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkAuth();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  async function checkAuth() {
    try {
      const data = await getMe();
      if (data.authenticated) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    const url = await getAuthUrl();
    window.open(url, 'spotify_oauth', 'width=600,height=700');
  }

  async function handleGenerate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!mood.trim()) return;
    if (!user) {
      setError("Please connect your Spotify account first.");
      return;
    }

    setGenerating(true);
    setPlaylist([]);
    setExported(false);
    setError(null);
    
    try {
      console.log("Starting generation for mood:", mood);
      const params = await parseMood(mood);
      console.log("Gemini parsed mood params:", params);
      setMoodParams(params);
      
      console.log("Fetching recommendations from backend...");
      const data = await getRecommendations({ ...params, mood });
      console.log("Recommendations received:", data);
      setPlaylist(data.tracks);
      setIsFallback(!!data.is_fallback);
    } catch (err: any) {
      console.error("Generation failed", err);
      if (err.response?.status === 401) {
        setUser(null);
        setError("Your session has expired. Please connect Spotify again.");
      } else {
        const details = err.response?.data?.details;
        const detailsStr = typeof details === 'string' ? details : (details ? JSON.stringify(details) : "");
        const message = err.response?.data?.message || err.message || "Something went wrong. Please try again.";
        
        if (message === "[object Object]") {
          setError("Spotify API returned an obscure error. This usually means a temporary connection issue. Please try again in a moment.");
        } else {
          setError(`${message}${detailsStr && detailsStr !== "{}" ? ` (${detailsStr})` : ""}`);
        }
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleExport() {
    if (!playlist.length) return;
    setExporting(true);
    try {
      const uris = playlist.map(t => t.uri);
      const name = `MoodTune: ${mood.charAt(0).toUpperCase() + mood.slice(1)}`;
      await createPlaylist(name, uris);
      setExported(true);
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setExporting(false);
    }
  }

  async function checkHealth() {
    setCheckingHealth(true);
    try {
      const response = await fetch("/api/spotify/health");
      const data = await response.json();
      setHealthStatus(data);
    } catch (err: any) {
      setHealthStatus({ status: "error", message: err.message });
    } finally {
      setCheckingHealth(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-green-500/30">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-900/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            <Music className="text-black w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tighter">MoodTune</h1>
        </div>
        
        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium">{user.display_name}</span>
              <span className="text-[10px] text-white/40 uppercase tracking-widest">Spotify Connected</span>
            </div>
            <img 
              src={user.images?.[0]?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full border border-white/10"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <button 
            onClick={handleLogin}
            className="px-6 py-2 bg-green-500 text-black font-bold rounded-full hover:scale-105 transition-transform active:scale-95 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
          >
            Connect Spotify
          </button>
        )}
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Search Section */}
        <section className="mb-16 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-[0.9]"
          >
            What's your <span className="text-green-500">vibe</span> today?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/60 text-lg mb-10 max-w-xl mx-auto"
          >
            Describe your mood, activity, or a specific feeling. Our AI will curate the perfect Spotify playlist for you.
          </motion.p>

          <form onSubmit={handleGenerate} className="relative max-w-2xl mx-auto">
            <input 
              type="text" 
              value={mood}
              onChange={(e) => {
                setMood(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. late night drive through Tokyo, rainy jazz study session, high energy gym pump..."
              className={cn(
                "w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all placeholder:text-white/20",
                error && "border-red-500/50 focus:ring-red-500/50"
              )}
            />
            <button 
              disabled={generating}
              className="absolute right-2 top-2 bottom-2 px-6 bg-green-500 text-black font-bold rounded-xl flex items-center gap-2 hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              <span className="hidden sm:inline">Generate</span>
            </button>
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-sm text-red-500 flex items-center justify-center gap-1"
              >
                <Info className="w-4 h-4" /> {error}
              </motion.p>
            )}
            {!user && !error && (
              <p className="mt-4 text-sm text-white/40 flex items-center justify-center gap-1">
                <Info className="w-4 h-4" /> Connect Spotify to generate playlists
              </p>
            )}
          </form>
        </section>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {generating ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
                <Music className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-500 w-8 h-8" />
              </div>
              <p className="text-white/60 animate-pulse font-mono text-sm tracking-widest uppercase">Analyzing your vibe...</p>
            </motion.div>
          ) : playlist.length > 0 ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 bg-white/5 p-8 rounded-3xl border border-white/10">
                <div>
                  <div className="flex items-center gap-2 text-green-500 mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">AI Interpretation</span>
                    {isFallback && (
                      <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-[10px] rounded-full border border-yellow-500/30">
                        Search Fallback
                      </span>
                    )}
                  </div>
                  <h3 className="text-3xl font-bold mb-2 capitalize">{mood}</h3>
                  <p className="text-white/60 text-sm max-w-lg italic">
                    "{moodParams?.explanation}"
                  </p>
                  <div className="flex gap-4 mt-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/40 uppercase tracking-tighter">Energy</span>
                      <span className="font-mono text-green-500">{Math.round((moodParams?.target_energy || 0) * 100)}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/40 uppercase tracking-tighter">Valence</span>
                      <span className="font-mono text-green-500">{Math.round((moodParams?.target_valence || 0) * 100)}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/40 uppercase tracking-tighter">Tempo</span>
                      <span className="font-mono text-green-500">{Math.round(moodParams?.target_tempo || 0)} BPM</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleGenerate()}
                    className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={handleExport}
                    disabled={exporting || exported}
                    className={cn(
                      "px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all",
                      exported 
                        ? "bg-green-500/20 text-green-500 border border-green-500/30" 
                        : "bg-green-500 text-black hover:scale-105 active:scale-95"
                    )}
                  >
                    {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : exported ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {exported ? "Saved to Spotify" : "Save to Spotify"}
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                {playlist.map((track, i) => (
                  <motion.div 
                    key={track.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                  >
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <img 
                        src={track.album.images[0]?.url} 
                        alt={track.name} 
                        className="w-full h-full object-cover rounded-md"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                        <Play className="w-5 h-5 fill-white" />
                      </div>
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-bold truncate group-hover:text-green-500 transition-colors">{track.name}</h4>
                      <p className="text-sm text-white/40 truncate">{track.artists.map((a: any) => a.name).join(", ")}</p>
                    </div>
                    <div className="hidden sm:block text-white/20 font-mono text-xs">
                      {Math.floor(track.duration_ms / 60000)}:{String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}
                    </div>
                    <a 
                      href={track.external_urls.spotify} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-white/20 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-white/5 mt-20 text-center">
        <p className="text-white/20 text-sm flex items-center justify-center gap-2 mb-4">
          Powered by <span className="text-white/40 font-bold">Gemini AI</span> & <span className="text-white/40 font-bold">Spotify API</span>
        </p>
        
        {user && (
          <div className="max-w-xs mx-auto">
            <button 
              onClick={checkHealth}
              disabled={checkingHealth}
              className="text-[10px] uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors flex items-center gap-2 mx-auto"
            >
              {checkingHealth ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              System Health Check
            </button>
            {healthStatus && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 text-left"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] uppercase font-bold text-white/40">Status</span>
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    healthStatus.status === "ok" ? "bg-green-500" : "bg-red-500"
                  )} />
                </div>
                <pre className="text-[10px] font-mono text-white/60 overflow-auto max-h-32">
                  {JSON.stringify(healthStatus, null, 2)}
                </pre>
              </motion.div>
            )}
          </div>
        )}
      </footer>
    </div>
  );
}
