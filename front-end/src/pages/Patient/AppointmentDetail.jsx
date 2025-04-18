import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  Card,
  Tag,
  Spin,
  Button,
  message,
  Row,
  Col,
  Divider,
  Modal,
  Form,
  Input,
  Typography,
  Avatar,
  Space,
  Descriptions,
  Result,
  Empty,
  notification,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  UserOutlined,
  LeftOutlined,
  CreditCardOutlined,
  WalletOutlined,
  ArrowLeftOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

const AppointmentDetail = () => {
  const { url1 } = useContext(AppContext);
  const navigate = useNavigate();
  const params = useParams();
  console.log("URL params:", params);
  const { id } = params;
  console.log("Appointment ID from URL:", id);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    console.log("AppointmentDetail mounted or id changed:", id);
    fetchAppointmentDetail();
  }, [id]);

  const fetchAppointmentDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        message.error("Vui lòng đăng nhập để xem chi tiết lịch hẹn");
        navigate("/login");
        return;
      }

      if (!id || id === "undefined" || id === "null") {
        console.error("Invalid appointment ID:", id);
        message.error("ID lịch hẹn không hợp lệ");
        navigate("/my-appointments");
        return;
      }

      console.log("Making API request to get appointment with ID:", id);

      // Ensure id is a valid number
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        console.error("ID is not a valid number:", id);
        message.error("ID lịch hẹn không hợp lệ");
        navigate("/my-appointments");
        return;
      }

      const requestUrl = `${url1}/patient/appointments/${numericId}`;
      console.log("Request URL:", requestUrl);

      const response = await axios.get(requestUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Full API Response:", response.data);

      if (response.data.success) {
        const appointmentData = response.data.data;
        console.log("Appointment Data:", appointmentData);

        if (!appointmentData) {
          message.error("Không tìm thấy thông tin lịch hẹn");
          navigate("/my-appointments");
          return;
        }

        setAppointment(appointmentData);
      } else {
        console.error("API returned error:", response.data);
        message.error(
          response.data.message || "Không thể lấy thông tin lịch hẹn"
        );
        navigate("/my-appointments");
      }
    } catch (error) {
      console.error("Error fetching appointment detail:", error);
      console.error("Error response:", error.response?.data);

      const errorMessage =
        error.response?.data?.message ||
        "Có lỗi xảy ra khi lấy thông tin lịch hẹn";
      message.error(errorMessage);

      if (error.response?.status === 404) {
        navigate("/my-appointments");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setCancelLoading(true);

      if (!cancelReason.trim()) {
        notification.error({
          message: "Thiếu thông tin",
          description: "Vui lòng nhập lý do hủy lịch",
          duration: 3,
          placement: "top",
        });
        return;
      }

      const token = localStorage.getItem("token");
      console.log(
        "Cancelling appointment with ID:",
        id,
        "Reason:",
        cancelReason
      );

      const response = await axios.post(
        `${url1}/patient/appointments/${id}/cancel`,
        { reason: cancelReason },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Cancel API Response:", response.data);

      if (response.data.success) {
        notification.success({
          message: "Thành công",
          description: "Hủy lịch hẹn thành công",
          duration: 3,
          placement: "top",
        });
        setCancelModalVisible(false);
        setCancelReason("");

        // Thêm delay để đảm bảo dữ liệu được cập nhật trong database
        setTimeout(() => {
          console.log(
            "Fetching updated appointment details after cancellation"
          );
          fetchAppointmentDetail();
        }, 2000);
      } else {
        // Xử lý trường hợp API trả về success: false
        notification.error({
          message: "Không thể hủy lịch hẹn",
          description: response.data.message,
          duration: 5,
          placement: "top",
        });
      }
    } catch (error) {
      console.error("Cancel appointment error:", error.response?.data);

      // Xử lý error từ API hoặc lỗi network
      const errorMessage =
        error.response?.data?.message || "Có lỗi xảy ra khi hủy lịch hẹn";

      notification.error({
        message: "Không thể hủy lịch hẹn",
        description: errorMessage,
        duration: 5,
        placement: "top",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const showCancelConfirm = () => {
    setCancelModalVisible(true);
  };

  const handlePayment = () => {
    navigate(`/patient/payment/${id}`);
  };

  const getStatusTag = (status, payments) => {
    if (status === "completed") {
      const isPaid =
        payments && payments.length > 0 && payments[0].status === "paid";
      return isPaid ? (
        <Tag icon={<CheckCircleOutlined />} color="blue" className="text-base">
          Đã hoàn tất
        </Tag>
      ) : (
        <Tag icon={<WalletOutlined />} color="gold" className="text-base">
          Cần thanh toán
        </Tag>
      );
    }

    switch (status) {
      case "waiting_for_confirmation":
        return (
          <Tag
            icon={<ClockCircleOutlined />}
            color="orange"
            className="text-base"
          >
            Đang chờ xác nhận
          </Tag>
        );
      case "accepted":
        return (
          <Tag
            icon={<CheckCircleOutlined />}
            color="green"
            className="text-base"
          >
            Đã xác nhận
          </Tag>
        );
      case "cancelled":
        return (
          <Tag icon={<CloseCircleOutlined />} color="red" className="text-base">
            Đã hủy
          </Tag>
        );
      case "doctor_day_off":
        return (
          <Tag color="volcano" className="text-base">
            Bác sĩ nghỉ
          </Tag>
        );
      case "patient_not_coming":
        return (
          <Tag color="magenta" className="text-base">
            Không đến khám
          </Tag>
        );
      default:
        return (
          <Tag color="default" className="text-base">
            {status}
          </Tag>
        );
    }
  };

  const canCancel =
    appointment &&
    (appointment.status === "waiting_for_confirmation" ||
      appointment.status === "accepted");

  const needsPayment =
    appointment &&
    appointment.status === "completed" &&
    (!appointment.Payments ||
      !appointment.Payments.length ||
      appointment.Payments[0].status === "pending");

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 flex justify-center items-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Result
          status="404"
          title="Không tìm thấy lịch hẹn"
          subTitle="Lịch hẹn bạn đang tìm kiếm không tồn tại hoặc đã bị xóa."
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Quay lại danh sách lịch hẹn
            </Button>
          }
        />
      </div>
    );
  }

  const appointmentDate = dayjs(appointment.appointment_datetime).format(
    "DD/MM/YYYY"
  );
  const appointmentTime = dayjs(appointment.appointment_datetime).format(
    "HH:mm"
  );
  const bookingDate = appointment.created_at
    ? dayjs(appointment.created_at).format("DD/MM/YYYY HH:mm")
    : "N/A";

  return (
    <div className="container mx-auto p-6">
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => window.history.back()}
        className="mb-4 pl-0 text-gray-700"
      >
        Quay lại danh sách lịch hẹn
      </Button>

      <Row gutter={[24, 24]}>
        {/* Left side - Main appointment info */}
        <Col xs={24} md={16}>
          <Card className="shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <Title level={3} className="mb-0">
                Chi tiết lịch hẹn
              </Title>
              {getStatusTag(appointment.status, appointment.Payments)}
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <Text type="secondary" className="block mb-1">
                  Ngày giờ khám
                </Text>
                <div className="flex items-center">
                  <ClockCircleOutlined className="mr-2 text-blue-500" />
                  <Text strong className="text-lg">
                    {appointmentDate} {appointmentTime}
                  </Text>
                </div>
              </div>
              <div>
                <Text type="secondary" className="block mb-1">
                  Chi phí khám
                </Text>
                <div className="flex items-center">
                  <DollarOutlined className="mr-2 text-green-500" />
                  <Text strong className="text-lg">
                    {(appointment.fees || 0).toLocaleString("vi-VN")} VNĐ
                  </Text>
                </div>
              </div>
            </div>

            {/* Hiển thị thông tin hủy lịch khi status là cancelled */}
            {appointment && appointment.status === "cancelled" && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <Text type="secondary" strong className="block mb-2">
                  Thông tin hủy lịch
                </Text>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Text type="secondary">Thời gian hủy:</Text>
                    <Text>
                      {appointment.cancelled_at
                        ? dayjs(appointment.cancelled_at).format(
                            "DD/MM/YYYY HH:mm"
                          )
                        : "N/A"}
                    </Text>
                  </div>
                  <div className="flex justify-between">
                    <Text type="secondary">Người hủy:</Text>
                    <Text>{appointment.cancelled_by || "N/A"}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text type="secondary">Lý do:</Text>
                    <Text>{appointment.cancel_reason || "N/A"}</Text>
                  </div>
                </div>
              </div>
            )}

            {/* Hiển thị button thanh toán khi status completed và payment pending */}
            {appointment.status === "completed" &&
              (!appointment.Payments ||
                !appointment.Payments.length ||
                appointment.Payments[0].status === "pending") && (
                <div className="flex justify-end mt-4">
                  <Button
                    type="primary"
                    icon={<WalletOutlined />}
                    onClick={handlePayment}
                  >
                    Thanh toán
                  </Button>
                </div>
              )}

            {/* Hiển thị thông tin khám khi status completed và đã thanh toán */}
            {appointment.status === "completed" &&
              appointment.Payments &&
              appointment.Payments.length > 0 &&
              appointment.Payments[0].status === "paid" && (
                <div className="mt-6">
                  {/* Medical Record Section */}
                  {appointment.MedicalRecord && (
                    <div className="mb-6">
                      <Title level={4}>Hồ sơ bệnh án</Title>
                      <Card className="mt-2">
                        <div className="space-y-4">
                          <div>
                            <Text type="secondary">Chẩn đoán:</Text>
                            <Paragraph className="mt-1">
                              {appointment.MedicalRecord.diagnosis}
                            </Paragraph>
                          </div>
                          <div>
                            <Text type="secondary">Triệu chứng:</Text>
                            <Paragraph className="mt-1">
                              {appointment.MedicalRecord.symptoms}
                            </Paragraph>
                          </div>
                          <div>
                            <Text type="secondary">Kết luận:</Text>
                            <Paragraph className="mt-1">
                              {appointment.MedicalRecord.conclusion}
                            </Paragraph>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Prescription Section */}
                  {appointment.Prescription &&
                    appointment.Prescription.prescriptionMedicines && (
                      <div className="mb-6">
                        <Title level={4}>Đơn thuốc</Title>
                        <Card className="mt-2">
                          {appointment.Prescription.prescriptionMedicines.map(
                            (medicine, index) => (
                              <div
                                key={index}
                                className="py-2 border-b last:border-b-0"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <Text strong>{medicine.Medicine.name}</Text>
                                    <div className="text-gray-500">
                                      <Text>Liều lượng: {medicine.dosage}</Text>
                                      <br />
                                      <Text>
                                        Hướng dẫn: {medicine.usage_instruction}
                                      </Text>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Text>
                                      {medicine.quantity}{" "}
                                      {medicine.Medicine.unit}
                                    </Text>
                                    <br />
                                    <Text type="secondary">
                                      {(
                                        medicine.Medicine.price *
                                        medicine.quantity
                                      ).toLocaleString("vi-VN")}{" "}
                                      VNĐ
                                    </Text>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </Card>
                      </div>
                    )}
                </div>
              )}

            {/* Button Hủy lịch */}
            {canCancel && (
              <div className="flex justify-end mt-4">
                <Button type="primary" danger onClick={showCancelConfirm}>
                  Hủy lịch hẹn
                </Button>
              </div>
            )}
          </Card>
        </Col>

        {/* Right side - Doctor & Patient info */}
        <Col xs={24} md={8}>
          <Card className="shadow-sm mb-6">
            <Title level={4} className="mb-4">
              Thông tin bác sĩ
            </Title>
            {appointment.Doctor && appointment.Doctor.user ? (
              <div className="text-center">
                <Avatar
                  size={80}
                  icon={<UserOutlined />}
                  src={appointment.Doctor.user.avatar}
                  className="mb-3"
                />
                <Text strong className="block text-lg mb-1">
                  {appointment.Doctor.user.username}
                </Text>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-center text-gray-500">
                    <MailOutlined className="mr-2" />
                    <Text>{appointment.Doctor.user.email}</Text>
                  </div>
                  <div className="flex items-center justify-center text-gray-500">
                    <MedicineBoxOutlined className="mr-2" />
                    <Text>
                      {appointment.Doctor?.Specialization?.name ||
                        "Chưa cập nhật khoa"}
                    </Text>
                  </div>
                </div>
              </div>
            ) : (
              <Empty description="Không có thông tin bác sĩ" />
            )}
          </Card>

          <Card className="shadow-sm">
            <Title level={4} className="mb-4">
              Thông tin người khám
            </Title>
            {appointment.FamilyMember ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Text type="secondary">Họ tên:</Text>
                  <Text strong>{appointment.FamilyMember.username}</Text>
                </div>
                <div className="flex justify-between">
                  <Text type="secondary">Quan hệ:</Text>
                  <Text strong>
                    {appointment.FamilyMember.relationship === "self"
                      ? "Bản thân"
                      : appointment.FamilyMember.relationship === "father"
                      ? "Cha"
                      : appointment.FamilyMember.relationship === "mother"
                      ? "Mẹ"
                      : appointment.FamilyMember.relationship === "spouse"
                      ? "Vợ/Chồng"
                      : appointment.FamilyMember.relationship === "child"
                      ? "Con"
                      : "Khác"}
                  </Text>
                </div>
                <div className="flex justify-between">
                  <Text type="secondary">Ngày sinh:</Text>
                  <Text strong>
                    {dayjs(appointment.FamilyMember.date_of_birth).format(
                      "DD/MM/YYYY"
                    )}
                  </Text>
                </div>
                <div className="flex justify-between">
                  <Text type="secondary">Số điện thoại:</Text>
                  <Text strong>{appointment.FamilyMember.phone_number}</Text>
                </div>
                <div className="flex justify-between">
                  <Text type="secondary">Giới tính:</Text>
                  <Text strong>
                    {appointment.FamilyMember.gender === "male" ? "Nam" : "Nữ"}
                  </Text>
                </div>
              </div>
            ) : (
              <Empty description="Không có thông tin người khám" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Cancel Modal */}
      <Modal
        title="Hủy lịch hẹn"
        open={cancelModalVisible}
        onCancel={() => setCancelModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setCancelModalVisible(false)}>
            Hủy bỏ
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            loading={cancelLoading}
            onClick={handleCancel}
          >
            Xác nhận hủy lịch
          </Button>,
        ]}
      >
        <div className="mb-4">
          <ExclamationCircleOutlined className="text-yellow-500 mr-2" />
          <span>
            Bạn có chắc chắn muốn hủy lịch hẹn này? Vui lòng cung cấp lý do.
          </span>
        </div>
        <Form form={form} layout="vertical">
          <Form.Item
            name="cancelReason"
            label="Lý do hủy lịch"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập lý do hủy lịch",
              },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Nhập lý do hủy lịch..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AppointmentDetail;
