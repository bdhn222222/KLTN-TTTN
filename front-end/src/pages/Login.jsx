import React from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { notification, Form, Input } from 'antd';

const Login = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [api, contextHolder] = notification.useNotification();

  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: 'topRight',
      duration: 3,
      style: {
        fontFamily: 'Inter'
      },
    });
  };

  const onFinish = async (values) => {
    try {
      const response = await authService.login(values.email, values.password);
      console.log("Login response:", response); // Debug log

      // Lưu token
      localStorage.setItem("token", response.token);

      // Kiểm tra role và lưu thông tin user tương ứng
      if (response.doctor) {
        localStorage.setItem("user", JSON.stringify({
          ...response.doctor,
          role: 'doctor'
        }));
        showNotification(
          'success',
          'Đăng nhập thành công!',
          'Chào mừng bác sĩ quay trở lại Prescripto'
        );
        navigate("/doctor/dashboard");
      } else if (response.patient) {
        localStorage.setItem("user", JSON.stringify({
          ...response.patient,
          role: 'patient'
        }));
        showNotification(
          'success',
          'Đăng nhập thành công!',
          'Chào mừng bạn quay trở lại Prescripto'
        );
        navigate("/");
      } else {
        throw new Error('Invalid user role');
      }
    } catch (error) {
      console.error("Login error:", error);
      
      let errorMessage = '';
      if (error.status === 401) {
        errorMessage = 'Email hoặc mật khẩu không chính xác';
      } else if (error.status === 404) {
        errorMessage = 'Tài khoản không tồn tại';
      } else if (error.status === 503) {
        errorMessage = 'Không thể kết nối đến server. Vui lòng thử lại sau';
      } else {
        errorMessage = error.message || 'Có lỗi xảy ra. Vui lòng thử lại';
      }

      showNotification(
        'error',
        'Đăng nhập không thành công',
        errorMessage
      );
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center">
      {contextHolder}
      <div className="flex flex-col gap-3 m-auto items-start p-8 min-w-[800px] border rounder-xl text-zinc-600 text-sm shadow-lg">
        <p className="text-2xl font-semibold w-full text-center">Login</p>
        <p className="w-full text-center">Please log in to book appointment</p>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="w-full"
          requiredMark={false}
        >
          <div className="grid grid-cols-2 gap-4 w-full">
            <Form.Item
              label={<span>Email <span style={{ color: 'red' }}>(*)</span></span>}
              name="email"
              rules={[
                { required: true, message: 'Email không được để trống' },
                { type: 'email', message: 'Email không hợp lệ' }
              ]}
            >
              <Input placeholder="Enter your email" />
            </Form.Item>

            <Form.Item
              label={<span>Password <span style={{ color: 'red' }}>(*)</span></span>}
              name="password"
              rules={[
                { required: true, message: 'Mật khẩu không được để trống' },
                { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' }
              ]}
            >
              <Input.Password placeholder="Enter your password" />
            </Form.Item>
          </div>

          <Form.Item>
            <button
              type="submit"
              className="bg-blue-900 !text-white w-full py-2 rounded-md mt-4 hover:bg-white hover:!text-blue-900 border border-blue-900 transition-colors"
            >
              Login
            </button>
          </Form.Item>
        </Form>

        <p className="w-full text-center">
          Create an new account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-blue-900 underline cursor-pointer"
          >
            click here
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;