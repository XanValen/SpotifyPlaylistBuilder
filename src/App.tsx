import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import {
  Music,
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
import { getAuthUrl, getMe, getRecommendations, createPlaylist, getTrending, searchSongs } from "./lib/spotify";
import { TrendingUp, Search } from "lucide-react";
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [trendingTracks, setTrendingTracks] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [songQuery, setSongQuery] = useState("");
  const [songResults, setSongResults] = useState<any[]>([]);
  const [songSearching, setSongSearching] = useState(false);
  const [songSearchError, setSongSearchError] = useState<string | null>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-profile-menu]')) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showProfileMenu]);

  async function checkAuth() {
    try {
      const data = await getMe();
      if (data.authenticated) {
        setUser(data.user);
        fetchTrending();
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

  async function handleSongSearch(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!songQuery.trim()) return;
    setSongSearching(true);
    setSongSearchError(null);
    setSongResults([]);
    try {
      const data = await searchSongs(songQuery);
      setSongResults(data.tracks || []);
    } catch (error: any) {
      setSongSearchError(error?.response?.data?.message || error?.message || "Search failed");
    } finally {
      setSongSearching(false);
    }
  }

  async function fetchTrending() {
    setTrendingLoading(true);
    setTrendingError(null);
    try {
      const data = await getTrending();
      setTrendingTracks(data.tracks || []);
    } catch (error: any) {
      console.error("Failed to fetch trending", error);
      setTrendingError(error?.response?.data?.message || error?.message || "Failed to load trending tracks");
    } finally {
      setTrendingLoading(false);
    }
  }

  async function handleLogin() {
    const url = await getAuthUrl();
    window.open(url, 'spotify_oauth', 'width=600,height=700');
  }

  async function handleLogout() {
    try {
      await axios.post('/api/auth/logout');
      setUser(null);
      setPlaylist([]);
      setMood("");
      setMoodParams(null);
      setError(null);
    } catch (error) {
      console.error("Logout failed:", error);
      setError("Failed to logout. Please try again.");
    }
  }

  async function handleGenerate(e?: React.SyntheticEvent) {
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
    <div className="w-full min-h-screen bg-[#050505] text-white font-sans selection:bg-green-500/30">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-900/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      {/* Header */}
      <header className="relative w-full z-10 p-6 flex justify-between items-center border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            <Music className="text-black w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tighter">MoodTune</h1>
        </div>
        
        {user ? (
          <div className="relative" data-profile-menu>
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-4 hover:opacity-80 transition-opacity"
            >
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium">{user.display_name}</span>
                <span className="text-[10px] text-white/40 uppercase tracking-widest">Spotify Connected</span>
              </div>
              <img 
                src={user.images?.[0]?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                alt="Avatar" 
                className="w-10 h-10 rounded-full border border-white/10 hover:border-white/30 transition-colors"
                referrerPolicy="no-referrer"
              />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-48 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg shadow-lg p-2 z-50"
                >
                  <div className="px-3 py-2 border-b border-white/10 mb-2">
                    <p className="text-sm font-medium">{user.display_name}</p>
                    <p className="text-xs text-white/50">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-md transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
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

      <main className="relative z-10 w-full mx-auto px-4 sm:px-6 flex flex-col items-center" style={{ paddingTop: '40px', paddingBottom: '100px' }}>
        {/* Search Section */}
        <section className="text-center w-full max-w-2xl mx-auto flex flex-col items-center" style={{ marginBottom: '80px' }}>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl sm:text-7xl font-bold tracking-tight leading-[0.9] text-center"
            style={{ marginBottom: '80px' }}
          >
            What's your <span className="text-green-500">vibe</span> today?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/60 text-lg max-w-xl mx-auto"
            style={{ marginBottom: '32px' }}
          >
            Describe your mood, activity, or a specific feeling. Our AI will curate the perfect Spotify playlist for you.
          </motion.p>

          <form onSubmit={handleGenerate} className="relative w-full max-w-2xl mx-auto flex flex-col items-center" style={{ gap: '16px' }}>
            <input 
              type="text" 
              value={mood}
              onChange={(e) => {
                setMood(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. late night drive through Tokyo, rainy jazz study session, high energy gym pump..."
              className={cn(
                "w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-6 text-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all placeholder:text-white/20",
                error && "border-red-500/50 focus:ring-red-500/50"
              )}
            />
            <button 
              disabled={generating}
              className="px-10 py-4 bg-green-500 text-black font-bold rounded-xl flex items-center gap-3 hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              <span className="hidden sm:inline">Generate</span>
            </button>
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-500 flex items-center justify-center gap-1"
                style={{ marginTop: '60px' }}
              >
                <Info className="w-4 h-4" /> {error}
              </motion.p>
            )}
            {!user && !error && (
              <p className="text-sm text-white/40 flex items-center justify-center gap-1" style={{ marginTop: '60px' }}>
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
              className="w-full max-w-4xl flex flex-col items-center justify-center py-20 gap-4"
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
              className="w-full max-w-4xl space-y-16"
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

              <div className="grid gap-4">
                {playlist.map((track, i) => (
                  <motion.div 
                    key={track.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
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

        {/* Trending Section */}
        {user && (
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-4xl mt-24"
          >
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-bold tracking-tight">Trending This Week</h2>
              <span className="text-[10px] uppercase tracking-widest text-white/30 font-mono ml-1">Global Top 50</span>
            </div>

            {trendingLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
              </div>
            ) : trendingError ? (
              <p className="text-white/30 text-sm py-8 text-center">{trendingError}</p>
            ) : trendingTracks.length === 0 ? (
              <p className="text-white/30 text-sm py-8 text-center">No trending tracks available.</p>
            ) : (
              <div className="grid gap-2">
                {trendingTracks.map((track, i) => (
                  <div
                    key={track.id}
                    className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                  >
                    <span className="w-6 text-center text-white/20 font-mono text-sm flex-shrink-0">{i + 1}</span>
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <img
                        src={track.album.images[0]?.url}
                        alt={track.name}
                        className="w-full h-full object-cover rounded-md"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                        <Play className="w-4 h-4 fill-white" />
                      </div>
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold truncate group-hover:text-green-500 transition-colors text-sm">{track.name}</p>
                      <p className="text-xs text-white/40 truncate">{track.artists.map((a: any) => a.name).join(", ")}</p>
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
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* Song Search Section */}
        {user && (
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-4xl mb-8"
            style={{ marginTop: '80px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Search className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-bold tracking-tight">Search Songs</h2>
            </div>

            <form onSubmit={handleSongSearch} className="flex gap-3 mb-6">
              <input
                type="text"
                value={songQuery}
                onChange={(e) => setSongQuery(e.target.value)}
                placeholder="Search for a song or artist..."
                className="flex-grow bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all placeholder:text-white/20"
              />
              <button
                type="submit"
                disabled={songSearching}
                className="px-6 py-3 bg-green-500 text-black font-bold rounded-xl hover:bg-green-400 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {songSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </form>

            {songSearchError && (
              <p className="text-red-400 text-sm mb-4 flex items-center gap-2">
                <Info className="w-4 h-4" /> {songSearchError}
              </p>
            )}

            {songResults.length > 0 && (
              <div className="grid gap-2">
                {songResults.map((track) => (
                  <div
                    key={track.id}
                    className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                  >
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <img
                        src={track.album.images[0]?.url}
                        alt={track.name}
                        className="w-full h-full object-cover rounded-md"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                        <Play className="w-4 h-4 fill-white" />
                      </div>
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold truncate group-hover:text-green-500 transition-colors text-sm">{track.name}</p>
                      <p className="text-xs text-white/40 truncate">{track.artists.map((a: any) => a.name).join(", ")}</p>
                    </div>
                    <div className="hidden sm:block text-white/20 font-mono text-xs flex-shrink-0">
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
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-20 px-6 border-t border-white/5 mt-48 text-center">
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
