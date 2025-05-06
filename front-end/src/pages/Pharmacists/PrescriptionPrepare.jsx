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
                                <Badge status="processing" className="mr-2" />
                                <Text strong>
                                  Đơn #{prescription.prescription_id}
                                </Text>
                              </div>
                              <Tag color="gold">
                                <ClockCircleOutlined /> Chờ chuẩn bị
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
                                  className="mr-2 bg-blue-900 mt-1"
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
                                  {formatRelativeTime(prescription.created_at)}
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
                                        <Tag color="blue">
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
                                handleViewPrescriptionDetail(
                                  prescription.prescription_id
                                )
                              }
                              className="w-full !bg-blue-900 !text-white"
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
