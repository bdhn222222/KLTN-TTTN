import React, { useState, useEffect, useContext } from 'react';
import { Layout, Card, Table, Button, Avatar, Space, Tag, Flex, notification, Spin } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  FileAddOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import NavbarDoctor from '../../components/Doctor/NavbarDoctor';
import MenuDoctor from '../../components/Doctor/MenuDoctor';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';
import dayjs from 'dayjs';
import AppointmentDetails from '../../components/Doctor/AppointmentDetails';

const { Sider, Content } = Layout;

const AppointmentAccDoctor = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const navigate = useNavigate();
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  
  // Thêm state để lưu các cuộc hẹn đã kiểm tra
  const [verifiedAppointments, setVerifiedAppointments] = useState({});
  
  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: 'topRight',
      duration: 3,
    });
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      await axios.post(`${url1}/doctor/appointments/${appointmentId}/cancel`, null, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      showNotification(
        'success',
        'Xác nhận thành công',
        'Đã hủy cuộc hẹn thành công'
      );
      
      // Refresh appointments data
      fetchAppointments();
    } catch (error) {
      console.error('Error accepting appointment:', error);
      
      let errorMessage = '';
      if (error.response?.status === 401) {
        errorMessage = 'Bạn không có quyền thực hiện thao tác này';
      } else if (error.response?.status === 404) {
        errorMessage = 'Không tìm thấy cuộc hẹn';
      } else if (error.response?.status === 400) {
        errorMessage = 'Cuộc hẹn đã được xác nhận trước đó';
      } else {
        errorMessage = 'Có lỗi xảy ra, vui lòng thử lại sau';
      }

      showNotification(
        'error',
        'Xác nhận thất bại',
        errorMessage
      );
    }
  };

  const getAppointmentDetails = async (appointmentId) => {
    try {
      const response = await axios.get(`${url1}/doctor/appointments/${appointmentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('Appointment Detail Response:', JSON.stringify(response.data.data, null, 2));
      setSelectedAppointment(response.data.data);
      setIsDrawerVisible(true);
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      showNotification('error', 'Lỗi', 'Không thể tải thông tin chi tiết cuộc hẹn');
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url1}/doctor/appointments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          status: 'accepted'
        }
      });
      
      if (response.data && response.data.data) {
        console.log('API Response (fetchAppointments):', JSON.stringify(response.data.data, null, 2));
        
        // Kiểm tra và log từng appointment để xem chúng có medical_record_id và prescription_id không
        const appointments = response.data.data;
        appointments.forEach(app => {
          console.log(`Appointment ID ${app.appointment_id}: medical_record_id=${app.medical_record_id}, prescription_id=${app.prescription_id}`);
        });
        
        setAppointments(response.data.data);
      } else {
        console.error('Invalid data format from API:', response.data);
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
      showNotification(
        'error',
        'Tải dữ liệu thất bại',
        'Không thể tải danh sách cuộc hẹn, vui lòng thử lại sau'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleViewDetails = async (appointmentId) => {
    // Implement view details logic
    console.log('View details for appointment:', appointmentId);
  };

  const createMedicalRecord = async (appointment_id) => {
    try {
      setLoading(true);
      // Kiểm tra trạng thái cuộc hẹn trước khi chuyển trang
      const response = await axios.get(`${url1}/doctor/appointments/${appointment_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data?.data?.appointment_info?.status === 'accepted') {
        console.log(`Navigating to create medical record for appointment ID: ${appointment_id}`);
        // Chuyển đến trang tạo hồ sơ y tế với appointment_id tương ứng
        navigate(`/doctor/medical-records/create/${appointment_id}`);
      } else {
        showNotification(
          'error',
          'Không thể tạo bệnh án',
          'Cuộc hẹn phải ở trạng thái đã xác nhận'
        );
      }
    } catch (error) {
      console.error('Error checking appointment:', error);
      showNotification(
        'error',
        'Lỗi',
        'Không thể kiểm tra thông tin cuộc hẹn'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      console.log(`Navigating to payment page for appointment ID: ${appointmentId}`);
      // Chuyển đến trang thanh toán với appointment_id tương ứng
      navigate(`/doctor/appointments/${appointmentId}/payment`);
    } catch (error) {
      console.error('Error navigating to payment page:', error);
      showNotification(
        'error',
        'Lỗi',
        'Không thể chuyển đến trang thanh toán'
      );
    }
  };

  const viewPaymentPage = (appointmentId) => {
    navigate(`/doctor/appointments/${appointmentId}/payment`);
  };

  const getStatusTag = (status) => {
    const statusConfig = {
        waiting_for_confirmation: { color: 'gold', text: 'unconfirmed' },
        accepted: { color: 'green', text: 'confirmed' },
        completed: { color: 'blue', text: 'completed' },
        cancelled: { color: 'red', text: 'cancelled' },
        doctor_day_off: { color: 'orange', text: 'doctor_day_off' },
        patient_not_coming: { color: 'red', text: 'cancelled' } 
      };

    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // Hàm kiểm tra cục bộ, không gọi API
  const checkLocalAppointment = (appointment) => {
    if (!appointment) return false;
    
    // Kiểm tra medical record
    const hasMedicalRecord = !!(
      appointment.medical_record_id || 
      appointment.MedicalRecord ||
      appointment.medical_record
    );
    
    // Kiểm tra prescription
    const hasPrescription = !!(
      appointment.prescription_id || 
      appointment.Prescription ||
      appointment.prescription
    );
    
    return hasMedicalRecord && hasPrescription;
  };
  
  // Hàm kiểm tra từ state đã lưu hoặc gọi API nếu cần
  const checkAppointmentStatus = async (appointmentId) => {
    // Nếu đã kiểm tra rồi thì trả về kết quả
    if (verifiedAppointments[appointmentId] !== undefined) {
      return verifiedAppointments[appointmentId];
    }
    
    try {
      // Gọi API để lấy thông tin chi tiết
      const response = await axios.get(`${url1}/doctor/appointments/${appointmentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const detailedData = response.data.data;
      console.log(`Detailed data for appointment ${appointmentId}:`, detailedData);
      
      // Lưu lại thông tin chi tiết
      setSelectedAppointment(detailedData);
      
      // Kiểm tra cả medical record và prescription
      const hasMedicalRecord = !!(
        detailedData.medical_record_id || 
        detailedData.MedicalRecord ||
        detailedData.medical_record
      );
      
      const hasPrescription = !!(
        detailedData.prescription_id || 
        detailedData.Prescription ||
        detailedData.prescription
      );
      
      const hasCompleteData = hasMedicalRecord && hasPrescription;
      
      // Lưu kết quả để lần sau không cần gọi lại API
      setVerifiedAppointments(prev => ({
        ...prev,
        [appointmentId]: hasCompleteData
      }));
      
      console.log(`Appointment ${appointmentId} verified status:`, {
        hasMedicalRecord,
        hasPrescription,
        hasCompleteData
      });
      
      return hasCompleteData;
    } catch (error) {
      console.error(`Error checking appointment ${appointmentId}:`, error);
      return false;
    }
  };

  // Component hiển thị nút hành động
  const ActionButtons = ({ record }) => {
    const [loading, setLoading] = useState(false);
    const [hasCompleteData, setHasCompleteData] = useState(null);
    
    // Kiểm tra trạng thái 
    useEffect(() => {
      const checkStatus = async () => {
        // Thử kiểm tra cục bộ trước
        const localCheck = checkLocalAppointment(record);
        
        if (localCheck) {
          setHasCompleteData(true);
          return;
        }
        
        // Nếu chưa thể xác định từ dữ liệu cục bộ, gọi API
        setLoading(true);
        const result = await checkAppointmentStatus(record.appointment_id);
        setHasCompleteData(result);
        setLoading(false);
      };
      
      checkStatus();
    }, [record]);
    
    // Hiển thị spinner khi đang kiểm tra
    if (loading) {
      return (
        <Spin size="small" tip="Đang kiểm tra...">
          <div style={{ padding: '10px 20px', minHeight: '32px' }}></div>
        </Spin>
      );
    }
    
    // Nếu đã có cả medical record và prescription, hiển thị nút Hoàn thành
    if (hasCompleteData) {
      return (
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={() => handleCompleteAppointment(record.appointment_id)}
          className="!bg-blue-900 !text-white px-6 w-34 py-2 h-auto rounded-full hover:!bg-blue-800"
        >
          Hoàn thành
        </Button>
      );
    }
    
    // Mặc định hiển thị nút Tạo hồ sơ
    return (
      <Button
        type="primary"
        icon={<FileAddOutlined />}
        onClick={() => createMedicalRecord(record.appointment_id)}
        className="!bg-blue-900 !text-white px-6 w-34 py-2 h-auto rounded-full hover:!bg-blue-800"
      >
        Tạo hồ sơ
      </Button>
    );
  };
  
  const columns = [
    {
      title: 'ID',
      dataIndex: 'appointment_id',
      key: 'appointment_id',
    },
    {
      title: 'Patient',
      dataIndex: 'patient_name',
      key: 'patient_name',
      render: (text) => (
        <div className="flex items-center gap-2">
          <Avatar icon={<UserOutlined />} className="bg-blue-900" />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: 'Appointment Time',
      dataIndex: 'appointment_datetime',
      key: 'appointment_datetime',
      render: (datetime) => dayjs(datetime).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Fees',
      dataIndex: 'fees',
      key: 'fees',
      render: (fees) => fees?.toLocaleString('vi-VN') + ' VNĐ',
    },
    {
      title: 'More',
      key: 'action',
      render: (_, record) => {
        return (
          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={() => getAppointmentDetails(record.appointment_id)}
              className="!text-blue-900 hover:text-blue-800 hover:border-blue-900 px-6 py-2 rounded-full font-light hidden md:block hover:opacity-90 transition duration-300"
            >
              Details
            </Button>
            
            <ActionButtons record={record} />
          </Space>
        );
      },
    },
  ];

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
            <Card title="Confirmed Appointments" className="shadow-sm">
              <Flex gap="middle" vertical>
                <Table
                  columns={columns}
                  dataSource={appointments}
                  rowKey="appointment_id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Tổng số ${total} cuộc hẹn chờ xác nhận`,
                  }}
                />
              </Flex>
            </Card>
          </Content>
        </Layout>
      </Layout>

      <AppointmentDetails
        isDrawerVisible={isDrawerVisible}
        setIsDrawerVisible={setIsDrawerVisible}
        selectedAppointment={selectedAppointment}
        onRefresh={fetchAppointments}
        onNavigateToCreateRecord={(appointmentId) => navigate(`/doctor/medical-records/create/${appointmentId}`)}
        onNavigateToPayment={viewPaymentPage}
      />
    </Layout>
  );
};

export default AppointmentAccDoctor;
