const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class ApiClient {
  async request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    let data;
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  }

  // AUTH
  login(username, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    });
  }
  me() { return this.request('/api/auth/me'); }
  logout() { return this.request('/api/auth/logout', { method: 'POST' }); }
  changeMyPassword(current_password, new_password) {
    return this.request('/api/profiles/me/password', {
      method: 'PATCH',
      body: { current_password, new_password }
    });
  }

  // ADMIN USERS
  listUsers() { return this.request('/api/admin/users'); }
  createUser(username, password, role) {
    return this.request('/api/admin/users', {
      method: 'POST',
      body: { username, password, role }
    });
  }
  updateUserRole(id, role) {
    return this.request(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: { role }
    });
  }
  resetUserPassword(id, password) {
    return this.request(`/api/admin/users/${id}/password`, {
      method: 'PATCH',
      body: { password }
    });
  }
  deleteUser(id) {
    return this.request(`/api/admin/users/${id}`, { method: 'DELETE' });
  }

  // PROFILES
  listProfiles() { return this.request('/api/profiles'); }
  getProfile(username) { return this.request(`/api/profiles/${username}`); }
  updateMyProfile(updates) {
    return this.request('/api/profiles/me', { method: 'PATCH', body: updates });
  }
  setMyImage(kind, url, public_id) {
    return this.request('/api/profiles/me/image', {
      method: 'POST',
      body: { kind, url, public_id }
    });
  }

  // UPLOADS
  getUploadSignature(kind) {
    return this.request('/api/uploads/signature', {
      method: 'POST',
      body: { kind }
    });
  }

  // CARDS
  listCards() { return this.request('/api/cards'); }
  getCard(id) { return this.request(`/api/cards/${id}`); }
  createCard(data) { return this.request('/api/cards', { method: 'POST', body: data }); }
  updateCard(id, data) { return this.request(`/api/cards/${id}`, { method: 'PATCH', body: data }); }
  deleteCard(id) { return this.request(`/api/cards/${id}`, { method: 'DELETE' }); }
  reorderCards(ids) {
    return this.request('/api/cards/reorder/all', { method: 'PATCH', body: { ids } });
  }

  // PLAYERS
  listPlayers(params = {}) {
    const qs = new URLSearchParams();
    if (params.faction) qs.set('faction', params.faction);
    if (params.search) qs.set('search', params.search);
    const suffix = qs.toString() ? `?${qs}` : '';
    return this.request(`/api/players${suffix}`);
  }
  getPlayer(id) { return this.request(`/api/players/${id}`); }
  createPlayer(data) { return this.request('/api/players', { method: 'POST', body: data }); }
  updatePlayer(id, data) { return this.request(`/api/players/${id}`, { method: 'PATCH', body: data }); }
  deletePlayer(id) { return this.request(`/api/players/${id}`, { method: 'DELETE' }); }

  // JUTSUS
  listJutsus() { return this.request('/api/jutsus'); }
  createJutsu(data) { return this.request('/api/jutsus', { method: 'POST', body: data }); }
  updateJutsu(id, data) { return this.request(`/api/jutsus/${id}`, { method: 'PATCH', body: data }); }
  deleteJutsu(id) { return this.request(`/api/jutsus/${id}`, { method: 'DELETE' }); }

  // FACTIONS
  listFactions() { return this.request('/api/factions'); }
  getFaction(id) { return this.request(`/api/factions/${id}`); }
  createFaction(data) { return this.request('/api/factions', { method: 'POST', body: data }); }
  updateFaction(id, data) { return this.request(`/api/factions/${id}`, { method: 'PATCH', body: data }); }
  deleteFaction(id) { return this.request(`/api/factions/${id}`, { method: 'DELETE' }); }
}

export const api = new ApiClient();
