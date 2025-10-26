import axios from "axios";

const api = axios.create({
  baseURL: "https://proyecto-final-icop-backend.onrender.com/api", // ⚙️ dominio de Render
});

export default api;