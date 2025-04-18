import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import {
  Card,
  Button,
  Spin,
  Result,
  Typography,
  Divider,
  List,
  Row,
  Col,
  message,
  notification,
  Radio,
  Space,
} from "antd";
import {
  CreditCardOutlined,
  WalletOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;

const PaymentAppointment = () => {
  const { url1 } = useContext(AppContext);
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("momo");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    fetchAppointmentDetail();
  }, [id]);

  // Kiểm tra nếu URL có params từ thanh toán thành công
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get("status");
    const orderId = urlParams.get("orderId");

    if (status === "success" && orderId) {
      // Cập nhật trạng thái thanh toán
      updatePaymentStatus(orderId);
    }
  }, []);

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

      const response = await axios.get(`${url1}/patient/appointments/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success && response.data.data.success) {
        const appointmentData = response.data.data.data;
        console.log("Appointment Data:", appointmentData);

        // Kiểm tra nếu đã thanh toán
        const isPaid =
          appointmentData.Payments &&
          appointmentData.Payments.length > 0 &&
          appointmentData.Payments[0].status === "paid";

        if (isPaid) {
          setPaymentSuccess(true);
        }

        setAppointment(appointmentData);
      } else {
        message.error(
          response.data.data.message || "Không thể lấy thông tin lịch hẹn"
        );
        navigate("/my-appointments");
      }
    } catch (error) {
      console.error("Error fetching appointment detail:", error);
      message.error("Có lỗi xảy ra khi lấy thông tin lịch hẹn");
      navigate("/my-appointments");
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật trạng thái thanh toán
  const updatePaymentStatus = async (orderId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${url1}/patient/appointments/${id}/payment/verify`,
        { order_id: orderId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setPaymentSuccess(true);
        notification.success({
          message: "Thanh toán thành công",
          description: "Thanh toán lịch hẹn của bạn đã được xác nhận.",
          placement: "top",
        });

        // Cập nhật lại thông tin lịch hẹn
        fetchAppointmentDetail();
      } else {
        notification.error({
          message: "Lỗi xác nhận thanh toán",
          description:
            response.data.message || "Không thể xác nhận thanh toán.",
          placement: "top",
        });
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      notification.error({
        message: "Lỗi xác nhận thanh toán",
        description: "Có lỗi xảy ra khi xác nhận thanh toán.",
        placement: "top",
      });
    }
  };

  // Xử lý thanh toán
  const handlePayment = async () => {
    try {
      setProcessingPayment(true);
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${url1}/patient/appointments/${id}/payment`,
        {
          payment_method: paymentMethod,
          amount: appointment.fees,
          appointment_id: id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.payUrl) {
        // Chuyển hướng đến trang thanh toán MoMo
        window.location.href = response.data.payUrl;
      } else {
        notification.error({
          message: "Lỗi thanh toán",
          description: "Không thể kết nối đến cổng thanh toán.",
          placement: "top",
        });
        setProcessingPayment(false);
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      notification.error({
        message: "Lỗi thanh toán",
        description: "Có lỗi xảy ra khi xử lý thanh toán.",
        placement: "top",
      });
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container mx-auto p-6">
        <Result
          status="404"
          title="Không tìm thấy thông tin thanh toán"
          subTitle="Lịch hẹn bạn đang tìm kiếm không tồn tại hoặc đã bị xóa."
          extra={
            <Button type="primary" onClick={() => navigate("/my-appointments")}>
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

  // Nếu đã thanh toán thành công
  if (paymentSuccess) {
    return (
      <div className="container mx-auto p-6">
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/patient/appointment/${id}`)}
          className="mb-4 pl-0 text-gray-700"
        >
          Quay lại chi tiết lịch hẹn
        </Button>

        <Row gutter={[24, 24]} className="mt-6">
          <Col xs={24} lg={16} className="mx-auto">
            <Result
              status="success"
              title="Thanh toán thành công!"
              subTitle="Cảm ơn bạn đã thanh toán. Bạn có thể xem chi tiết hồ sơ bệnh án và đơn thuốc trong chi tiết lịch hẹn."
              extra={[
                <Button
                  type="primary"
                  key="detail"
                  onClick={() => navigate(`/patient/appointment/${id}`)}
                >
                  Xem chi tiết lịch hẹn
                </Button>,
                <Button
                  key="appointments"
                  onClick={() => navigate("/my-appointments")}
                >
                  Quay lại danh sách lịch hẹn
                </Button>,
              ]}
            />
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/patient/appointment/${id}`)}
        className="mb-4 pl-0 text-gray-700"
      >
        Quay lại chi tiết lịch hẹn
      </Button>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={16}>
          {/* Thông tin thanh toán */}
          <Card className="shadow-sm mb-6">
            <Title level={3} className="mb-4">
              Thanh toán lịch hẹn
            </Title>

            <List itemLayout="horizontal" className="mb-4">
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <CalendarOutlined
                      style={{ fontSize: "24px", color: "#1890ff" }}
                    />
                  }
                  title="Ngày giờ khám"
                  description={`${appointmentDate} ${appointmentTime}`}
                />
              </List.Item>
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <UserOutlined
                      style={{ fontSize: "24px", color: "#1890ff" }}
                    />
                  }
                  title="Bác sĩ"
                  description={
                    appointment.Doctor?.user?.username || "Chưa có thông tin"
                  }
                />
              </List.Item>
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <MedicineBoxOutlined
                      style={{ fontSize: "24px", color: "#1890ff" }}
                    />
                  }
                  title="Chuyên khoa"
                  description={
                    appointment.Doctor?.Specialization?.name ||
                    "Chưa có thông tin"
                  }
                />
              </List.Item>
            </List>

            <Divider />

            <div className="mb-4">
              <Title level={4}>Chi tiết thanh toán</Title>
              <Row justify="space-between" className="mb-2">
                <Text>Chi phí khám:</Text>
                <Text strong>
                  {(appointment.fees || 0).toLocaleString("vi-VN")} VNĐ
                </Text>
              </Row>
              <Row justify="space-between" className="mb-2">
                <Text>Phí dịch vụ:</Text>
                <Text>0 VNĐ</Text>
              </Row>
              <Divider style={{ margin: "12px 0" }} />
              <Row justify="space-between">
                <Title level={5}>Tổng thanh toán:</Title>
                <Title level={5} type="danger">
                  {(appointment.fees || 0).toLocaleString("vi-VN")} VNĐ
                </Title>
              </Row>
            </div>

            <Divider />

            <div className="mb-4">
              <Title level={4}>Phương thức thanh toán</Title>
              <Radio.Group
                onChange={(e) => setPaymentMethod(e.target.value)}
                value={paymentMethod}
                className="w-full"
              >
                <Space direction="vertical" className="w-full">
                  <Radio value="momo" className="p-3 border rounded w-full">
                    <div className="flex items-center">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png"
                        alt="MoMo"
                        className="h-8 mr-3"
                      />
                      <span>Thanh toán qua MoMo</span>
                    </div>
                  </Radio>
                </Space>
              </Radio.Group>
            </div>

            <Button
              type="primary"
              size="large"
              icon={<CreditCardOutlined />}
              onClick={handlePayment}
              loading={processingPayment}
              block
              className="mt-4"
            >
              {processingPayment ? "Đang xử lý..." : "Thanh toán ngay"}
            </Button>

            <div className="mt-4 text-gray-500 text-sm">
              <InfoCircleOutlined className="mr-1" />
              Sau khi thanh toán thành công, bạn sẽ được chuyển về trang chi
              tiết lịch hẹn và có thể xem hồ sơ bệnh án và đơn thuốc của mình.
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          {/* Thông tin quan trọng */}
          <Card className="shadow-sm">
            <Title level={4} className="mb-4">
              Thông tin quan trọng
            </Title>
            <Paragraph>
              <CheckCircleOutlined className="mr-2 text-green-500" />
              Thanh toán an toàn và bảo mật với MoMo.
            </Paragraph>
            <Paragraph>
              <CheckCircleOutlined className="mr-2 text-green-500" />
              Hồ sơ bệnh án và đơn thuốc của bạn sẽ được hiển thị sau khi thanh
              toán thành công.
            </Paragraph>
            <Paragraph>
              <CheckCircleOutlined className="mr-2 text-green-500" />
              Nếu bạn gặp vấn đề trong quá trình thanh toán, vui lòng liên hệ
              với chúng tôi qua hotline: 1900 xxxx.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PaymentAppointment;
