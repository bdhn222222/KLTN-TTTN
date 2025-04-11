import React, { useState, useEffect, useContext } from 'react';
import { Layout, Card, Table, Button, Avatar, Badge, Space, Tag, Statistic, Flex, notification } from 'antd';
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
import MenuDoctor from '../../components/Doctor/MenuDoctor';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';
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
  const { url1 } = useContext(AppContext);
  const [formData, setFormData] = useState([]);
  const [api, contextHolder] = notification.useNotification();
  
  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: 'topRight',
      duration: 3,
    });
  };

  const fetchFormData = async () => {
    try {
      const response = await axios.get(`${url1}/doctor/appointments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching form data:', error);
      showNotification(
        'error',
        'Tải dữ liệu thất bại',
        'Không thể tải danh sách cuộc hẹn, vui lòng thử lại sau'
      );
    }
  };

  const acceptAppointment = async (appointmentId) => {
    try {
      await axios.patch(`${url1}/doctor/appointments/${appointmentId}/accept`, null, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      showNotification(
        'success',
        'Xác nhận thành công',
        'Cuộc hẹn đã được xác nhận thành công'
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
  
  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url1}/doctor/summary`);
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
      const response = await axios.get(`${url1}/doctor/appointments`, {
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
    const fetchData = async () => {
      try {
        await fetchFormData();
        console.log('Form data after fetch:', formData);
      } catch (error) {
        console.error('Error fetching form data:', error);
      }
    };

    fetchData();
  }, []);

  // Thêm useEffect để theo dõi thay đổi của formData
  useEffect(() => {
    console.log('Form data updated:', formData);
  }, [formData]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url1}/doctor/appointments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data && response.data.data) {
        setAppointments(response.data.data);
        setFormData(response.data.data);
        console.log('Appointments loaded:', response.data.data);
      } else {
        console.error('Invalid data format from API:', response.data);
        setAppointments([]);
        setFormData([]);
        showNotification(
          'error',
          'Tải dữ liệu thất bại',
          'Không thể tải danh sách cuộc hẹn, vui lòng thử lại sau'
        );
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
      setFormData([]);
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

  const handleAcceptAppointment = async (appointmentId) => {
    try {
      await axios.put(`${url1}/doctor/appointments/${appointmentId}/accept`, null, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      // Refresh the appointments list after accepting
      fetchAppointments();
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
      title: 'ID',
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
              className="!bg-blue-900 !text-white px-6 py-2 rounded-full font-light hidden md:block hover:!bg-blue-800 hover:!text-white border border-blue-800 transition duration-300"
              icon={<CheckOutlined />}
              onClick={() => acceptAppointment(record.appointment_id)}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card loading={loading} className="w-full bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100">
                <Statistic
                  title="Tổng số bệnh nhân"
                  value={statistics.totalPatients || 0}
                  prefix={<TeamOutlined className="text-blue-900" />}
                  className="text-center"
                />
              </Card>
              <Card loading={loading} className="w-full bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100">
                <Statistic
                  title="Cuộc hẹn hôm nay"
                  value={statistics.totalAppointments || 0}
                  prefix={<CalendarOutlined className="text-blue-900" />}
                  className="text-center"
                />
              </Card>
              <Card loading={loading} className="w-full bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100">
                <Statistic
                  title="Chờ xác nhận"
                  value={statistics.pendingAppointments || 0}
                  prefix={<UserAddOutlined className="text-blue-900" />}
                  className="text-center"
                />
              </Card>
            </div>

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
