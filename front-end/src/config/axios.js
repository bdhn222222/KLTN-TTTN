import axios from "axios";
const api = axios.create({
  baseURL: "http://localhost:5001",
  headers: {
    "Content-Type": "application/json",
  },
});
// Interceptor để thêm token vào header
api.interceptors.request.use(
    (config) => {
        console.log('Request config:', config);
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Interceptor để xử lý response
api.interceptors.response.use(
    (response) => {
        console.log('Response:', response);
        return response;
    },
    (error) => {
        console.error('Response error:', {
            error,
            response: error.response,
            request: error.request,
            message: error.message
        });
        return Promise.reject(error);
    }
);

export default api;
