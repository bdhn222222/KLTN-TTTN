import React, { useState, useEffect, useContext } from "react";
import {
  Card,
  Tag,
  Button,
  Typography,
  notification,
  Spin,
  Input,
  Row,
  Col,
  Space,
  Empty,
  Badge,
  Pagination,
  Tooltip,
  Modal,
  List,
  Layout,
  Divider,
  Avatar,
} from "antd";
import {
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  CalendarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FieldTimeOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import relativeTime from "dayjs/plugin/relativeTime";
import NavbarPhar from "../../components/Pharmacist/NavbarPhar";
import MenuPhar from "../../components/Pharmacist/MenuPhar";
import { AppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import PrescriptionDetails from "../../components/Pharmacist/PrescriptionDetails";
import "./PrescriptionPrepare.css";

// Set up dayjs with Vietnamese locale
dayjs.locale("vi");
dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { Meta } = Card;
const { Sider, Content } = Layout;

const PrescriptionPrepare = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6); // 3x3 grid display
  const [total, setTotal] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [medicinesModalVisible, setMedicinesModalVisible] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const { url1 } = useContext(AppContext);
  const navigate = useNavigate();
  const [api, contextHolder] = notification.useNotification();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(null);

  useEffect(() => {
    fetchPrescriptions();
  }, [page, pageSize]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(`${url1}/pharmacist/prescriptions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          status: "pending_prepare",
          page: page,
          limit: pageSize,
        },
      });

      if (response.data.success) {
        console.log("API Response:", response.data);

        // Log a sample prescription to understand the structure
        if (response.data.data.prescriptions.length > 0) {
          console.log(
            "Sample Prescription Structure:",
            JSON.stringify(response.data.data.prescriptions[0], null, 2)
          );
        }

        // Ensure we're only working with pending_prepare prescriptions
        const pendingPrepare = response.data.data.prescriptions.filter(
          (prescription) => prescription.status === "pending_prepare"
        );

        setPrescriptions(pendingPrepare);
        setTotal(response.data.data.pagination.total_records);
      } else {
        showNotification("error", "Lỗi", "Không thể tải danh sách đơn thuốc");
      }
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể tải danh sách đơn thuốc"
      );
    } finally {
      setLoading(false);
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

  const handleSearch = (value) => {
    setSearchText(value);
  };

  const handleViewPrescription = (prescriptionId) => {
    setSelectedPrescriptionId(prescriptionId);
    setDrawerVisible(true);
  };

  const handleStartPrepare = async (prescriptionId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.patch(
        `${url1}/pharmacist/prescriptions/${prescriptionId}/confirm-preparation`,
        {},
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
          "Đã bắt đầu chuẩn bị đơn thuốc"
        );
        fetchPrescriptions();
      } else {
        showNotification(
          "error",
          "Lỗi",
          "Không thể bắt đầu chuẩn bị đơn thuốc"
        );
      }
    } catch (error) {
      console.error("Error starting prescription preparation:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể bắt đầu chuẩn bị đơn thuốc"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewPrescriptionDetail = (prescriptionId) => {
    navigate(`/pharmacist/prescriptions/${prescriptionId}/detail-to-prepare`, {
      state: {
        fromPage: "pending_prepare",
        prescriptionId,
        isCompleted: false,
      },
    });
  };

  // Format date for Vietnamese locale
  const formatVietnameseDate = (date) => {
    return dayjs(date).format("DD/MM/YYYY HH:mm");
  };

  // Format relative time for Vietnamese locale
  const formatRelativeTime = (date) => {
    return dayjs(date).fromNow();
  };

  // Add a robust function to format currency
  const formatCurrency = (amount) => {
    // Handle null, undefined, or empty string
    if (amount === null || amount === undefined || amount === "") {
      return "0 VNĐ";
    }

    // If amount is already a formatted string (e.g., "100.000 VNĐ")
    if (typeof amount === "string" && amount.includes("VNĐ")) {
      return amount; // Already formatted correctly
    }

    // If it's a string without VNĐ, try to parse it
    if (typeof amount === "string") {
      // Remove all non-numeric characters except dots
      const numericValue = amount.replace(/[^0-9.]/g, "");
      amount = parseFloat(numericValue);
    }

    // Return formatted currency for numbers
    if (!isNaN(amount)) {
      return `${amount.toLocaleString("vi-VN")} VNĐ`;
    }

    return "0 VNĐ";
  };

  // Filter prescriptions based on search text
  const filteredPrescriptions = prescriptions.filter((prescription) => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();
    const prescriptionId = prescription.prescription_id.toString();
    const doctorName = prescription.appointment?.doctor?.name || "";
    const patientName = prescription.appointment?.family_member?.name || "";
    const patientPhone =
      prescription.appointment?.family_member?.phone_number || "";

    return (
      prescriptionId.includes(searchLower) ||
      doctorName.toLowerCase().includes(searchLower) ||
      patientName.toLowerCase().includes(searchLower) ||
      patientPhone.includes(searchLower)
    );
  });

  const handleDrawerClose = () => {
    setDrawerVisible(false);
    setSelectedPrescriptionId(null);
  };

  const handlePrescriptionUpdated = () => {
    fetchPrescriptions();
  };

  // Add this helper function to examine medicine data
  const debugMedicineData = (medicine) => {
    console.log("Medicine Debug Data:");
    console.log("- Name:", medicine.medicine?.name);
    console.log("- Prescribed Quantity:", medicine.prescribed?.quantity);
    console.log("- Price Fields:");
    console.log("  * medicine.medicine.price:", medicine.medicine?.price);
    console.log(
      "  * medicine.prescribed.total_price:",
      medicine.prescribed?.total_price
    );
    console.log(
      "  * medicine.prescribed.unit_price:",
      medicine.prescribed?.unit_price
    );
    console.log("  * Raw medicine data:", JSON.stringify(medicine, null, 2));
  };

  // Add a helper function to calculate total prescription price
  const calculateTotalPrice = (medicines) => {
    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return "0 VNĐ";
    }

    let total = 0;

    medicines.forEach((med) => {
      if (med.prescribed?.total_price) {
        // Process string like "100.000 VNĐ"
        const priceString = med.prescribed.total_price;
        // Remove all non-numeric characters
        const numericString = priceString.replace(/[^0-9]/g, "");
        // Convert to number and add to total
        const priceValue = parseInt(numericString, 10);
        if (!isNaN(priceValue)) {
          total += priceValue;
        }
      }
    });

    return total.toLocaleString("vi-VN") + " VNĐ";
  };

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
                className="text-xl cursor-pointer"
                onClick={() => setCollapsed(false)}
              />
            ) : (
              <MenuFoldOutlined
                className="text-xl cursor-pointer"
                onClick={() => setCollapsed(true)}
              />
            )}
          </div>
          <MenuPhar collapsed={collapsed} selectedKey="pending_prepare" />
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
          <Content style={{ margin: "24px 16px", overflow: "initial" }}>
            <Card bordered={false} className="shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <Title level={4}>Đơn thuốc chờ chuẩn bị</Title>
                <Input
                  placeholder="Tìm kiếm theo mã đơn, bệnh nhân hoặc bác sĩ..."
                  prefix={<SearchOutlined />}
                  style={{ width: 300 }}
                  onChange={(e) => handleSearch(e.target.value)}
                  value={searchText}
                  allowClear
                />
              </div>

              {loading ? (
                <div className="flex justify-center items-center p-10">
                  <Spin size="large" />
                </div>
              ) : filteredPrescriptions.length === 0 ? (
                <Empty description="Không tìm thấy đơn thuốc chờ chuẩn bị" />
              ) : (
                <>
                  <Row gutter={[24, 24]}>
                    {filteredPrescriptions.map((prescription, index) => (
                      <Col
                        xs={24}
                        sm={24}
                        md={12}
                        lg={8}
                        key={prescription.prescription_id}
                        className={`card-animation col-animation-${
                          (index % 6) + 1
                        }`}
                      >
                        <Card
                          hoverable
                          className="h-full flex flex-col prescription-card"
                          styles={{
                            body: {
                              display: "flex",
                              flexDirection: "column",
                              flex: 1,
                              padding: "15px",
                            },
                          }}
                          onClick={() =>
                            handleViewPrescriptionDetail(
                              prescription.prescription_id
                            )
                          }
                        >
                          {/* Header: Prescription Info + Patient Info */}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center">
                              {/* <Badge status="processing" className="mr-2" /> */}
                              <div>
                                <Text strong className="text-lg">
                                  {prescription.appointment?.family_member
                                    ?.name || "N/A"}
                                </Text>
                                <div className="flex items-center mt-1">
                                  {/* <Avatar
                                    icon={<UserOutlined />}
                                    size="small"
                                    className="mr-2 bg-blue-900"
                                  /> */}
                                  <Text>
                                    Đơn #{prescription.prescription_id}
                                  </Text>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <Tag color="blue" className="mt-1">
                                <ClockCircleOutlined /> Chờ chuẩn bị
                              </Tag>
                              <Text type="secondary" className="block">
                                {formatRelativeTime(prescription.created_at)}
                              </Text>
                            </div>
                          </div>

                          <Divider orientation="left" plain className="my-2">
                            <Text type="secondary">Danh sách thuốc</Text>
                          </Divider>

                          {/* Medications list - fixed height with max 3 visible items */}
                          <div
                            style={{
                              height: "130px",
                              overflowY: "auto",
                              marginBottom: "10px",
                              scrollbarWidth: "thin",
                              scrollbarColor: "#d4d4d4 #f5f5f5",
                            }}
                            className="custom-scrollbar"
                          >
                            {prescription.medicines &&
                            prescription.medicines.length > 0 ? (
                              <List
                                dataSource={prescription.medicines}
                                renderItem={(medicine, index) => (
                                  <List.Item
                                    key={index}
                                    className="py-1 px-2 flex justify-between card-medicine-item"
                                  >
                                    <Text className="flex-1 truncate mr-2">
                                      {medicine.medicine?.name ||
                                        "Không có tên"}
                                    </Text>
                                    <div className="flex items-center">
                                      <Text className="mr-2">
                                        {medicine.prescribed?.quantity || 0}{" "}
                                        {medicine.medicine?.unit || ""}
                                      </Text>
                                      <Text>
                                        {formatCurrency(
                                          medicine.prescribed?.total_price ||
                                            "0 VNĐ"
                                        )}
                                      </Text>
                                    </div>
                                  </List.Item>
                                )}
                              />
                            ) : (
                              <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Không có dữ liệu thuốc"
                              />
                            )}
                          </div>

                          {/* Payment info */}
                          <div className="mt-auto border-t pt-3">
                            <div className="flex justify-between items-center">
                              <Text strong>Thanh toán:</Text>
                              <Text type="danger" strong>
                                {calculateTotalPrice(prescription.medicines)}
                              </Text>
                            </div>
                            <br />

                            {/* View details button */}
                            <Button
                              type="primary"
                              icon={<EyeOutlined />}
                              onClick={() =>
                                handleViewPrescriptionDetail(
                                  prescription.prescription_id
                                )
                              }
                              className="w-full mt-3 !bg-blue-900 !text-white card-action-button"
                            >
                              Xem chi tiết
                            </Button>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  <br />

                  <Pagination
                    current={page}
                    pageSize={pageSize}
                    total={total}
                    onChange={(page, pageSize) => {
                      setPage(page);
                      setPageSize(pageSize);
                    }}
                    className="mt-6 flex justify-end"
                  />
                </>
              )}
            </Card>
          </Content>
        </Layout>
      </Layout>

      {/* Prescription Details Drawer */}
      {/* <PrescriptionDetails
        visible={drawerVisible}
        prescriptionId={selectedPrescriptionId}
        onClose={handleDrawerClose}
        onUpdate={handlePrescriptionUpdated}
      /> */}
    </Layout>
  );
};

export default PrescriptionPrepare;
