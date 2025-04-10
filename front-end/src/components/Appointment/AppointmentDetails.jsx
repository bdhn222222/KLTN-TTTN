import React, { useContext } from 'react';
import { Drawer, Button, Space, Tag, Divider, Descriptions, Modal, Flex } from 'antd';
import { ArrowLeftOutlined, CloseCircleOutlined, CheckOutlined, FileAddOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';

const AppointmentDetails = ({ 
  isDrawerVisible, 
  setIsDrawerVisible, 
  selectedAppointment, 
  onRefresh,
  onNavigateToCreateRecord,
  onNavigateToPayment 
}) => {
  const { url1 } = useContext(AppContext);
  const [isConfirmCancelVisible, setIsConfirmCancelVisible] = React.useState(false);
  const [isConfirmCompleteVisible, setIsConfirmCompleteVisible] = React.useState(false);

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

  const handleCancelAppointment = async (appointmentId) => {
    try {
      await axios.post(`${url1}/doctor/appointments/${appointmentId}/cancel`, {
        reason: "Bác sĩ hủy lịch hẹn"
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setIsConfirmCancelVisible(false);
      setIsDrawerVisible(false);
      onRefresh();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
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
              className="px-6 py-2 h-auto rounded-full"
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
              className="px-6 py-2 h-auto rounded-full"
            >
              Cancel
            </Button>
            
            {(hasMedicalRecord && hasPrescription) ? (
              // Nếu đã có medical record và prescription -> hiển thị nút "Hoàn thành"
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  console.log(`Navigating to payment page for appointment ID: ${appointmentId}`);
                  onNavigateToPayment(appointmentId);
                }}
                className="!bg-blue-900 !text-white px-6 py-2 h-auto rounded-full hover:!bg-blue-800"
              >
                Hoàn thành
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
                Tạo hồ sơ
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
      <Drawer
        open={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        width="30%"
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
        onOk={() => handleCancelAppointment(selectedAppointment?.appointment_info.id)}
        onCancel={() => setIsConfirmCancelVisible(false)}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={{
          className: '!bg-blue-900 !text-white hover:!bg-blue-800'
        }}
      >
        <p>Bạn có chắc chắn muốn hủy lịch hẹn này?</p>
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