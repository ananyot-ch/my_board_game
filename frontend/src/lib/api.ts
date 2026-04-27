import axios from 'axios';

// VITE_API_URL: empty/undefined = use Vite proxy (`/api` → backend in dev/local)
//               https://your-backend.onrender.com = used directly in prod (Vercel)
const baseURL = `${import.meta.env.VITE_API_URL ?? ''}/api`;

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
