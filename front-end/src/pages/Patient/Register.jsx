import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DatePicker, notification, Form, Input, Select, Button, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import axios from 'axios';
import { AppContext } from "../../context/AppContext";
import { useContext } from "react";

// Kích hoạt plugin customParseFormat
dayjs.extend(customParseFormat);

const dateFormat = 'YYYY-MM-DD';

const Register = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [api, contextHolder] = notification.useNotification();
  const { url1 } = useContext(AppContext);

  const showNotification = (type, message, description) => {
    const icons = {
      success: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      error: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      info: <InfoCircleOutlined style={{ color: '#1890ff' }} />
    };

    api[type]({
      message: message,
      description: description,
      placement: 'topRight',
      duration: 5,
      icon: icons[type],
      style: {
        fontFamily: 'Inter',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }
    });
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      console.log("Sending registration data:", values);
      
      const requestData = {
        username: values.username,
        email: values.email,
        password: values.password,
        date_of_birth: dayjs(values.date_of_birth).format('YYYY-MM-DD'),
        gender: values.gender,
        phone_number: values.phone_number,
        insurance_number: values.insurance_number,
        id_number: values.id_number,
        address: values.address,
        role: 'patient'
      };

      console.log("Request data:", requestData);

      const response = await axios.post(`${url1}/patient/register`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log("Registration response:", response);

      if (response.data.message === "Đăng ký account bệnh nhân thành công") {
        showNotification(
          'success',
          'Đăng ký thành công!',
          'Chào mừng bạn đến với Prescripto. Vui lòng kiểm tra email để xác thực tài khoản.'
        );
        
        // Delay navigation to allow user to see the success message
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      console.error("Registration error:", error);
      
      let errorMessage = error.response?.data?.message || error.message || 'Có lỗi xảy ra. Vui lòng thử lại';
      showNotification(
        'error',
        'Đăng ký không thành công',
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center">
      {contextHolder}
      <div className="flex flex-col gap-3 m-auto items-start p-8 min-w-[800px] border rounded-xl text-zinc-600 text-sm shadow-lg">
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
                rules={[{ required: true, message: 'Tên đầy đủ không được để trống' }]}
              >
                <Input placeholder="Enter your full name" />
              </Form.Item>

              <Form.Item
                label={<span>Phone Number <span style={{ color: 'red' }}>(*)</span></span>}
                name="phone_number"
                rules={[
                  { required: true, message: 'Số điện thoại không được để trống' },
                  { pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại không hợp lệ' }
                ]}
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

              <Form.Item
                label={<span>ID Number <span style={{ color: 'red' }}>(*)</span></span>}
                name="id_number"
                rules={[
                  { required: true, message: 'Số CMND/CCCD không được để trống' },
                  { pattern: /^[0-9]{9,12}$/, message: 'Số CMND/CCCD không hợp lệ' }
                ]}
              >
                <Input placeholder="Enter your ID number" />
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
                label={<span>Insurance Number <span style={{ color: 'red' }}>(*)</span></span>}
                name="insurance_number"
                rules={[
                  { required: true, message: 'Mã số BHYT không được để trống' },
                  { pattern: /^[0-9]{10}$/, message: 'Mã số BHYT phải có 10 chữ số' }
                ]}
              >
                <Input placeholder="Enter your insurance number" />
              </Form.Item>

              <Form.Item
                label={<span>Address <span style={{ color: 'red' }}>(*)</span></span>}
                name="address"
                rules={[{ required: true, message: 'Địa chỉ không được để trống' }]}
              >
                <Input.TextArea 
                  placeholder="Enter your address" 
                  autoSize={{ minRows: 2, maxRows: 3 }}
                />
              </Form.Item>

              <Form.Item
                label={<span>Password <span style={{ color: 'red' }}>(*)</span></span>}
                name="password"
                rules={[
                  { required: true, message: 'Mật khẩu không được để trống' },
                  { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
                  {
                    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/,
                    message: 'Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường, một số và một ký tự đặc biệt'
                  }
                ]}
              >
                <Input.Password placeholder="Enter your password" />
              </Form.Item>
            </div>
          </div>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="bg-blue-900 text-white w-full py-2 h-auto rounded-md mt-4 hover:bg-blue-800 border-none"
              loading={loading}
              size="large"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
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