import React, { useContext, useState } from 'react';
import { Drawer, Button, Space, Tag, Divider, Descriptions, Modal, Flex, Input, Form, notification } from 'antd';
import { ArrowLeftOutlined, CloseCircleOutlined, CheckOutlined, FileAddOutlined, CheckCircleOutlined, WalletOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';

const { TextArea } = Input;

const AppointmentDetails = ({ 
  isDrawerVisible, 
  setIsDrawerVisible, 
  selectedAppointment, 
  onRefresh,
  onNavigateToCreateRecord,
  onNavigateToPayment 
}) => {
  const { url1 } = useContext(AppContext);
  const [isConfirmCancelVisible, setIsConfirmCancelVisible] = useState(false);
  const [isConfirmCompleteVisible, setIsConfirmCompleteVisible] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [form] = Form.useForm();
  const [api, contextHolder] = notification.useNotification();

  const statusConfig = {
    waiting_for_confirmation: { color: 'gold', text: 'unconfirmed' },
    accepted: { color: 'green', text: 'confirmed' },
    completed: { color: 'blue', text: 'completed' },
    cancelled: { color: 'red', text: 'cancelled' },
    doctor_day_off: { color: 'orange', text: 'doctor_day_off' },
    patient_not_coming: { color: 'red', text: 'cancelled' } // Đảm bảo text là 'cancelled'
  };

  const getStatusTag = (status) => {
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color} style={{ fontWeight: 'normal' }}>{config.text}</Tag>;
  };

  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: 'topRight',
      duration: 5,
    });
  };

  const handleCancelAppointment = async () => {
    if (!cancelReason || cancelReason.trim() === '') {
      showNotification(
        'error', 
        'Lỗi', 
        'Vui lòng nhập lý do hủy cuộc hẹn'
      );
      return;
    }

    if (!selectedAppointment) {
      showNotification(
        'error',
        'Lỗi',
        'Không tìm thấy thông tin cuộc hẹn'
      );
      return;
    }

    const appointmentId = selectedAppointment.appointment_info?.id || selectedAppointment.appointment_id;

    if (!appointmentId) {
      showNotification(
        'error',
        'Lỗi',
        'Mã cuộc hẹn không hợp lệ'
      );
      return;
    }

    console.log(`Cancelling appointment with ID: ${appointmentId}`);

    try {
      setIsCancelling(true);
      await axios.post(`${url1}/doctor/appointments/${appointmentId}/cancel`, {
        reason: cancelReason.trim()
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      showNotification(
        'success',
        'Hủy thành công',
        'Đã hủy cuộc hẹn thành công'
      );
      
      setIsConfirmCancelVisible(false);
      setCancelReason('');
      form.resetFields();
      setIsDrawerVisible(false);
      onRefresh();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      
      let errorMessage = '';
      if (error.response?.status === 401) {
        errorMessage = 'Bạn không có quyền thực hiện thao tác này';
      } else if (error.response?.status === 404) {
        errorMessage = 'Không tìm thấy cuộc hẹn';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || error.response?.data?.error || 'Cuộc hẹn không thể hủy';
      } else {
        errorMessage = 'Có lỗi xảy ra, vui lòng thử lại sau';
      }

      showNotification(
        'error',
        'Hủy thất bại',
        errorMessage
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleAcceptAppointment = async (appointmentId) => {
    try {
      await axios.patch(`${url1}/doctor/appointments/${appointmentId}/accept`, null, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setIsDrawerVisible(false);
      onRefresh();
    } catch (error) {
      console.error('Error accepting appointment:', error);
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      await axios.post(`${url1}/doctor/appointments/${appointmentId}/complete`, null, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setIsConfirmCompleteVisible(false);
      setIsDrawerVisible(false);
      onRefresh();
    } catch (error) {
      console.error('Error completing appointment:', error);
    }
  };

  const renderActionButtons = (status, appointmentId) => {
    switch (status) {
      case 'waiting_for_confirmation':
        return (
          <Flex justify="center" gap="middle">
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => setIsConfirmCancelVisible(true)}
              className="!bg-red-700 !text-white px-6 py-2 h-auto rounded-full hover:!bg-red-600"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleAcceptAppointment(appointmentId)}
              className="!bg-blue-900 !text-white px-6 py-2 h-auto rounded-full hover:!bg-blue-800"
            >
              Confirm
            </Button>
          </Flex>
        );
      case 'accepted':
        // Kiểm tra nếu có thông tin về medical_record hoặc prescription trong dữ liệu
        const hasMedicalRecord = selectedAppointment.medical_record || selectedAppointment.medical_record_id;
        const hasPrescription = selectedAppointment.prescription || selectedAppointment.prescription_id;
        
        console.log('AppointmentDetails - Check medical record and prescription:', {
          appointmentId,
          hasMedicalRecord,
          hasPrescription,
          medicalRecord: selectedAppointment.medical_record,
          medicalRecordId: selectedAppointment.medical_record_id,
          prescription: selectedAppointment.prescription,
          prescriptionId: selectedAppointment.prescription_id
        });
        
        return (
          <Flex justify="center" gap="middle">
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => setIsConfirmCancelVisible(true)}
              className="!bg-red-700 !text-white px-6 py-2 h-auto rounded-full hover:!bg-red-600"
            >
              Cancel
            </Button>
            
            {(hasMedicalRecord && hasPrescription) ? (
              // Nếu đã có medical record và prescription -> hiển thị nút "Hoàn thành"
              <Button
                type="primary"
                icon={<WalletOutlined />}
                onClick={() => {
                  console.log(`Navigating to payment page for appointment ID: ${appointmentId}`);
                  onNavigateToPayment(appointmentId);
                }}
                className="!bg-blue-900 !text-white px-6 py-2 h-auto rounded-full hover:!bg-blue-800"
              >
                Payment
              </Button>
            ) : (
              // Nếu chưa có medical record và prescription -> hiển thị nút "Tạo hồ sơ"
              <Button
                type="primary"
                icon={<FileAddOutlined />}
                onClick={() => {
                  console.log(`Navigating to create medical record for appointment ID: ${appointmentId}`);
                  onNavigateToCreateRecord(appointmentId);
                }}
                className="!bg-blue-900 !text-white px-6 py-2 h-auto rounded-full hover:!bg-blue-800"
              >
                Create Medical Record
              </Button>
            )}
          </Flex>
        );
      case 'completed':
        return (
          <Flex justify="center" gap="middle">
            {/* <Button
              type="primary"
              icon={<FileAddOutlined />}
              onClick={() => onNavigateToCreateRecord(appointmentId)}
              className="!bg-blue-900 !text-white px-6 py-2 h-auto rounded-full hover:!bg-blue-800"
            >
              Xem hồ sơ
            </Button> */}
          </Flex>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {contextHolder}
      <Drawer
        open={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        width="50%"
        extra={
          <Space>
            {/* <Button 
              icon={<ArrowLeftOutlined />}
              onClick={() => setIsDrawerVisible(false)}
              type="text"
              className="!text-blue-900 hover:!text-blue-700"
            >
              Back
            </Button> */}
          </Space>
        }
        title={
          <Flex justify="space-between" align="center">
  <span>Appointment Details</span>
  {selectedAppointment && (
    <Tag color={getStatusTag(selectedAppointment.appointment_info.status).props.color}>
      {getStatusTag(selectedAppointment.appointment_info.status).props.children}
    </Tag>
  )}
</Flex>
        }
      >
        {selectedAppointment && (
          <>
            <Descriptions title="Appointment Information" column={1}>
              <Descriptions.Item label="Mã cuộc hẹn">
                {selectedAppointment.appointment_info.id}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian">
                {dayjs(selectedAppointment.appointment_info.datetime).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Phí khám">
                {selectedAppointment.appointment_info.fees?.toLocaleString('vi-VN')} VNĐ
              </Descriptions.Item>
              {selectedAppointment.appointment_info.status === 'patient_not_coming' && (
                <Descriptions.Item label="Lý do hủy">
                  Patient not coming
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <Descriptions title="Thông tin bệnh nhân" column={1}>
              <Descriptions.Item label="Họ tên">
                {selectedAppointment.patient.name}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {selectedAppointment.patient.email}
              </Descriptions.Item>
            </Descriptions>

            {selectedAppointment.medical_record && (
              <>
                <Divider />
                <Descriptions title="Hồ sơ bệnh án" column={1}>
                  <Descriptions.Item label="Chẩn đoán">
                    {selectedAppointment.medical_record.diagnosis}
                  </Descriptions.Item>
                  <Descriptions.Item label="Phương pháp điều trị">
                    {selectedAppointment.medical_record.treatment}
                  </Descriptions.Item>
                  {selectedAppointment.medical_record.notes && (
                    <Descriptions.Item label="Ghi chú">
                      {selectedAppointment.medical_record.notes}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </>
            )}

            {selectedAppointment.prescription && (
              <>
                <Divider />
                <Descriptions title="Đơn thuốc" column={1}>
                  <Descriptions.Item label="Trạng thái">
                    {selectedAppointment.prescription.status}
                  </Descriptions.Item>
                  {selectedAppointment.prescription.medicines && (
                    <Descriptions.Item label="Danh sách thuốc">
                      <ul className="list-disc pl-4">
                        {selectedAppointment.prescription.medicines.map((medicine) => (
                          <li key={medicine.id}>
                            {medicine.name} - SL: {medicine.quantity} - {medicine.total.toLocaleString('vi-VN')} VNĐ
                          </li>
                        ))}
                      </ul>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </>
            )}

            {selectedAppointment.payment && (
              <>
                <Divider />
                <Descriptions title="Thanh toán" column={1}>
                  <Descriptions.Item label="Số tiền">
                    {selectedAppointment.payment.amount.toLocaleString('vi-VN')} VNĐ
                  </Descriptions.Item>
                  <Descriptions.Item label="Phương thức">
                    {selectedAppointment.payment.payment_method}
                  </Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">
                    {selectedAppointment.payment.status}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            {selectedAppointment.feedback && (
              <>
                <Divider />
                <Descriptions title="Đánh giá" column={1}>
                  <Descriptions.Item label="Điểm đánh giá">
                    {selectedAppointment.feedback.rating}
                  </Descriptions.Item>
                  <Descriptions.Item label="Nhận xét">
                    {selectedAppointment.feedback.comment}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            <Divider />
            
            {renderActionButtons(selectedAppointment.appointment_info.status, selectedAppointment.appointment_info.id)}
          </>
        )}
      </Drawer>

      <Modal
        title="Xác nhận hủy lịch hẹn"
        open={isConfirmCancelVisible}
        onOk={handleCancelAppointment}
        onCancel={() => {
          setIsConfirmCancelVisible(false);
          setCancelReason('');
          form.resetFields();
        }}
        footer={[
          <Button key="back" onClick={() => {
            setIsConfirmCancelVisible(false);
            setCancelReason('');
            form.resetFields();
          }}
          className="!bg-white !text-gray-700 px-6 py-2 h-auto rounded-full border !border-gray-700 hover:!bg-gray-100 hover:!text-gray-700">
            Hủy bỏ
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            danger 
            loading={isCancelling}
            onClick={handleCancelAppointment}
            className="!bg-red-700 !text-white px-6 py-2 h-auto rounded-full hover:!bg-white hover:!text-red-700 border !border-red-700"
          >
            Xác nhận hủy
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <p>Bạn có chắc chắn muốn hủy cuộc hẹn này không?</p>
          {selectedAppointment && (
            <p className="text-sm text-gray-500 mb-4">
              Thông tin cuộc hẹn: {dayjs(
                (selectedAppointment.appointment_info && selectedAppointment.appointment_info.datetime) || 
                selectedAppointment.appointment_datetime
              ).format('DD/MM/YYYY HH:mm')} - {selectedAppointment.patient?.name || 'Không có thông tin'}
            </p>
          )}
          
          <Form.Item 
            name="reason" 
            label="Lý do hủy cuộc hẹn"
            rules={[{ required: true, message: 'Vui lòng nhập lý do hủy cuộc hẹn' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Nhập lý do hủy cuộc hẹn..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </Form.Item>
          
          <div className="text-sm text-red-600">
            <p>Lưu ý: Việc hủy cuộc hẹn có thể dẫn đến các quy định đền bù</p>
            <ul className="list-disc pl-5 mt-1">
              {/* <li>Hủy trước 24 giờ: Không yêu cầu đền bù</li>
              <li>Hủy từ 3-24 giờ: Bệnh nhân được giảm giá 5% cho lần khám tiếp theo</li>
              <li>Hủy dưới 3 giờ: Bệnh nhân được giảm giá 20% cho lần khám tiếp theo</li> */}
            </ul>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Xác nhận hoàn thành"
        open={isConfirmCompleteVisible}
        onOk={() => handleCompleteAppointment(selectedAppointment?.appointment_info.id)}
        onCancel={() => setIsConfirmCompleteVisible(false)}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={{
          className: '!bg-blue-900 !text-white hover:!bg-blue-800'
        }}
      >
        <p>Bạn có chắc chắn muốn đánh dấu cuộc hẹn này là đã hoàn thành?</p>
      </Modal>
    </>
  );
};

export default AppointmentDetails; 