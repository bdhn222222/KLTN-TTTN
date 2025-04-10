import React from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { notification, Form, Input, Select } from 'antd';

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
      const response = await authService.login(values.email, values.password, values.role);
      console.log("Login response:", response);

      // Lưu token
      localStorage.setItem("token", response.token);

      // Lưu thông tin user dựa trên role
      const userData = {
        ...response[values.role],
        role: values.role
      };
      localStorage.setItem("user", JSON.stringify(userData));

      // Hiển thị thông báo và chuyển hướng dựa trên role
      const roleMessages = {
        patient: 'Chào mừng bạn quay trở lại Prescripto',
        doctor: 'Chào mừng bác sĩ quay trở lại Prescripto',
        pharmacist: 'Chào mừng dược sĩ quay trở lại Prescripto',
        admin: 'Chào mừng admin quay trở lại Prescripto'
      };

      showNotification(
        'success',
        'Đăng nhập thành công!',
        roleMessages[values.role]
      );

      // Chuyển hướng dựa trên role
      const roleRoutes = {
        patient: "/",
        doctor: "/doctor/dashboard",
        pharmacist: "/pharmacist/dashboard",
        admin: "/admin/dashboard"
      };
      navigate(roleRoutes[values.role]);

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
        <p className="w-full text-center">Please log in to access your account</p>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="w-full"
          requiredMark={false}
        >
          <div className="grid grid-cols-2 gap-4 w-full">
            <Form.Item
              label={<span>Role <span style={{ color: 'red' }}>(*)</span></span>}
              name="role"
              rules={[{ required: true, message: 'Vui lòng chọn role' }]}
            >
              <Select placeholder="Chọn role">
                <Select.Option value="patient">Bệnh nhân</Select.Option>
                <Select.Option value="doctor">Bác sĩ</Select.Option>
                <Select.Option value="pharmacist">Dược sĩ</Select.Option>
                <Select.Option value="admin">Admin</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label={<span>Email <span style={{ color: 'red' }}>(*)</span></span>}
              name="email"
              rules={[
                { required: true, message: 'Email không được để trống' },
                { type: 'email', message: 'Email không hợp lệ' }
              ]}
            >
              <Input placeholder="Nhập email" />
            </Form.Item>

            <Form.Item
              label={<span>Password <span style={{ color: 'red' }}>(*)</span></span>}
              name="password"
              rules={[
                { required: true, message: 'Mật khẩu không được để trống' },
                { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
              ]}
            >
              <Input.Password placeholder="Nhập mật khẩu" />
            </Form.Item>
          </div>

          <Form.Item>
            <button
              type="submit"
              className="w-full bg-blue-900 text-white py-2 rounded-md hover:bg-blue-800 transition duration-300"
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