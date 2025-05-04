import React, { useState, useEffect, useContext } from "react";
import {
  Layout,
  Card,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Empty,
  Spin,
  Drawer,
  Statistic,
  List,
  DatePicker,
  Progress,
  Table,
  Tag,
  Badge,
  Tooltip,
  Input,
} from "antd";
import {
  MedicineBoxOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  FileTextOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import MenuDoctor from "../../components/Doctor/MenuDoctor";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import dayjs from "dayjs";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

const PharmacistDashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    revenue: 0,
  });
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();
  const { url1 } = useContext(AppContext);

  const fetchPrescriptions = async (date) => {
    try {
      setLoading(true);
      const response = await axios.get(`${url1}/doctor/prescriptions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        params: {
          filter_date: date.format("YYYY-MM-DD"),
        },
      });

      if (response.data && response.data.data) {
        setPrescriptions(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
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
    fetchPrescriptions(selectedDate);
  }, [selectedDate]);

  const handleDateChange = (date) => {
    setSelectedDate(date || dayjs());
  };

  const viewPrescription = async (prescription_id) => {
    try {
      const response = await axios.get(
        `${url1}/doctor/prescriptions/${prescription_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setSelectedPrescription(response.data.data);
      setIsDrawerVisible(true);
    } catch (error) {
      console.error("Error fetching prescription details:", error);
    }
  };

  const renderStats = () => (
    <Row gutter={[16, 16]} className="mb-6">
      <Col xs={24} sm={12} lg={6}>
        <Card hoverable>
          <Statistic
            title={<span className="text-gray-600">Tổng đơn thuốc</span>}
            value={stats.total}
            prefix={<FileTextOutlined className="text-blue-500" />}
            valueStyle={{ color: "#1890ff" }}
          />
          <Progress percent={100} showInfo={false} strokeColor="#1890ff" />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card hoverable>
          <Statistic
            title={<span className="text-gray-600">Đã hoàn thành</span>}
            value={stats.completed}
            prefix={<CheckCircleOutlined className="text-green-500" />}
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
        <Card hoverable>
          <Statistic
            title={<span className="text-gray-600">Chờ xử lý</span>}
            value={stats.pending}
            prefix={<ClockCircleOutlined className="text-orange-500" />}
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
        <Card hoverable>
          <Statistic
            title={<span className="text-gray-600">Doanh thu</span>}
            value={stats.revenue}
            prefix={<DollarCircleOutlined className="text-cyan-500" />}
            valueStyle={{ color: "#13c2c2" }}
            suffix="VNĐ"
          />
          <Progress percent={100} showInfo={false} strokeColor="#13c2c2" />
        </Card>
      </Col>
    </Row>
  );

  const columns = [
    {
      title: "Mã đơn",
      dataIndex: "prescription_id",
      key: "prescription_id",
      width: 100,
    },
    {
      title: "Bệnh nhân",
      dataIndex: "patient_name",
      key: "patient_name",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" className="text-xs">
            {record.patient_email}
          </Text>
        </Space>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => dayjs(date).format("HH:mm DD/MM/YYYY"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const statusConfig = {
          pending: { color: "orange", text: "Chờ xử lý" },
          completed: { color: "green", text: "Hoàn thành" },
          cancelled: { color: "red", text: "Đã hủy" },
        };
        return (
          <Tag color={statusConfig[status]?.color}>
            {statusConfig[status]?.text}
          </Tag>
        );
      },
    },
    {
      title: "Tổng tiền",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (amount) => `${amount?.toLocaleString()} VNĐ`,
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={() => viewPrescription(record.prescription_id)}
            />
          </Tooltip>
          <Tooltip title="In đơn thuốc">
            <Button
              icon={<PrinterOutlined />}
              onClick={() => handlePrint(record.prescription_id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handlePrint = (prescriptionId) => {
    // Implement print functionality
    console.log("Printing prescription:", prescriptionId);
  };

  const renderPrescriptionDetails = () => {
    if (!selectedPrescription) return null;

    return (
      <div className="prescription-details">
        <div className="mb-6">
          <Title level={4}>Thông tin đơn thuốc</Title>
          <Card>
            <Space direction="vertical" className="w-full">
              <div className="flex justify-between">
                <Text strong>Mã đơn:</Text>
                <Text>{selectedPrescription.prescription_id}</Text>
              </div>
              <div className="flex justify-between">
                <Text strong>Ngày kê:</Text>
                <Text>
                  {dayjs(selectedPrescription.created_at).format(
                    "HH:mm DD/MM/YYYY"
                  )}
                </Text>
              </div>
              <div className="flex justify-between">
                <Text strong>Trạng thái:</Text>
                <Tag
                  color={
                    selectedPrescription.status === "completed"
                      ? "green"
                      : selectedPrescription.status === "pending"
                      ? "orange"
                      : "red"
                  }
                >
                  {selectedPrescription.status === "completed"
                    ? "Hoàn thành"
                    : selectedPrescription.status === "pending"
                    ? "Chờ xử lý"
                    : "Đã hủy"}
                </Tag>
              </div>
            </Space>
          </Card>
        </div>

        <Title level={4}>Danh sách thuốc</Title>
        <List
          dataSource={selectedPrescription.medicines || []}
          renderItem={(medicine) => (
            <Card className="mb-3">
              <div className="flex justify-between items-start">
                <div>
                  <Text strong className="text-lg">
                    {medicine.name}
                  </Text>
                  <div className="mt-2">
                    <Space direction="vertical">
                      <Text>
                        <Text type="secondary">Số lượng:</Text>{" "}
                        {medicine.quantity}
                      </Text>
                      <Text>
                        <Text type="secondary">Liều dùng:</Text>{" "}
                        {medicine.dosage}
                      </Text>
                      <Text>
                        <Text type="secondary">Tần suất:</Text>{" "}
                        {medicine.frequency}
                      </Text>
                      <Text>
                        <Text type="secondary">Thời gian:</Text>{" "}
                        {medicine.duration}
                      </Text>
                    </Space>
                  </div>
                </div>
                <div className="text-right">
                  <Text strong className="text-lg text-blue-600">
                    {medicine.total.toLocaleString()} VNĐ
                  </Text>
                </div>
              </div>
            </Card>
          )}
        />

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <Text strong className="text-lg">
              Tổng tiền:
            </Text>
            <Text strong className="text-xl text-blue-600">
              {selectedPrescription.total_amount?.toLocaleString()} VNĐ
            </Text>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
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
              borderRadius: 8,
            }}
          >
            <div className="mb-6">
              <Row gutter={16} align="middle" justify="space-between">
                <Col>
                  <Title level={2} className="mb-0">
                    Quản lý đơn thuốc
                  </Title>
                </Col>
                <Col>
                  <Space>
                    <Search
                      placeholder="Tìm kiếm đơn thuốc..."
                      allowClear
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ width: 250 }}
                    />
                    <DatePicker
                      value={selectedDate}
                      onChange={handleDateChange}
                      format="DD/MM/YYYY"
                      allowClear={false}
                    />
                  </Space>
                </Col>
              </Row>
            </div>

            {renderStats()}

            <Card className="mt-6">
              <Table
                columns={columns}
                dataSource={prescriptions}
                loading={loading}
                rowKey="prescription_id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `Tổng số ${total} đơn thuốc`,
                }}
              />
            </Card>
          </Content>
        </Layout>
      </Layout>
      <Drawer
        width={640}
        placement="right"
        closable={true}
        onClose={() => setIsDrawerVisible(false)}
        visible={isDrawerVisible}
        title={
          <Space>
            <MedicineBoxOutlined />
            <span>Chi tiết đơn thuốc</span>
          </Space>
        }
      >
        {renderPrescriptionDetails()}
      </Drawer>
    </Layout>
  );
};

export default PharmacistDashboard;
