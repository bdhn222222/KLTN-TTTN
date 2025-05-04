import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { notification, Form, Input, Select } from "antd";
import axios from "axios";
import { AppContext } from "../context/AppContext";

const Login = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [api, contextHolder] = notification.useNotification();
  const { url1, login } = useContext(AppContext);

  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: "topRight",
      duration: 3,
      style: {
        fontFamily: "Inter",
      },
    });
  };

  const onFinish = async (values) => {
    try {
      console.log("Login values:", values);

      const response = await axios.post(
        `${url1}/${values.role}/login`,
        {
          email: values.email,
          password: values.password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Login response:", response);

      // Lưu token và thông tin user
      localStorage.setItem("token", response.data.token);
      const userData = {
        ...response.data[values.role],
        role: values.role,
      };
      localStorage.setItem("user", JSON.stringify(userData));

      // Set user vào context
      login(userData);

      // Hiển thị thông báo thành công
      const roleMessages = {
        patient: "Chào mừng bạn quay trở lại Prescripto",
        doctor: "Chào mừng bác sĩ quay trở lại Prescripto",
        pharmacist: "Chào mừng dược sĩ quay trở lại Prescripto",
        admin: "Chào mừng admin quay trở lại Prescripto",
      };

      showNotification(
        "success",
        "Đăng nhập thành công!",
        roleMessages[values.role]
      );

      // Chuyển hướng dựa trên role
      const roleRoutes = {
        patient: "/",
        doctor: "/doctor/dashboard",
        pharmacist: "/pharmacists/prescription/pending_prepare",
        admin: "/admin/appointments/waiting-to-confirm",
      };
      navigate(roleRoutes[values.role]);
    } catch (error) {
      console.error("Login error:", error);

      let errorMessage = "Đã có lỗi xảy ra";

      if (error.response) {
        // Lỗi từ server
        const status = error.response.status;
        const data = error.response.data;

        console.log("Server error details:", {
          status,
          data,
          error: data.error || data.message,
        });

        switch (status) {
          case 400:
            errorMessage =
              data.error || data.message || "Thông tin đăng nhập không hợp lệ";
            break;
          case 401:
            errorMessage = "Email hoặc mật khẩu không chính xác";
            break;
          case 404:
            errorMessage = "Không tìm thấy tài khoản với email này";
            break;
          case 500:
            errorMessage = "Lỗi server, vui lòng thử lại sau";
            break;
          default:
            errorMessage =
              data.error || data.message || "Đã có lỗi xảy ra khi đăng nhập";
        }
      } else if (error.request) {
        // Lỗi không nhận được response
        errorMessage = "Không thể kết nối đến server";
      }

      showNotification("error", "Đăng nhập thất bại", errorMessage);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center">
      {contextHolder}
      <div className="flex flex-col gap-3 m-auto items-start p-8 min-w-[800px] border rounder-xl text-zinc-600 text-sm shadow-lg">
        <p className="text-2xl font-semibold w-full text-center">Login</p>
        <p className="w-full text-center">
          Please log in to access your account
        </p>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="w-full"
          requiredMark={false}
        >
          <div className="grid grid-cols-2 gap-4 w-full">
            <Form.Item
              label={
                <span>
                  Role <span style={{ color: "red" }}>(*)</span>
                </span>
              }
              name="role"
              rules={[{ required: true, message: "Vui lòng chọn role" }]}
            >
              <Select placeholder="Chọn role">
                <Select.Option value="patient">Bệnh nhân</Select.Option>
                <Select.Option value="doctor">Bác sĩ</Select.Option>
                <Select.Option value="pharmacist">Dược sĩ</Select.Option>
                <Select.Option value="admin">Admin</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label={
                <span>
                  Email <span style={{ color: "red" }}>(*)</span>
                </span>
              }
              name="email"
              rules={[
                { required: true, message: "Email không được để trống" },
                { type: "email", message: "Email không hợp lệ" },
              ]}
            >
              <Input placeholder="Nhập email" />
            </Form.Item>

            <Form.Item
              label={
                <span>
                  Password <span style={{ color: "red" }}>(*)</span>
                </span>
              }
              name="password"
              rules={[
                { required: true, message: "Mật khẩu không được để trống" },
                { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
              ]}
            >
              <Input.Password placeholder="Nhập mật khẩu" />
            </Form.Item>
          </div>

          <Form.Item>
            <button
              type="submit"
              className="w-full bg-blue-900 !text-white py-2 rounded-md hover:bg-blue-800 transition duration-300"
            >
              Login
            </button>
          </Form.Item>
        </Form>

        <p className="w-full text-center">
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-blue-900 underline cursor-pointer hover:text-blue-700 transition-colors"
          >
            Register here
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
