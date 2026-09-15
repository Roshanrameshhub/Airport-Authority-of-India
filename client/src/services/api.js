/**
 * Standardized API client for AAI Asset Management System
 */

// Base API URL configuration
// When deployed on Vercel, VITE_API_URL points to Render backend:
// e.g. https://airport-authority-of-india.onrender.com
const RAW_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const API_HOST = RAW_BASE_URL;
export const API_BASE_URL = `${RAW_BASE_URL}/api/v1`;

/**
 * Normalizes any relative or absolute endpoint into a fully qualified API URL.
 * Prevents '/api/v1/api/v1' duplication.
 */
export const buildApiUrl = (endpoint) => {
  if (!endpoint) return API_BASE_URL;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (cleanEndpoint.startsWith('/api/v1')) {
    return `${RAW_BASE_URL}${cleanEndpoint}`;
  }
  return `${API_BASE_URL}${cleanEndpoint}`;
};

// Intercept window.fetch globally so all relative /api/v1 requests throughout all pages
// seamlessly route to VITE_API_URL in production without breaking Vite proxy in local dev.
if (typeof window !== 'undefined' && window.fetch && RAW_BASE_URL) {
  if (!window._aaiFetchPatched) {
    const nativeFetch = window.fetch;
    window.fetch = function (input, init) {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        input = `${RAW_BASE_URL}${input}`;
      } else if (input instanceof URL && input.pathname.startsWith('/api/')) {
        input = new URL(`${RAW_BASE_URL}${input.pathname}${input.search}`);
      }
      return nativeFetch.call(this, input, init);
    };
    window._aaiFetchPatched = true;
  }
}

export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('aai_ams_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const targetUrl = buildApiUrl(endpoint);
    const response = await fetch(targetUrl, config);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'API request failed');
      error.status = response.status;
      error.errors = data.errors;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
};

export const checkSystemHealth = async () => {
  return apiClient('/health');
};

/**
 * Authenticated Client-Side PDF Downloader
 * 1. Reads authenticated JWT token from localStorage.
 * 2. Makes an authenticated fetch request to the PDF endpoint.
 * 3. Includes the Authorization: Bearer <token> header.
 * 4. Receives the binary PDF response as a Blob.
 * 5. Creates a temporary object URL.
 * 6. Triggers clean client-side file download.
 * 7. Safely revokes and cleans up the temporary object URL.
 */
export const downloadAuthenticatedPdf = async (url, fallbackFilename = 'AAI_Document.pdf') => {
  const token = localStorage.getItem('aai_ams_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const targetUrl = buildApiUrl(url);
  const response = await fetch(targetUrl, { headers });

  if (!response.ok) {
    let errorMessage = 'Failed to download official PDF document';
    try {
      const errorJson = await response.json();
      if (errorJson.message) errorMessage = errorJson.message;
    } catch {}
    throw new Error(errorMessage);
  }

  // Read filename from Content-Disposition header if available
  let filename = fallbackFilename;
  const disposition = response.headers.get('Content-Disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      filename = match[1].trim();
    }
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up object URL after short delay
  setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 2000);
};

/**
 * Authenticated Client-Side PDF Preview in New Tab
 */
export const openAuthenticatedPdf = async (url) => {
  const token = localStorage.getItem('aai_ams_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const targetUrl = buildApiUrl(url);
  const response = await fetch(targetUrl, { headers });

  if (!response.ok) {
    let errorMessage = 'Failed to preview PDF document';
    try {
      const errorJson = await response.json();
      if (errorJson.message) errorMessage = errorJson.message;
    } catch {}
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  window.open(objectUrl, '_blank');

  setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 60000);
};

export const api = {
  get: (endpoint) => apiClient(endpoint, { method: 'GET' }),
  post: (endpoint, data) => apiClient(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: (endpoint, data) => apiClient(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  patch: (endpoint, data) => apiClient(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  delete: (endpoint) => apiClient(endpoint, { method: 'DELETE' }),
};

export const verificationApi = {
  getCampaigns: async () => {
    return api.get('/verification/campaigns');
  },
  getCampaignById: async (id) => {
    return api.get(`/verification/campaigns/${id}`);
  },
  createCampaign: async (data) => {
    return api.post('/verification/campaigns', data);
  },
  recordVerification: async (id, data) => {
    return api.post(`/verification/campaigns/${id}/verify`, data);
  },
  finalizeCampaign: async (id) => {
    return api.post(`/verification/campaigns/${id}/finalize`);
  }
};

