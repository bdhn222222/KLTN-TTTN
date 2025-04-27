import React from "react";
import { Drawer, Descriptions, Tag, Button, Space } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const AppointmentDetails = ({ visible, onClose, appointment }) => {
  const getStatusTag = (status) => {
    const statusConfig = {
      waiting_for_confirmation: { color: "gold", text: "unconfirmed" },
      accepted: { color: "green", text: "confirmed" },
      completed: { color: "blue", text: "completed" },
      cancelled: { color: "red", text: "cancelled" },
    };

    const config = statusConfig[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  return (
    <Drawer
      title="Appointment Details"
      placement="right"
      onClose={onClose}
      open={visible}
      width={500}
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={onClose}>
            OK
          </Button>
        </Space>
      }
    >
      {appointment && (
        <Descriptions column={1}>
          <Descriptions.Item label="Appointment ID">
            {appointment.appointment_id}
          </Descriptions.Item>
          <Descriptions.Item label="Patient Name">
            {appointment.patient_name}
          </Descriptions.Item>
          <Descriptions.Item label="Patient Email">
            {appointment.patient_email}
          </Descriptions.Item>
          <Descriptions.Item label="Doctor Name">
            {appointment.doctor_name}
          </Descriptions.Item>
          <Descriptions.Item label="Doctor Email">
            {appointment.doctor_email}
          </Descriptions.Item>
          <Descriptions.Item label="Appointment Time">
            {dayjs(appointment.appointment_datetime).format("DD/MM/YYYY HH:mm")}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            {getStatusTag(appointment.status)}
          </Descriptions.Item>
          <Descriptions.Item label="Fees">
            {appointment.fees?.toLocaleString("vi-VN")} VNĐ
          </Descriptions.Item>
          <Descriptions.Item label="Symptoms">
            {appointment.symptoms || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Notes">
            {appointment.notes || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Created At">
            {dayjs(appointment.created_at).format("DD/MM/YYYY HH:mm")}
          </Descriptions.Item>
          <Descriptions.Item label="Updated At">
            {dayjs(appointment.updated_at).format("DD/MM/YYYY HH:mm")}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  );
};

export default AppointmentDetails;
