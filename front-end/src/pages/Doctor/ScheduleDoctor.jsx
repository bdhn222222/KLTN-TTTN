import React, { useState, useEffect, useContext } from 'react';
import { Layout, Card, Table, Button, DatePicker, Select, Form, Input, notification, Radio, Modal, Tag, Spin, message } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CalendarOutlined,
  PlusOutlined,
  CloseCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import NavbarDoctor from '../../components/Doctor/NavbarDoctor';
import MenuDoctor from '../../components/Doctor/MenuDoctor';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';
import dayjs from 'dayjs';

const { Sider, Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;

const ScheduleDoctor = () => {
  // Layout state
  const [collapsed, setCollapsed] = useState(false);
  
  // Data state
  const [loading, setLoading] = useState(false);
  const [dayOffs, setDayOffs] = useState([]);
  
  // Form state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  
  // Context
  const navigate = useNavigate();
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  
  // Date filters
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ]);
  
  const scheduleHours = {
    morning: "08:00 - 11:30",
    afternoon: "13:30 - 17:00"
  };

  // Fetch doctor information
  const [doctorInfo, setDoctorInfo] = useState(null);

  // Lấy thông tin bác sĩ khi component mount
  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
    setDoctorInfo(userInfo);
    console.log('User info from localStorage:', userInfo);
    
    // Hiển thị thông báo nếu không có thông tin bác sĩ
    if (!userInfo || (!userInfo.user_id && !userInfo.doctor?.doctor_id)) {
      showNotification(
        'warning',
        'Thông tin không đầy đủ',
        'Không tìm thấy thông tin bác sĩ. Một số chức năng có thể không hoạt động đúng. Vui lòng đăng nhập lại.'
      );
    }
  }, []);

  // Fetch day offs when component mounts or date range changes
  useEffect(() => {
    if (doctorInfo && dateRange && dateRange.length === 2) {
      fetchDayOffs();
    }
  }, [dateRange, doctorInfo]);

  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: 'topRight',
      duration: 3,
    });
  };

  // Fetch day offs
  const fetchDayOffs = async () => {
    try {
      setLoading(true);
      
      // Đảm bảo dateRange là một mảng hợp lệ
      if (!dateRange || dateRange.length !== 2) {
        console.error('Invalid dateRange:', dateRange);
        throw new Error('Khoảng thời gian không hợp lệ');
      }
      
      const [start, end] = dateRange;
      
      const params = {
        start: start.format('YYYY-MM-DD'),
        end: end.format('YYYY-MM-DD')
      };
      
      console.log('Đang tải danh sách ngày nghỉ với tham số:', params);
      
      const response = await axios.get(`${url1}/doctor/day-offs`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        params
      });
      
      console.log('Phản hồi từ API:', response.data);
      
      if (response.data && response.data.success && response.data.data) {
        // Xử lý dữ liệu trả về, đảm bảo mỗi ngày nghỉ có affected_appointments
        const formattedDayOffs = response.data.data.map(dayOff => {
          // Đảm bảo affected_appointments luôn là một mảng
          const affectedAppointments = (dayOff.affected_appointments || []).map(apt => ({
            ...apt,
            patient_name: apt.patient_name || 
                        (apt.Patient && apt.Patient.user && apt.Patient.user.username) || 
                        'Không có thông tin',
            patient_phone: apt.patient_phone || 
                         (apt.Patient && apt.Patient.phone_number) || 
                         'Không có số điện thoại'
          }));
          
          return {
            ...dayOff,
            affected_appointments: affectedAppointments
          };
        });
        
        console.log('Danh sách ngày nghỉ đã xử lý:', formattedDayOffs);
        setDayOffs(formattedDayOffs);
      } else {
        console.warn('Không có dữ liệu ngày nghỉ hoặc cấu trúc phản hồi không đúng:', response.data);
        setDayOffs([]);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách ngày nghỉ:', error);
      
      let errorMessage = 'Không thể tải danh sách ngày nghỉ';
      if (error.response) {
        console.error('Phản hồi lỗi từ API:', error.response.data);
        
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 401) {
          errorMessage = 'Vui lòng đăng nhập lại để tiếp tục';
        } else if (error.response.status === 403) {
          errorMessage = 'Bạn không có quyền truy cập tính năng này';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showNotification('error', 'Lỗi tải dữ liệu', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle DateRangePicker change
  const handleDateRangeChange = (dates) => {
    console.log('Date range changed:', dates);
    if (dates && dates.length === 2) {
      setDateRange(dates);
    } else {
      // Set default date range if invalid
      setDateRange([dayjs().startOf('month'), dayjs().endOf('month')]);
    }
  };

  // Thêm hàm mới để lấy doctor_id từ backend
  const getDoctorIdFromBackend = async () => {
    try {
      // Gọi một API đã biết hoạt động để lấy thông tin
      const response = await axios.get(`${url1}/doctor/appointments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          limit: 1 // Chỉ lấy 1 kết quả để tối ưu
        }
      });
      
      console.log('Got response to extract doctor_id:', response.data);
      
      // Trả về doctor_id từ response nếu có
      if (response.data && response.data.data && response.data.data.length > 0) {
        return response.data.data[0].doctor_id;
      } else {
        // Thử một API khác nếu API appointments không trả về doctor_id
        const summaryResponse = await axios.get(`${url1}/doctor/summary`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        console.log('Got summary response:', summaryResponse.data);
        
        if (summaryResponse.data && summaryResponse.data.doctor_id) {
          return summaryResponse.data.doctor_id;
        }
      }
      
      // Sử dụng thông tin từ localStorage nếu API không trả về
      const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
      return userInfo?.user_id || userInfo?.doctor?.doctor_id;
    } catch (error) {
      console.error('Error getting doctor_id from backend:', error);
      // Trả về từ localStorage nếu lỗi
      const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
      return userInfo?.user_id || userInfo?.doctor?.doctor_id;
    }
  };

  const handleCreateDayOff = async (values) => {
    try {
      setConfirmLoading(true);
      
      // Chuẩn bị dữ liệu gửi tới API
      const requestData = {
        off_date: values.date.format('YYYY-MM-DD'),
        time_off: values.time_off,
        reason: values.reason
      };
      
      console.log('Tạo ngày nghỉ với dữ liệu:', requestData);
      
      // Gọi API tạo ngày nghỉ
      const response = await axios.post(`${url1}/doctor/day-offs`, requestData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Kết quả từ API:', response.data);
      
      if (response.data && response.data.success) {
        showNotification(
          'success',
          'Đăng ký thành công',
          response.data.message || 'Đã đăng ký ngày nghỉ thành công'
        );
        
        // Đóng modal và reset form
        setIsModalVisible(false);
        form.resetFields();
        
        // Cập nhật lại danh sách ngày nghỉ
        fetchDayOffs();
      }
    } catch (error) {
      console.error('Lỗi khi đăng ký ngày nghỉ:', error);
      console.error('Response lỗi:', error.response?.data);
      
      let errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      
      showNotification(
        'error',
        'Đăng ký thất bại',
        errorMessage
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancelDayOff = async (dayOffId, timeOff) => {
    try {
      // Đảm bảo giá trị time_off là một trong 'morning', 'afternoon', 'full'
      if (!['morning', 'afternoon', 'full'].includes(timeOff)) {
        throw new Error("Buổi nghỉ không hợp lệ");
      }
      
      // Prepare request data
      const requestData = {
        time_off: timeOff,
        include_details: true // Yêu cầu thêm chi tiết về bệnh nhân
      };
      
      console.log('Hủy ngày nghỉ với dữ liệu:', requestData);
      
      // Gọi API cancelDoctorDayOff
      const response = await axios.post(`${url1}/doctor/day-offs/${dayOffId}`, requestData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Kết quả từ API hủy ngày nghỉ:', response.data);
      
      if (response.data && response.data.success) {
        // Lấy thông tin danh sách cuộc hẹn bị ảnh hưởng từ response
        const dayOffData = response.data.data.day_off;
        const affectedAppts = response.data.data.affected_appointments || [];
        
        // Thêm dữ liệu để hiển thị trong modal khi cần
        if (affectedAppts.length > 0) {
          // Cập nhật để sử dụng khi người dùng xem danh sách
          showCancelAffectedAppointments(affectedAppts, dayOffData);
          
          showNotification(
            'info',
            'Thông tin cuộc hẹn',
            `Có ${affectedAppts.length} cuộc hẹn đã được khôi phục trạng thái thành "Đang chờ xác nhận"`
          );
        }
        
        showNotification(
          'success',
          'Hủy thành công',
          response.data.message || 'Đã hủy ngày nghỉ thành công'
        );
        
        // Cập nhật lại danh sách ngày nghỉ
        fetchDayOffs();
      }
    } catch (error) {
      console.error('Lỗi khi hủy ngày nghỉ:', error);
      console.error('Response lỗi:', error.response?.data);
      
      let errorMessage = 'Có lỗi xảy ra khi hủy ngày nghỉ';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showNotification(
        'error',
        'Hủy thất bại',
        errorMessage
      );
    }
  };

  // Confirm modal for cancelling day off
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState(null);

  const showCancelConfirm = (dayOffId, timeOff, timeLabel) => {
    setConfirmModalData({ dayOffId, timeOff, timeLabel });
    setIsConfirmModalVisible(true);
  };

  // Hiển thị modal các cuộc hẹn bị ảnh hưởng
  const [affectedAppointments, setAffectedAppointments] = useState([]);
  const [isAppointmentsModalVisible, setIsAppointmentsModalVisible] = useState(false);
  const [selectedDayOff, setSelectedDayOff] = useState(null);
  const [appointmentModalTitle, setAppointmentModalTitle] = useState("Danh sách cuộc hẹn bị ảnh hưởng");

  const showAffectedAppointments = (record) => {
    setSelectedDayOff(record);
    setAppointmentModalTitle(`Cuộc hẹn bị ảnh hưởng - Ngày ${dayjs(record.date).format('DD/MM/YYYY')}`);
    
    // Hiển thị modal trước để tránh trễ UX
    setIsAppointmentsModalVisible(true);
    
    // Nếu đã có data, không cần gọi API lại
    if (record.affected_appointments && record.affected_appointments.length > 0) {
      // Đảm bảo có dữ liệu tên và điện thoại của bệnh nhân
      const processedAppointments = record.affected_appointments.map(apt => ({
        ...apt,
            patient_name: apt.patient_name || 
                        (apt.Patient && apt.Patient.user && apt.Patient.user.username) || 
                        'Không có thông tin',
            patient_phone: apt.patient_phone || 
                        (apt.Patient && apt.Patient.phone_number) || 
                        'Không có số điện thoại'
      }));
      
      setAffectedAppointments(processedAppointments);
    } else {
      showNotification('info', 'Thông tin', 'Không có cuộc hẹn nào bị ảnh hưởng');
      setAffectedAppointments([]);
    }
  };

  // Hiển thị danh sách cuộc hẹn bị ảnh hưởng sau khi hủy
  const showCancelAffectedAppointments = (appointments, dayOff) => {
    if (appointments && appointments.length > 0) {
      // Dữ liệu đã được xử lý từ backend, chỉ cần map trực tiếp
      const processedAppointments = appointments.map(apt => ({
        id: apt.id,
        datetime: apt.datetime,
        patient_name: apt.patient_name,
        patient_phone: apt.patient_phone
      }));
      
      setAffectedAppointments(processedAppointments);
      setAppointmentModalTitle(`Cuộc hẹn đã được khôi phục - Ngày ${dayjs(dayOff.off_date).format('DD/MM/YYYY')}`);
      setIsAppointmentsModalVisible(true);
    } else {
      showNotification('info', 'Thông tin', 'Không có cuộc hẹn nào bị ảnh hưởng');
    }
  };

  // Columns for affected appointments table
  const appointmentColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id'
    },
    {
      title: 'Thời gian',
      dataIndex: 'datetime',
      key: 'datetime',
      render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Tên bệnh nhân',
      dataIndex: 'patient_name',
      key: 'patient_name',
      render: (text, record) => record.patient_name || 'Không có thông tin'
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'patient_phone',
      key: 'patient_phone',
      render: (text, record) => record.patient_phone || 'Không có thông tin'
    }
  ];

  // Table columns
  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (text) => dayjs(text).format('DD/MM/YYYY'),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Buổi sáng',
      dataIndex: 'morning',
      key: 'morning',
      render: (isMorningOff, record) => {
        if (isMorningOff) {
          return (
            <div className="flex items-center">
              <Tag color="red">Nghỉ</Tag>
              <Button
                type="text"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  console.log('Morning cancel button clicked');
                  showCancelConfirm(record.id, 'morning', 'buổi sáng');
                }}
                className="ml-2"
              />
            </div>
          );
        }
        return <Tag color="green">Làm việc ({scheduleHours.morning})</Tag>;
      }
    },
    {
      title: 'Buổi chiều',
      dataIndex: 'afternoon',
      key: 'afternoon',
      render: (isAfternoonOff, record) => {
        if (isAfternoonOff) {
          return (
            <div className="flex items-center">
              <Tag color="red">Nghỉ</Tag>
              <Button
                type="text"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  console.log('Afternoon cancel button clicked');
                  showCancelConfirm(record.id, 'afternoon', 'buổi chiều');
                }}
                className="ml-2"
              />
            </div>
          );
        }
        return <Tag color="green">Làm việc ({scheduleHours.afternoon})</Tag>;
      }
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (text, record) => {
        return (
          <div className="flex space-x-2">
            {/* Nút xem cuộc hẹn bị ảnh hưởng */}
            <Button
              icon={<EyeOutlined />}
              onClick={() => showAffectedAppointments(record)}
              className="!text-blue-900 hover:text-blue-800 px-6 py-2 rounded-full font-light hidden md:block hover:opacity-90 transition duration-300"
            >
              Xem cuộc hẹn
            </Button>
            {/* Nút hủy buổi sáng */}
            {record.morning && !record.afternoon && (
              <Button
                danger
                onClick={() => showCancelConfirm(record.id, 'morning', 'buổi sáng')}
                icon={<CloseCircleOutlined />}
              >
                Hủy lịch
              </Button>
            )}
            {/* Nút hủy buổi chiều */}
            {record.afternoon && !record.morning && (
              <Button
                danger
                onClick={() => showCancelConfirm(record.id, 'afternoon', 'buổi chiều')}
                icon={<CloseCircleOutlined />}
              >
                Hủy lịch
              </Button>
            )}
            {/* Nút hủy cả ngày */}
            {record.morning && record.afternoon && (
              <Button
                danger
                onClick={() => showCancelConfirm(record.id, 'full', 'cả ngày')}
                icon={<CloseCircleOutlined />}
              >
                Hủy lịch
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Add logging to check dayOffs data
  console.log('Current dayOffs data:', dayOffs);

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
            <Card 
              title="Lịch làm việc của tôi"
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsModalVisible(true)}
                  className="!bg-blue-900 !text-white"
                >
                  Đăng ký nghỉ
                </Button>
              }
              className="mb-4"
            >
              <div className="flex items-center mb-4">
                <CalendarOutlined className="mr-2" />
                <span className="mr-2">Thời gian làm việc (Thứ 2 - Thứ 6):</span>
                <Tag color="green">Buổi sáng: {scheduleHours.morning}</Tag>
                <Tag color="green">Buổi chiều: {scheduleHours.afternoon}</Tag>
              </div>
              
              <div className="flex mb-4">
                <DatePicker.RangePicker 
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  format="DD/MM/YYYY"
                  className="mr-4"
                />
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <Spin size="large" />
                </div>
              ) : (
                <Table 
                  columns={columns} 
                  dataSource={dayOffs} 
                  rowKey="id"
                  pagination={{ 
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Tổng số ${total} ngày nghỉ` 
                  }}
                />
              )}
            </Card>
          </Content>
        </Layout>
      </Layout>
      
      {/* Modal đăng ký nghỉ */}
      <Modal
        title="Đăng ký nghỉ"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsModalVisible(false);
              form.resetFields();
            }}
            className="!text-gray-700 border-gray-300"
          >
            Hủy bỏ
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={confirmLoading}
            onClick={() => form.submit()}
            className="!bg-blue-900 !text-white"
          >
            Đăng ký
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateDayOff}
          initialValues={{
            time_off: 'full',
          }}
        >
          <Form.Item
            name="date"
            label="Ngày nghỉ"
            rules={[
              {
                required: true,
                message: 'Vui lòng chọn ngày nghỉ',
              },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  if (value.isBefore(dayjs().startOf('day'))) {
                    return Promise.reject('Không thể đăng ký ngày nghỉ trong quá khứ');
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
          
          <Form.Item
            name="time_off"
            label="Buổi nghỉ"
            rules={[
              {
                required: true,
                message: 'Vui lòng chọn buổi nghỉ',
              },
            ]}
          >
            <Radio.Group>
              <Radio value="morning">Buổi sáng ({scheduleHours.morning})</Radio>
              <Radio value="afternoon">Buổi chiều ({scheduleHours.afternoon})</Radio>
              <Radio value="full">Cả ngày</Radio>
            </Radio.Group>
          </Form.Item>
          
          <Form.Item
            name="reason"
            label="Lý do"
            rules={[
              {
                required: true,
                message: 'Vui lòng nhập lý do nghỉ',
              },
              {
                min: 3,
                message: 'Lý do phải có ít nhất 3 ký tự',
              },
              {
                max: 200,
                message: 'Lý do không được quá 200 ký tự',
              },
            ]}
          >
            <TextArea rows={4} placeholder="Nhập lý do nghỉ..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal hiển thị danh sách cuộc hẹn bị ảnh hưởng */}
      <Modal
        title={appointmentModalTitle}
        open={isAppointmentsModalVisible}
        onCancel={() => {
          setIsAppointmentsModalVisible(false);
          setAffectedAppointments([]);
        }}
        footer={null}
      >
        <Table
          columns={appointmentColumns}
          dataSource={affectedAppointments}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng số ${total} cuộc hẹn`
          }}
        />
      </Modal>

      {/* Modal xác nhận hủy ngày nghỉ */}
      <Modal
        title="Xác nhận hủy ngày nghỉ"
        open={isConfirmModalVisible}
        onOk={() => {
          handleCancelDayOff(confirmModalData.dayOffId, confirmModalData.timeOff);
          setIsConfirmModalVisible(false);
        }}
        onCancel={() => setIsConfirmModalVisible(false)}
        okText="Xác nhận"
        cancelText="Hủy bỏ"
        okButtonProps={{ danger: true }}
      >
        <p>Bạn có chắc chắn muốn hủy {confirmModalData?.timeLabel}?</p>
      </Modal>
    </Layout>
  );
};

export default ScheduleDoctor;
