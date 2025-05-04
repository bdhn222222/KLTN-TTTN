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
} from "antd";
import {
  EyeOutlined,
  FileAddOutlined,
  CheckCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import NavbarDoctor from "../../components/Doctor/NavbarDoctor";
import MenuDoctor from "../../components/Doctor/MenuDoctor";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import dayjs from "dayjs";
import AppointmentDetails from "../../components/Doctor/AppointmentDetails";

const { Header, Sider, Content } = Layout;

const AppointmentAccDoctor = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { url1 } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { user } = useContext(AppContext);
  const navigate = useNavigate();

  const showNotification = (type, message, description) => {
    notification[type]({
      message,
      description,
    });
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${url1}/doctor/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: "accepted" },
      });

      if (response.data.success) {
        console.log("Appointments data:", response.data.data);
        // FamilyMember data should already be included in the API response
        setAppointments(response.data.data);

        // If detailed prescription and medical record data is still needed
        // and not provided by the main API, we can fetch them in a more optimized way
        if (response.data.data.length > 0) {
          const appointmentsWithDetails = await Promise.all(
            response.data.data.map(async (appointment) => {
              try {
                const detailsResponse = await axios.get(
                  `${url1}/doctor/appointments/${appointment.appointment_id}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );

                console.log(
                  `Detail for appointment ${appointment.appointment_id}:`,
                  detailsResponse.data.data
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
        }
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      showNotification("error", "Lỗi", "Không thể tải danh sách lịch hẹn");
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
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${url1}/doctor/appointments/${appointmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        console.log("Appointment detail data:", response.data.data);
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
      accepted: { color: "processing", text: "Đã tiếp nhận" },
      completed: { color: "success", text: "Đã hoàn thành" },
      cancelled: { color: "error", text: "Đã hủy" },
      doctor_day_off: { color: "default", text: "Bác sĩ nghỉ" },
      patient_not_coming: { color: "warning", text: "Bệnh nhân không đến" },
    };

    const config = statusConfig[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: "Mã cuộc hẹn",
      dataIndex: "appointment_id",
      key: "appointment_id",
      width: "15%",
    },
    {
      title: "Tên bệnh nhân",
      dataIndex: "family_name",
      key: "family_name",
      width: "25%",
    },
    {
      title: "Email",
      dataIndex: "family_email",
      key: "family_email",
      width: "20%",
      responsive: ["lg"],
    },
    {
      title: "Thời gian",
      dataIndex: "appointment_datetime",
      key: "appointment_datetime",
      width: "15%",
      render: (datetime) => dayjs(datetime).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: "10%",
      render: (status) => getStatusTag(status),
    },
    {
      title: "Thao tác",
      key: "action",
      width: "15%",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            ghost
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record.appointment_id)}
          >
            Chi tiết
          </Button>
          {record.status === "accepted" && !record.medical_record && (
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              onClick={() => createMedicalRecord(record.appointment_id)}
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
              >
                Hoàn thành
              </Button>
            )}
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
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
        <MenuDoctor collapsed={collapsed} />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 250 }}>
        <Header
          style={{
            padding: 0,
            background: "#fff",
            position: "fixed",
            width: `calc(100% - ${collapsed ? 80 : 250}px)`,
            top: 0,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            height: "60px",
          }}
        >
          <NavbarDoctor />
        </Header>
        <Content
          style={{
            margin: "80px 24px 24px",
            borderRadius: "8px",
            background: "#fff",
            padding: 0,
            minHeight: "calc(100vh - 104px)",
          }}
        >
          <Card
            title="Danh sách cuộc hẹn đã tiếp nhận"
            variant="bordered"
            styles={{
              body: {
                padding: "20px",
              },
            }}
            style={{
              borderRadius: "8px",
            }}
          >
            <Table
              loading={loading}
              dataSource={appointments}
              columns={columns}
              rowKey="appointment_id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Tổng số ${total} cuộc hẹn`,
                style: { marginBottom: 0 },
              }}
              scroll={{ x: 1000 }}
              style={{ marginTop: "8px" }}
            />
          </Card>

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
    </Layout>
  );
};

export default AppointmentAccDoctor;
