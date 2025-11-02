import axios from 'axios'

const API_URL = 'http://localhost:3000/api/estadisticas'

export const obtenerEstadisticas = async () => {
  const response = await axios.get(API_URL)
  return response.data
}