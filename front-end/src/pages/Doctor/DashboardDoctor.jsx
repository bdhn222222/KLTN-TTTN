import React, { useState, useEffect, useContext } from "react";
import {
  Layout,
  Card,
  Table,
  Button,
  Space,
  Tag,
  notification,
  Spin,
  Typography,
  Row,
  Col,
  Statistic,
  Avatar,
  Input,
  Select,
  DatePicker,
  Badge,
  Divider,
  Calendar,
  Progress,
  Modal,
} from "antd";
import {
  EyeOutlined,
  FileAddOutlined,
  CheckCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  SearchOutlined,
  CalendarOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  MedicineBoxOutlined,
  UsergroupAddOutlined,
  PhoneOutlined,
  FileTextOutlined,
  StarFilled,
  LeftOutlined,
  RightOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import NavbarDoctor from "../../components/Doctor/NavbarDoctor";
import MenuDoctor from "../../components/Doctor/MenuDoctor";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import AppointmentDetails from "../../components/Doctor/AppointmentDetails";

// Add this near the top with other dayjs extensions
dayjs.extend(utc);
dayjs.extend(timezone);

// Add custom styles for the appointments table
const tableStyles = {
  ".appointments-table .ant-table-thead > tr > th": {
    backgroundColor: "#f0f5ff",
    fontWeight: 500,
  },
  ".appointments-table .ant-table-tbody > tr > td": {
    padding: "8px 12px",
  },
  ".appointments-table .ant-table-tbody > tr.bg-gray-50 > td": {
    backgroundColor: "#f9fafb",
  },
  ".appointments-table .ant-table-tbody > tr:hover > td": {
    backgroundColor: "#e6f7ff !important",
  },
};

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const DashboardDoctor = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { url1 } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { user } = useContext(AppContext);
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("accepted");
  const [selectedDate, setSelectedDate] = useState(null);
  const [summaryStats, setSummaryStats] = useState({
    totalPatients: 0,
    todayPatients: 0,
    todayAppointments: 0,
    withRecords: 0,
    withPrescriptions: 0,
    pending: 0,
  });
  const [nextPatient, setNextPatient] = useState(null);
  const [todayDate] = useState(dayjs().tz("Asia/Ho_Chi_Minh"));
  const [currentMonth] = useState(
    dayjs().tz("Asia/Ho_Chi_Minh").format("THÁNG M NĂM YYYY")
  );

  const [api, contextHolder] = notification.useNotification();

  const showNotification = (type, message, description) => {
    api[type]({
      message,
      description,
      placement: "topRight",
    });
  };

  const [notComingModalVisible, setNotComingModalVisible] = useState(false);
  const [processingNotComing, setProcessingNotComing] = useState(false);
  const [pendingNotComingId, setPendingNotComingId] = useState(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // First, get total patients count
      const patientsResponse = await axios.get(`${url1}/doctor/patients`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const totalPatients = patientsResponse.data?.pagination?.total || 0;

      // Get today's date in YYYY-MM-DD format for Vietnamese timezone
      const todayDateStr = dayjs().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");
      console.log("Today's date:", todayDateStr);

      // Get appointments with today's date filter
      const response = await axios.get(`${url1}/doctor/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          filter_date: todayDateStr, // Pass today's date as filter parameter
        },
      });

      if (response.data.success) {
        const appointmentsData = response.data.data || [];
        console.log("All appointments from API:", appointmentsData);
        setAppointments(appointmentsData);

        // Current time in Vietnam timezone
        const now = dayjs().tz("Asia/Ho_Chi_Minh");
        console.log("Current time:", now.format("YYYY-MM-DD HH:mm:ss"));

        // Debug: Log each appointment with its time and evaluation result
        appointmentsData.forEach((appointment) => {
          // Convert appointment time to Vietnam timezone
          const appointmentTime = dayjs(appointment.appointment_datetime).tz(
            "Asia/Ho_Chi_Minh"
          );
          const isAccepted = appointment.status === "accepted";
          const isAfterNow = appointmentTime.isAfter(now);
          console.log(`Appointment ${appointment.appointment_id}: 
            - Time: ${appointmentTime.format("YYYY-MM-DD HH:mm:ss")}
            - Status: ${appointment.status} (isAccepted: ${isAccepted})
            - After current time: ${isAfterNow}
            - Will be included: ${isAccepted && isAfterNow}`);
        });

        // Filter upcoming accepted appointments and sort by time
        const upcomingAppointments = appointmentsData
          .filter((appointment) => {
            // Check if status is accepted
            const isAccepted = appointment.status === "accepted";

            // Parse the appointment time and convert to Vietnam timezone
            const appointmentTime = dayjs(appointment.appointment_datetime).tz(
              "Asia/Ho_Chi_Minh"
            );
            const isAfterNow = appointmentTime.isAfter(now);

            console.log(`Time comparison for ${appointment.appointment_id}: 
              - Is accepted: ${isAccepted}
              - Is after now: ${isAfterNow}`);

            return isAccepted && isAfterNow;
          })
          .sort((a, b) => {
            return (
              dayjs(a.appointment_datetime).tz("Asia/Ho_Chi_Minh").valueOf() -
              dayjs(b.appointment_datetime).tz("Asia/Ho_Chi_Minh").valueOf()
            );
          });

        console.log(
          "Filtered upcoming accepted appointments:",
          upcomingAppointments
        );

        // Get the top 7 upcoming appointments
        const top7UpcomingAppointments = upcomingAppointments.slice(0, 7);
        console.log("Top 7 upcoming appointments:", top7UpcomingAppointments);
        setFilteredAppointments(top7UpcomingAppointments);

        // Find next patient (the closest upcoming appointment)
        const nextPatient =
          upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
        console.log("Next patient selected:", nextPatient);
        setNextPatient(nextPatient);

        // Count today's unique patients by family_name
        const uniqueTodayPatients = new Set();
        const todayAppointmentsCount = top7UpcomingAppointments.length;

        // Only count patients from appointments that are actually displayed (filtered)
        top7UpcomingAppointments.forEach((appointment) => {
          if (appointment.family_name) {
            uniqueTodayPatients.add(appointment.family_name);
          }
        });

        // Calculate summary statistics - sync with what's displayed on the UI
        const withRecords = top7UpcomingAppointments.filter(
          (app) => app.medical_record
        ).length;
        const withPrescriptions = top7UpcomingAppointments.filter(
          (app) => app.prescription
        ).length;
        const pending = top7UpcomingAppointments.filter(
          (app) => !app.medical_record || !app.prescription
        ).length;

        setSummaryStats({
          totalPatients,
          todayPatients: uniqueTodayPatients.size,
          todayAppointments: todayAppointmentsCount,
          withRecords,
          withPrescriptions,
          pending,
        });

        // If detailed prescription and medical record data is still needed
        if (appointmentsData.length > 0) {
          const appointmentsWithDetails = await Promise.all(
            appointmentsData.map(async (appointment) => {
              try {
                const detailsResponse = await axios.get(
                  `${url1}/doctor/appointments/${appointment.appointment_id}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );

                return {
                  ...appointment,
                  medical_record:
                    detailsResponse.data.data?.medical_record || null,
                  prescription: detailsResponse.data.data?.prescription || null,
                };
              } catch (error) {
                console.error(
                  `Error fetching details for appointment ${appointment.appointment_id}:`,
                  error
                );
                return appointment;
              }
            })
          );
          setAppointments(appointmentsWithDetails);

          // Update filtered appointments with details as well
          const upcomingAppointmentsWithDetails = appointmentsWithDetails
            .filter(
              (appointment) =>
                appointment.status === "accepted" &&
                dayjs(appointment.appointment_datetime)
                  .tz("Asia/Ho_Chi_Minh")
                  .isAfter(now)
            )
            .sort((a, b) => {
              return (
                dayjs(a.appointment_datetime).tz("Asia/Ho_Chi_Minh").valueOf() -
                dayjs(b.appointment_datetime).tz("Asia/Ho_Chi_Minh").valueOf()
              );
            });

          // Get the top 7 upcoming appointments with details
          const top7UpcomingWithDetails = upcomingAppointmentsWithDetails.slice(
            0,
            7
          );
          setFilteredAppointments(top7UpcomingWithDetails);

          // Update next patient with details
          if (upcomingAppointmentsWithDetails.length > 0) {
            setNextPatient(upcomingAppointmentsWithDetails[0]);
          }

          // Update statistics with the refreshed data
          const updatedUniqueTodayPatients = new Set();
          const updatedTodayAppointmentsCount = top7UpcomingWithDetails.length;

          top7UpcomingWithDetails.forEach((appointment) => {
            if (appointment.family_name) {
              updatedUniqueTodayPatients.add(appointment.family_name);
            }
          });

          setSummaryStats((prev) => ({
            ...prev,
            todayPatients: updatedUniqueTodayPatients.size,
            todayAppointments: updatedTodayAppointmentsCount,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      showNotification("error", "Lỗi", "Không thể tải danh sách lịch hẹn");

      // Reset statistics to 0 on error
      setSummaryStats({
        totalPatients: 0,
        todayPatients: 0,
        todayAppointments: 0,
        withRecords: 0,
        withPrescriptions: 0,
        pending: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const findNextPatient = (appointments) => {
    // Find the next accepted appointment that hasn't happened yet
    const now = dayjs().tz("Asia/Ho_Chi_Minh");
    const upcomingAppointments = appointments.filter((appointment) => {
      return (
        appointment.status === "accepted" &&
        dayjs(appointment.appointment_datetime)
          .tz("Asia/Ho_Chi_Minh")
          .isAfter(now)
      );
    });

    // Sort by time
    upcomingAppointments.sort((a, b) => {
      return dayjs(a.appointment_datetime)
        .tz("Asia/Ho_Chi_Minh")
        .diff(dayjs(b.appointment_datetime).tz("Asia/Ho_Chi_Minh"));
    });

    // Set the next patient
    if (upcomingAppointments.length > 0) {
      setNextPatient(upcomingAppointments[0]);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Apply filters whenever search text or filter status changes
  useEffect(() => {
    filterAppointments();
  }, [searchText, filterStatus, selectedDate, appointments, todayDate]);

  const filterAppointments = () => {
    // Start with today's accepted appointments
    let filtered = appointments.filter(
      (appointment) => appointment.status === "accepted"
    );

    // Apply text search
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (appointment) =>
          appointment.family_name?.toLowerCase().includes(searchLower) ||
          appointment.family_email?.toLowerCase().includes(searchLower) ||
          appointment.appointment_id?.toString().includes(searchLower)
      );
    }

    // Apply status filter if different from default 'accepted'
    if (filterStatus && filterStatus !== "accepted" && filterStatus !== "all") {
      filtered = filtered.filter(
        (appointment) => appointment.status === filterStatus
      );
    }

    // Apply date filter only if selected a different date
    if (selectedDate) {
      const dateString = dayjs(selectedDate)
        .tz("Asia/Ho_Chi_Minh")
        .format("YYYY-MM-DD");
      filtered = filtered.filter((appointment) => {
        const appointmentDate = dayjs(appointment.appointment_datetime)
          .tz("Asia/Ho_Chi_Minh")
          .format("YYYY-MM-DD");
        return appointmentDate === dateString;
      });
    }

    // Sort by time
    filtered.sort((a, b) => {
      return (
        dayjs(a.appointment_datetime).tz("Asia/Ho_Chi_Minh").valueOf() -
        dayjs(b.appointment_datetime).tz("Asia/Ho_Chi_Minh").valueOf()
      );
    });

    setFilteredAppointments(filtered);
  };

  const handleViewDetails = async (appointmentId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${url1}/doctor/appointments/${appointmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setSelectedAppointment(response.data.data);
        setDrawerVisible(true);
      }
    } catch (error) {
      console.error("Error fetching appointment details:", error);
      showNotification("error", "Lỗi", "Không thể tải chi tiết lịch hẹn");
    } finally {
      setLoading(false);
    }
  };

  const createMedicalRecord = async (appointmentId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${url1}/doctor/medical-records`,
        {
          appointment_id: appointmentId,
          diagnosis: "",
          treatment: "",
          notes: "",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        showNotification("success", "Thành công", "Đã tạo hồ sơ bệnh án");
        fetchAppointments();
      }
    } catch (error) {
      console.error("Error creating medical record:", error);
      showNotification("error", "Lỗi", "Không thể tạo hồ sơ bệnh án");
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${url1}/doctor/appointments/complete`,
        { appointment_id: appointmentId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        showNotification("success", "Thành công", "Đã hoàn thành lịch hẹn");
        fetchAppointments();
      }
    } catch (error) {
      console.error("Error completing appointment:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể hoàn thành lịch hẹn"
      );
    }
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      waiting_for_confirmation: { color: "gold", text: "Chờ xác nhận" },
      accepted: { color: "green", text: "Đã tiếp nhận" },
      completed: { color: "blue", text: "Đã hoàn thành" },
      cancelled: { color: "red", text: "Đã hủy" },
      doctor_day_off: { color: "default", text: "Bác sĩ nghỉ" },
      patient_not_coming: { color: "red", text: "Bệnh nhân không đến" },
    };

    const config = statusConfig[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const handleResetFilters = () => {
    setSearchText("");
    setFilterStatus("accepted");
    setSelectedDate(null);
  };

  const handleCreateMedicalRecord = (appointmentId) => {
    navigate(`/doctor/medical-records/create/${appointmentId}`);
  };

  const handlePatientNotComing = (appointmentId) => {
    setPendingNotComingId(appointmentId);
    setNotComingModalVisible(true);
  };

  const confirmPatientNotComing = async () => {
    try {
      setProcessingNotComing(true);
      const token = localStorage.getItem("token");
      const appointmentId = pendingNotComingId;

      if (!appointmentId) {
        showNotification(
          "error",
          "Lỗi",
          "Không tìm thấy thông tin lịch hẹn để cập nhật"
        );
        setNotComingModalVisible(false);
        setProcessingNotComing(false);
        return;
      }

      const response = await axios.post(
        `${url1}/doctor/appointments/${appointmentId}/mark-not-coming`,
        {
          appointment_id: appointmentId,
          status: "patient_not_coming",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        showNotification(
          "success",
          "Thành công",
          "Đã cập nhật trạng thái bệnh nhân không đến"
        );

        setNotComingModalVisible(false);
        refreshDashboard();
      }
    } catch (error) {
      console.error("Error updating appointment status:", error);

      const errorMessage =
        error.response?.data?.message ||
        "Không thể cập nhật trạng thái. Vui lòng thử lại.";

      showNotification("error", "Lỗi cập nhật trạng thái", errorMessage);
    } finally {
      setProcessingNotComing(false);
    }
  };

  const isToday = (dateStr) => {
    const date = dayjs(dateStr).tz("Asia/Ho_Chi_Minh");
    const today = dayjs().tz("Asia/Ho_Chi_Minh");
    return date.format("YYYY-MM-DD") === today.format("YYYY-MM-DD");
  };

  const todayAppointmentsColumns = [
    {
      title: "BỆNH NHÂN",
      key: "patient",
      dataIndex: "family_name",
      width: "40%",
      render: (_, record) => (
        <div className="flex items-center">
          <Avatar
            src={`https://xsgames.co/randomusers/avatar.php?g=pixel&key=${record.appointment_id}`}
            size={36}
          />
          <div className="ml-2 overflow-hidden">
            <div className="font-medium truncate">{record.family_name}</div>
            <div className="text-xs text-gray-500 truncate">
              {record.family_email}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "THỜI GIAN",
      dataIndex: "appointment_datetime",
      key: "time",
      width: "25%",
      render: (datetime) => {
        const time = dayjs(datetime).tz("Asia/Ho_Chi_Minh").format("HH:mm");
        const date = dayjs(datetime)
          .tz("Asia/Ho_Chi_Minh")
          .format("DD/MM/YYYY");
        return (
          <div>
            <div className="font-medium">{time}</div>
            <div className="text-xs text-gray-500">{date}</div>
          </div>
        );
      },
    },
    {
      title: "TRẠNG THÁI",
      dataIndex: "status",
      key: "status",
      width: "20%",
      render: (status) => getStatusTag(status),
    },
    {
      title: "",
      key: "actions",
      width: "15%",
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record.appointment_id)}
          size="small"
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  const columns = [
    {
      title: "Bệnh nhân",
      key: "patient",
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Avatar
            src={`https://xsgames.co/randomusers/avatar.php?g=pixel&key=${
              record.family_member_id || record.appointment_id
            }`}
            size={40}
            icon={<UserOutlined />}
          />
          <div>
            <div className="font-medium">{record.family_name}</div>
            <div className="text-xs text-gray-500">{record.family_email}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "appointment_datetime",
      key: "appointment_datetime",
      render: (datetime) => (
        <div>
          <div className="font-medium">
            {dayjs(datetime).tz("Asia/Ho_Chi_Minh").format("HH:mm")}
          </div>
          <div className="text-xs text-gray-500">
            {dayjs(datetime).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY")}
          </div>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status, record) => (
        <div>
          {getStatusTag(status)}
          <div className="mt-1">
            {record.medical_record ? (
              <Badge
                status="success"
                text="Có hồ sơ"
                className="mr-2 text-xs"
              />
            ) : (
              <Badge
                status="default"
                text="Chưa có hồ sơ"
                className="mr-2 text-xs"
              />
            )}
            {record.prescription ? (
              <Badge status="success" text="Có đơn thuốc" className="text-xs" />
            ) : (
              <Badge
                status="default"
                text="Chưa có đơn thuốc"
                className="text-xs"
              />
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Space direction="vertical" size="small" className="w-full">
          <Button
            type="primary"
            ghost
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record.appointment_id)}
            className="w-full"
          >
            Chi tiết
          </Button>
          {record.status === "accepted" && !record.medical_record && (
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              onClick={() => handleCreateMedicalRecord(record.appointment_id)}
              className="w-full"
            >
              Tạo hồ sơ
            </Button>
          )}
          {record.status === "accepted" &&
            record.medical_record &&
            record.prescription && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleCompleteAppointment(record.appointment_id)}
                className="w-full"
                style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
              >
                Hoàn thành
              </Button>
            )}
        </Space>
      ),
    },
  ];

  const refreshDashboard = () => {
    setLoading(true);
    setFilteredAppointments([]);
    setNextPatient(null);
    setSummaryStats({
      totalPatients: 0,
      todayPatients: 0,
      todayAppointments: 0,
      withRecords: 0,
      withPrescriptions: 0,
      pending: 0,
    });
    fetchAppointments();
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {contextHolder}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          background: "#fff",
          overflow: "auto",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 2,
          paddingTop: "60px",
        }}
        width={250}
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
        <MenuDoctor collapsed={collapsed} selectedKey="dashboard" />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 250 }}>
        <Content
          style={{
            margin: "80px 24px 24px",
            minHeight: "calc(100vh - 104px)",
            ...tableStyles,
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium">Bảng điều khiển</h2>
            <Button
              icon={<ReloadOutlined />}
              onClick={refreshDashboard}
              loading={loading}
            >
              Làm mới
            </Button>
          </div>

          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} md={8}>
              <Card variant="bordered" className="h-full shadow-sm">
                <div className="flex items-center">
                  <Avatar
                    style={{ backgroundColor: "#e6f7ff", color: "#1890ff" }}
                    size={50}
                    icon={<UsergroupAddOutlined />}
                  />
                  <div className="ml-4">
                    <Text
                      type="secondary"
                      className="uppercase text-xs font-medium"
                    >
                      TỔNG SỐ BỆNH NHÂN
                    </Text>
                    <Title level={3} className="m-0">
                      {summaryStats.totalPatients}
                    </Title>
                    <Text type="secondary">Tính đến hôm nay</Text>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card variant="bordered" className="h-full shadow-sm">
                <div className="flex items-center">
                  <Avatar
                    style={{ backgroundColor: "#f6ffed", color: "#52c41a" }}
                    size={50}
                    icon={<UsergroupAddOutlined />}
                  />
                  <div className="ml-4">
                    <Text
                      type="secondary"
                      className="uppercase text-xs font-medium"
                    >
                      BỆNH NHÂN HÔM NAY
                    </Text>
                    <Title level={3} className="m-0">
                      {summaryStats.todayPatients}
                    </Title>
                    <Text type="secondary">
                      {todayDate.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY")}
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card variant="bordered" className="h-full shadow-sm">
                <div className="flex items-center">
                  <Avatar
                    style={{ backgroundColor: "#e6f7ff", color: "#1890ff" }}
                    size={50}
                    icon={<ClockCircleOutlined />}
                  />
                  <div className="ml-4">
                    <Text
                      type="secondary"
                      className="uppercase text-xs font-medium"
                    >
                      LỊCH HẸN HÔM NAY
                    </Text>
                    <Title level={3} className="m-0">
                      {summaryStats.todayAppointments}
                    </Title>
                    <Text type="secondary">
                      {todayDate.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY")}
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={17}>
              <Card
                title={<span className="font-medium">LỊCH HẸN HÔM NAY</span>}
                variant="bordered"
                className="h-full shadow-sm"
                extra={
                  filteredAppointments.length > 0 ? (
                    <Button
                      type="link"
                      href="/doctor/appointments/accepted"
                      className="text-blue-500 px-0"
                    >
                      Xem thêm
                    </Button>
                  ) : null
                }
              >
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Spin tip="Đang tải lịch hẹn..." />
                  </div>
                ) : filteredAppointments.length > 0 ? (
                  <Table
                    dataSource={filteredAppointments}
                    columns={todayAppointmentsColumns}
                    rowKey="appointment_id"
                    pagination={false}
                    size="small"
                    className="appointments-table"
                    rowClassName={(record, index) =>
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }
                    locale={{
                      emptyText: (
                        <div className="py-5 text-center">
                          <div className="text-gray-500">
                            Không có lịch hẹn nào hôm nay
                          </div>
                        </div>
                      ),
                    }}
                  />
                ) : (
                  <div className="py-6 text-center">
                    <CalendarOutlined
                      style={{ fontSize: 28, color: "#d9d9d9" }}
                    />
                    <div className="mt-2 text-gray-500">
                      Không có lịch hẹn nào hôm nay
                    </div>
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={7}>
              <Card
                title={<span className="font-medium">BỆNH NHÂN TIẾP THEO</span>}
                variant="bordered"
                className="h-full shadow-sm"
              >
                {nextPatient ? (
                  <>
                    <div className="text-center mb-3">
                      <Avatar
                        src={`https://xsgames.co/randomusers/avatar.php?g=pixel&key=${nextPatient.appointment_id}`}
                        size={70}
                      />
                      <h3 className="mt-2 font-medium">
                        {nextPatient.family_name || "Chưa có thông tin"}
                      </h3>
                      <Text className="text-gray-500 text-sm">
                        Mã lịch hẹn: {nextPatient.appointment_id || "N/A"}
                      </Text>
                    </div>

                    <Divider style={{ margin: "12px 0" }} />

                    <div className="px-2">
                      <div className="mb-2">
                        <Text className="block text-gray-500 uppercase text-xs">
                          NGÀY SINH
                        </Text>
                        <Text className="font-medium">
                          {nextPatient.family_dob
                            ? dayjs(nextPatient.family_dob)
                                .tz("Asia/Ho_Chi_Minh")
                                .format("DD/MM/YYYY")
                            : "N/A"}
                        </Text>
                      </div>

                      <div className="mb-2">
                        <Text className="block text-gray-500 uppercase text-xs">
                          GIỚI TÍNH
                        </Text>
                        <Text className="font-medium">
                          {nextPatient.family_gender === "male"
                            ? "Nam"
                            : nextPatient.family_gender === "female"
                            ? "Nữ"
                            : nextPatient.family_gender || "N/A"}
                        </Text>
                      </div>

                      <div className="mb-2">
                        <Text className="block text-gray-500 uppercase text-xs">
                          EMAIL
                        </Text>
                        <Text className="font-medium overflow-hidden text-ellipsis">
                          {nextPatient.family_email || "N/A"}
                        </Text>
                      </div>

                      <div className="mb-2">
                        <Text className="block text-gray-500 uppercase text-xs">
                          THỜI GIAN
                        </Text>
                        <Text className="font-medium">
                          {nextPatient.appointment_datetime
                            ? dayjs(nextPatient.appointment_datetime)
                                .tz("Asia/Ho_Chi_Minh")
                                .format("HH:mm DD/MM/YYYY")
                            : "N/A"}
                        </Text>
                      </div>
                    </div>

                    <Divider style={{ margin: "12px 0" }} />

                    <div className="flex flex-col gap-2">
                      <Button
                        type="primary"
                        icon={<FileTextOutlined />}
                        onClick={() =>
                          handleCreateMedicalRecord(nextPatient.appointment_id)
                        }
                        block
                      >
                        Tạo hồ sơ
                      </Button>
                      <Button
                        danger
                        icon={<CloseCircleOutlined />}
                        onClick={() =>
                          handlePatientNotComing(nextPatient.appointment_id)
                        }
                        loading={
                          processingNotComing &&
                          pendingNotComingId === nextPatient.appointment_id
                        }
                        block
                      >
                        Không đến
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <ClockCircleOutlined
                      style={{ fontSize: 32, color: "#d9d9d9" }}
                    />
                    <Title level={5} className="mt-2 font-normal">
                      Không có bệnh nhân nào sắp đến
                    </Title>
                    <Text type="secondary" className="text-sm">
                      Chưa có lịch hẹn hoặc chưa đến giờ
                    </Text>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
          {selectedAppointment && (
            <AppointmentDetails
              open={drawerVisible}
              onClose={() => {
                setDrawerVisible(false);
                setSelectedAppointment(null);
              }}
              appointmentData={selectedAppointment}
              onUpdate={fetchAppointments}
            />
          )}
        </Content>
      </Layout>
      <Modal
        title="Xác nhận"
        open={notComingModalVisible}
        onOk={confirmPatientNotComing}
        confirmLoading={processingNotComing}
        onCancel={() => setNotComingModalVisible(false)}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        <p>Bạn có chắc chắn muốn đánh dấu bệnh nhân này không đến khám?</p>
        <p className="text-gray-500">
          Lưu ý: Hành động này sẽ thay đổi trạng thái lịch hẹn và không thể hoàn
          tác.
        </p>
      </Modal>
    </Layout>
  );
};

export default DashboardDoctor;
