import axios from "axios";

export async function getAuthUrl() {
  const { data } = await axios.get("/api/auth/url");
  return data.url;
}

export async function getMe() {
  const { data } = await axios.get("/api/auth/me");
  return data;
}

export async function getRecommendations(params: any) {
  const { data } = await axios.post("/api/spotify/recommendations", params);
  return data;
}

export async function createPlaylist(name: string, uris: string[]) {
  const { data } = await axios.post("/api/spotify/create-playlist", { name, uris });
  return data;
}

export async function getTrending() {
  const { data } = await axios.get("/api/spotify/trending");
  return data;
}

export async function searchSongs(query: string) {
  const { data } = await axios.get("/api/spotify/search-songs", { params: { q: query } });
  return data;
}
