import React, { useContext, useState } from "react";
import {
  Drawer,
  Button,
  Space,
  Tag,
  Divider,
  Descriptions,
  Modal,
  Flex,
  Input,
  Form,
  notification,
  Empty,
} from "antd";
import {
  ArrowLeftOutlined,
  CloseCircleOutlined,
  CheckOutlined,
  FileAddOutlined,
  CheckCircleOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import axios from "axios";
import { AppContext } from "../../context/AppContext";

const { TextArea } = Input;

const AppointmentDetails = ({ open, onClose, appointmentData, onUpdate }) => {
  const { url1 } = useContext(AppContext);
  const [isConfirmCancelVisible, setIsConfirmCancelVisible] = useState(false);
  const [isConfirmCompleteVisible, setIsConfirmCompleteVisible] =
    useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [form] = Form.useForm();
  const [api, contextHolder] = notification.useNotification();

  const statusConfig = {
    waiting_for_confirmation: { color: "gold", text: "Chờ xác nhận" },
    accepted: { color: "green", text: "Đã tiếp nhận" },
    completed: { color: "blue", text: "Đã hoàn thành" },
    cancelled: { color: "red", text: "Đã hủy" },
    doctor_day_off: { color: "red", text: "Bác sĩ nghỉ" },
    patient_not_coming: { color: "red", text: "Bệnh nhân không đến" },
  };

  // Safe accessor functions
  const safeAccess = (obj, path, defaultValue = "N/A") => {
    try {
      const result = path.split(".").reduce((o, p) => o && o[p], obj);
      return result !== undefined && result !== null ? result : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return "N/A";
    return value.toLocaleString("vi-VN") + " VNĐ";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = dayjs(dateString);
    return date.isValid() ? date.format("DD/MM/YYYY HH:mm") : "N/A";
  };

  const getStatusTag = (status) => {
    const config = statusConfig[status] || {
      color: "default",
      text: status || "N/A",
    };
    return (
      <Tag color={config.color} style={{ fontWeight: "normal" }}>
        {config.text}
      </Tag>
    );
  };

  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: "topRight",
      duration: 5,
    });
  };

  const handleCancelAppointment = async () => {
    if (!cancelReason || cancelReason.trim() === "") {
      showNotification("error", "Lỗi", "Vui lòng nhập lý do hủy cuộc hẹn");
      return;
    }

    if (!appointmentData) {
      showNotification("error", "Lỗi", "Không tìm thấy thông tin cuộc hẹn");
      return;
    }

    const appointmentId =
      safeAccess(appointmentData, "appointment_info.id") ||
      safeAccess(appointmentData, "appointment_id");

    if (!appointmentId || appointmentId === "N/A") {
      showNotification("error", "Lỗi", "Mã cuộc hẹn không hợp lệ");
      return;
    }

    console.log(`Cancelling appointment with ID: ${appointmentId}`);

    try {
      setIsCancelling(true);
      await axios.post(
        `${url1}/doctor/appointments/${appointmentId}/cancel`,
        {
          reason: cancelReason.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      showNotification(
        "success",
        "Hủy thành công",
        "Đã hủy cuộc hẹn thành công"
      );

      setIsConfirmCancelVisible(false);
      setCancelReason("");
      form.resetFields();
      onClose();
      onUpdate();
    } catch (error) {
      console.error("Error cancelling appointment:", error);

      let errorMessage = "";
      if (error.response?.status === 401) {
        errorMessage = "Bạn không có quyền thực hiện thao tác này";
      } else if (error.response?.status === 404) {
        errorMessage = "Không tìm thấy cuộc hẹn";
      } else if (error.response?.status === 400) {
        errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Cuộc hẹn không thể hủy";
      } else {
        errorMessage = "Có lỗi xảy ra, vui lòng thử lại sau";
      }

      showNotification("error", "Hủy thất bại", errorMessage);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleAcceptAppointment = async (appointmentId) => {
    if (!appointmentId || appointmentId === "N/A") {
      showNotification("error", "Lỗi", "Mã cuộc hẹn không hợp lệ");
      return;
    }

    try {
      await axios.patch(
        `${url1}/doctor/appointments/${appointmentId}/accept`,
        null,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      onClose();
      onUpdate();
    } catch (error) {
      console.error("Error accepting appointment:", error);
      showNotification("error", "Lỗi", "Không thể xác nhận cuộc hẹn");
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    if (!appointmentId || appointmentId === "N/A") {
      showNotification("error", "Lỗi", "Mã cuộc hẹn không hợp lệ");
      return;
    }

    try {
      await axios.post(
        `${url1}/doctor/appointments/complete`,
        {
          appointment_id: appointmentId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setIsConfirmCompleteVisible(false);
      onClose();
      onUpdate();
    } catch (error) {
      console.error("Error completing appointment:", error);
      showNotification("error", "Lỗi", "Không thể hoàn thành cuộc hẹn");
    }
  };

  const renderActionButtons = (status, appointmentId) => {
    if (!status || !appointmentId || appointmentId === "N/A") {
      return null;
    }

    switch (status) {
      case "waiting_for_confirmation":
        return (
          <Flex justify="center" gap="middle">
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => setIsConfirmCancelVisible(true)}
              className="!bg-red-700 !text-white px-6 py-2 h-auto rounded-full hover:!bg-red-600"
            >
              Từ chối
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleAcceptAppointment(appointmentId)}
              className="!bg-blue-900 !text-white px-6 py-2 h-auto rounded-full hover:!bg-blue-800"
            >
              Xác nhận
            </Button>
          </Flex>
        );
      case "accepted":
        const hasMedicalRecord =
          safeAccess(appointmentData, "medical_record") ||
          safeAccess(appointmentData, "medical_record_id");
        const hasPrescription =
          safeAccess(appointmentData, "prescription") ||
          safeAccess(appointmentData, "prescription_id");

        return (
          <Flex justify="center" gap="middle">
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => setIsConfirmCancelVisible(true)}
              className="!bg-red-700 !text-white px-6 py-2 h-auto rounded-full hover:!bg-red-600"
            >
              Hủy
            </Button>

            {hasMedicalRecord &&
            hasPrescription &&
            hasMedicalRecord !== "N/A" &&
            hasPrescription !== "N/A" ? (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => setIsConfirmCompleteVisible(true)}
                className="!bg-blue-900 !text-white px-6 py-2 h-auto rounded-full hover:!bg-blue-800"
              >
                Hoàn thành
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<FileAddOutlined />}
                onClick={() => {
                  console.log(
                    `Creating medical record for appointment ID: ${appointmentId}`
                  );
                  // Thêm phương thức tạo hồ sơ ở đây nếu cần
                  onClose();
                }}
                className="!bg-blue-900 !text-white px-6 py-2 h-auto rounded-full hover:!bg-blue-800"
              >
                Tạo hồ sơ
              </Button>
            )}
          </Flex>
        );
      case "completed":
        return null;
      default:
        return null;
    }
  };

  if (!appointmentData) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        width="50%"
        title="Chi tiết cuộc hẹn"
      >
        <Empty description="Không có dữ liệu" />
      </Drawer>
    );
  }

  // Extract all needed data with safe accessors
  const appointmentId = safeAccess(appointmentData, "appointment_info.id");
  const appointmentDateTime = safeAccess(
    appointmentData,
    "appointment_info.datetime"
  );
  const appointmentStatus = safeAccess(
    appointmentData,
    "appointment_info.status"
  );
  const appointmentFees = safeAccess(appointmentData, "appointment_info.fees");

  const patientName = safeAccess(appointmentData, "familyMember.name");
  const patientEmail = safeAccess(appointmentData, "familyMember.email");
  const patientGender = safeAccess(appointmentData, "familyMember.gender");
  const patientDob = safeAccess(appointmentData, "familyMember.dob");

  return (
    <>
      {contextHolder}
      <Drawer
        open={open}
        onClose={onClose}
        width="50%"
        title={
          <Flex justify="space-between" align="center">
            <span>Chi tiết cuộc hẹn</span>
            {appointmentStatus && (
              <Tag color={getStatusTag(appointmentStatus).props.color}>
                {getStatusTag(appointmentStatus).props.children}
              </Tag>
            )}
          </Flex>
        }
      >
        <Descriptions title="Thông tin cuộc hẹn" column={1}>
          <Descriptions.Item label="Mã cuộc hẹn">
            {appointmentId}
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian">
            {formatDate(appointmentDateTime)}
          </Descriptions.Item>
          <Descriptions.Item label="Phí khám">
            {appointmentFees !== "N/A"
              ? formatCurrency(appointmentFees)
              : "N/A"}
          </Descriptions.Item>
          {appointmentStatus === "patient_not_coming" && (
            <Descriptions.Item label="Lý do hủy">
              Bệnh nhân không đến
            </Descriptions.Item>
          )}
          {appointmentStatus === "doctor_day_off" && (
            <Descriptions.Item label="Lý do hủy">
              Bác sĩ có lịch nghỉ
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider />

        <Descriptions title="Thông tin bệnh nhân" column={1}>
          <Descriptions.Item label="Họ tên">{patientName}</Descriptions.Item>
          <Descriptions.Item label="Email">{patientEmail}</Descriptions.Item>
          <Descriptions.Item label="Giới tính">
            {patientGender === "male"
              ? "Nam"
              : patientGender === "female"
              ? "Nữ"
              : patientGender}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày sinh">
            {patientDob !== "N/A"
              ? dayjs(patientDob).format("DD/MM/YYYY")
              : "N/A"}
          </Descriptions.Item>
        </Descriptions>

        {safeAccess(appointmentData, "medical_record") !== "N/A" && (
          <>
            <Divider />
            <Descriptions title="Hồ sơ bệnh án" column={1}>
              <Descriptions.Item label="Chẩn đoán">
                {safeAccess(appointmentData, "medical_record.diagnosis")}
              </Descriptions.Item>
              <Descriptions.Item label="Phương pháp điều trị">
                {safeAccess(appointmentData, "medical_record.treatment")}
              </Descriptions.Item>
              {safeAccess(appointmentData, "medical_record.notes") !==
                "N/A" && (
                <Descriptions.Item label="Ghi chú">
                  {safeAccess(appointmentData, "medical_record.notes")}
                </Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}

        {safeAccess(appointmentData, "prescription") !== "N/A" && (
          <>
            <Divider />
            <Descriptions title="Đơn thuốc" column={1}>
              <Descriptions.Item label="Trạng thái">
                {safeAccess(appointmentData, "prescription.status")}
              </Descriptions.Item>
              {safeAccess(appointmentData, "prescription.medicines") !==
                "N/A" && (
                <Descriptions.Item label="Danh sách thuốc">
                  <ul className="list-disc pl-4">
                    {appointmentData.prescription.medicines.map(
                      (medicine, index) => (
                        <li key={medicine?.id || index}>
                          {safeAccess(medicine, "name")} - SL:{" "}
                          {safeAccess(medicine, "quantity")} -{" "}
                          {safeAccess(medicine, "total") !== "N/A"
                            ? formatCurrency(medicine.total)
                            : "N/A"}
                        </li>
                      )
                    )}
                  </ul>
                </Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}

        {safeAccess(appointmentData, "payment") !== "N/A" &&
          appointmentStatus !== "accepted" && (
            <>
              <Divider />
              <Descriptions title="Thanh toán" column={1}>
                <Descriptions.Item label="Số tiền">
                  {safeAccess(appointmentData, "payment.amount") !== "N/A"
                    ? formatCurrency(appointmentData.payment.amount)
                    : "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Phương thức">
                  {safeAccess(appointmentData, "payment.payment_method")}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  {safeAccess(appointmentData, "payment.status")}
                </Descriptions.Item>
              </Descriptions>
            </>
          )}

        {safeAccess(appointmentData, "feedback") !== "N/A" && (
          <>
            <Divider />
            <Descriptions title="Đánh giá" column={1}>
              <Descriptions.Item label="Điểm đánh giá">
                {safeAccess(appointmentData, "feedback.rating")}
              </Descriptions.Item>
              <Descriptions.Item label="Nhận xét">
                {safeAccess(appointmentData, "feedback.comment")}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}

        <Divider />

        {renderActionButtons(appointmentStatus, appointmentId)}
      </Drawer>

      <Modal
        title="Xác nhận hủy lịch hẹn"
        open={isConfirmCancelVisible}
        onOk={handleCancelAppointment}
        onCancel={() => {
          setIsConfirmCancelVisible(false);
          setCancelReason("");
          form.resetFields();
        }}
        footer={[
          <Button
            key="back"
            onClick={() => {
              setIsConfirmCancelVisible(false);
              setCancelReason("");
              form.resetFields();
            }}
            className="!bg-white !text-gray-700 px-6 py-2 h-auto rounded-full border !border-gray-700 hover:!bg-gray-100 hover:!text-gray-700"
          >
            Hủy bỏ
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            loading={isCancelling}
            onClick={handleCancelAppointment}
            className="!bg-red-700 !text-white px-6 py-2 h-auto rounded-full hover:!bg-white hover:!text-red-700 border !border-red-700"
          >
            Xác nhận hủy
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <p>Bạn có chắc chắn muốn hủy cuộc hẹn này không?</p>
          {appointmentData && (
            <p className="text-sm text-gray-500 mb-4">
              Thông tin cuộc hẹn:{" "}
              {formatDate(
                safeAccess(appointmentData, "appointment_info.datetime")
              )}{" "}
              - {safeAccess(appointmentData, "familyMember.name")}
            </p>
          )}

          <Form.Item
            name="reason"
            label="Lý do hủy cuộc hẹn"
            rules={[
              { required: true, message: "Vui lòng nhập lý do hủy cuộc hẹn" },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Nhập lý do hủy cuộc hẹn..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </Form.Item>

          <div className="text-sm text-red-600">
            <p>Lưu ý: Việc hủy cuộc hẹn có thể dẫn đến các quy định đền bù</p>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Xác nhận hoàn thành"
        open={isConfirmCompleteVisible}
        onOk={() => handleCompleteAppointment(appointmentId)}
        onCancel={() => setIsConfirmCompleteVisible(false)}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={{
          className: "!bg-blue-900 !text-white hover:!bg-blue-800",
        }}
      >
        <p>Bạn có chắc chắn muốn đánh dấu cuộc hẹn này là đã hoàn thành?</p>
      </Modal>
    </>
  );
};

export default AppointmentDetails;
