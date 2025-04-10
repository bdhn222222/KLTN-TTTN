import React from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { DatePicker, notification, Form, Input, Select } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Kích hoạt plugin customParseFormat
dayjs.extend(customParseFormat);

const dateFormat = 'YYYY-MM-DD';

const Register = () => {
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

  const handleDateChange = (date) => {
    form.setFieldValue('date_of_birth', date);
  };

  const onFinish = async (values) => {
    try {
      console.log("Sending registration data:", values);
      const response = await authService.register(values);
      console.log("Registration response:", response);
      showNotification(
        'success',
        'Đăng ký thành công!',
        'Chào mừng bạn đến với Prescripto. Vui lòng đăng nhập để tiếp tục.'
      );
      navigate('/login');
    } catch (error) {
      console.error("Registration error:", error);
      
      let errorMessage = error.message || 'Có lỗi xảy ra. Vui lòng thử lại';
      showNotification(
        'error',
        'Đăng ký không thành công',
        errorMessage
      );
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center">
      {contextHolder}
      <div className="flex flex-col gap-3 m-auto items-start p-8 min-w-[800px] border rounder-xl text-zinc-600 text-sm shadow-lg">
        <p className="text-2xl font-semibold w-full text-center">Create Account</p>
        <p className="w-full text-center">Please sign up to book appointment</p>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="w-full"
          requiredMark={false}
        >
          <div className="grid grid-cols-2 gap-4 w-full">
            {/* Cột trái */}
            <div className="flex flex-col gap-3">
              <Form.Item
                label={<span>Full Name <span style={{ color: 'red' }}>(*)</span></span>}
                name="username"
                rules={[{ required: true, message: 'Tên đăng nhập không được để trống' }]}
              >
                <Input placeholder="Enter your full name" />
              </Form.Item>

              <Form.Item
                label={<span>Phone Number <span style={{ color: 'red' }}>(*)</span></span>}
                name="phone_number"
                rules={[{ required: true, message: 'Số điện thoại không được để trống' }]}
              >
                <Input placeholder="Enter your phone number" />
              </Form.Item>

              <Form.Item
                label={<span>Date of Birth <span style={{ color: 'red' }}>(*)</span></span>}
                name="date_of_birth"
                rules={[{ required: true, message: 'Ngày sinh không được để trống' }]}
              >
                <DatePicker
                  className="w-full"
                  format={dateFormat}
                  onChange={handleDateChange}
                  placeholder="Select your date of birth"
                  minDate={dayjs('1900-01-01', dateFormat)}
                  maxDate={dayjs().subtract(1, 'year')}
                />
              </Form.Item>

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
            </div>

            {/* Cột phải */}
            <div className="flex flex-col gap-3">
              <Form.Item
                label={<span>Gender <span style={{ color: 'red' }}>(*)</span></span>}
                name="gender"
                rules={[{ required: true, message: 'Vui lòng chọn giới tính' }]}
              >
                <Select placeholder="Select gender">
                  <Select.Option value="male">Male</Select.Option>
                  <Select.Option value="female">Female</Select.Option>
                  <Select.Option value="other">Other</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label={<span>Address <span style={{ color: 'red' }}>(*)</span></span>}
                name="address"
                rules={[{ required: true, message: 'Địa chỉ không được để trống' }]}
              >
                <Input placeholder="Enter your address" />
              </Form.Item>

              <Form.Item
                label={<span>Insurance Number <span style={{ color: 'red' }}>(*)</span></span>}
                name="insurance_number"
                rules={[{ required: true, message: 'Mã số BHYT không được để trống' }]}
              >
                <Input placeholder="Enter your insurance number" />
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
          </div>

          <Form.Item>
            <button
              type="submit"
              className="bg-blue-900 !text-white w-full py-2 rounded-md mt-4 hover:bg-white hover:!text-blue-900 border border-blue-900 transition-colors"
            >
              Create Account
            </button>
          </Form.Item>
        </Form>

        <p className="w-full text-center">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-blue-900 underline cursor-pointer"
          >
            Login here
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register; 