import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, Avatar, Badge, Space, Tag, Statistic, Flex } from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  UserAddOutlined,
  TeamOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  CheckOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import NavbarDoctor from '../../components/Doctor/NavbarDoctor';
import api from '../../config/axios';
import dayjs from 'dayjs';

const { Sider, Content } = Layout;

const DashboardDoctor = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [statistics, setStatistics] = useState({
    totalDoctors: 0,
    totalAppointments: 0,
    totalPatients: 0
  });
  const [latestAppointments, setLatestAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const navigate = useNavigate();

  // Fetch dashboard statistics
  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/doctor/summary');
      setStatistics(response.data.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch latest appointments
  const fetchLatestAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/doctor/appointments', {
        params: {
          limit: 5,
          sort: 'latest'
        }
      });
      setLatestAppointments(response.data.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
    fetchLatestAppointments();
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/doctor/appointments');
      console.log('API Response:', response.data); // Debug log
      
      if (response.data && response.data.data) {
        setAppointments(response.data.data);
      } else {
        console.error('Invalid data format from API:', response.data);
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAppointment = async (appointmentId) => {
    try {
      await api.put(`/doctor/appointments/${appointmentId}/accept`);
      fetchAppointments(); // Refresh the list
    } catch (error) {
      console.error('Error accepting appointment:', error);
    }
  };

  const handleViewDetails = async (appointmentId) => {
    // Implement view details logic
    console.log('View details for appointment:', appointmentId);
  };

  const start = () => {
    setLoading(true);
    // Refresh appointments data
    fetchAppointments().finally(() => {
      setSelectedRowKeys([]);
      setLoading(false);
    });
  };

  const onSelectChange = (newSelectedRowKeys) => {
    console.log('selectedRowKeys changed: ', newSelectedRowKeys);
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const hasSelected = selectedRowKeys.length > 0;

  const getStatusTag = (status) => {
    const statusConfig = {
      waiting_for_confirmation: { color: 'gold', text: 'Chờ xác nhận' },
      accepted: { color: 'green', text: 'Đã xác nhận' },
      completed: { color: 'blue', text: 'Hoàn thành' },
      cancelled: { color: 'red', text: 'Đã hủy' },
      doctor_day_off: { color: 'orange', text: 'Bác sĩ nghỉ' },
      patient_not_coming: { color: 'gray', text: 'Bệnh nhân không đến' }
    };

    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: 'Mã cuộc hẹn',
      dataIndex: 'appointment_id',
      key: 'appointment_id',
    },
    {
      title: 'Bệnh nhân',
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
      title: 'Thời gian',
      dataIndex: 'appointment_datetime',
      key: 'appointment_datetime',
      render: (datetime) => dayjs(datetime).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Phí khám',
      dataIndex: 'fees',
      key: 'fees',
      render: (fees) => fees?.toLocaleString('vi-VN') + ' VNĐ',
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record.appointment_id)}
            className="text-blue-900 hover:text-blue-700"
          >
            Chi tiết
          </Button>
          {record.status === 'waiting_for_confirmation' && (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleAcceptAppointment(record.appointment_id)}
              className="bg-blue-900 hover:bg-blue-800"
            >
              Xác nhận
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => navigate('/doctor/dashboard')
    },
    {
      key: 'appointments',
      icon: <CalendarOutlined />,
      label: 'Cuộc hẹn',
      onClick: () => navigate('/doctor/appointments')
    },
    {
      key: 'patients',
      icon: <TeamOutlined />,
      label: 'Bệnh nhân',
      onClick: () => navigate('/doctor/patients')
    },
    {
      key: 'profile',
      icon: <UserAddOutlined />,
      label: 'Thông tin cá nhân',
      onClick: () => navigate('/doctor/profile')
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
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
          <div className="flex flex-col gap-2 p-4">
            {menuItems.map(item => (
              <div
                key={item.key}
                onClick={item.onClick}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-blue-50"
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </div>
            ))}
          </div>
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
          <Content style={{ margin: '24px 16px', overflow: 'initial' }}>
            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card loading={loading} className="shadow-sm">
                <Statistic
                  title="Tổng số bệnh nhân"
                  value={statistics.totalPatients || 0}
                  prefix={<TeamOutlined className="text-blue-900" />}
                  className="text-center"
                />
              </Card>
              <Card loading={loading} className="shadow-sm">
                <Statistic
                  title="Cuộc hẹn hôm nay"
                  value={statistics.totalAppointments || 0}
                  prefix={<CalendarOutlined className="text-blue-900" />}
                  className="text-center"
                />
              </Card>
              <Card loading={loading} className="shadow-sm">
                <Statistic
                  title="Chờ xác nhận"
                  value={statistics.pendingAppointments || 0}
                  prefix={<UserAddOutlined className="text-blue-900" />}
                  className="text-center"
                />
              </Card>
            </div> */}


            <Card title="Danh sách cuộc hẹn" className="shadow-sm">
              <Flex gap="middle" vertical>
                {/* <Flex align="center" gap="middle">
                  <Button
                    type="primary"
                    onClick={start}
                    disabled={!hasSelected}
                    loading={loading}
                    icon={<ReloadOutlined />}
                    className="bg-blue-900 hover:bg-blue-800"
                  >
                    Làm mới
                  </Button>
                  {hasSelected && (
                    <span className="text-gray-600">
                      Đã chọn {selectedRowKeys.length} cuộc hẹn
                    </span>
                  )}
                </Flex> */}
                <Table
                  rowSelection={rowSelection}
                  columns={columns}
                  dataSource={appointments}
                  rowKey="appointment_id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Tổng số ${total} cuộc hẹn`,
                  }}
                />
              </Flex>
            </Card>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default DashboardDoctor;
