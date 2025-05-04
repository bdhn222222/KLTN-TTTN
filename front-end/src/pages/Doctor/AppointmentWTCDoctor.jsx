import React, { useState, useEffect, useContext } from "react";
import {
  Layout,
  Card,
  Row,
  Col,
  Button,
  Avatar,
  Space,
  Tag,
  Flex,
  notification,
  Typography,
  Empty,
  Spin,
  Drawer,
  Statistic,
  Timeline,
  List,
  DatePicker,
  Progress,
} from "antd";
import {
  UserOutlined,
  EyeOutlined,
  MedicineBoxOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  DollarCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import MenuDoctor from "../../components/Doctor/MenuDoctor";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import dayjs from "dayjs";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const PharmacistDashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    revenue: 0,
  });
  const navigate = useNavigate();
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: "topRight",
      duration: 3,
    });
  };

  const fetchAppointments = async (date) => {
    try {
      setLoading(true);
      const response = await axios.get(`${url1}/doctor/appointments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        params: {
          status: "accepted",
          filter_date: date.format("YYYY-MM-DD"),
        },
      });

      if (response.data && response.data.data) {
        setAppointments(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      showNotification(
        "error",
        "Tải dữ liệu thất bại",
        "Không thể tải danh sách cuộc hẹn, vui lòng thử lại sau"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${url1}/doctor/summary`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data && response.data.data) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAppointments(selectedDate);
  }, [selectedDate]);

  const handleDateChange = (date) => {
    setSelectedDate(date || dayjs());
  };

  const viewPrescription = async (appointment_id) => {
    try {
      const response = await axios.get(
        `${url1}/doctor/appointments/${appointment_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setSelectedPrescription(response.data.data);
      setIsDrawerVisible(true);
    } catch (error) {
      showNotification(
        "error",
        "Lỗi",
        "Không thể tải thông tin chi tiết đơn thuốc"
      );
    }
  };

  const renderStats = () => (
    <Row gutter={[16, 16]} className="mb-6">
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Tổng số đơn thuốc"
            value={stats.total}
            prefix={<FileDoneOutlined />}
            valueStyle={{ color: "#1890ff" }}
          />
          <Progress percent={100} showInfo={false} strokeColor="#1890ff" />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Đã hoàn thành"
            value={stats.completed}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: "#52c41a" }}
          />
          <Progress
            percent={Math.round((stats.completed / stats.total) * 100)}
            showInfo={false}
            strokeColor="#52c41a"
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Chờ xử lý"
            value={stats.pending}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: "#faad14" }}
          />
          <Progress
            percent={Math.round((stats.pending / stats.total) * 100)}
            showInfo={false}
            strokeColor="#faad14"
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Doanh thu"
            value={stats.revenue}
            prefix={<DollarCircleOutlined />}
            valueStyle={{ color: "#13c2c2" }}
            suffix="VNĐ"
          />
          <Progress percent={100} showInfo={false} strokeColor="#13c2c2" />
        </Card>
      </Col>
    </Row>
  );

  const renderPrescriptionDetails = () => {
    if (!selectedPrescription) return null;

    return (
      <div className="prescription-details">
        <Title level={4}>Chi tiết đơn thuốc</Title>
        <div className="patient-info mb-4">
          <Text strong>Bệnh nhân: </Text>
          <Text>{selectedPrescription.patient_name}</Text>
          <br />
          <Text strong>Ngày kê: </Text>
          <Text>{dayjs(selectedPrescription.date).format("DD/MM/YYYY")}</Text>
        </div>

        <Title level={5}>Danh sách thuốc</Title>
        <List
          dataSource={selectedPrescription.medicines}
          renderItem={(medicine) => (
            <List.Item>
              <List.Item.Meta
                avatar={<MedicineBoxOutlined />}
                title={medicine.name}
                description={
                  <>
                    <Text>Số lượng: {medicine.quantity}</Text>
                    <br />
                    <Text>Hướng dẫn: {medicine.instructions}</Text>
                  </>
                }
              />
              <div>
                <Text strong>{medicine.total.toLocaleString()} VNĐ</Text>
              </div>
            </List.Item>
          )}
        />

        <div className="total-section mt-4">
          <Text strong>Tổng tiền: </Text>
          <Text className="text-lg">
            {selectedPrescription.total_amount?.toLocaleString()} VNĐ
          </Text>
        </div>
      </div>
    );
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {contextHolder}
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
          <Content
            style={{
              margin: "24px 16px",
              padding: 24,
              minHeight: 280,
              background: "#fff",
            }}
          >
            <Flex justify="space-between" align="center" className="mb-6">
              <Title level={2}>Quản lý đơn thuốc</Title>
              <DatePicker
                value={selectedDate}
                onChange={handleDateChange}
                format="DD/MM/YYYY"
                allowClear={false}
              />
            </Flex>

            {renderStats()}

            <Title level={3}>Đơn thuốc hôm nay</Title>
            <Spin spinning={loading}>
              {appointments.length > 0 ? (
                <Row gutter={[16, 16]}>
                  {appointments.map((appointment) => (
                    <Col
                      xs={24}
                      sm={12}
                      lg={8}
                      key={appointment.appointment_id}
                    >
                      <Card
                        hoverable
                        className="prescription-card"
                        actions={[
                          <Button
                            type="primary"
                            icon={<EyeOutlined />}
                            onClick={() =>
                              viewPrescription(appointment.appointment_id)
                            }
                          >
                            Xem đơn thuốc
                          </Button>,
                        ]}
                      >
                        <Flex align="center" gap={16}>
                          <Avatar
                            size={64}
                            icon={<UserOutlined />}
                            className="bg-blue-900"
                          />
                          <div>
                            <Title level={5}>{appointment.family_name}</Title>
                            <Text type="secondary">
                              {appointment.family_email}
                            </Text>
                            <div className="mt-2">
                              <Space>
                                <CalendarOutlined />
                                <Text>
                                  {dayjs(
                                    appointment.appointment_datetime
                                  ).format("DD/MM/YYYY")}
                                </Text>
                              </Space>
                            </div>
                            <div className="mt-1">
                              <Space>
                                <ClockCircleOutlined />
                                <Text>
                                  {dayjs(
                                    appointment.appointment_datetime
                                  ).format("HH:mm")}
                                </Text>
                              </Space>
                            </div>
                          </div>
                        </Flex>
                      </Card>
                    </Col>
                  ))}
                </Row>
              ) : (
                <Empty
                  description="Không có đơn thuốc nào trong ngày này"
                  className="mt-8"
                />
              )}
            </Spin>
          </Content>
        </Layout>
      </Layout>
      <Drawer
        width={640}
        placement="right"
        closable={true}
        onClose={() => setIsDrawerVisible(false)}
        visible={isDrawerVisible}
        title="Chi tiết đơn thuốc"
      >
        {renderPrescriptionDetails()}
      </Drawer>
    </Layout>
  );
};

export default PharmacistDashboard;
