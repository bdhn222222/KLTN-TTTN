import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  Card,
  Button,
  Radio,
  Space,
  Typography,
  Spin,
  notification,
  Result,
  Descriptions,
  Divider,
} from "antd";
import {
  WalletOutlined,
  ArrowLeftOutlined,
  CreditCardOutlined,
  BankOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const PaymentPage = () => {
  const { url1 } = useContext(AppContext);
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("momo");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchAppointmentDetail();
  }, [id]);

  const fetchAppointmentDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        notification.error({
          message: "Vui lòng đăng nhập để xem chi tiết thanh toán",
          placement: "top",
        });
        navigate("/login");
        return;
      }

      const response = await axios.get(`${url1}/patient/appointments/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Appointment Detail Response:", response.data);

      if (response.data.success) {
        setAppointment(response.data.data);
      } else {
        notification.error({
          message: "Không thể lấy thông tin thanh toán",
          description: response.data.message,
          placement: "top",
        });
        navigate("/my-appointments");
      }
    } catch (error) {
      console.error("Error fetching appointment detail:", error);
      notification.error({
        message: "Lỗi",
        description: "Không thể lấy thông tin thanh toán",
        placement: "top",
      });
      navigate("/my-appointments");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      setProcessing(true);
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${url1}/patient/appointments/${id}/payment/create`,
        {
          appointment_id: parseInt(id),
          amount: appointment.fees,
          payment_method: selectedMethod,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Payment Response:", response.data);

      if (response.data.payUrl) {
        window.location.href = response.data.payUrl;
      } else {
        notification.error({
          message: "Lỗi thanh toán",
          description: "Không thể kết nối đến cổng thanh toán",
          placement: "top",
        });
      }
    } catch (error) {
      console.error("Error in payment:", error);
      notification.error({
        message: "Lỗi thanh toán",
        description:
          error.response?.data?.message || "Có lỗi xảy ra khi xử lý thanh toán",
        placement: "top",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <Result
        status="404"
        title="Không tìm thấy thông tin thanh toán"
        subTitle="Thông tin thanh toán không tồn tại hoặc đã được xử lý"
        extra={
          <Button type="primary" onClick={() => navigate("/my-appointments")}>
            Quay lại danh sách lịch hẹn
          </Button>
        }
      />
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => window.history.back()}
        className="mb-4 pl-0"
      >
        Quay lại chi tiết lịch hẹn
      </Button>

      <Card className="max-w-2xl mx-auto">
        <Title level={3} className="mb-6">
          Thanh toán lịch hẹn
        </Title>

        <Descriptions bordered column={1} className="mb-6">
          <Descriptions.Item label="Bác sĩ">
            {appointment.Doctor?.user?.username || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Chuyên khoa">
            {appointment.Doctor?.Specialization?.name || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian khám">
            {dayjs(appointment.appointment_datetime).format("DD/MM/YYYY HH:mm")}
          </Descriptions.Item>
          <Descriptions.Item label="Số tiền">
            <Text strong className="text-lg">
              {appointment.fees?.toLocaleString("vi-VN")} VNĐ
            </Text>
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <div className="mb-6">
          <Title level={4} className="mb-4">
            Chọn phương thức thanh toán
          </Title>
          <Radio.Group
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
          >
            <Space direction="vertical">
              <Radio value="momo">
                <Space>
                  <WalletOutlined className="text-pink-500" />
                  Ví MoMo
                </Space>
              </Radio>
              <Radio value="vnpay" disabled>
                <Space>
                  <CreditCardOutlined className="text-blue-500" />
                  VNPay (Sắp ra mắt)
                </Space>
              </Radio>
              <Radio value="bank_transfer" disabled>
                <Space>
                  <BankOutlined className="text-green-500" />
                  Chuyển khoản ngân hàng (Sắp ra mắt)
                </Space>
              </Radio>
            </Space>
          </Radio.Group>
        </div>

        <div className="flex justify-end">
          <Button
            type="primary"
            size="large"
            icon={<WalletOutlined />}
            onClick={handlePayment}
            loading={processing}
          >
            Thanh toán ngay
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PaymentPage;
