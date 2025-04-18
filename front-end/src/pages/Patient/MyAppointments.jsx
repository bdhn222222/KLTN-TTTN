import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Layout,
  Card,
  Button,
  Tag,
  message,
  Spin,
  Tabs,
  Row,
  Col,
  Pagination,
  Empty,
  Avatar,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  WalletOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Content } = Layout;

const MyAppointments = () => {
  const { url1 } = useContext(AppContext);
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("upcoming");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        message.error("Vui lòng đăng nhập để xem lịch hẹn");
        navigate("/login");
        return;
      }

      const response = await axios.get(`${url1}/patient/appointments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setAppointments(response.data.data);
      } else {
        message.error(
          response.data.message || "Không thể lấy danh sách lịch hẹn"
        );
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      message.error("Có lỗi xảy ra khi lấy danh sách lịch hẹn");
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status) => {
    switch (status) {
      case "waiting_for_confirmation":
        return (
          <Tag icon={<ClockCircleOutlined />} color="orange">
            Đang chờ xác nhận
          </Tag>
        );
      case "accepted":
        return (
          <Tag icon={<CheckCircleOutlined />} color="green">
            Đã xác nhận
          </Tag>
        );
      case "completed":
        return (
          <Tag icon={<CheckCircleOutlined />} color="blue">
            Đã hoàn tất
          </Tag>
        );
      case "cancelled":
        return (
          <Tag icon={<CloseCircleOutlined />} color="red">
            Đã hủy
          </Tag>
        );
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  const handleViewDetail = (appointmentId) => {
    navigate(`/patient/appointment/${appointmentId}`);
  };

  const filterAppointments = () => {
    if (!appointments.length) return [];

    const now = dayjs();
    let filtered = [];

    switch (currentTab) {
      case "upcoming":
        filtered = appointments.filter(
          (app) =>
            ["waiting_for_confirmation", "accepted"].includes(app.status) &&
            dayjs(app.appointment_datetime).isAfter(now)
        );
        break;
      case "completed_pending":
        filtered = appointments.filter(
          (app) =>
            app.status === "completed" &&
            (!app.payment || app.payment.status === "pending")
        );
        break;
      case "completed_paid":
        filtered = appointments.filter(
          (app) => app.status === "completed" && app.payment?.status === "paid"
        );
        break;
      case "cancelled":
        filtered = appointments.filter((app) => app.status === "cancelled");
        break;
      default:
        filtered = appointments;
    }

    return filtered.sort((a, b) =>
      dayjs(b.appointment_datetime).diff(dayjs(a.appointment_datetime))
    );
  };

  const countAppointments = () => {
    const now = dayjs();
    return {
      upcoming: appointments.filter(
        (app) =>
          ["waiting_for_confirmation", "accepted"].includes(app.status) &&
          dayjs(app.appointment_datetime).isAfter(now)
      ).length,
      completed_pending: appointments.filter(
        (app) =>
          app.status === "completed" &&
          (!app.payment || app.payment.status === "pending")
      ).length,
      completed_paid: appointments.filter(
        (app) => app.status === "completed" && app.payment?.status === "paid"
      ).length,
      cancelled: appointments.filter((app) => app.status === "cancelled")
        .length,
    };
  };

  const counts = countAppointments();

  const tabItems = [
    {
      key: "upcoming",
      label: (
        <span>
          Sắp tới{" "}
          <span
            className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
              counts.upcoming > 0
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {counts.upcoming || 0}
          </span>
        </span>
      ),
    },
    {
      key: "completed_pending",
      label: (
        <span>
          Cần thanh toán{" "}
          <span
            className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
              counts.completed_pending > 0
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {counts.completed_pending || 0}
          </span>
        </span>
      ),
    },
    {
      key: "completed_paid",
      label: (
        <span>
          Đã hoàn tất{" "}
          <span
            className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
              counts.completed_paid > 0
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {counts.completed_paid || 0}
          </span>
        </span>
      ),
    },
    {
      key: "cancelled",
      label: (
        <span>
          Đã hủy{" "}
          <span
            className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
              counts.cancelled > 0
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {counts.cancelled || 0}
          </span>
        </span>
      ),
    },
  ];

  const renderAppointmentCard = (appointment) => {
    const appointmentDate = dayjs(appointment.appointment_datetime).format(
      "DD/MM/YYYY"
    );
    const appointmentTime = dayjs(appointment.appointment_datetime).format(
      "HH:mm"
    );

    return (
      <Card className="mb-4" key={appointment.appointment_id}>
        <div className="flex flex-col md:flex-row md:justify-between md:items-start">
          <div className="flex flex-col gap-3 md:flex-row md:items-start mb-4 md:mb-0">
            <Avatar
              size={64}
              src={appointment.Doctor?.user?.avatar}
              icon={<UserOutlined />}
              className="mb-4 md:mb-0 md:mr-4"
            />
            <div>
              <div className="font-medium text-lg mb-1">
                {appointment.Doctor?.user?.username || "Chưa có bác sĩ"}
              </div>
              <div className="text-gray-500 mb-1">
                {appointment.Doctor?.Specialization?.name ||
                  "Chưa có chuyên khoa"}
              </div>
              <div className="mb-1">
                <CalendarOutlined className="mr-2 text-blue-500" />
                {appointmentDate} - {appointmentTime}
              </div>
              <div className="mb-2">
                <DollarOutlined className="mr-2 text-green-500" />
                {appointment.fees?.toLocaleString("vi-VN") || 0} VNĐ
              </div>
              {getStatusTag(appointment.status)}
            </div>
          </div>
          <div className="flex justify-end mt-4 md:mt-0">
            <Button
              type="primary"
              onClick={() => handleViewDetail(appointment.appointment_id)}
            >
              Xem chi tiết
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <Content className="p-6">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        </div>
      </Content>
    );
  }

  const filteredAppointments = filterAppointments();
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <Content className="p-6">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-medium mb-6">Lịch sử khám bệnh</h1>

        <Tabs
          activeKey={currentTab}
          onChange={setCurrentTab}
          items={tabItems}
          className="mb-6"
        />

        {filteredAppointments.length > 0 ? (
          <>
            <Row>
              <Col span={24}>
                {paginatedAppointments.map(renderAppointmentCard)}
              </Col>
            </Row>

            {filteredAppointments.length > pageSize && (
              <div className="flex justify-center mt-6">
                <Pagination
                  current={currentPage}
                  onChange={setCurrentPage}
                  total={filteredAppointments.length}
                  pageSize={pageSize}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        ) : (
          <Empty
            description={`Không có lịch hẹn nào ${
              currentTab === "upcoming"
                ? "sắp tới"
                : currentTab === "completed_pending"
                ? "cần thanh toán"
                : currentTab === "completed_paid"
                ? "đã hoàn tất"
                : "đã hủy"
            }`}
          />
        )}
      </div>
    </Content>
  );
};

export default MyAppointments;
