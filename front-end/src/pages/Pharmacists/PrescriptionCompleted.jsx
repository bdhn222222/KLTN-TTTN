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
import "./PrescriptionPrepare.css";

// Set up dayjs with Vietnamese locale
dayjs.locale("vi");
dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { Meta } = Card;
const { Sider, Content } = Layout;

const PrescriptionCompleted = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6); // 3x3 grid display
  const [total, setTotal] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const { url1 } = useContext(AppContext);
  const navigate = useNavigate();
  const [api, contextHolder] = notification.useNotification();

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
          status: "completed",
          payment_status: "paid",
          page: page,
          limit: pageSize,
        },
      });

      if (response.data.success) {
        console.log("API Response:", response.data);

        // Ensure we're only working with completed prescriptions that have paid status
        const completedPrescriptions = response.data.data.prescriptions.filter(
          (prescription) =>
            prescription.status === "completed" &&
            prescription.payment?.status === "paid"
        );

        setPrescriptions(completedPrescriptions);
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

  const handleViewPrescriptionDetail = (prescriptionId) => {
    try {
      setLoading(true);

      // Navigate to the detail page, passing isCompleted state
      navigate(`/pharmacist/prescriptions/${prescriptionId}/detail`, {
        state: {
          fromPage: "completed",
          prescriptionId,
          isCompleted: true, // Explicitly pass that this is completed
        },
      });
    } catch (error) {
      console.error("Error navigating to prescription detail:", error);
      showNotification(
        "error",
        "Lỗi",
        "Không thể mở chi tiết đơn thuốc. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  // Format date for Vietnamese locale
  const formatVietnameseDate = (date) => {
    return dayjs(date).format("DD/MM/YYYY HH:mm");
  };

  // Format relative time for Vietnamese locale
  const formatRelativeTime = (date) => {
    return dayjs(date).fromNow();
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
    const pharmacistName = prescription.pharmacist?.name || "";

    return (
      prescriptionId.includes(searchLower) ||
      doctorName.toLowerCase().includes(searchLower) ||
      patientName.toLowerCase().includes(searchLower) ||
      pharmacistName.toLowerCase().includes(searchLower) ||
      patientPhone.includes(searchLower)
    );
  });

  // Add a function to handle prescription status
  const getPrescriptionStatusTag = (prescription) => {
    if (
      prescription.status === "completed" &&
      prescription.payment?.status === "paid"
    ) {
      return (
        <Tag color="green">
          <CheckCircleOutlined /> Đã hoàn thành
        </Tag>
      );
    }
    return null;
  };

  // Add a function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
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
          <MenuPhar collapsed={collapsed} selectedKey="completed" />
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
          <Content style={{ margin: "24px 16px", overflow: "initial" }}>
            <Card bordered={false} className="shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <Title level={4}>Đơn thuốc đã hoàn thành</Title>
                <Input
                  placeholder="Tìm kiếm theo mã đơn, bệnh nhân, bác sĩ hoặc dược sĩ..."
                  prefix={<SearchOutlined />}
                  style={{ width: 400 }}
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
                <Empty description="Không tìm thấy đơn thuốc đã hoàn thành" />
              ) : (
                <>
                  <Row gutter={[24, 24]}>
                    {filteredPrescriptions.map((prescription) => (
                      <Col
                        xs={24}
                        sm={24}
                        md={12}
                        lg={8}
                        key={prescription.prescription_id}
                      >
                        <Card
                          hoverable
                          className="h-full flex flex-col"
                          title={
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-x-2">
                                <Badge status="success" className="mr-2" />
                                <Text strong>
                                  Đơn #{prescription.prescription_id}
                                </Text>
                              </div>
                              {getPrescriptionStatusTag(prescription)}
                            </div>
                          }
                          bodyStyle={{
                            display: "flex",
                            flexDirection: "column",
                            flex: 1,
                            padding: "15px",
                          }}
                        >
                          <div className="mb-2">
                            {/* Patient info and Date on the same line */}
                            <div className="flex justify-between mb-3">
                              {/* Left side: Patient info */}
                              <div className="flex items-start">
                                <Avatar
                                  icon={<UserOutlined />}
                                  className="mr-2 bg-green-700 mt-1"
                                />
                                <div>
                                  <Text strong className="ml-2">
                                    {prescription.appointment?.family_member
                                      ?.name || "N/A"}
                                  </Text>
                                  <div>
                                    <Text
                                      type="secondary"
                                      className="text-xs ml-2"
                                    >
                                      SĐT:{" "}
                                      {prescription.appointment?.family_member
                                        ?.phone_number || "Không có SĐT"}
                                    </Text>
                                  </div>
                                </div>
                              </div>

                              {/* Right side: Date info */}
                              <div className="text-right text-gray-500 text-sm">
                                <CalendarOutlined className="mr-1" />
                                <span>
                                  {formatVietnameseDate(
                                    prescription.status_info?.completed_at ||
                                      prescription.created_at
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          <Divider orientation="left" plain className="my-2">
                            <Text type="secondary">Danh sách thuốc</Text>
                          </Divider>

                          {/* Medications list - scrollable area with max 2 visible items */}
                          <div
                            style={{
                              maxHeight: "110px",
                              overflowY: "auto",
                              marginBottom: "15px",
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
                                  <List.Item key={index} className="py-1 px-2">
                                    <div className="w-full">
                                      <div className="flex justify-between">
                                        <Text strong>
                                          {medicine.medicine?.name ||
                                            "Không có tên"}
                                        </Text>
                                        <Tag color="green">
                                          {medicine.dispensed?.quantity || 0}/
                                          {medicine.prescribed?.quantity || 0}{" "}
                                          {medicine.medicine?.unit || "Đơn vị"}
                                        </Tag>
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        <Text>
                                          {medicine.prescribed?.dosage || "N/A"}{" "}
                                          -{" "}
                                          {medicine.prescribed?.frequency ||
                                            "N/A"}
                                          {" - "}
                                          {medicine.prescribed?.duration ||
                                            "N/A"}
                                        </Text>
                                      </div>
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

                          <div className="mt-2 text-gray-500 text-sm mb-2">
                            <Space
                              direction="vertical"
                              size="small"
                              className="w-full"
                            >
                              <div className="flex justify-between">
                                <span>Tổng số loại thuốc:</span>
                                <span>
                                  {prescription.medicines?.length || 0}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Thanh toán:</span>
                                <Tag color="green">
                                  {formatCurrency(prescription.payment?.amount)}
                                </Tag>
                              </div>
                              <div className="flex justify-between">
                                <span>Dược sĩ phụ trách:</span>
                                <span>
                                  {prescription.pharmacist?.name || "N/A"}
                                </span>
                              </div>
                            </Space>
                          </div>

                          {/* Spacer div to push button to bottom */}
                          <div className="flex-grow"></div>

                          {/* View details button at the bottom of the card */}
                          <div className="mt-auto">
                            <Button
                              type="primary"
                              icon={<EyeOutlined />}
                              onClick={() =>
                                handleViewPrescriptionDetail(
                                  prescription.prescription_id
                                )
                              }
                              className="w-full !bg-green-700 !text-white"
                            >
                              Xem chi tiết
                            </Button>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>

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
    </Layout>
  );
};

export default PrescriptionCompleted;
