import React, { useState, useEffect, useContext } from "react";
import {
  Layout,
  Card,
  Descriptions,
  Avatar,
  Tabs,
  Table,
  Tag,
  Spin,
  Row,
  Col,
  Statistic,
  notification,
  Typography,
  Space,
  List,
  Timeline,
  Button,
  Empty,
  Modal,
  Divider,
} from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import NavbarDoctor from "../../components/Doctor/NavbarDoctor";
import MenuDoctor from "../../components/Doctor/MenuDoctor";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import dayjs from "dayjs";

const { Sider, Content } = Layout;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

const PatientDetail = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fullAppointmentList, setFullAppointmentList] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Modal states
  const [isMedicalRecordModalVisible, setIsMedicalRecordModalVisible] =
    useState(false);
  const [isPrescriptionModalVisible, setIsPrescriptionModalVisible] =
    useState(false);
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState(null);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const { family_member_id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();

  // Nếu có thông tin bệnh nhân từ navigation state, sử dụng nó
  useEffect(() => {
    if (location.state?.patientInfo) {
      setPatientInfo(location.state.patientInfo);
    }
  }, [location]);

  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: "topRight",
      duration: 3,
    });
  };

  // Handle opening medical record modal
  const showMedicalRecordModal = (record) => {
    setSelectedMedicalRecord(record.MedicalRecord);
    setIsMedicalRecordModalVisible(true);
  };

  // Handle opening prescription modal
  const showPrescriptionModal = (record) => {
    setSelectedPrescription(record.Prescription);
    setIsPrescriptionModalVisible(true);
  };

  const fetchPatientAppointments = async (page = 1, limit = 5) => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await axios.get(
        `${url1}/doctor/family-members/${family_member_id}/appointments`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data && response.data.success) {
        console.log("API Response (fetchPatientAppointments):", response.data);

        // Store the full list of appointments
        const appointments = response.data.data || [];
        setFullAppointmentList(appointments);

        // Calculate the total number of appointments
        const totalItems = appointments.length;

        // Calculate pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        // Get the current page of appointments
        const paginatedAppointments = appointments.slice(startIndex, endIndex);

        // Nếu có thông tin bệnh nhân trong API response, cập nhật state
        if (appointments.length > 0 && appointments[0].FamilyMember) {
          setPatientInfo(appointments[0].FamilyMember);
        }
      } else {
        console.error(
          "Invalid appointment data format from API:",
          response.data
        );
        setErrorMessage("Không thể tải thông tin lịch hẹn của bệnh nhân");
        setFullAppointmentList([]);
      }
    } catch (error) {
      console.error("Error fetching patient appointments:", error);
      setErrorMessage(
        error.response?.data?.message ||
          "Không thể tải thông tin lịch hẹn của bệnh nhân"
      );
      showNotification(
        "error",
        "Lỗi",
        "Không thể tải danh sách lịch hẹn của bệnh nhân"
      );
      setFullAppointmentList([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = () => {
    fetchPatientAppointments();
  };

  useEffect(() => {
    fetchPatientAppointments();
  }, [family_member_id]);

  const getStatusColor = (status) => {
    switch (status) {
      case "accepted":
        return "green";
      case "completed":
        return "blue";
      case "cancelled":
        return "red";
      case "doctor_day_off":
        return "orange";
      case "patient_not_coming":
        return "red";
      default:
        return "default";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "accepted":
        return "Đã tiếp nhận";
      case "completed":
        return "Đã hoàn thành";
      case "cancelled":
        return "Đã hủy";
      case "doctor_day_off":
        return "Bác sĩ nghỉ";
      case "patient_not_coming":
        return "Bệnh nhân không đến";
      case "waiting_for_confirmation":
        return "Chờ xác nhận";
      case "pending_prepare":
        return "Chờ chuẩn bị";
      case "processing":
        return "Đang chuẩn bị";
      default:
        return status;
    }
  };

  const getPrescriptionStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "green";
      case "processing":
        return "blue";
      case "pending":
        return "gold";
      default:
        return "default";
    }
  };

  const getPrescriptionStatusText = (status) => {
    switch (status) {
      case "completed":
        return "Đã hoàn thành";
      case "processing":
        return "Đang xử lý";
      case "pending":
        return "Đang chờ";
      case "cancelled":
        return "Đã hủy";
      case "pending_prepare":
        return "Chờ chuẩn bị";
      default:
        return status;
    }
  };

  // Tính tổng tiền của đơn thuốc
  const calculateTotalPrice = (prescriptionMedicines) => {
    if (!prescriptionMedicines || prescriptionMedicines.length === 0) return 0;

    return prescriptionMedicines.reduce((total, medicine) => {
      const price = medicine.Medicine?.price || 0;
      const quantity = medicine.quantity || 0;
      return total + price * quantity;
    }, 0);
  };

  const medicalHistoryColumns = [
    {
      title: "Ngày khám",
      dataIndex: "date",
      key: "date",
      render: (date) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Chẩn đoán",
      dataIndex: "diagnosis",
      key: "diagnosis",
    },
    {
      title: "Phương pháp điều trị",
      dataIndex: "treatment",
      key: "treatment",
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<FileTextOutlined />}
          onClick={() => {
            navigate(`/doctor/medical-records/${record.record_id}`);
            // After navigation back, the data should be refreshed
          }}
          className="!bg-blue-900 !text-white rounded-full hover:!bg-blue-800"
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  const prescriptionColumns = [
    {
      title: "Ngày kê đơn",
      dataIndex: "date",
      key: "date",
      render: (date) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Thuốc",
      dataIndex: "medicines",
      key: "medicines",
      ellipsis: true,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={getPrescriptionStatusColor(status)}>
          {getPrescriptionStatusText(status)}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<MedicineBoxOutlined />}
          onClick={() =>
            navigate(`/doctor/prescriptions/${record.prescription_id}`)
          }
          className="!bg-blue-900 !text-white rounded-full hover:!bg-blue-800"
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  const appointmentColumns = [
    {
      title: "Ngày khám",
      dataIndex: "appointment_datetime",
      key: "appointment_datetime",
      render: (date) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: "Phí khám",
      dataIndex: "fees",
      key: "fees",
      render: (fees) => fees?.toLocaleString("vi-VN") + " VNĐ",
    },
    {
      title: "Hồ sơ bệnh án",
      dataIndex: "MedicalRecord",
      key: "medical_record_id",
      render: (medicalRecord) =>
        medicalRecord ? (
          <Button
            type="primary"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() =>
              navigate(`/doctor/medical-records/${medicalRecord.record_id}`)
            }
            className="!bg-blue-900 !text-white rounded-full hover:!bg-blue-800"
          >
            Xem
          </Button>
        ) : (
          <Tag color="default">Chưa có</Tag>
        ),
    },
    {
      title: "Đơn thuốc",
      dataIndex: "Prescription",
      key: "prescription_id",
      render: (prescription) =>
        prescription ? (
          <Button
            type="primary"
            size="small"
            icon={<MedicineBoxOutlined />}
            onClick={() =>
              navigate(`/doctor/prescriptions/${prescription.prescription_id}`)
            }
            className="!bg-blue-900 !text-white rounded-full hover:!bg-blue-800"
          >
            Xem
          </Button>
        ) : (
          <Tag color="default">Chưa có</Tag>
        ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {contextHolder}
      <NavbarDoctor />
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
          <Content style={{ margin: "24px 16px", overflow: "initial" }}>
            <div className="mb-4 flex justify-between">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/doctor/patients")}
                className="text-blue-900 hover:text-blue-700"
              >
                Quay lại danh sách bệnh nhân
              </Button>
              <Button
                type="primary"
                onClick={refreshAllData}
                className="!bg-blue-900 !text-white rounded-full hover:!bg-blue-800"
              >
                Làm mới
              </Button>
            </div>

            {errorMessage ? (
              <Card className="shadow-sm">
                <div className="flex flex-col items-center justify-center py-8">
                  <ExclamationCircleOutlined
                    style={{ fontSize: 64, color: "#ff4d4f" }}
                  />
                  <Title level={3} className="mt-4 text-center">
                    {errorMessage}
                  </Title>
                  <Text className="text-center mb-6">
                    Không thể tải dữ liệu bệnh nhân. Vui lòng thử lại sau hoặc
                    quay lại danh sách bệnh nhân.
                  </Text>
                  <div className="flex gap-3">
                    <Button
                      type="primary"
                      onClick={() => navigate("/doctor/patients")}
                      className="!bg-blue-900 !text-white px-6 py-2 rounded-full font-light hover:!bg-blue-800 hover:!text-white border border-blue-800 transition duration-300"
                    >
                      <ArrowLeftOutlined /> Quay lại danh sách
                    </Button>
                    <Button
                      onClick={refreshAllData}
                      className="px-6 py-2 rounded-full font-light border border-blue-800 transition duration-300"
                    >
                      Thử lại
                    </Button>
                  </div>
                </div>
              </Card>
            ) : loading ? (
              <div className="flex justify-center items-center h-64">
                <Spin size="large" />
              </div>
            ) : (
              <>
                {/* Thông tin bệnh nhân */}
                {patientInfo && (
                  <Card className="shadow-sm mb-4">
                    <div className="flex items-center gap-4">
                      <Avatar
                        size={80}
                        src={patientInfo.avatar}
                        icon={!patientInfo.avatar && <UserOutlined />}
                        className="bg-blue-900"
                      />
                      <div>
                        <Title level={3}>{patientInfo.username}</Title>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>Email: {patientInfo.email || "N/A"}</div>
                          <div>SĐT: {patientInfo.phone_number || "N/A"}</div>
                          <div>
                            Giới tính:{" "}
                            {patientInfo.gender === "male"
                              ? "Nam"
                              : patientInfo.gender === "female"
                              ? "Nữ"
                              : "Khác"}
                          </div>
                          <div>
                            Ngày sinh:{" "}
                            {patientInfo.date_of_birth
                              ? dayjs(patientInfo.date_of_birth).format(
                                  "DD/MM/YYYY"
                                )
                              : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Danh sách các lịch hẹn */}
                <Card
                  title={
                    <div className="flex items-center">
                      <ClockCircleOutlined className="mr-2" />
                      <span>
                        Danh sách các cuộc hẹn đã hoàn thành và đã thanh toán
                      </span>
                    </div>
                  }
                  className="shadow-sm"
                >
                  {fullAppointmentList.length > 0 ? (
                    <Table
                      columns={[
                        {
                          title: "Ngày khám",
                          dataIndex: "appointment_datetime",
                          key: "appointment_datetime",
                          render: (date) =>
                            dayjs(date).format("DD/MM/YYYY HH:mm"),
                        },
                        {
                          title: "Trạng thái",
                          dataIndex: "status",
                          key: "status",
                          render: (status) => (
                            <Tag color={getStatusColor(status)}>
                              {getStatusText(status)}
                            </Tag>
                          ),
                        },
                        {
                          title: "Phí khám",
                          dataIndex: "fees",
                          key: "fees",
                          render: (fees) =>
                            fees?.toLocaleString("vi-VN") + " VNĐ",
                        },
                        {
                          title: "Thanh toán",
                          dataIndex: "Payments",
                          key: "payment",
                          render: (payments) =>
                            payments && payments.length > 0 ? (
                              <div>
                                <Tag color="green">Đã thanh toán</Tag>
                                <div className="text-xs text-gray-500 mt-1">
                                  {payments[0].payment_method} -{" "}
                                  {dayjs(payments[0].createdAt).format(
                                    "DD/MM/YYYY"
                                  )}
                                </div>
                              </div>
                            ) : (
                              <Tag color="orange">Chưa thanh toán</Tag>
                            ),
                        },
                        {
                          title: "Hồ sơ bệnh án",
                          dataIndex: "MedicalRecord",
                          key: "medical_record_id",
                          render: (medicalRecord, record) =>
                            medicalRecord ? (
                              <Button
                                type="primary"
                                size="small"
                                icon={<FileTextOutlined />}
                                onClick={() => showMedicalRecordModal(record)}
                                className="!bg-blue-900 !text-white rounded-full hover:!bg-blue-800"
                              >
                                Xem
                              </Button>
                            ) : (
                              <Tag color="default">Chưa có</Tag>
                            ),
                        },
                        {
                          title: "Đơn thuốc",
                          dataIndex: "Prescription",
                          key: "prescription_id",
                          render: (prescription, record) =>
                            prescription ? (
                              <Button
                                type="primary"
                                size="small"
                                icon={<MedicineBoxOutlined />}
                                onClick={() => showPrescriptionModal(record)}
                                className="!bg-blue-900 !text-white rounded-full hover:!bg-blue-800"
                              >
                                Xem
                              </Button>
                            ) : (
                              <Tag color="default">Chưa có</Tag>
                            ),
                        },
                      ]}
                      dataSource={fullAppointmentList}
                      rowKey="appointment_id"
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) =>
                          `Tổng số ${total} cuộc hẹn đã hoàn thành và thanh toán`,
                      }}
                    />
                  ) : (
                    <div className="text-center py-10">
                      <Empty description="Không có cuộc hẹn đã hoàn thành và thanh toán" />
                    </div>
                  )}
                </Card>
              </>
            )}
          </Content>
        </Layout>
      </Layout>

      {/* Modal Hồ sơ bệnh án */}
      <Modal
        title={
          <div className="flex items-center">
            <FileTextOutlined className="mr-2 text-blue-900" />
            <span>Chi tiết hồ sơ bệnh án</span>
          </div>
        }
        visible={isMedicalRecordModalVisible}
        onCancel={() => setIsMedicalRecordModalVisible(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setIsMedicalRecordModalVisible(false)}
            className="rounded-full"
          >
            Đóng
          </Button>,
        ]}
        width={700}
      >
        {selectedMedicalRecord && (
          <div className="p-4">
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Mã hồ sơ">
                {selectedMedicalRecord.record_id}
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú">
                {selectedMedicalRecord.notes || "Không có ghi chú"}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Modal Đơn thuốc */}
      <Modal
        title={
          <div className="flex items-center">
            <MedicineBoxOutlined className="mr-2 text-blue-900" />
            <span>Chi tiết đơn thuốc</span>
          </div>
        }
        visible={isPrescriptionModalVisible}
        onCancel={() => setIsPrescriptionModalVisible(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setIsPrescriptionModalVisible(false)}
            className="rounded-full"
          >
            Đóng
          </Button>,
        ]}
        width={700}
      >
        {selectedPrescription && (
          <div className="p-4">
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Mã đơn thuốc">
                {selectedPrescription.prescription_id}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={getStatusColor(selectedPrescription.status)}>
                  {getStatusText(selectedPrescription.status)}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Danh sách thuốc</Divider>

            <List
              bordered
              dataSource={selectedPrescription.prescriptionMedicines}
              renderItem={(item) => (
                <List.Item>
                  <div className="w-full">
                    <div className="flex justify-between">
                      <div className="font-medium">{item.Medicine.name}</div>
                      <div>
                        {item.quantity} {item.Medicine.unit}
                      </div>
                    </div>
                    <div className="flex justify-between text-gray-500 text-sm mt-1">
                      <div>
                        Đơn giá: {item.Medicine.price?.toLocaleString("vi-VN")}{" "}
                        VNĐ/{item.Medicine.unit}
                      </div>
                      <div>
                        Thành tiền:{" "}
                        {(item.Medicine.price * item.quantity)?.toLocaleString(
                          "vi-VN"
                        )}{" "}
                        VNĐ
                      </div>
                    </div>
                  </div>
                </List.Item>
              )}
              footer={
                <div className="flex justify-end font-semibold">
                  Tổng tiền:{" "}
                  {calculateTotalPrice(
                    selectedPrescription.prescriptionMedicines
                  )?.toLocaleString("vi-VN")}{" "}
                  VNĐ
                </div>
              }
            />
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default PatientDetail;
