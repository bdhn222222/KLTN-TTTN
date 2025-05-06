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
  Layout,
  Divider,
  Avatar,
  List,
} from "antd";
import {
  SearchOutlined,
  EyeOutlined,
  StopOutlined,
  CalendarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import relativeTime from "dayjs/plugin/relativeTime";
import NavbarPhar from "../../components/Pharmacist/NavbarPhar";
import MenuPhar from "../../components/Pharmacist/MenuPhar";
import "./PrescriptionPrepare.css";

// Set up dayjs with Vietnamese locale
dayjs.locale("vi");
dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Sider, Content } = Layout;

const PrescriptionCancelled = () => {
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 6,
    total: 0,
  });

  // Fetch cancelled prescriptions
  const fetchCancelledPrescriptions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Build query parameters
      let queryParams = `?page=${pagination.current}&limit=${pagination.pageSize}&status=cancelled`;

      const response = await axios.get(
        `${url1}/pharmacist/prescriptions${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        const cancelledPrescriptions = response.data.data.prescriptions.filter(
          (prescription) => prescription.status === "cancelled"
        );

        setPrescriptions(cancelledPrescriptions);
        setPagination({
          ...pagination,
          total: response.data.data.pagination.total_records,
        });
      } else {
        showNotification("error", "Lỗi", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching cancelled prescriptions:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message ||
          "Không thể tải danh sách đơn thuốc đã huỷ"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCancelledPrescriptions();
  }, [pagination.current, pagination.pageSize]);

  const showNotification = (type, message, description) => {
    api[type]({
      message,
      description,
      placement: "topRight",
      duration: 4,
    });
  };

  const handlePageChange = (page, pageSize) => {
    setPagination({
      ...pagination,
      current: page,
      pageSize: pageSize,
    });
  };

  const handleSearch = (value) => {
    setSearchText(value);
  };

  const handleViewDetails = (prescriptionId) => {
    navigate(`/pharmacist/prescriptions/${prescriptionId}/detail`);
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "N/A";
    return dayjs(dateTimeString).format("DD/MM/YYYY HH:mm");
  };

  const formatRelativeTime = (date) => {
    return dayjs(date).fromNow();
  };

  // Add a formatCurrency function
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

  // Filter prescriptions based on search text
  const filteredPrescriptions = prescriptions.filter((prescription) => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();
    const prescriptionId = prescription.prescription_id.toString();
    const doctorName = prescription.appointment?.doctor?.name || "";
    const patientName = prescription.appointment?.family_member?.name || "";
    const patientPhone =
      prescription.appointment?.family_member?.phone_number || "";
    const cancelledBy = prescription.status_info?.cancelled_by?.name || "";
    const cancelReason = prescription.status_info?.cancel_reason || "";

    return (
      prescriptionId.includes(searchLower) ||
      doctorName.toLowerCase().includes(searchLower) ||
      patientName.toLowerCase().includes(searchLower) ||
      patientPhone.includes(searchLower) ||
      cancelledBy.toLowerCase().includes(searchLower) ||
      cancelReason.toLowerCase().includes(searchLower)
    );
  });

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
          <MenuPhar collapsed={collapsed} selectedKey="cancelled" />
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
          <Content style={{ margin: "24px 16px", overflow: "initial" }}>
            <Card bordered={false} className="shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <Title level={4}>Đơn thuốc đã huỷ</Title>
                <Input
                  placeholder="Tìm kiếm theo mã đơn, bệnh nhân, bác sĩ hoặc lý do huỷ..."
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
                <Empty description="Không tìm thấy đơn thuốc đã huỷ" />
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
                              <div className="flex items-center">
                                <Badge status="error" className="mr-2" />
                                <Text strong>
                                  Đơn #{prescription.prescription_id}
                                </Text>
                              </div>
                              <Tag color="red">
                                <StopOutlined /> Đã huỷ
                              </Tag>
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
                                  className="mr-2 bg-red-600 mt-1"
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
                                  {formatRelativeTime(
                                    prescription.status_info?.cancelled_at ||
                                      prescription.created_at
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* <Divider orientation="left" plain className="my-2">
                            <Text type="secondary">Thông tin huỷ đơn</Text>
                          </Divider> */}

                          {/* <div className="mb-3">
                            <div className="flex justify-between mb-1">
                              <Text type="secondary">Người huỷ:</Text>
                              <Text strong>
                                {prescription.status_info?.cancelled_by?.name ||
                                  "N/A"}
                              </Text>
                            </div>
                            <div className="flex justify-between mb-1">
                              <Text type="secondary">Thời gian huỷ:</Text>
                              <Text>
                                {formatDateTime(
                                  prescription.status_info?.cancelled_at
                                )}
                              </Text>
                            </div>
                          </div> */}

                          {/* <Divider orientation="left" plain className="my-2">
                            <Text type="secondary">Lý do huỷ</Text>
                          </Divider>

                          <Tooltip
                            title={
                              prescription.status_info?.cancel_reason ||
                              "Không có lý do"
                            }
                          >
                            <div className="mb-3 p-2 bg-gray-50 rounded-md max-h-16 overflow-y-auto">
                              <Text>
                                {prescription.status_info?.cancel_reason ||
                                  "Không có lý do"}
                              </Text>
                            </div>
                          </Tooltip> */}

                          <Divider orientation="left" plain className="my-2">
                            <Text type="secondary">Danh sách thuốc</Text>
                          </Divider>

                          {/* Medications list - scrollable area with max height */}
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
                                        <div>
                                          <Tag color="red">
                                            {medicine.prescribed?.quantity || 0}{" "}
                                            {medicine.medicine?.unit ||
                                              "Đơn vị"}
                                          </Tag>
                                          <Text type="danger" className="ml-2">
                                            {formatCurrency(
                                              medicine.medicine?.price || 0
                                            )}
                                          </Text>
                                        </div>
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

                          <div className="mt-2 text-right mb-2">
                            <Text type="secondary">
                              Tổng số loại thuốc:{" "}
                              {prescription.medicines?.length || 0}
                            </Text>
                          </div>

                          {/* Spacer div to push button to bottom */}
                          <div className="flex-grow"></div>

                          {/* View details button at the bottom of the card */}
                          <div className="mt-auto">
                            <Button
                              type="primary"
                              icon={<EyeOutlined />}
                              onClick={() =>
                                handleViewDetails(prescription.prescription_id)
                              }
                              className="w-full !bg-red-600 !text-white"
                              style={{ borderColor: "#dc2626" }}
                            >
                              Xem chi tiết
                            </Button>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>

                  <Pagination
                    current={pagination.current}
                    pageSize={pagination.pageSize}
                    total={pagination.total}
                    onChange={handlePageChange}
                    className="mt-6 flex justify-end"
                  />
                </>
              )}
            </Card>
          </Content>
        </Layout>
      </Layout>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d1d1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #b3b3b3;
        }
      `}</style>
    </Layout>
  );
};

export default PrescriptionCancelled;
