import React, { useState, useEffect, useContext } from "react";
import {
  Layout,
  Card,
  Table,
  Button,
  Avatar,
  Space,
  Tag,
  Flex,
  notification,
} from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import NavbarDoctor from "../../components/Doctor/NavbarDoctor";
import MenuDoctor from "../../components/Doctor/MenuDoctor";
import AppointmentDetails from "../../components/Doctor/AppointmentDetails";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import dayjs from "dayjs";

const { Sider, Content } = Layout;

const AppointmentWTCDoctor = () => {
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
      placement: "topRight",
      duration: 3,
    });
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      await axios.post(
        `${url1}/doctor/appointments/${appointmentId}/cancel`,
        null,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      showNotification(
        "success",
        "Xác nhận thành công",
        "Đã hủy cuộc hẹn thành công"
      );

      fetchAppointments();
    } catch (error) {
      console.error("Error accepting appointment:", error);

      let errorMessage = "";
      if (error.response?.status === 401) {
        errorMessage = "Bạn không có quyền thực hiện thao tác này";
      } else if (error.response?.status === 404) {
        errorMessage = "Không tìm thấy cuộc hẹn";
      } else if (error.response?.status === 400) {
        errorMessage = "Cuộc hẹn đã được xác nhận trước đó";
      } else {
        errorMessage = "Có lỗi xảy ra, vui lòng thử lại sau";
      }

      showNotification("error", "Xác nhận thất bại", errorMessage);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url1}/doctor/appointments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        params: {
          status: "completed",
        },
      });

      if (response.data && response.data.data) {
        const formattedAppointments = response.data.data.map((appointment) => ({
          ...appointment,
          family_name: appointment.family_name,
          // family_email: appointment.family_email,
        }));

        setAppointments(formattedAppointments);
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

  const handleViewDetails = async (appointmentId) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${url1}/doctor/appointments/${appointmentId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("API Response:", response.data);

      if (response.data && response.data.data) {
        // Sử dụng dữ liệu trực tiếp từ API mà không thay đổi cấu trúc
        const appointmentData = response.data.data;
        console.log("Appointment data to display:", appointmentData);

        setSelectedAppointment(appointmentData);
        setIsDrawerVisible(true);
      } else {
        showNotification(
          "error",
          "Lỗi",
          "Không thể tải thông tin chi tiết cuộc hẹn"
        );
      }
    } catch (error) {
      console.error("Error fetching appointment details:", error);
      showNotification(
        "error",
        "Lỗi",
        "Không thể tải thông tin chi tiết cuộc hẹn"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToCreateRecord = (appointmentId) => {
    navigate(`/doctor/medical-records/create/${appointmentId}`);
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      waiting_for_confirmation: { color: "gold", text: "Chờ xác nhận" },
      accepted: { color: "green", text: "Đã tiếp nhận" },
      completed: { color: "blue", text: "Đã hoàn thành" },
      cancelled: { color: "red", text: "Đã hủy" },
      doctor_day_off: { color: "orange", text: "Bác sĩ nghỉ" },
      patient_not_coming: { color: "red", text: "Bệnh nhân không đến" },
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
      title: "Bệnh nhân",
      key: "family",
      render: (_, record) => (
        <div className="flex items-center gap-2">
          {/* <Avatar icon={<UserOutlined />} className="bg-blue-900" /> */}
          <div>
            <div>{record.family_name || "N/A"}</div>
            {/* <div className="text-xs text-gray-500">
              {record.family_email || "N/A"}
            </div> */}
          </div>
        </div>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "appointment_datetime",
      key: "appointment_datetime",
      render: (datetime) => dayjs(datetime).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
    },
    {
      title: "Phí khám",
      dataIndex: "fees",
      key: "fees",
      render: (fees) => fees?.toLocaleString("vi-VN") + " VNĐ",
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record.appointment_id)}
          className="!bg-blue-900 !text-white px-6 py-2 rounded-full font-light hover:!bg-blue-800 hover:!text-white border border-blue-800 transition duration-300"
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
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
            overflow: "auto",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 64,
            bottom: 0,
          }}
        >
          <div className="logo" />
          <div className="flex justify-end p-4">
            {collapsed ? (
              <MenuUnfoldOutlined
                className="text-xl"
                onClick={() => setCollapsed(false)}
              />
            ) : (
              <MenuFoldOutlined
                className="text-xl"
                onClick={() => setCollapsed(true)}
              />
            )}
          </div>
          <MenuDoctor collapsed={collapsed} />
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
          <Content style={{ margin: "24px 16px", overflow: "initial" }}>
            <Card title="Lịch hẹn đã hoàn thành" className="shadow-sm">
              <Flex gap="middle" vertical>
                <Table
                  columns={columns}
                  dataSource={appointments}
                  rowKey="appointment_id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) =>
                      `Tổng số: ${total} lịch hẹn đã hoàn thành`,
                  }}
                  locale={{
                    emptyText: "Không có lịch hẹn nào đã hoàn thành",
                  }}
                />
              </Flex>
            </Card>
          </Content>
        </Layout>
      </Layout>

      <AppointmentDetails
        open={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        appointmentData={selectedAppointment}
        onUpdate={fetchAppointments}
      />
    </Layout>
  );
};

export default AppointmentWTCDoctor;
