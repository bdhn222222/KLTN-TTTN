import React, { useState, useEffect, useContext } from "react";
import {
  Layout,
  Card,
  Typography,
  Spin,
  Divider,
  List,
  Avatar,
  Tag,
  Row,
  Col,
  Button,
  InputNumber,
  Input,
  Table,
  notification,
  Space,
  Modal,
  Radio,
  Alert,
  Empty,
  Descriptions,
  Tooltip,
} from "antd";
import {
  UserOutlined,
  MedicineBoxOutlined,
  ClockCircleOutlined,
  MoneyCollectOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  CalendarOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import NavbarPhar from "../../components/Pharmacist/NavbarPhar";
import MenuPhar from "../../components/Pharmacist/MenuPhar";
import { AppContext } from "../../context/AppContext";
import "./PrescriptionPrepare.css";

const { Title, Text, Paragraph } = Typography;
const { Sider, Content } = Layout;

const PrescriptionDetailToPrepare = () => {
  const { prescriptionId } = useParams();
  const navigate = useNavigate();
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  const [pharmacistName, setPharmacistName] = useState("");

  const [loading, setLoading] = useState(true);
  const [prescriptionDetail, setPrescriptionDetail] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [allocations, setAllocations] = useState([]);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [preparationLoading, setPreparationLoading] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    fetchPrescriptionDetail();
    getUserInfo();
  }, [prescriptionId, url1]);

  const fetchPrescriptionDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${url1}/pharmacist/prescriptions/fifo/${prescriptionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        console.log("Prescription detail data:", response.data);
        setPrescriptionDetail(response.data.data);

        // Initialize allocations with the data from API
        const initialAllocations = response.data.data.lines.map((line) => ({
          medicine_id: line.medicine_id,
          allocated: Math.min(line.quantity, line.total_available),
          max: Math.min(line.quantity, line.total_available),
        }));

        setAllocations(initialAllocations);
      } else {
        showNotification("error", "Lỗi", "Không thể tải thông tin đơn thuốc");
      }
    } catch (error) {
      console.error("Error fetching prescription detail:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể tải thông tin đơn thuốc"
      );
    } finally {
      setLoading(false);
    }
  };

  const getUserInfo = async () => {
    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("user_id");

      if (token && userId) {
        const response = await axios.get(`${url1}/pharmacist/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data && response.data.username) {
          setPharmacistName(response.data.username);
        }
      }
    } catch (error) {
      console.error("Error fetching pharmacist info:", error);
    }
  };

  const showNotification = (type, message, description) => {
    api[type]({
      message,
      description,
      placement: "topRight",
      duration: 4,
    });
  };

  const handleAllocationChange = (medicine_id, value) => {
    const updatedAllocations = allocations.map((allocation) => {
      if (allocation.medicine_id === medicine_id) {
        return { ...allocation, allocated: value };
      }
      return allocation;
    });

    setAllocations(updatedAllocations);
  };

  const calculateTotalAmount = () => {
    if (!prescriptionDetail) return 0;

    return prescriptionDetail.lines.reduce((total, line) => {
      const allocation = allocations.find(
        (a) => a.medicine_id === line.medicine_id
      );
      if (!allocation) return total;

      return total + allocation.allocated * line.unit_price;
    }, 0);
  };

  const handlePrepareClick = () => {
    // Check if any medicine is short on stock
    const shortages = prescriptionDetail.lines.filter(
      (line) => line.total_available < line.quantity
    );

    if (shortages.length > 0) {
      // Show warning if there are shortages
      setConfirmModalVisible(true);
    } else {
      // Proceed directly to payment if no shortages
      setPaymentModalVisible(true);
    }
  };

  const handleConfirmWithShortage = () => {
    setConfirmModalVisible(false);
    setPaymentModalVisible(true);
  };

  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
  };

  const handlePrepareAndPay = async () => {
    try {
      setPreparationLoading(true);
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("user_id"); // Get user ID from localStorage

      // Chuẩn bị dữ liệu gửi lên server
      const requestLines = prescriptionDetail.lines
        .map((line) => {
          // Tìm thông tin allocation từ state
          const allocation = allocations.find(
            (a) => a.medicine_id === line.medicine_id
          );
          if (!allocation) return null;

          // Chỉ gửi những thuốc có số lượng cấp > 0
          if (!allocation.allocated || allocation.allocated <= 0) return null;

          // Gửi cả thông tin phân bổ theo batch từ FIFO
          return {
            medicine_id: line.medicine_id,
            allocated: allocation.allocated,
            allocations: line.allocations, // Thông tin phân bổ theo FIFO đã được tính từ API
          };
        })
        .filter(Boolean); // Loại bỏ các item null

      const response = await axios.post(
        `${url1}/pharmacist/prescriptions/${prescriptionId}/prepare-and-pay`,
        {
          lines: requestLines,
          payment_method: paymentMethod,
          pharmacist_id: userId, // Add the pharmacist ID to the request
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        showNotification(
          "success",
          "Thành công",
          `Đơn thuốc #${prescriptionId} đã được chuẩn bị và thanh toán thành công bởi ${
            pharmacistName || "dược sĩ"
          }`
        );
        setPaymentModalVisible(false);

        // Navigate back to the prescriptions list after success
        setTimeout(() => {
          navigate("/pharmacist/prescriptions/pending");
        }, 1500);
      } else {
        showNotification("error", "Lỗi", "Không thể hoàn tất đơn thuốc");
      }
    } catch (error) {
      console.error("Error preparing prescription:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể hoàn tất đơn thuốc"
      );
    } finally {
      setPreparationLoading(false);
    }
  };

  const handleCancelPrescription = async () => {
    try {
      setCancelLoading(true);
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("user_id"); // Get user ID from localStorage

      const response = await axios.patch(
        `${url1}/pharmacist/prescriptions/${prescriptionId}/cancel`,
        {
          reason: cancelReason,
          pharmacist_id: userId, // Add pharmacist ID to the request
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        const pharmacistName = response.data.data.pharmacist?.name || "Dược sĩ";

        showNotification(
          "success",
          "Thành công",
          `Đã huỷ đơn thuốc thành công bởi ${pharmacistName}`
        );
        setCancelModalVisible(false);
        setCancelReason("");

        // Navigate back to the prescriptions list after success
        setTimeout(() => {
          navigate("/pharmacist/prescriptions/pending");
        }, 1500);
      } else {
        showNotification("error", "Lỗi", "Không thể huỷ đơn thuốc");
      }
    } catch (error) {
      console.error("Error cancelling prescription:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể huỷ đơn thuốc"
      );
    } finally {
      setCancelLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    // If amount is null, undefined, or NaN, return default value
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "0 VNĐ";
    }

    // If amount is a string with format like "100,000 VNĐ"
    if (typeof amount === "string" && amount.includes("VNĐ")) {
      // Extract numeric part removing commas and VNĐ
      const numericPart = amount.replace(/[^\d]/g, "");
      if (numericPart) {
        // Convert to number and format back
        const numAmount = parseInt(numericPart, 10);
        if (!isNaN(numAmount)) {
          return `${numAmount.toLocaleString("vi-VN")} VNĐ`;
        }
      }
      // If we couldn't parse the string, return it as is
      return amount;
    }

    // Ensure amount is a number
    const numAmount = typeof amount === "number" ? amount : parseFloat(amount);

    // If conversion resulted in NaN, return default
    if (isNaN(numAmount)) {
      return "0 VNĐ";
    }

    // Format the number
    return `${numAmount.toLocaleString("vi-VN")} VNĐ`;
  };

  const formatDate = (date) => {
    return dayjs(date).format("DD/MM/YYYY HH:mm");
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <NavbarPhar />
        <Layout>
          <Sider
            width={250}
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
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
            <MenuPhar collapsed={collapsed} selectedKey="pending_prepare" />
          </Sider>
          <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
            <Content style={{ margin: "24px 16px", overflow: "initial" }}>
              <div className="flex justify-center items-center h-full">
                <Spin size="large" />
              </div>
            </Content>
          </Layout>
        </Layout>
      </Layout>
    );
  }

  if (!prescriptionDetail) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <NavbarPhar />
        <Layout>
          <Sider
            width={250}
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
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
            <MenuPhar collapsed={collapsed} selectedKey="pending_prepare" />
          </Sider>
          <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
            <Content style={{ margin: "24px 16px", overflow: "initial" }}>
              <Empty
                description="Không tìm thấy thông tin đơn thuốc"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
              <div className="text-center mt-4">
                <Button
                  type="primary"
                  onClick={() => navigate("/pharmacist/prescriptions/pending")}
                >
                  Quay lại danh sách đơn
                </Button>
              </div>
            </Content>
          </Layout>
        </Layout>
      </Layout>
    );
  }

  // Render content when we have prescription data
  return (
    <Layout style={{ minHeight: "100vh" }}>
      {contextHolder}
      <NavbarPhar />
      <Layout>
        <Sider
          width={250}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
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
          <MenuPhar collapsed={collapsed} selectedKey="pending_prepare" />
        </Sider>
        <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
          <Content style={{ margin: "24px 16px", overflow: "initial" }}>
            <Card bordered={false} className="shadow-sm mb-4">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/pharmacist/prescriptions/pending")}
                className="mr-4 !border-none !bg-white !shadow-none"
              >
                Quay lại
              </Button>
              <div className="flex justify-between items-center mb-4 mt-4">
                <div className="flex items-center ">
                  <div>
                    <Title level={4} className="!m-0">
                      Chi tiết đơn thuốc #{prescriptionDetail.prescription_id}
                    </Title>
                  </div>
                </div>
                <div>
                  <Tag color="gold">
                    <ClockCircleOutlined /> Chờ chuẩn bị
                  </Tag>
                </div>
              </div>

              <div className="flex justify-end mb-4">
                <Space>
                  <Button
                    danger
                    icon={<WarningOutlined />}
                    onClick={() => setCancelModalVisible(true)}
                  >
                    Huỷ đơn
                  </Button>

                  {allocations.every((a) => a.allocated == 0) && (
                    <Button
                      type="primary"
                      icon={<MoneyCollectOutlined />}
                      onClick={handlePrepareClick}
                      //   disabled={allocations.every((a) => a.allocated === 0)}
                      className="!bg-blue-900"
                    >
                      Chuẩn bị và thanh toán
                    </Button>
                  )}
                </Space>
              </div>

              <Row gutter={[24, 24]}>
                {/* Patient Information */}
                <Col xs={24} md={12}>
                  <Card title="Thông tin bệnh nhân" className="h-full">
                    <div className="flex items-center mb-3">
                      <Avatar
                        icon={<UserOutlined />}
                        className="mr-3 bg-blue-900"
                        size={40}
                      />
                      <div className="ml-2">
                        <Text strong style={{ fontSize: "16px" }}>
                          {prescriptionDetail.family_member.name}
                        </Text>
                        <div>
                          <Text type="secondary">
                            SĐT:{" "}
                            {prescriptionDetail.family_member.phone_number ||
                              "Không có SĐT"}
                          </Text>
                        </div>
                      </div>
                    </div>

                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Ngày sinh">
                        {prescriptionDetail.family_member.dob}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>

                {/* Appointment Information */}
                <Col xs={24} md={12}>
                  <Card title="Thông tin khám bệnh" className="h-full">
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Mã cuộc hẹn">
                        #{prescriptionDetail.appointment.appointment_id}
                      </Descriptions.Item>
                      <Descriptions.Item label="Ngày khám">
                        <CalendarOutlined className="mr-1" />
                        {formatDate(prescriptionDetail.appointment.datetime)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Bác sĩ">
                        {prescriptionDetail.appointment.doctor_name}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              </Row>

              <Divider>Thông tin thuốc</Divider>

              <List
                itemLayout="vertical"
                dataSource={prescriptionDetail.lines}
                renderItem={(line, index) => {
                  const allocation = allocations.find(
                    (a) => a.medicine_id === line.medicine_id
                  );
                  const isOutOfStock = line.total_available === 0;
                  const isLimited = line.total_available < line.quantity;

                  return (
                    <Card className="mb-4" key={line.medicine_id}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center">
                          <MedicineBoxOutlined className="text-xl mr-2 text-blue-900" />
                          <Text strong style={{ fontSize: "16px" }}>
                            {line.medicine_name}
                          </Text>
                        </div>
                        <div>
                          {isOutOfStock ? (
                            <Tag color="red">Hết hàng</Tag>
                          ) : isLimited ? (
                            <Tag color="orange">Hàng hạn chế</Tag>
                          ) : (
                            <Tag color="green">Còn hàng</Tag>
                          )}
                        </div>
                      </div>

                      <Row gutter={[24, 16]}>
                        <Col xs={24} md={8}>
                          <Card
                            size="small"
                            title="Thông tin kê thuốc"
                            bordered={false}
                            className="bg-gray-50"
                          >
                            <Descriptions column={1} size="small">
                              <Descriptions.Item label="Số lượng kê">
                                <Text strong>{line.quantity}</Text> {line.unit}
                              </Descriptions.Item>
                              <Descriptions.Item label="Đơn giá">
                                {formatCurrency(line.unit_price)}
                              </Descriptions.Item>
                              <Descriptions.Item label="Thành tiền (kê)">
                                <Text type="danger" strong>
                                  {formatCurrency(
                                    line.quantity * line.unit_price
                                  )}
                                </Text>
                              </Descriptions.Item>
                            </Descriptions>
                          </Card>
                        </Col>

                        <Col xs={24} md={8}>
                          <Card
                            size="small"
                            title="Thông tin kho"
                            bordered={false}
                            className="bg-gray-50"
                          >
                            <Descriptions column={1} size="small">
                              <Descriptions.Item label="Số lượng trong kho">
                                <Text strong>{line.total_available}</Text>{" "}
                                {line.unit}
                              </Descriptions.Item>
                              <Descriptions.Item label="Có thể cung cấp đủ">
                                {line.canFulfill ? (
                                  <Text type="success">
                                    Có <CheckCircleOutlined />
                                  </Text>
                                ) : (
                                  <Text type="danger">
                                    Không <WarningOutlined /> (Thiếu{" "}
                                    {line.shortage} {line.unit})
                                  </Text>
                                )}
                              </Descriptions.Item>
                              <Descriptions.Item label="Số lô hàng">
                                {line.batches.length} lô
                              </Descriptions.Item>
                            </Descriptions>
                          </Card>
                        </Col>

                        <Col xs={24} md={8}>
                          <Card
                            size="small"
                            title="Cấp thuốc"
                            bordered={false}
                            className="bg-blue-50"
                          >
                            <div className="flex flex-col items-center">
                              <Text className="mb-2">Số lượng cấp:</Text>
                              <InputNumber
                                min={0}
                                max={allocation?.max || 0}
                                value={allocation?.allocated || 0}
                                onChange={(value) =>
                                  handleAllocationChange(
                                    line.medicine_id,
                                    value
                                  )
                                }
                                disabled={isOutOfStock}
                                className="w-full mb-3"
                              />
                              <Text
                                type="secondary"
                                className="text-xs text-center"
                              >
                                {isOutOfStock
                                  ? "Không thể cấp thuốc vì hết hàng"
                                  : isLimited
                                  ? `Chỉ có thể cấp tối đa ${line.total_available} ${line.unit}`
                                  : `Có thể cấp tối đa ${line.quantity} ${line.unit}`}
                              </Text>
                              <Text type="danger" strong className="mt-2">
                                {formatCurrency(
                                  (allocation?.allocated || 0) * line.unit_price
                                )}
                              </Text>
                            </div>
                          </Card>
                        </Col>
                      </Row>

                      {line.batches.length > 0 && (
                        <>
                          <Divider orientation="left" plain>
                            Chi tiết lô thuốc
                          </Divider>
                          <Table
                            dataSource={line.batches}
                            columns={[
                              {
                                title: "Mã lô",
                                dataIndex: "batch_number",
                                key: "batch_number",
                              },
                              {
                                title: "Hạn sử dụng",
                                dataIndex: "expiry_date",
                                key: "expiry_date",
                                render: (date) => {
                                  const expiryDate = dayjs(date);
                                  const monthsUntilExpiry = expiryDate.diff(
                                    dayjs(),
                                    "month"
                                  );

                                  let color = "default";
                                  let tooltipText = "";

                                  if (
                                    monthsUntilExpiry <= 3 &&
                                    monthsUntilExpiry > 1
                                  ) {
                                    color = "warning";
                                    tooltipText =
                                      "Sắp hết hạn (trong vòng 3 tháng)";
                                  } else if (monthsUntilExpiry <= 1) {
                                    color = "error";
                                    tooltipText =
                                      "Sắp hết hạn (trong vòng 1 tháng)";
                                  }

                                  return (
                                    <Tooltip title={tooltipText}>
                                      <Tag color={color}>{date}</Tag>
                                    </Tooltip>
                                  );
                                },
                              },
                              {
                                title: "Số lượng",
                                dataIndex: "quantity",
                                key: "quantity",
                                render: (quantity) =>
                                  `${quantity} ${line.unit}`,
                              },
                            ]}
                            pagination={false}
                            size="small"
                          />
                        </>
                      )}
                    </Card>
                  );
                }}
              />

              <Divider />

              <Row>
                <Col xs={24} md={12} offset={12}>
                  <Card className="bg-gray-50">
                    <div className="flex justify-between mb-3">
                      <Text strong>Tổng số loại thuốc:</Text>
                      <Text>{prescriptionDetail.lines.length} loại</Text>
                    </div>
                    <div className="flex justify-between mb-3">
                      <Text strong>Tổng số lượng thuốc được kê:</Text>
                      <Text>
                        {prescriptionDetail.lines.reduce(
                          (sum, line) => sum + line.quantity,
                          0
                        )}{" "}
                        đơn vị
                      </Text>
                    </div>
                    <div className="flex justify-between mb-3">
                      <Text strong>Tổng số lượng cấp:</Text>
                      <Text>
                        {allocations.reduce(
                          (sum, alloc) => sum + (alloc.allocated || 0),
                          0
                        )}{" "}
                        đơn vị
                      </Text>
                    </div>
                    <Divider style={{ margin: "12px 0" }} />
                    <div className="flex justify-between">
                      <Title level={5}>Tổng tiền:</Title>
                      <Title level={5} type="danger">
                        {formatCurrency(calculateTotalAmount())}
                      </Title>
                    </div>
                  </Card>
                </Col>
              </Row>
            </Card>
          </Content>
        </Layout>
      </Layout>

      {/* Shortage Confirmation Modal */}
      <Modal
        title={
          <div className="flex items-center">
            <WarningOutlined className="text-yellow-500 mr-2" />
            Cảnh báo thiếu hàng
          </div>
        }
        open={confirmModalVisible}
        onCancel={() => setConfirmModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setConfirmModalVisible(false)}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleConfirmWithShortage}
            className="!bg-blue-900"
          >
            Tiếp tục với số lượng hiện có
          </Button>,
        ]}
      >
        <Alert
          message="Một số thuốc không đủ số lượng trong kho"
          description="Số lượng thuốc trong kho không đủ để đáp ứng toàn bộ đơn thuốc. Bạn có muốn tiếp tục với số lượng hiện có trong kho?"
          type="warning"
          showIcon
          className="mb-4"
        />
        <List
          dataSource={prescriptionDetail.lines.filter(
            (line) => line.total_available < line.quantity
          )}
          renderItem={(line) => (
            <List.Item>
              <Text>{line.medicine_name}</Text>
              <Text type="danger">
                Kê: {line.quantity} {line.unit} | Kho: {line.total_available}{" "}
                {line.unit} | Thiếu: {line.shortage} {line.unit}
              </Text>
            </List.Item>
          )}
        />
      </Modal>

      {/* Payment Modal */}
      <Modal
        title={
          <div className="flex items-center">
            <MoneyCollectOutlined className="text-green-500 mr-2" />
            Thanh toán đơn thuốc
          </div>
        }
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setPaymentModalVisible(false)}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handlePrepareAndPay}
            loading={preparationLoading}
            className="!bg-blue-900"
          >
            Xác nhận và thanh toán
          </Button>,
        ]}
        width={800}
      >
        <Card className="mb-4">
          <Descriptions
            title="Thông tin đơn thuốc"
            column={1}
            bordered
            size="small"
          >
            <Descriptions.Item label="Mã đơn">
              #{prescriptionDetail.prescription_id}
            </Descriptions.Item>
            <Descriptions.Item label="Bệnh nhân">
              {prescriptionDetail.family_member.name}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng số loại thuốc">
              {prescriptionDetail.lines.length} loại
            </Descriptions.Item>
            <Descriptions.Item label="Tổng tiền">
              <Text type="danger" strong>
                {formatCurrency(calculateTotalAmount())}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Dược sĩ thực hiện">
              <Text strong>{pharmacistName || "Chưa xác định"}</Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <div className="mb-4">
          <Text strong>Danh sách thuốc:</Text>
          <List
            dataSource={prescriptionDetail.lines.filter((line) => {
              const allocation = allocations.find(
                (a) => a.medicine_id === line.medicine_id
              );
              return allocation && allocation.allocated > 0;
            })}
            renderItem={(line) => {
              const allocation = allocations.find(
                (a) => a.medicine_id === line.medicine_id
              );
              if (!allocation || allocation.allocated === 0) return null;

              // Lấy chi tiết phân bổ theo batch
              const lineBatchAllocations = line.allocations
                ? line.allocations.filter((a) => a.allocated > 0)
                : [];

              return (
                <List.Item className="flex flex-col w-full">
                  <div className="flex justify-between w-full mb-2">
                    <Text strong>{line.medicine_name}</Text>
                    <div>
                      <Text className="mr-2">
                        {allocation.allocated} {line.unit}
                      </Text>
                      <Text type="danger">
                        {formatCurrency(allocation.allocated * line.unit_price)}
                      </Text>
                    </div>
                  </div>

                  {/* Hiển thị chi tiết phân bổ theo batch */}
                  {lineBatchAllocations.length > 0 && (
                    <div className="w-full bg-gray-50 p-2 rounded mt-1">
                      <Text type="secondary" className="mb-1 block">
                        Chi tiết phân bổ:
                      </Text>
                      <Table
                        dataSource={lineBatchAllocations}
                        columns={[
                          {
                            title: "Mã lô",
                            dataIndex: "batch_number",
                            key: "batch_number",
                            width: "30%",
                          },
                          {
                            title: "Số lượng",
                            dataIndex: "allocated",
                            key: "allocated",
                            width: "30%",
                            render: (allocated) => (
                              <Tag color="blue">
                                {allocated} {line.unit}
                              </Tag>
                            ),
                          },
                          {
                            title: "Hạn sử dụng",
                            key: "expiry_date",
                            width: "40%",
                            render: (_, record) => {
                              // Tìm thông tin batch tương ứng để lấy ngày hết hạn
                              const batchInfo = line.batches.find(
                                (b) => b.batch_number === record.batch_number
                              );
                              if (!batchInfo) return "N/A";

                              return batchInfo.expiry_date;
                            },
                          },
                        ]}
                        pagination={false}
                        size="small"
                        bordered={false}
                      />
                    </div>
                  )}
                </List.Item>
              );
            }}
          />
        </div>

        <div className="mb-4">
          <Text strong>Phương thức thanh toán:</Text>
          <Radio.Group
            onChange={handlePaymentMethodChange}
            value={paymentMethod}
            className="flex flex-col mt-2"
          >
            <Radio value="cash" className="mb-2">
              <div className="flex items-center">
                <MoneyCollectOutlined className="mr-2 text-green-500" />
                Tiền mặt
              </div>
            </Radio>
            <Radio value="momo" disabled className="mb-2">
              <div className="flex items-center opacity-50">
                <img
                  src="/momo-icon.png"
                  alt="MoMo"
                  className="w-4 h-4 mr-2"
                  onError={(e) => {
                    e.target.src =
                      'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>';
                  }}
                />
                MoMo (Chưa hỗ trợ)
              </div>
            </Radio>
          </Radio.Group>
        </div>

        <Alert
          message="Lưu ý"
          description="Khi xác nhận thanh toán, hệ thống sẽ tự động trừ số lượng thuốc trong kho và chuyển trạng thái đơn thuốc thành 'Đã hoàn thành'."
          type="info"
          showIcon
        />
      </Modal>

      {/* Cancel Prescription Modal */}
      <Modal
        title={
          <div className="flex items-center">
            <WarningOutlined className="text-red-500 mr-2" />
            Huỷ đơn thuốc
          </div>
        }
        open={cancelModalVisible}
        onCancel={() => {
          setCancelModalVisible(false);
          setCancelReason("");
        }}
        footer={[
          <Button
            key="back"
            onClick={() => {
              setCancelModalVisible(false);
              setCancelReason("");
            }}
          >
            Đóng
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            onClick={handleCancelPrescription}
            loading={cancelLoading}
            disabled={!cancelReason.trim()}
          >
            Xác nhận huỷ đơn
          </Button>,
        ]}
      >
        <Alert
          message="Lưu ý"
          description="Đơn thuốc sau khi huỷ sẽ không thể khôi phục lại. Vui lòng chắc chắn trước khi thực hiện."
          type="warning"
          showIcon
          className="mb-4"
        />
        <div className="mb-4">
          <Text strong className="block mb-2">
            Lý do huỷ đơn:
          </Text>
          <Input.TextArea
            placeholder="Nhập lý do huỷ đơn thuốc"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={4}
            required
          />
        </div>
      </Modal>
    </Layout>
  );
};

export default PrescriptionDetailToPrepare;
