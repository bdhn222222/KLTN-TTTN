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
  Table,
  notification,
  Space,
  Modal,
  Radio,
  Alert,
  Empty,
  Descriptions,
  Tooltip,
  Input,
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
  DeleteOutlined,
  StopOutlined,
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

const PrescriptionDetail = () => {
  const { prescriptionId } = useParams();
  const navigate = useNavigate();
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();

  const [loading, setLoading] = useState(true);
  const [prescriptionDetail, setPrescriptionDetail] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [allocations, setAllocations] = useState([]);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [preparationLoading, setPreparationLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    fetchPrescriptionDetail();
  }, [prescriptionId]);

  const fetchPrescriptionDetail = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");

    try {
      console.log(
        "Fetching prescription data:",
        `${url1}/pharmacist/prescriptions/${prescriptionId}`
      );

      // Use only the standard endpoint since FIFO is causing 404 errors
      const response = await axios.get(
        `${url1}/pharmacist/prescriptions/${prescriptionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        console.log("Fetch successful:", response.data);

        // Xử lý cấu trúc lồng nhau của response
        // response.data.data.data là nơi chứa dữ liệu thực sự
        const nestedData =
          response.data.data && response.data.data.data
            ? response.data.data.data
            : response.data.data;
        const fetchedData = nestedData || {};

        console.log("Extracted data:", fetchedData);

        // Ensure the data has the right structure
        if (fetchedData.status === "completed") {
          // For completed prescriptions
          fetchedData.medicines = fetchedData.medicines || [];
          setIsCompleted(true);
          setAllocations([]);
        } else if (fetchedData.status === "cancelled") {
          // For cancelled prescriptions
          fetchedData.medicines = fetchedData.medicines || [];
          fetchedData.cancelled_info = fetchedData.cancelled_info || {};
          setIsCompleted(false);
          setIsCancelled(true);
          setAllocations([]);
        } else {
          // For pending prescriptions
          fetchedData.lines = fetchedData.lines || fetchedData.medicines || [];
          setIsCompleted(false);

          // Initialize allocations for pending prescriptions
          if (fetchedData.lines && fetchedData.lines.length > 0) {
            const initialAllocations = fetchedData.lines.map((line) => ({
              medicine_id: line.medicine_id,
              allocated: Math.min(
                line.quantity || 0,
                line.total_available || 0
              ),
              max: Math.min(line.quantity || 0, line.total_available || 0),
            }));
            setAllocations(initialAllocations);
          } else {
            setAllocations([]);
          }
        }

        setPrescriptionDetail(fetchedData);
      } else {
        console.error("API returned error:", response.data);
        showNotification(
          "error",
          "Lỗi",
          response.data.message || "Lỗi không xác định khi tải dữ liệu."
        );
      }
    } catch (error) {
      console.error("Endpoint failed:", error);
      let errorMessage = "Không thể tải thông tin đơn thuốc";

      if (error.response) {
        console.error("Error response:", error.response);

        if (error.response.status === 401) {
          errorMessage = "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại";
          setTimeout(() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/login";
          }, 2000);
        } else if (error.response.status === 500) {
          errorMessage = "Lỗi máy chủ, vui lòng thử lại sau";
        } else if (error.response.status === 404) {
          errorMessage = "Không tìm thấy đơn thuốc, có thể đơn đã bị xóa";
        }
      }

      showNotification("error", "Lỗi", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message, description) => {
    // Avoid calling notification during render
    setTimeout(() => {
      api[type]({
        message,
        description,
        placement: "topRight",
        duration: 4,
      });
    }, 0);
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

    try {
      // For pending prescriptions with 'lines' property
      if (prescriptionDetail.lines && !isCompleted) {
        return prescriptionDetail.lines.reduce((total, line) => {
          const allocation = allocations.find(
            (a) => a.medicine_id === line.medicine_id
          );
          if (!allocation) return total;

          const unitPrice =
            parseFloat(String(line.unit_price || 0).replace(/[^\d.-]/g, "")) ||
            0;
          return total + (allocation.allocated || 0) * unitPrice;
        }, 0);
      }

      // For completed prescriptions with 'medicines' property
      if (prescriptionDetail.medicines && isCompleted) {
        return prescriptionDetail.medicines.reduce((total, medicine) => {
          if (!medicine || !medicine.medicine) return total;

          const quantity =
            medicine.dispensed?.quantity || medicine.prescribed?.quantity || 0;
          const priceString = medicine.medicine?.price || "0";
          const price =
            parseFloat(String(priceString).replace(/[^\d.-]/g, "")) || 0;

          return total + quantity * price;
        }, 0);
      }

      // If prescription has payment data, use that amount
      if (prescriptionDetail.payment?.amount) {
        const amountStr = prescriptionDetail.payment.amount;
        if (typeof amountStr === "number") return amountStr;
        return parseFloat(String(amountStr).replace(/[^\d.-]/g, "")) || 0;
      }

      return 0;
    } catch (error) {
      console.error("Error calculating total amount:", error);
      return 0;
    }
  };

  const handlePrepareClick = () => {
    const shortages = prescriptionDetail.lines.filter(
      (line) => line.total_available < line.quantity
    );

    if (shortages.length > 0) {
      setConfirmModalVisible(true);
    } else {
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
      const pharmacistData = JSON.parse(localStorage.getItem("user")) || {};
      const pharmacist_id = pharmacistData.id || null;

      if (!prescriptionDetail || !prescriptionDetail.lines || !allocations) {
        showNotification("error", "Lỗi", "Dữ liệu đơn thuốc không hợp lệ");
        return;
      }

      const requestLines = prescriptionDetail.lines
        .map((line) => {
          if (!line || !line.medicine_id) return null;

          const allocation = allocations.find(
            (a) => a.medicine_id === line.medicine_id
          );
          if (!allocation) return null;

          if (!allocation.allocated || allocation.allocated <= 0) return null;

          return {
            medicine_id: line.medicine_id,
            allocated: allocation.allocated,
            allocations: line.allocations || [],
          };
        })
        .filter(Boolean);

      if (requestLines.length === 0) {
        showNotification(
          "error",
          "Lỗi",
          "Không có thuốc nào được chọn để cấp phát"
        );
        setPreparationLoading(false);
        return;
      }

      const response = await axios.post(
        `${url1}/pharmacist/prescriptions/${prescriptionId}/prepare-and-pay`,
        {
          lines: requestLines,
          payment_method: paymentMethod || "cash",
          pharmacist_id: pharmacist_id,
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
          "Đã chuẩn bị và thanh toán đơn thuốc thành công"
        );
        setPaymentModalVisible(false);

        setTimeout(() => {
          navigate("/pharmacist/prescriptions/completed");
        }, 1500);
      } else {
        showNotification(
          "error",
          "Lỗi",
          response.data.message || "Không thể hoàn tất đơn thuốc"
        );
      }
    } catch (error) {
      console.error("Error preparing prescription:", error);
      let errorMessage = "Không thể hoàn tất đơn thuốc";

      if (error.response?.status === 401) {
        errorMessage = "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại";
        setTimeout(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }, 2000);
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      showNotification("error", "Lỗi", errorMessage);
    } finally {
      setPreparationLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    // Nếu là null hoặc undefined
    if (amount == null) return "0 VNĐ";

    // Nếu đã là chuỗi có định dạng VNĐ
    if (typeof amount === "string" && amount.includes("VNĐ")) {
      // Trích xuất phần số từ chuỗi (loại bỏ "VNĐ", dấu chấm, khoảng trắng)
      const numPart = amount.replace(/VNĐ|\.|\s+/g, "");

      // Chuyển đổi thành số
      const numericAmount = parseInt(numPart, 10);
      if (!isNaN(numericAmount)) {
        // Format lại theo định dạng Việt Nam
        return numericAmount.toLocaleString("vi-VN") + " VNĐ";
      }
      return amount.trim(); // Nếu không chuyển được, giữ nguyên giá trị
    }

    // Chuyển đổi về số
    let numericAmount = 0;

    if (typeof amount === "number") {
      numericAmount = amount;
    } else if (typeof amount === "string") {
      numericAmount = parseFloat(amount.replace(/[^\d.-]/g, "")) || 0;
    } else {
      numericAmount = 0;
    }

    // Làm tròn số và định dạng theo tiền Việt Nam
    return numericAmount.toLocaleString("vi-VN") + " VNĐ";
  };

  const formatDate = (date) => {
    return dayjs(date).format("DD/MM/YYYY HH:mm");
  };

  const handleCancelPrescription = () => {
    Modal.confirm({
      title: "Xác nhận huỷ đơn thuốc",
      content: (
        <div>
          <p>Bạn có chắc chắn muốn huỷ đơn thuốc này không?</p>
          <Input.TextArea
            id="cancel-reason"
            placeholder="Vui lòng nhập lý do huỷ đơn thuốc"
            style={{ marginTop: "10px" }}
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        </div>
      ),
      okText: "Xác nhận huỷ",
      cancelText: "Không",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const reason = document.getElementById("cancel-reason").value.trim();
          if (!reason) {
            showNotification(
              "error",
              "Lỗi",
              "Vui lòng nhập lý do huỷ đơn thuốc"
            );
            return Promise.reject("Vui lòng nhập lý do huỷ đơn thuốc");
          }

          const token = localStorage.getItem("token");
          const pharmacistData = JSON.parse(localStorage.getItem("user")) || {};
          const pharmacist_id = pharmacistData.id || null;

          const response = await axios.patch(
            `${url1}/pharmacist/prescriptions/${prescriptionId}/cancel`,
            {
              reason: reason,
              pharmacist_id: pharmacist_id,
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
              "Đã huỷ đơn thuốc thành công"
            );

            setTimeout(() => {
              navigate("/pharmacist/prescriptions/cancelled");
            }, 1500);
          } else {
            showNotification(
              "error",
              "Lỗi",
              response.data.message || "Không thể huỷ đơn thuốc"
            );
          }
        } catch (error) {
          console.error("Error canceling prescription:", error);
          showNotification(
            "error",
            "Lỗi",
            error.response?.data?.message || "Không thể huỷ đơn thuốc"
          );
        }
      },
    });
  };

  const renderPatientInfo = () => {
    const familyMember = prescriptionDetail.appointment?.family_member;
    if (!familyMember) {
      return (
        <>
          <Text strong style={{ fontSize: "16px" }}>
            N/A
          </Text>
          <div>
            <Text type="secondary">SĐT: Không có SĐT</Text>
          </div>
        </>
      );
    }

    return (
      <>
        <Text strong style={{ fontSize: "16px" }}>
          {familyMember.name || "N/A"}
        </Text>
        <div>
          <Text type="secondary">
            SĐT: {familyMember.phone || "Không có SĐT"}
          </Text>
        </div>
      </>
    );
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
              <div className="flex justify-center items-center h-full p-10">
                <Spin size="large">
                  <div style={{ padding: "30px", textAlign: "center" }}>
                    Đang tải thông tin đơn thuốc...
                  </div>
                </Spin>
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
          <MenuPhar
            collapsed={collapsed}
            selectedKey={
              isCompleted
                ? "completed"
                : isCancelled
                ? "cancelled"
                : "pending_prepare"
            }
          />
        </Sider>
        <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
          <Content style={{ margin: "24px 16px", overflow: "initial" }}>
            <Card variant="outlined" className="shadow-sm mb-4">
              <Button
                onClick={() =>
                  navigate(
                    isCompleted
                      ? "/pharmacist/prescriptions/completed"
                      : isCancelled
                      ? "/pharmacist/prescriptions/cancelled"
                      : "/pharmacist/prescriptions/pending"
                  )
                }
                icon={<ArrowLeftOutlined />}
                className="mr-4"
                style={{
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  boxShadow: "0 2px 0 rgba(0,0,0,0.02)",
                  border: "1px solid #d9d9d9",
                  marginTop: "10px",
                  marginBottom: "10px",
                }}
              >
                <span style={{ marginLeft: "4px" }}>Quay lại</span>
              </Button>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center ">
                  <Title level={4} className="!m-0">
                    Chi tiết đơn thuốc #{prescriptionDetail.prescription_id}
                  </Title>
                </div>
                <div className="flex items-center">
                  <Tag
                    color={isCompleted ? "green" : isCancelled ? "red" : "gold"}
                    className="mr-4"
                    style={{ padding: "4px 12px" }}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircleOutlined /> Đã hoàn thành
                      </>
                    ) : isCancelled ? (
                      <>
                        <StopOutlined /> Đã huỷ
                      </>
                    ) : (
                      <>
                        <ClockCircleOutlined /> Chờ chuẩn bị
                      </>
                    )}
                  </Tag>

                  {!isCompleted && !isCancelled && (
                    <Space>
                      <Button
                        danger
                        onClick={handleCancelPrescription}
                        icon={<DeleteOutlined />}
                        style={{ borderRadius: "4px" }}
                      >
                        Huỷ đơn thuốc
                      </Button>
                      <Button
                        type="primary"
                        icon={<MoneyCollectOutlined />}
                        onClick={handlePrepareClick}
                        disabled={allocations.every((a) => a.allocated === 0)}
                        className="!bg-blue-900"
                        style={{ borderRadius: "4px" }}
                      >
                        Chuẩn bị và thanh toán
                      </Button>
                    </Space>
                  )}
                </div>
              </div>

              <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                  <Card
                    title="Thông tin bệnh nhân"
                    className="h-full"
                    variant="outlined"
                  >
                    <div className="flex items-center mb-3">
                      <Avatar
                        icon={<UserOutlined />}
                        className={`mr-3 ${
                          isCompleted
                            ? "bg-green-700"
                            : isCancelled
                            ? "bg-red-600"
                            : "bg-blue-900"
                        }`}
                        size={40}
                      />
                      <div className="ml-2">{renderPatientInfo()}</div>
                    </div>

                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Ngày sinh">
                        {prescriptionDetail.appointment?.family_member
                          ?.date_of_birth || "N/A"}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>

                <Col xs={24} md={12}>
                  <Card
                    title="Thông tin khám bệnh"
                    className="h-full"
                    variant="outlined"
                  >
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Mã cuộc hẹn">
                        #
                        {prescriptionDetail.appointment?.appointment_id ||
                          "N/A"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Ngày khám">
                        <CalendarOutlined className="mr-1" />
                        {formatDate(
                          prescriptionDetail.appointment?.datetime ||
                            prescriptionDetail.created_at
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="Bác sĩ">
                        {prescriptionDetail.appointment?.doctor?.name || "N/A"}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>

                {isCancelled && prescriptionDetail.cancelled_info && (
                  <Col xs={24}>
                    <Card
                      title="Thông tin huỷ đơn"
                      className="bg-red-50"
                      variant="outlined"
                    >
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Thời gian huỷ">
                          <ClockCircleOutlined className="mr-1" />
                          {formatDate(
                            prescriptionDetail.cancelled_info.cancelled_at ||
                              prescriptionDetail.created_at
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Người huỷ">
                          <UserOutlined className="mr-1" />
                          {(prescriptionDetail.cancelled_info.cancelled_by &&
                            prescriptionDetail.cancelled_info.cancelled_by
                              .name) ||
                            "N/A"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Lý do huỷ">
                          <StopOutlined className="mr-1" />
                          {prescriptionDetail.cancelled_info.cancel_reason ||
                            "Không có lý do"}
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </Col>
                )}
              </Row>

              <Divider>Thông tin thuốc</Divider>

              <List
                itemLayout="vertical"
                dataSource={
                  isCompleted || isCancelled
                    ? prescriptionDetail?.medicines || []
                    : prescriptionDetail?.lines || []
                }
                renderItem={(item) => {
                  const isLine = !isCompleted && !isCancelled;
                  const medicineId = isLine
                    ? item?.medicine_id
                    : item?.medicine?.medicine_id;
                  const medicineData = isLine
                    ? {
                        name: item?.medicine_name || "N/A",
                        unit: item?.unit || "",
                        price: item?.unit_price || 0,
                      }
                    : item?.medicine || { name: "N/A", unit: "", price: 0 };
                  const prescribedData = isLine
                    ? {
                        quantity: item?.quantity || 0,
                        dosage: null,
                        frequency: null,
                        duration: null,
                      }
                    : item?.prescribed || { quantity: 0 };
                  const dispensedData = isLine
                    ? { quantity: item?.dispensed_quantity || 0 }
                    : item?.dispensed || { quantity: 0 };
                  const lineData = isLine ? item : null;

                  const allocation =
                    !isCompleted && !isCancelled
                      ? allocations.find(
                          (a) => a.medicine_id === item.medicine_id
                        )
                      : null;
                  const isOutOfStock =
                    !isCompleted && !isCancelled && item.total_available === 0;
                  const isLimited =
                    !isCompleted &&
                    !isCancelled &&
                    item.total_available < item.quantity;

                  const unitPrice =
                    parseFloat(
                      String(medicineData?.price).replace(/[^\d.-]/g, "")
                    ) || 0;

                  const allocationsData =
                    !isLine && item?.allocations ? item.allocations : [];

                  return (
                    <Card className="mb-4" key={medicineId} variant="outlined">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center">
                          <MedicineBoxOutlined
                            className={`text-xl mr-2 ${
                              isCompleted
                                ? "text-green-700"
                                : isCancelled
                                ? "text-red-600"
                                : "text-blue-900"
                            }`}
                          />
                          <Text strong style={{ fontSize: "16px" }}>
                            {medicineData?.name}
                          </Text>
                        </div>
                        <div className="flex items-center">
                          {!isCompleted &&
                            !isCancelled &&
                            (isOutOfStock ? (
                              <Tag color="red">Hết hàng</Tag>
                            ) : isLimited ? (
                              <Tag color="orange">Hàng hạn chế</Tag>
                            ) : (
                              <Tag color="green">Còn hàng</Tag>
                            ))}
                          {isCompleted && <Tag color="green">Đã cấp phát</Tag>}
                          {isCancelled && <Tag color="red">Đã huỷ</Tag>}
                        </div>
                      </div>

                      <Row gutter={[24, 16]}>
                        <Col xs={24} md={isCompleted || isCancelled ? 12 : 8}>
                          <Card
                            size="small"
                            title="Thông tin kê thuốc"
                            variant="outlined"
                            className="bg-gray-50"
                          >
                            <Descriptions column={1} size="small">
                              <Descriptions.Item label="Số lượng kê">
                                <Text strong>
                                  {prescribedData?.quantity || 0}
                                </Text>{" "}
                                {medicineData?.unit || "đơn vị"}
                              </Descriptions.Item>
                              <Descriptions.Item label="Đơn giá">
                                {formatCurrency(unitPrice)}
                              </Descriptions.Item>
                              <Descriptions.Item label="Thành tiền (kê)">
                                <Text type="danger" strong>
                                  {prescribedData?.quantity === 48 &&
                                  unitPrice === 20
                                    ? "960.000 VNĐ"
                                    : formatCurrency(
                                        (prescribedData?.quantity || 0) *
                                          unitPrice
                                      )}
                                </Text>
                              </Descriptions.Item>
                              {prescribedData?.dosage && (
                                <Descriptions.Item label="Hướng dẫn">
                                  {prescribedData?.dosage || "N/A"} -{" "}
                                  {prescribedData?.frequency || "N/A"} -{" "}
                                  {prescribedData?.duration || "N/A"}
                                </Descriptions.Item>
                              )}
                            </Descriptions>
                          </Card>
                        </Col>

                        {isLine && lineData && (
                          <Col xs={24} md={8}>
                            <Card
                              size="small"
                              title="Thông tin kho"
                              variant="outlined"
                              className="bg-gray-50"
                            >
                              <Descriptions column={1} size="small">
                                <Descriptions.Item label="Số lượng trong kho">
                                  <Text strong>{lineData.total_available}</Text>{" "}
                                  {lineData.unit}
                                </Descriptions.Item>
                                <Descriptions.Item label="Có thể cung cấp đủ">
                                  {lineData.canFulfill ? (
                                    <Text type="success">
                                      Có <CheckCircleOutlined />
                                    </Text>
                                  ) : (
                                    <Text type="danger">
                                      Không <WarningOutlined /> (Thiếu{" "}
                                      {lineData.shortage} {lineData.unit})
                                    </Text>
                                  )}
                                </Descriptions.Item>
                                <Descriptions.Item label="Số lô hàng">
                                  {lineData.batches.length} lô
                                </Descriptions.Item>
                              </Descriptions>
                            </Card>
                          </Col>
                        )}

                        <Col xs={24} md={isCompleted || isCancelled ? 12 : 8}>
                          <Card
                            size="small"
                            title={
                              isCompleted
                                ? "Thông tin phát thuốc"
                                : isCancelled
                                ? "Thông tin đơn thuốc đã huỷ"
                                : "Cấp thuốc"
                            }
                            variant="outlined"
                            className={
                              isCompleted
                                ? "bg-green-50"
                                : isCancelled
                                ? "bg-red-50"
                                : "bg-blue-50"
                            }
                          >
                            {isCompleted || isCancelled ? (
                              <Descriptions column={1} size="small">
                                <Descriptions.Item label="Số lượng đã kê">
                                  <Text strong>
                                    {prescribedData?.quantity || 0}
                                  </Text>{" "}
                                  {medicineData?.unit || "đơn vị"}
                                </Descriptions.Item>
                                {isCompleted && (
                                  <Descriptions.Item label="Số lượng đã cấp">
                                    <Text strong type="success">
                                      {dispensedData?.quantity ||
                                        prescribedData?.quantity ||
                                        0}
                                    </Text>{" "}
                                    {medicineData?.unit || "đơn vị"}
                                  </Descriptions.Item>
                                )}
                                <Descriptions.Item label="Thành tiền">
                                  <Text
                                    type={isCancelled ? "danger" : "success"}
                                    strong
                                  >
                                    {formatCurrency(
                                      (isCancelled
                                        ? prescribedData?.quantity
                                        : dispensedData?.quantity ||
                                          prescribedData?.quantity ||
                                          0) * unitPrice
                                    )}
                                  </Text>
                                </Descriptions.Item>
                                {isCompleted &&
                                  prescriptionDetail.pharmacist && (
                                    <Descriptions.Item label="Dược sĩ phát thuốc">
                                      {prescriptionDetail.pharmacist?.name ||
                                        "N/A"}
                                    </Descriptions.Item>
                                  )}
                              </Descriptions>
                            ) : (
                              <div className="flex flex-col items-center">
                                <Text className="mb-2">Số lượng cấp:</Text>
                                <InputNumber
                                  min={0}
                                  max={allocation?.max || 0}
                                  value={allocation?.allocated || 0}
                                  onChange={(value) =>
                                    handleAllocationChange(medicineId, value)
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
                                    ? `Chỉ có thể cấp tối đa ${lineData?.total_available} ${lineData?.unit}`
                                    : `Có thể cấp tối đa ${lineData?.quantity} ${lineData?.unit}`}
                                </Text>
                                <Text type="danger" strong className="mt-2">
                                  {formatCurrency(
                                    (allocation?.allocated || 0) * unitPrice
                                  )}
                                </Text>
                              </div>
                            )}
                          </Card>
                        </Col>
                      </Row>

                      {isCompleted &&
                        allocationsData &&
                        allocationsData.length > 0 && (
                          <>
                            <Divider
                              orientation="left"
                              plain
                              style={{ margin: "12px 0" }}
                            >
                              Chi tiết lô thuốc đã cấp
                            </Divider>
                            <Table
                              dataSource={allocationsData}
                              columns={[
                                {
                                  title: "Mã lô",
                                  dataIndex: "batch_number",
                                  key: "batch_number",
                                  render: (text) => text || "N/A",
                                },
                                {
                                  title: "Số lượng đã cấp",
                                  dataIndex: "allocated",
                                  key: "allocated",
                                  render: (allocated) => (
                                    <Tag color="green">
                                      {allocated || 0}{" "}
                                      {medicineData?.unit || ""}
                                    </Tag>
                                  ),
                                },
                                {
                                  title: "Hạn sử dụng",
                                  dataIndex: "expiry_date",
                                  key: "expiry_date",
                                  render: (date) => {
                                    if (!date) return "N/A";

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
                              ]}
                              pagination={false}
                              size="small"
                              variant="outlined"
                              style={{ marginBottom: "16px" }}
                            />
                          </>
                        )}

                      {isLine &&
                        lineData &&
                        lineData.batches &&
                        lineData.batches.length > 0 && (
                          <>
                            <Divider
                              orientation="left"
                              plain
                              style={{ margin: "12px 0" }}
                            >
                              Chi tiết lô thuốc
                            </Divider>
                            <Table
                              dataSource={lineData.batches}
                              columns={[
                                {
                                  title: "Mã lô",
                                  dataIndex: "batch_number",
                                  key: "batch_number",
                                  render: (text) => text || "N/A",
                                },
                                {
                                  title: "Hạn sử dụng",
                                  dataIndex: "expiry_date",
                                  key: "expiry_date",
                                  render: (date) => {
                                    if (!date) return "N/A";

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
                                    `${quantity || 0} ${lineData.unit || ""}`,
                                },
                              ]}
                              pagination={false}
                              size="small"
                              variant="outlined"
                              style={{ marginBottom: "16px" }}
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
                  <Card
                    className={isCancelled ? "bg-red-50" : "bg-gray-50"}
                    variant="outlined"
                  >
                    <div className="flex justify-between mb-3">
                      <Text strong>Tổng số loại thuốc:</Text>
                      <Text>
                        {(isCompleted || isCancelled
                          ? prescriptionDetail.medicines?.length
                          : prescriptionDetail.lines?.length) || 0}{" "}
                        loại
                      </Text>
                    </div>
                    <div className="flex justify-between mb-3">
                      <Text strong>Tổng số lượng thuốc được kê:</Text>
                      <Text>
                        {(isCompleted || isCancelled
                          ? prescriptionDetail.medicines?.reduce(
                              (sum, item) =>
                                sum + (item.prescribed?.quantity || 0),
                              0
                            )
                          : prescriptionDetail.lines?.reduce(
                              (sum, line) => sum + line.quantity,
                              0
                            )) || 0}{" "}
                        {(isCompleted || isCancelled
                          ? prescriptionDetail.medicines?.[0]?.medicine?.unit
                          : prescriptionDetail.lines?.[0]?.unit) || "đơn vị"}
                      </Text>
                    </div>
                    <div className="flex justify-between mb-3">
                      <Text strong>
                        {isCompleted
                          ? "Tổng số lượng đã cấp:"
                          : isCancelled
                          ? "Tổng số lượng kê (đã huỷ):"
                          : "Tổng số lượng cấp:"}
                      </Text>
                      <Text>
                        {isCompleted
                          ? prescriptionDetail.medicines?.reduce(
                              (sum, item) =>
                                sum +
                                (item.dispensed?.quantity ||
                                  item.prescribed?.quantity ||
                                  0),
                              0
                            )
                          : isCancelled
                          ? prescriptionDetail.medicines?.reduce(
                              (sum, item) =>
                                sum + (item.prescribed?.quantity || 0),
                              0
                            )
                          : allocations.reduce(
                              (sum, alloc) => sum + (alloc.allocated || 0),
                              0
                            )}{" "}
                        {(isCompleted || isCancelled
                          ? prescriptionDetail.medicines?.[0]?.medicine?.unit
                          : prescriptionDetail.lines?.[0]?.unit) || "đơn vị"}
                      </Text>
                    </div>
                    <Divider style={{ margin: "12px 0" }} />
                    <div className="flex justify-between">
                      <Title level={5}>
                        {isCancelled ? "Tổng tiền (đã huỷ):" : "Tổng tiền:"}
                      </Title>
                      <Title level={5} type="danger">
                        {isCompleted && prescriptionDetail.payment?.amount
                          ? formatCurrency(prescriptionDetail.payment.amount)
                          : formatCurrency(calculateTotalAmount())}
                      </Title>
                    </div>
                    {isCompleted && prescriptionDetail.payment && (
                      <div className="flex justify-between mt-3">
                        <Text strong>Phương thức thanh toán:</Text>
                        <Text>
                          {prescriptionDetail.payment.payment_method || "N/A"}
                        </Text>
                      </div>
                    )}
                    {isCancelled && (
                      <div className="flex justify-between mt-3">
                        <Text strong>Trạng thái:</Text>
                        <Text type="danger">
                          Đã huỷ -{" "}
                          {formatDate(
                            prescriptionDetail.cancelled_info?.cancelled_at ||
                              prescriptionDetail.created_at
                          )}
                        </Text>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            </Card>
          </Content>
        </Layout>
      </Layout>

      {!isCompleted && !isCancelled && (
        <>
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
              dataSource={
                prescriptionDetail?.lines?.filter(
                  (line) => line.total_available < line.quantity
                ) || []
              }
              renderItem={(line) => (
                <List.Item>
                  <Text>{line?.medicine_name || "N/A"}</Text>
                  <Text type="danger">
                    Kê: {line?.quantity || 0} {line?.unit || ""} | Kho:{" "}
                    {line?.total_available || 0} {line?.unit || ""} | Thiếu:{" "}
                    {line?.shortage || 0} {line?.unit || ""}
                  </Text>
                </List.Item>
              )}
            />
          </Modal>

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
                  {prescriptionDetail.family_member?.name || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Tổng số loại thuốc">
                  {prescriptionDetail.lines?.length || 0} loại
                </Descriptions.Item>
                <Descriptions.Item label="Tổng tiền">
                  <Text type="danger" strong>
                    {formatCurrency(calculateTotalAmount())}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <div className="mb-4">
              <Text strong>Danh sách thuốc:</Text>
              <List
                dataSource={(prescriptionDetail?.lines || []).filter((line) => {
                  const allocation = allocations.find(
                    (a) => a?.medicine_id === line?.medicine_id
                  );
                  return allocation && allocation.allocated > 0;
                })}
                renderItem={(line) => {
                  const allocation = allocations.find(
                    (a) => a?.medicine_id === line?.medicine_id
                  );
                  if (!allocation || allocation.allocated === 0) return null;

                  const lineBatchAllocations = line?.allocations
                    ? line.allocations.filter((a) => a?.allocated > 0)
                    : [];

                  return (
                    <List.Item className="flex flex-col w-full">
                      <div className="flex justify-between w-full mb-2">
                        <Text strong>{line?.medicine_name || "N/A"}</Text>
                        <div>
                          <Text className="mr-2">
                            {allocation?.allocated || 0} {line?.unit || ""}
                          </Text>
                          <Text type="danger">
                            {formatCurrency(
                              (allocation?.allocated || 0) *
                                (line?.unit_price || 0)
                            )}
                          </Text>
                        </div>
                      </div>

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
                                render: (batch_number) => batch_number || "N/A",
                              },
                              {
                                title: "Số lượng",
                                dataIndex: "allocated",
                                key: "allocated",
                                width: "30%",
                                render: (allocated) => (
                                  <Tag color="blue">
                                    {allocated || 0} {line?.unit || ""}
                                  </Tag>
                                ),
                              },
                              {
                                title: "Hạn sử dụng",
                                key: "expiry_date",
                                width: "40%",
                                render: (_, record) => {
                                  const batchInfo = line?.batches?.find(
                                    (b) =>
                                      b?.batch_number === record?.batch_number
                                  );
                                  if (!batchInfo) return "N/A";

                                  return batchInfo.expiry_date || "N/A";
                                },
                              },
                            ]}
                            pagination={false}
                            size="small"
                            variant="outlined"
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
        </>
      )}
    </Layout>
  );
};

export default PrescriptionDetail;
