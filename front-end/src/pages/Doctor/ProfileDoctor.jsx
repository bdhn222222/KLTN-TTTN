import React, { useState, useEffect, useContext } from 'react';
import { Layout, Card, Avatar, Typography, Descriptions, Tag, Spin, notification, Button, Form, Input, InputNumber, Select, Modal, Upload, Space } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  CalendarOutlined,
  MailOutlined,
  IdcardOutlined,
  BookOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  DollarOutlined,
  EditOutlined,
  SaveOutlined,
  UploadOutlined,
  LoadingOutlined,
  CloseOutlined
} from '@ant-design/icons';
import NavbarDoctor from '../../components/Doctor/NavbarDoctor';
import MenuDoctor from '../../components/Doctor/MenuDoctor';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';

const { Sider, Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;

const ProfileDoctor = () => {
  // State
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [formValues, setFormValues] = useState(null);
  const [form] = Form.useForm();
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  
  // Context
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();

  // Fetch doctor profile
  useEffect(() => {
    fetchDoctorProfile();
  }, []);

  useEffect(() => {
    if (doctorInfo && form) {
      setImageUrl(doctorInfo.avatar);
      form.setFieldsValue({
        username: doctorInfo.username,
        email: doctorInfo.email,
        degree: doctorInfo.doctor.degree,
        experience_years: doctorInfo.doctor.experience_years,
        description: doctorInfo.doctor.description,
        specialization_id: doctorInfo.doctor.specialization_id
      });
    }
  }, [doctorInfo, form]);

  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: 'topRight',
      duration: 3,
    });
  };

  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url1}/doctor/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setDoctorInfo(response.data.data);
        setImageUrl(response.data.data.avatar);
        
        // Cập nhật form values
        form.setFieldsValue({
          username: response.data.data.username,
          email: response.data.data.email,
          degree: response.data.data.doctor.degree,
          experience_years: response.data.data.doctor.experience_years,
          description: response.data.data.doctor.description,
          specialization_id: response.data.data.doctor.specialization_id
        });
      }
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      let errorMessage = 'Không thể tải thông tin bác sĩ';
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      }
      showNotification('error', 'Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getBase64 = (img, callback) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      // Chỉ lấy phần base64 string, bỏ qua phần data:image
      const base64String = reader.result;
      callback(base64String);
    });
    reader.readAsDataURL(img);
  };

  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      showNotification('error', 'Lỗi', 'Chỉ chấp nhận file JPG/PNG!');
      return false;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      showNotification('error', 'Lỗi', 'Kích thước ảnh phải nhỏ hơn 2MB!');
      return false;
    }
    return true;
  };

  const handleImageUpload = async (info) => {
    if (info.file.status === 'uploading') {
      setUploadLoading(true);
      return;
    }
    if (info.file.status === 'done') {
      try {
        getBase64(info.file.originFileObj, (imageUrl) => {
          setImageUrl(imageUrl);
          setUploadLoading(false);
        });
      } catch (error) {
        console.error('Error processing image:', error);
        showNotification('error', 'Lỗi', 'Không thể xử lý ảnh');
        setUploadLoading(false);
      }
    }
  };

  const handleSubmit = async (values) => {
    setFormValues(values);
    setConfirmModalVisible(true);
  };

  const handleConfirmUpdate = async () => {
    try {
      const formData = new FormData();
      
      // Thêm các trường dữ liệu vào FormData
      Object.entries(formValues).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      // Thêm avatar vào FormData nếu có thay đổi
      if (imageUrl && imageUrl !== doctorInfo.avatar) {
        // Chuyển đổi base64 thành file
        const base64Response = await fetch(imageUrl);
        const blob = await base64Response.blob();
        const file = new File([blob], "avatar.png", { type: "image/png" });
        formData.append("avatar", file);
      }

      console.log('Sending update request to:', `${url1}/doctor/profile`);
      
      const response = await axios({
        method: 'patch',
        url: `${url1}/doctor/profile`,
        data: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 10000 // Thêm timeout 10 giây
      });

      if (response.data.success) {
        showNotification('success', 'Thành công', 'Cập nhật thông tin thành công');
        setIsEditing(false);
        await fetchDoctorProfile();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      let errorMessage = 'Không thể cập nhật thông tin';
      
      if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.';
      } else if (error.response) {
        // Lỗi từ server
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        // Request đã được gửi nhưng không nhận được response
        errorMessage = 'Không nhận được phản hồi từ máy chủ. Vui lòng thử lại sau.';
      } else {
        // Lỗi khác
        errorMessage = error.message || errorMessage;
      }
      
      showNotification('error', 'Lỗi', errorMessage);
    } finally {
      setConfirmModalVisible(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const renderEditForm = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
    >
      <div className="flex items-center space-x-12 mb-6">
        <Upload
          name="avatar"
          listType="picture-card"
          className="avatar-uploader"
          showUploadList={false}
          beforeUpload={beforeUpload}
          onChange={handleImageUpload}
          customRequest={({ onSuccess }) => setTimeout(() => onSuccess("ok"), 0)}
        >
          {imageUrl ? (
            <Avatar size={120} src={imageUrl} />
          ) : (
            <div>
              {uploadLoading ? <LoadingOutlined /> : <UploadOutlined />}
              <div style={{ marginTop: 8 }}>Tải ảnh lên</div>
            </div>
          )}
        </Upload>
        <div className="flex-1 ml-12">
          <Form.Item
            name="username"
            label="Tên bác sĩ"
            rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}
            className="mb-12"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="degree"
            label="Học vị"
            rules={[{ required: true, message: 'Vui lòng nhập học vị!' }]}
          >
            <Input />
          </Form.Item>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Vui lòng nhập email!' },
            { type: 'email', message: 'Email không hợp lệ!' }
          ]}
          className="mb-3"
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="experience_years"
          label="Số năm kinh nghiệm"
          rules={[{ required: true, message: 'Vui lòng nhập số năm kinh nghiệm!' }]}
          className="mb-3"
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="description"
          label="Mô tả"
          rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
          className="mb-3"
        >
          <TextArea rows={4} />
        </Form.Item>

        <Form.Item
          name="specialization_id"
          label="Chuyên khoa"
          rules={[{ required: true, message: 'Vui lòng chọn chuyên khoa!' }]}
          className="mb-3"
        >
          <Select>
            <Select.Option value={1}>Nội tim mạch</Select.Option>
            <Select.Option value={2}>Ngoại thần kinh</Select.Option>
            {/* Thêm các chuyên khoa khác */}
          </Select>
        </Form.Item>
      </div>
    </Form>
  );

  const renderViewMode = () => (
    <>
      <div className="flex items-center space-x-6 mb-6">
        <Avatar 
          size={120} 
          src={doctorInfo.avatar} 
          icon={<UserOutlined />}
        />
        <div>
          <Title level={2} className="!mb-1">{doctorInfo.username}</Title>
          <div className="text-gray-500 mb-2">
            <IdcardOutlined className="mr-2" />
            {doctorInfo.doctor.degree}
          </div>
          <Tag color="blue">{doctorInfo.doctor.Specialization.name}</Tag>
        </div>
      </div>

      <Descriptions column={2}>
        <Descriptions.Item 
          label={<><MailOutlined className="mr-2" />Email</>}
        >
          {doctorInfo.email}
        </Descriptions.Item>
        
        <Descriptions.Item 
          label={<><TrophyOutlined className="mr-2" />Kinh nghiệm</>}
        >
          {doctorInfo.doctor.experience_years} năm
        </Descriptions.Item>

        <Descriptions.Item 
          label={<><BookOutlined className="mr-2" />Mô tả</>}
        >
          {doctorInfo.doctor.description}
        </Descriptions.Item>

        <Descriptions.Item 
          label={<><DollarOutlined className="mr-2" />Phí khám</>}
        >
          {formatCurrency(doctorInfo.doctor.Specialization.fees)}
        </Descriptions.Item>
      </Descriptions>
    </>
  );

  const handleCancelEdit = () => {
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = () => {
    // Reset form về giá trị ban đầu
    form.setFieldsValue({
      username: doctorInfo.username,
      email: doctorInfo.email,
      degree: doctorInfo.doctor.degree,
      experience_years: doctorInfo.doctor.experience_years,
      description: doctorInfo.doctor.description,
      specialization_id: doctorInfo.doctor.specialization_id
    });
    // Reset avatar về giá trị ban đầu
    setImageUrl(doctorInfo.avatar);
    // Tắt chế độ chỉnh sửa
    setIsEditing(false);
    setCancelModalVisible(false);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {contextHolder}
      <NavbarDoctor />
      <Layout>
        <Sider 
          width={250} 
          collapsible 
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          theme="light"
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 64,
            bottom: 0,
          }}
        >
          <div className="logo" />
          <div className="flex justify-end p-4">
            {collapsed ? (
              <MenuUnfoldOutlined className="text-xl" onClick={() => setCollapsed(false)} />
            ) : (
              <MenuFoldOutlined className="text-xl" onClick={() => setCollapsed(true)} />
            )}
          </div>
          <MenuDoctor collapsed={collapsed} />
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
          <Content style={{ margin: '24px 16px', overflow: 'initial' }}>
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <Spin size="large" />
              </div>
            ) : doctorInfo && (
              <div className="space-y-6">
                <Card 
                  extra={
                    isEditing ? (
                      <Space>
                        <Button 
                          icon={<CloseOutlined />}
                          onClick={handleCancelEdit}
                          className = "hover:text-blue-800 hover:border-blue-900 px-6 py-2 rounded-full font-light hidden md:block hover:opacity-90 transition duration-300"
                        >
                          Hủy
                        </Button>
                        <Button 
                          className="!bg-blue-900 !text-white hover:text-blue-800 hover:border-blue-900 px-6 py-2 rounded-full font-light hidden md:block hover:opacity-90 transition duration-300"
                          icon={<SaveOutlined />}
                          onClick={() => form.submit()}

                        >
                          Lưu
                        </Button>
                      </Space>
                    ) : (
                      <Button 
                        className="!text-blue-900 hover:text-blue-800 hover:border-blue-900 px-6 py-2 rounded-full font-light hidden md:block hover:opacity-90 transition duration-300"
                        icon={<EditOutlined />}
                        onClick={() => setIsEditing(true)}

                      >
                        Chỉnh sửa
                      </Button>
                    )
                  }
                >
                  {isEditing ? renderEditForm() : renderViewMode()}
                </Card>
                <br />

                {/* Lịch làm việc */}
                <Card title={<><CalendarOutlined className="mr-2" />Lịch làm việc</>}>
                  <Descriptions column={1}>
                    <Descriptions.Item 
                      label={<><ClockCircleOutlined className="mr-2" />Ngày làm việc</>}
                    >
                      {doctorInfo.working_hours.weekdays.days}
                    </Descriptions.Item>

                    <Descriptions.Item label="Buổi sáng">
                      <Tag color="green">
                        {doctorInfo.working_hours.weekdays.morning.start} - {doctorInfo.working_hours.weekdays.morning.end}
                      </Tag>
                    </Descriptions.Item>

                    <Descriptions.Item label="Buổi chiều">
                      <Tag color="green">
                        {doctorInfo.working_hours.weekdays.afternoon.start} - {doctorInfo.working_hours.weekdays.afternoon.end}
                      </Tag>
                    </Descriptions.Item>

                    <Descriptions.Item label="Cuối tuần">
                      <Tag color="red">
                        {doctorInfo.working_hours.weekend.days}: {doctorInfo.working_hours.weekend.status}
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </div>
            )}
          </Content>
        </Layout>
      </Layout>

      <Modal
        title="Xác nhận cập nhật"
        open={confirmModalVisible}
        onOk={handleConfirmUpdate}
        onCancel={() => setConfirmModalVisible(false)}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        <p>Bạn có chắc chắn muốn cập nhật thông tin?</p>
      </Modal>

      <Modal
        title="Xác nhận hủy"
        open={cancelModalVisible}
        onOk={handleConfirmCancel}
        onCancel={() => setCancelModalVisible(false)}
        okText="Xác nhận"
        cancelText="Không"
      >
        <p>Bạn có chắc chắn muốn hủy chỉnh sửa? Các thay đổi sẽ không được lưu.</p>
      </Modal>
    </Layout>
  );
};

export default ProfileDoctor;
