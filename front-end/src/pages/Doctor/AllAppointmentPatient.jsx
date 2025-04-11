import React, { useState, useEffect, useContext } from 'react';
import { Layout, Card, Button, Avatar, notification, Spin, Tag, List, Typography } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  EyeOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import NavbarDoctor from '../../components/Doctor/NavbarDoctor';
import MenuDoctor from '../../components/Doctor/MenuDoctor';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';
import dayjs from 'dayjs';
import AppointmentDetails from '../../components/Appointment/AppointmentDetails';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const AllAppointmentPatient = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { patient_id } = useParams();
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  
  // Lấy thông tin bệnh nhân từ state khi điều hướng
  const patientInfo = location.state?.patientInfo || {
    patient_id: patient_id,
    name: "Bệnh nhân",
    email: "",
    phone_number: ""
  };
  
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
      const response = await axios.get(`${url1}/doctor/patients/${patient_id}/appointments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          limit: 100 // Lấy tất cả các cuộc hẹn
        }
      });
      
      if (response.data && response.data.data) {
        console.log('Patient Appointments:', response.data.data);
        setAppointments(response.data.data);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching patient appointments:', error);
      showNotification(
        'error',
        'Lỗi tải dữ liệu',
        'Không thể tải danh sách cuộc hẹn của bệnh nhân'
      );
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patient_id) {
      fetchAppointments();
    }
  }, [patient_id]);

  const handleViewDetails = async (appointment) => {
    console.log("Viewing details for appointment:", appointment);
    try {
      setDetailLoading(true);
      // Gọi API để lấy thông tin chi tiết cuộc hẹn
      const response = await axios.get(`${url1}/doctor/appointments/${appointment.appointment_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log("Appointment details response:", response.data);
      
      // Nếu API không trả về cấu trúc mong muốn, tạo cấu trúc phù hợp với AppointmentDetails
      const formattedAppointment = response.data.data || response.data;
      
      // Nếu cần, cấu trúc lại dữ liệu để phù hợp với AppointmentDetails
      if (!formattedAppointment.appointment_info) {
        formattedAppointment.appointment_info = {
          id: appointment.appointment_id,
          datetime: appointment.appointment_datetime,
          status: appointment.status,
          fees: appointment.fees
        };
      }
      
      if (!formattedAppointment.patient && patientInfo) {
        formattedAppointment.patient = {
          name: patientInfo.name,
          email: patientInfo.email,
          phone_number: patientInfo.phone_number
        };
      }
      
      setSelectedAppointment(formattedAppointment);
      setIsDrawerVisible(true);
    } catch (error) {
      console.error("Error fetching appointment details:", error);
      showNotification(
        'error',
        'Lỗi tải dữ liệu',
        'Không thể tải thông tin chi tiết cuộc hẹn'
      );
      
      // Fallback: Sử dụng dữ liệu sẵn có nếu API gặp lỗi
      const fallbackAppointment = {
        appointment_info: {
          id: appointment.appointment_id,
          datetime: appointment.appointment_datetime,
          status: appointment.status,
          fees: appointment.fees || 0
        },
        patient: {
          name: patientInfo.name,
          email: patientInfo.email,
          phone_number: patientInfo.phone_number
        }
      };
      
      setSelectedAppointment(fallbackAppointment);
      setIsDrawerVisible(true);
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      waiting_for_confirmation: { color: 'gold', text: 'unconfirmed' },
      accepted: { color: 'green', text: 'confirmed' },
      completed: { color: 'blue', text: 'completed' },
      cancelled: { color: 'red', text: 'cancelled' },
      doctor_day_off: { color: 'red', text: 'cancelled' },
      patient_not_coming: { color: 'gray', text: 'patient_not_coming' }
    };

    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const goBack = () => {
    navigate('/doctor/patients');
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
            <div className="mb-4">
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={goBack}
                className="!text-blue-900 hover:!text-blue-700 border-0 shadow-none"
                type="text"
              >
                Quay lại
              </Button>
            </div>

            {/* Thông tin bệnh nhân */}
            <Card className="mb-4">
              <div className="flex items-center gap-4">
                <Avatar 
                  size={64} 
                  src={patientInfo.avatar} 
                  icon={!patientInfo.avatar && <UserOutlined />} 
                />
                <div>
                  <Title level={4}>{patientInfo.name}</Title>
                  {patientInfo.phone_number && <div>SĐT: {patientInfo.phone_number}</div>}
                  {patientInfo.email && <div>Email: {patientInfo.email}</div>}
                  <div>ID: {patientInfo.patient_id}</div>
                </div>
              </div>
            </Card>
            <br />
            
            {/* Danh sách các cuộc hẹn */}
            <Card title="Lịch sử khám bệnh">
              {loading ? (
                <div className="text-center p-4">
                  <Spin />
                </div>
              ) : appointments.length > 0 ? (
                <List
                  dataSource={appointments}
                  renderItem={(appointment, index) => (
                    <List.Item 
                      key={appointment.appointment_id}
                      onClick={() => handleViewDetails(appointment)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <Card 
                        style={{ width: '100%' }} 
                        className="shadow-sm"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold flex items-center">
                              Lần khám thứ {index + 1} <span className="ml-2">{getStatusTag(appointment.status)}</span>
                            </div>
                            <div>Ngày: {dayjs(appointment.appointment_datetime).format('DD/MM/YYYY HH:mm')}</div>
                            <div>Bác sĩ: {appointment.doctor_name}</div>
                            <div>Chuyên khoa: {appointment.specialization}</div>
                          </div>
                          <div className="flex items-center h-full">
                            <Button 
                              size="medium" 
                              icon={<EyeOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(appointment);
                              }}
                              className="!text-blue-900 bg-white hover:text-blue-800 hover:border-blue-900 px-6 py-2 rounded-full font-light hidden md:block hover:opacity-90 transition duration-300"
                            >
                              Chi tiết
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </List.Item>
                  )}
                />
              ) : (
                <div className="text-center p-8">
                  <Text type="secondary">Không có cuộc hẹn nào</Text>
                </div>
              )}
            </Card>
          </Content>
        </Layout>
      </Layout>

      {selectedAppointment && (
        <AppointmentDetails
          isDrawerVisible={isDrawerVisible}
          setIsDrawerVisible={setIsDrawerVisible}
          selectedAppointment={selectedAppointment}
          onRefresh={fetchAppointments}
          loading={detailLoading}
        />
      )}
    </Layout>
  );
};

export default AllAppointmentPatient; 