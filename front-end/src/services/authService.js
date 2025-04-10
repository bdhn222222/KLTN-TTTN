import api from "../config/axios";

export const authService = {
    // Đăng nhập cho tất cả các role
    login: async (email, password, role) => {
        try {
            console.log('Sending login request with:', { email, password, role });
            const response = await api.post(`/${role}/login`, {
                email,
                password,
            });
            console.log('Login response:', response);
            return response.data;
        } catch (error) {
            console.error('Login error details:', {
                error,
                response: error.response,
                request: error.request,
                message: error.message
            });
            
            if (error.response) {
                // Có response từ server với status code nằm ngoài range 2xx
                throw {
                    message: error.response.data.message || 'Đăng nhập thất bại',
                    status: error.response.status,
                    details: error.response.data
                };
            } else if (error.request) {
                // Request được gửi nhưng không nhận được response
                throw {
                    message: 'Không thể kết nối đến server',
                    status: 503,
                    details: 'Vui lòng kiểm tra kết nối mạng và thử lại'
                };
            } else {
                // Có lỗi khi setting up request
                throw {
                    message: 'Có lỗi xảy ra',
                    status: 500,
                    details: error.message
                };
            }
        }
    },

    // Đăng ký chỉ dành cho Patient
    register: async (userData) => {
        try {
            const response = await api.post("/patient/register", userData);
            return response.data;
        } catch (error) {
            if (error.response) {
                throw {
                    message: error.response.data.message || 'Đăng ký thất bại',
                    status: error.response.status,
                    details: error.response.data
                };
            } else if (error.request) {
                throw {
                    message: 'Không thể kết nối đến server',
                    status: 503,
                    details: 'Vui lòng kiểm tra kết nối mạng và thử lại'
                };
            } else {
                throw {
                    message: 'Có lỗi xảy ra',
                    status: 500,
                    details: error.message
                };
            }
        }
    },
    
};