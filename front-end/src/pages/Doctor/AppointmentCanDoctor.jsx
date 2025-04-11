import React, { useState, useEffect, useContext } from 'react';
import { Layout, Card, Table, Button, Avatar, Space, Tag, Flex, notification } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import NavbarDoctor from '../../components/Doctor/NavbarDoctor';
import MenuDoctor from '../../components/Doctor/MenuDoctor';
import AppointmentDetails from '../../components/Doctor/AppointmentDetails';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';
import dayjs from 'dayjs';

const { Sider, Content } = Layout;

const AppointmentCanDoctor = () => {
  // Khai báo tất cả state ở đầu component
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const navigate = useNavigate();
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();

  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: 'topRight',
      duration: 3,
    });
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url1}/doctor/appointments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          status: ['cancelled', 'patient_not_coming', 'doctor_day_off']
        }
      });
      
      if (response.data && response.data.data) {
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

  const getAppointmentDetails = async (appointmentId) => {
    try {
      const response = await axios.get(`${url1}/doctor/appointments/${appointmentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setSelectedAppointment(response.data.data);
      setIsDrawerVisible(true);
    } catch (error) {
      showNotification('error', 'Lỗi', 'Không thể tải thông tin chi tiết cuộc hẹn');
    }
  };

  const handleNavigateToCreateRecord = (appointmentId) => {
    navigate(`/doctor/medical-records/create/${appointmentId}`);
  };

  const getStatusTag = (status) => {
    const statusConfig = {
        waiting_for_confirmation: { color: 'gold', text: 'unconfirmed' },
        accepted: { color: 'green', text: 'confirmed' },
        completed: { color: 'blue', text: 'completed' },
        cancelled: { color: 'red', text: 'cancelled' },
        doctor_day_off: { color: 'red', text: 'cancelled' },
        patient_not_coming: { color: 'red', text: 'cancelled' }
         // Đảm bảo text là 'cancelled'
      };

    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
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
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => getAppointmentDetails(record.appointment_id)}
            className="!text-blue-900 hover:text-blue-800 px-6 py-2 rounded-full font-light hidden md:block hover:opacity-90 transition duration-300"
          >
            Details
          </Button>
        </Space>
      ),
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
            <Card title="Cancelled Appointments" className="shadow-sm">
              <Flex gap="middle" vertical>
                <Table
                  columns={columns}
                  dataSource={appointments}
                  rowKey="appointment_id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Tổng số ${total} cuộc hẹn đã hủy`,
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
        onNavigateToCreateRecord={handleNavigateToCreateRecord}
      />
    </Layout>
  );
};

export default AppointmentCanDoctor;