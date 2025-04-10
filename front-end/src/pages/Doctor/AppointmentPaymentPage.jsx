import React, { useState, useEffect, useContext } from 'react';
import { Layout, Card, Descriptions, Button, Tag, Space, Divider, Modal, Radio, Spin, notification, Typography } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, ArrowLeftOutlined, DollarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import NavbarDoctor from '../../components/Doctor/NavbarDoctor';
import MenuDoctor from '../../components/Doctor/MenuDoctor';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import dayjs from 'dayjs';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const AppointmentPaymentPage = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appointmentDetail, setAppointmentDetail] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { appointment_id } = useParams();
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  
  // Lấy các giá trị trạng thái từ state của location nếu có
  const initialPaymentStatus = location.state?.paymentStatus;
  const initialPrescriptionStatus = location.state?.prescriptionStatus;
  const initialAppointmentStatus = location.state?.appointmentStatus;

  console.log('Received state:', { 
    paymentStatus: initialPaymentStatus, 
    prescriptionStatus: initialPrescriptionStatus,
    appointmentStatus: initialAppointmentStatus
  });

  // Notification helper
  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: 'topRight',
      duration: 3,
    });
  };

  // Fetch appointment details
  useEffect(() => {
    fetchAppointmentDetail();
  }, [appointment_id, url1]);

  const fetchAppointmentDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url1}/doctor/appointments/${appointment_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      let appointmentData = response.data.data;
      console.log('API Response - Original Data:', JSON.stringify(appointmentData, null, 2));
      
      // Nếu có giá trị trạng thái được truyền từ trang tạo hồ sơ và chưa có dữ liệu từ server
      if (initialPaymentStatus) {
        // Cập nhật trạng thái payment nếu chưa có từ server
        if (!appointmentData.payment) {
          appointmentData.payment = { status: initialPaymentStatus };
        } else if (!appointmentData.payment.status) {
          appointmentData.payment.status = initialPaymentStatus;
        }
        console.log('Updated payment status:', appointmentData.payment.status);
      }
      
      if (initialPrescriptionStatus) {
        // Cập nhật trạng thái prescription nếu chưa có từ server
        if (!appointmentData.prescription) {
          appointmentData.prescription = { status: initialPrescriptionStatus };
        } else if (!appointmentData.prescription.status) {
          appointmentData.prescription.status = initialPrescriptionStatus;
        }
        console.log('Updated prescription status:', appointmentData.prescription.status);
      }
      
      if (initialAppointmentStatus) {
        // Cập nhật trạng thái appointment nếu có
        if (!appointmentData.appointment_info) {
          appointmentData.appointment_info = { status: initialAppointmentStatus };
        } else if (appointmentData.appointment_info) {
          appointmentData.appointment_info.status = initialAppointmentStatus;
        }
        console.log('Updated appointment status:', appointmentData.appointment_info.status);
      }
      
      console.log('Final appointment data with updated statuses:', appointmentData);
      
      // Thử log tất cả các thuộc tính liên quan đến payment
      if (appointmentData.payment) {
        console.log('Payment object:', appointmentData.payment);
      }
      if (appointmentData.Payments) {
        console.log('Payments object:', appointmentData.Payments);
      }
      
      // Kiểm tra thông tin payment
      const hasPayment = !!(appointmentData.payment || appointmentData.Payments);
      console.log('Has payment information:', hasPayment);
      
      setAppointmentDetail(appointmentData);
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      showNotification(
        'error',
        'Error',
        'Unable to load appointment details'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/doctor/appointments/accepted'); // Go back to previous page
  };

  const handlePaymentClick = () => {
    setIsPaymentModalVisible(true);
  };

  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
  };

  const handlePaymentConfirm = () => {
    if (paymentMethod === 'cash') {
      // For cash payment, show the second confirmation
      setIsPaymentModalVisible(false);
      setIsConfirmModalVisible(true);
    } else {
      // For Zalo Pay, we would normally redirect to payment gateway
      // For this example, we'll simulate a successful payment
      handlePaymentProcess();
    }
  };

  const handleFinalConfirmation = () => {
    setIsConfirmModalVisible(false);
    handlePaymentProcess();
  };

  const handlePaymentProcess = async () => {
    try {
      setLoading(true);
      
      console.log("AppointmentDetail data:", appointmentDetail);
      
      // Trường hợp 1: Kiểm tra xem payment_id có tồn tại theo các cách khác nhau
      let payment_id = null;
      
      if (appointmentDetail.payment) {
        payment_id = appointmentDetail.payment.id || appointmentDetail.payment.payment_id;
        console.log("Found payment_id in payment object:", payment_id);
      }
      
      if (!payment_id && appointmentDetail.Payments) {
        payment_id = appointmentDetail.Payments.payment_id;
        console.log("Found payment_id in Payments object:", payment_id);
      }
      
      // Trường hợp 2: Nếu không tìm thấy payment_id, gọi API completeAppointment để tạo mới
      if (!payment_id) {
        console.log("No payment_id found, calling completeAppointment API...");
        
        try {
          const completeResponse = await axios.post(`${url1}/doctor/appointments/complete`, {
            appointment_id: Number(appointment_id)
          }, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          console.log("completeAppointment response:", completeResponse.data);
          
          // Lấy payment_id từ kết quả
          if (completeResponse.data?.data?.payment?.payment_id) {
            payment_id = completeResponse.data.data.payment.payment_id;
            console.log("Got new payment_id:", payment_id);
          }
        } catch (completeError) {
          console.error("Error calling completeAppointment:", completeError);
          
          // Trường hợp 3: Nếu lỗi là do appointment đã hoàn thành, thử lấy thông tin lại
          if (completeError.response?.data?.message?.includes("đã hoàn thành") ||
              completeError.response?.data?.message?.includes("already completed")) {
            console.log("Appointment already completed, refreshing data...");
            
            try {
              // Lấy lại thông tin appointment
              const refreshResponse = await axios.get(`${url1}/doctor/appointments/${appointment_id}`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              });
              
              console.log("Refreshed appointment data:", refreshResponse.data);
              
              // Tìm payment_id từ dữ liệu mới
              const refreshedData = refreshResponse.data.data;
              if (refreshedData.payment) {
                payment_id = refreshedData.payment.id || refreshedData.payment.payment_id;
                console.log("Found payment_id after refresh:", payment_id);
              } else if (refreshedData.Payments) {
                payment_id = refreshedData.Payments.payment_id;
                console.log("Found payment_id in Payments after refresh:", payment_id);
              }
            } catch (refreshError) {
              console.error("Error refreshing appointment data:", refreshError);
            }
          }
          
          // Nếu vẫn không tìm thấy payment_id sau khi thử các cách
          if (!payment_id) {
            throw new Error("Không thể tìm thấy hoặc tạo mới thông tin thanh toán");
          }
        }
      }
      
      // Kiểm tra lần cuối trước khi tiếp tục
      if (!payment_id) {
        throw new Error("Payment information not found");
      }
      
      console.log("Final payment_id to update:", payment_id);
      
      // Gọi API cập nhật trạng thái thanh toán
      const updateResponse = await axios.patch(
        `${url1}/doctor/appointments/payments/${payment_id}/status`, 
        {
          status: 'paid',
          note: `Payment received via ${paymentMethod}`
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      console.log("Payment status update response:", updateResponse.data);
      
      showNotification(
        'success',
        'Success',
        'Payment processed successfully'
      );
      
      // Refresh the appointment details
      await fetchAppointmentDetail();
      
    } catch (error) {
      console.error('Error processing payment:', error);
      showNotification(
        'error',
        'Error',
        error.response?.data?.message || error.message || 'Failed to process payment'
      );
    } finally {
      setLoading(false);
    }
  };

  // Get status color for tags
  const getStatusColor = (status) => {
    // Map status to colors and display text
    const statusColors = {
      // Payment status colors
      pending: { color: 'orange', text: 'Pending' },
      paid: { color: 'green', text: 'Paid' },
      cancelled: { color: 'red', text: 'Cancelled' },
      
      // Prescription status colors
      pending_prepare: { color: 'orange', text: 'Pending Prepare' },
      waiting_payment: { color: 'blue', text: 'Waiting Payment' },
      completed: { color: 'green', text: 'Completed' },
      rejected: { color: 'red', text: 'Rejected' },
      
      // Appointment status colors
      pending_confirmation: { color: 'purple', text: 'Pending Confirmation' },
      accepted: { color: 'cyan', text: 'Accepted' },
      completed_appointment: { color: 'green', text: 'Completed' },
      cancelled_appointment: { color: 'red', text: 'Cancelled' },
      patient_not_coming: { color: 'red', text: 'Patient Not Coming' },
      doctor_day_off: { color: 'orange', text: 'Doctor Day Off' }
    };
    
    return statusColors[status] || { color: 'default', text: status?.toUpperCase() || 'Unknown' };
  };

  if (loading && !appointmentDetail) {
    return <Spin size="large" className="flex justify-center items-center min-h-screen" />;
  }

  // Calculate totals
  const calculatePrescriptionTotal = () => {
    if (!appointmentDetail?.prescription?.medicines?.length) return 0;
    return appointmentDetail.prescription.medicines.reduce((sum, medicine) => sum + medicine.total, 0);
  };

  const totalPrescriptionAmount = calculatePrescriptionTotal();
  const appointmentFee = appointmentDetail?.appointment_info?.fees || 0;
  const totalAmount = appointmentFee + totalPrescriptionAmount;

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
          <MenuDoctor 
            collapsed={collapsed} 
            selectedKey="accepted"
          />
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
          {/* Fixed buttons container */}
          <div className="fixed top-16 right-0 left-[250px] z-10 bg-white shadow-sm transition-all duration-300 py-4 px-6"
               style={{ left: collapsed ? '80px' : '250px' }}>
            <div className="flex justify-between items-center">
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={handleBack}
                className="!text-blue-900 hover:!text-blue-700 border-0 shadow-none"
                type="text"
              >
                Back
              </Button>
              
              {appointmentDetail?.payment?.status !== 'paid' && (
                <Button
                  type="primary"
                  icon={<DollarOutlined />}
                  onClick={handlePaymentClick}
                  className="!bg-blue-900 !text-white px-8 py-2 h-auto rounded-full font-light hover:!bg-blue-800 hover:!text-white border border-blue-800 transition duration-300"
                >
                  Confirm Payment
                </Button>
              )}
              
              {appointmentDetail?.payment?.status === 'paid' && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  disabled
                  className="!bg-green-700 !text-white px-8 py-2 h-auto rounded-full font-light border transition duration-300"
                >
                  Payment Completed
                </Button>
              )}
            </div>
          </div>

          <Content style={{ margin: '24px 16px', marginTop: '80px', overflow: 'initial' }}>
            {appointmentDetail && (
              <>
                {/* Payment Summary Card */}
                <Card className="shadow-sm mb-4">
                  <div className="flex justify-between items-center mb-4">
                    <Title level={4} className="!mb-0">Payment Summary</Title>
                    <Tag color={getStatusColor(appointmentDetail.payment?.status || 'pending').color}>
                      {getStatusColor(appointmentDetail.payment?.status || 'pending').text}
                    </Tag>
                  </div>
                  
                  <Descriptions column={1} bordered>
                    <Descriptions.Item label="Total Appointment Fee">
                      {appointmentFee.toLocaleString('vi-VN')} VNĐ
                    </Descriptions.Item>
                    <Descriptions.Item label="Prescription Charges">
                      {totalPrescriptionAmount.toLocaleString('vi-VN')} VNĐ
                    </Descriptions.Item>
                    <Descriptions.Item label="Total Amount" className="font-semibold">
                      <Text strong>{totalAmount.toLocaleString('vi-VN')} VNĐ</Text>
                    </Descriptions.Item>
                    
                    {appointmentDetail.payment?.status === 'paid' && (
                      <>
                        <Descriptions.Item label="Payment Method">
                          {appointmentDetail.payment.payment_method}
                        </Descriptions.Item>
                        <Descriptions.Item label="Payment Date">
                          {dayjs(appointmentDetail.payment.payment_date).format('DD/MM/YYYY HH:mm')}
                        </Descriptions.Item>
                      </>
                    )}
                  </Descriptions>
                </Card>
                <br />
                
                {/* Patient Information Card */}
                <Card title="Patient Information" className="shadow-sm mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><strong>Patient Name:</strong> {appointmentDetail.patient.name}</p>
                      <p><strong>Email:</strong> {appointmentDetail.patient.email}</p>
                    </div>
                    <div>
                      <p><strong>Appointment Time:</strong> {dayjs(appointmentDetail.appointment_info.datetime).format('DD/MM/YYYY HH:mm')}</p>
                      <p><strong>Status:     </strong> 
                        <Tag color={getStatusColor(appointmentDetail.appointment_info.status).color} className="ml-2">
                          {getStatusColor(appointmentDetail.appointment_info.status).text}
                        </Tag>
                      </p>
                    </div>
                  </div>
                </Card>
                <br />

                {/* Medical Record Card */}
                {appointmentDetail.medical_record && (
                  <Card title="Medical Record" className="shadow-sm mb-4">
                    <Descriptions column={1} bordered>
                      <Descriptions.Item label="Diagnosis">
                        {appointmentDetail.medical_record.diagnosis}
                      </Descriptions.Item>
                      <Descriptions.Item label="Treatment Method">
                        {appointmentDetail.medical_record.treatment}
                      </Descriptions.Item>
                      {appointmentDetail.medical_record.notes && (
                        <Descriptions.Item label="Notes">
                          {appointmentDetail.medical_record.notes}
                        </Descriptions.Item>
                      )}
                      <Descriptions.Item label="Created At">
                        {dayjs(appointmentDetail.medical_record.createdAt).format('DD/MM/YYYY HH:mm')}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                )}
                <br />
                {/* Prescription Card */}
                {appointmentDetail.prescription && (
                  <Card 
                    title={
                      <div className="flex justify-between items-center">
                        <span>Prescription</span>
                        <Tag color={getStatusColor(appointmentDetail.prescription.status).color}>
                          {getStatusColor(appointmentDetail.prescription.status).text}
                        </Tag>
                      </div>
                    } 
                    className="shadow-sm mb-4"
                  >
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">Medicine List</h3>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {appointmentDetail.prescription.medicines.map((medicine) => (
                            <tr key={medicine.id}>
                              <td className="px-6 py-4 whitespace-nowrap">{medicine.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{medicine.quantity}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{medicine.price.toLocaleString('vi-VN')} VNĐ</td>
                              <td className="px-6 py-4 whitespace-nowrap">{medicine.total.toLocaleString('vi-VN')} VNĐ</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50">
                            <td colSpan="3" className="px-6 py-4 text-right font-semibold">Total:</td>
                            <td className="px-6 py-4 whitespace-nowrap font-semibold">{totalPrescriptionAmount.toLocaleString('vi-VN')} VNĐ</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <Descriptions column={1}>
                      <Descriptions.Item label="Created At">
                        {dayjs(appointmentDetail.prescription.createdAt).format('DD/MM/YYYY HH:mm')}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                )}
              </>
            )}
          </Content>
        </Layout>
      </Layout>

      {/* Payment Method Modal */}
      <Modal
        title="Select Payment Method"
        open={isPaymentModalVisible}
        onOk={handlePaymentConfirm}
        onCancel={() => setIsPaymentModalVisible(false)}
        okText="Confirm"
        cancelText="Cancel"
        okButtonProps={{
          className: '!bg-blue-900 !text-white hover:!bg-blue-800'
        }}
      >
        <p className="mb-4">Total Amount: <strong>{totalAmount?.toLocaleString('vi-VN')} VNĐ</strong></p>
        <Radio.Group onChange={handlePaymentMethodChange} value={paymentMethod}>
          <Space direction="vertical">
            <Radio value="cash">Cash Payment</Radio>
            <Radio value="zalopay">ZaloPay</Radio>
          </Space>
        </Radio.Group>
      </Modal>

      {/* Cash Payment Confirmation Modal */}
      <Modal
        title="Cash Payment Confirmation"
        open={isConfirmModalVisible}
        onOk={handleFinalConfirmation}
        onCancel={() => setIsConfirmModalVisible(false)}
        okText="Yes, Cash Received"
        cancelText="Cancel"
        okButtonProps={{
          className: '!bg-blue-900 !text-white hover:!bg-blue-800'
        }}
      >
        <p>Have you successfully received the cash payment of <strong>{totalAmount?.toLocaleString('vi-VN')} VNĐ</strong>?</p>
      </Modal>
    </Layout>
  );
};

export default AppointmentPaymentPage; 