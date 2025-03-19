import axios from 'axios'
import env from '../config/env.config'

const axiosInstance = axios.create({
  baseURL: env.API_HOST,
  withCredentials: true, // Include cookies in cross-site requests
})

// Add request interceptor for debugging
axiosInstance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance
