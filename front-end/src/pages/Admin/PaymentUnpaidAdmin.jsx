import React, { useState, useEffect, useContext } from "react";
import { Card, Table, Button, Avatar, Space, Tag, notification } from "antd";
import { EyeOutlined, UserOutlined } from "@ant-design/icons";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import dayjs from "dayjs";
import AppointmentDetails from "../../components/Admin/AppointmentDetails";

const PaymentUnpaidAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: "topRight",
      duration: 3,
    });
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url1}/admin/appointments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        params: {
          appointmentStatus: "completed",
          paymentStatus: "pending",
        },
      });

      if (response.data && response.data.data) {
        setAppointments(response.data.data);
      } else {
        console.error("Invalid data format from API:", response.data);
        setAppointments([]);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setAppointments([]);
      showNotification(
        "error",
        "Tải dữ liệu thất bại",
        "Không thể tải danh sách cuộc hẹn, vui lòng thử lại sau"
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
      const response = await axios.get(
        `${url1}/admin/appointments/${appointmentId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setSelectedAppointment(response.data.data);
      setIsDrawerVisible(true);
    } catch (error) {
      showNotification(
        "error",
        "Lỗi",
        "Không thể tải thông tin chi tiết cuộc hẹn"
      );
    }
  };

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

  const getPaymentStatusTag = (status) => {
    const statusConfig = {
      unpaid: { color: "red", text: "Unpaid" },
      paid: { color: "green", text: "Paid" },
    };

    const config = statusConfig[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "appointment_id",
      key: "appointment_id",
    },
    {
      title: "Patient",
      dataIndex: "patient_name",
      key: "patient_name",
      render: (text) => (
        <div className="flex items-center gap-2">
          <Avatar icon={<UserOutlined />} className="bg-blue-900" />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: "Appointment Time",
      dataIndex: "appointment_datetime",
      key: "appointment_datetime",
      render: (datetime) => dayjs(datetime).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
    },
    {
      title: "Payment Status",
      dataIndex: "payment_status",
      key: "payment_status",
      render: (status) => getPaymentStatusTag(status),
    },
    {
      title: "Fees",
      dataIndex: "fees",
      key: "fees",
      render: (fees) => fees?.toLocaleString("vi-VN") + " VNĐ",
    },
    {
      title: "More",
      key: "action",
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
    <>
      {contextHolder}
      <Card title="Unpaid Appointments">
        <Table
          columns={columns}
          dataSource={appointments}
          loading={loading}
          rowKey="appointment_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} appointments`,
          }}
        />
      </Card>
      <AppointmentDetails
        visible={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        appointment={selectedAppointment}
      />
    </>
  );
};

export default PaymentUnpaidAdmin;
