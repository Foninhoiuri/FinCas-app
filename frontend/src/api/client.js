const API_BASE = '/api';

/**
 * Core request function with automatic household/user headers
 */
async function request(endpoint, options = {}) {
  const householdId = localStorage.getItem('financas_household_id');
  const userStr = localStorage.getItem('financas_user');
  const userId = userStr ? JSON.parse(userStr)?.id : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(householdId && { 'X-Household-Id': householdId }),
    ...(userId && { 'X-User-Id': userId }),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth (public — no household guard)
  validateToken: (invite_token) => request('/auth/validate-token', { method: 'POST', body: JSON.stringify({ invite_token }) }),
  getUsers: (params) => request(`/auth/users?${new URLSearchParams(params)}`),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  changePin: (data) => request('/auth/pin', { method: 'PATCH', body: JSON.stringify(data) }),
  getProfile: (id) => request(`/auth/profile/${id}`),
  updateProfile: (id, data) => request(`/auth/profile/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  uploadAvatar: async (id, file) => {
    const householdId = localStorage.getItem('financas_household_id');
    const userStr = localStorage.getItem('financas_user');
    const userId = userStr ? JSON.parse(userStr)?.id : null;

    const formData = new FormData();
    formData.append('avatar', file);
    const headers = {};
    if (householdId) headers['X-Household-Id'] = householdId;
    if (userId) headers['X-User-Id'] = userId;
    const res = await fetch(`${API_BASE}/auth/profile/${id}/avatar`, { method: 'POST', body: formData, headers });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Upload falhou'); }
    return res.json();
  },

  // Households (super_admin / admin)
  getHouseholds: () => request('/households'),
  getOwnHousehold: () => request('/households/me'),
  createHousehold: (data) => request('/households', { method: 'POST', body: JSON.stringify(data) }),
  updateHousehold: (id, data) => request(`/households/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteHousehold: (id) => request(`/households/${id}`, { method: 'DELETE' }),
  resetHouseholdToken: (id) => request(`/households/${id}/reset-token`, { method: 'PATCH' }),
  updateHouseholdCurrency: (id, currency) => request(`/households/${id}/currency`, { method: 'PATCH', body: JSON.stringify({ currency }) }),
  resetUserPin: (householdId, data) => request(`/households/${householdId}/reset-pin`, { method: 'POST', body: JSON.stringify(data) }),
  getMembers: (householdId) => request(`/households/${householdId}/members`),
  addMember: (householdId, data) => request(`/households/${householdId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (householdId, uid, data) => request(`/households/${householdId}/members/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  toggleMember: (householdId, uid) => request(`/households/${householdId}/members/${uid}/toggle`, { method: 'PATCH' }),

  // Dashboard
  getSummary: (params) => request(`/dashboard/summary?${new URLSearchParams(params)}`),
  getBreakdown: (params) => request(`/dashboard/breakdown?${new URLSearchParams(params)}`),
  getEvolution: (params) => request(`/dashboard/evolution?${new URLSearchParams(params)}`),

  // Transactions
  getTransactions: (params) => request(`/transactions?${new URLSearchParams(params)}`),
  getTransaction: (id) => request(`/transactions/${id}`),
  addTransaction: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id, data) => request(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTransaction: (id, params) => request(`/transactions/${id}${params ? '?' + new URLSearchParams(params) : ''}`, { method: 'DELETE' }),

  // Banks
  getBanks: (params) => request(`/banks?${new URLSearchParams(params)}`),
  createBank: (data) => request('/banks', { method: 'POST', body: JSON.stringify(data) }),
  updateBank: (id, data) => request(`/banks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBank: (id) => request(`/banks/${id}`, { method: 'DELETE' }),

  // Categories (global, no household)
  getCategories: (params) => request(`/categories?${new URLSearchParams(params)}`),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Bills
  getBills: (params) => request(`/bills?${new URLSearchParams(params)}`),
  updateBill: (id, data) => request(`/bills/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBill: (id) => request(`/bills/${id}`, { method: 'DELETE' }),

  // Cards
  getCards: (params) => request(`/cards?${new URLSearchParams(params)}`),
  createCard: (data) => request('/cards', { method: 'POST', body: JSON.stringify(data) }),
  updateCard: (id, data) => request(`/cards/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCard: (id) => request(`/cards/${id}`, { method: 'DELETE' }),
  getCardPurchases: (cardId, params) => request(`/cards/${cardId}/purchases?${new URLSearchParams(params)}`),
  addPurchase: (cardId, data) => request(`/cards/${cardId}/purchases`, { method: 'POST', body: JSON.stringify(data) }),
  getCardInvoice: (cardId, params) => request(`/cards/${cardId}/invoice?${new URLSearchParams(params)}`),
  payCardInvoice: (cardId, data) => request(`/cards/${cardId}/pay-invoice`, { method: 'POST', body: JSON.stringify(data) }),
  updatePurchase: (purchaseId, data) => request(`/cards/purchases/${purchaseId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePurchase: (purchaseId) => request(`/cards/purchases/${purchaseId}`, { method: 'DELETE' }),

  // Goals
  getGoals: (params) => request(`/goals?${new URLSearchParams(params)}`),
  createGoal: (data) => request('/goals', { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (id, data) => request(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteGoal: (id) => request(`/goals/${id}`, { method: 'DELETE' }),
  depositGoal: (id, data) => request(`/goals/${id}/deposit`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Logs
  getLogs: (params) => request(`/logs?${new URLSearchParams(params)}`),
  addLog: (data) => request('/logs', { method: 'POST', body: JSON.stringify(data) }),
  clearLogs: (days) => request(`/logs?days=${days || 30}`, { method: 'DELETE' }),

  // Recurring
  getRecurring: (params) => request(`/recurring?${new URLSearchParams(params)}`),
  getRecurringMonth: (month, params) => request(`/recurring/month/${month}?${new URLSearchParams(params)}`),
  createRecurring: (data) => request('/recurring', { method: 'POST', body: JSON.stringify(data) }),
  updateRecurring: (id, data) => request(`/recurring/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRecurring: (id, scope, month) => request(`/recurring/${id}?scope=${scope}&month=${month || ''}`, { method: 'DELETE' }),

  // Health (public)
  health: () => request('/health'),

  // Budgets
  getBudgets: (params) => request(`/budgets?${new URLSearchParams(params)}`),
  createBudget: (data) => request('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  updateBudget: (id, data) => request(`/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBudget: (id) => request(`/budgets/${id}`, { method: 'DELETE' }),
};
