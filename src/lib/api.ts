import axios from "axios";

// VITE_API_URL se usa en producción para apuntar al backend;
// en desarrollo, si no está definida, se usa http://localhost:3001/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
  
});

export default api;
