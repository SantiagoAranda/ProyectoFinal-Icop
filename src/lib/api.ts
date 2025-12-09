// src/lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3001/api",
});

// ⬇️ Interceptor para agregar el token a TODAS las requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // usa la misma key que en el login

    if (token) {
      // aseguramos que headers exista
      config.headers = config.headers || {};

      // Solo seteamos Authorization si no viene seteado a mano
      if (!config.headers["Authorization"] && !config.headers["authorization"]) {
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
