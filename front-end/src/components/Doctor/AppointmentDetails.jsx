import React, { useContext, useState, useEffect } from "react";
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
  Card,
  Avatar,
  Rate,
} from "antd";
import {
  ArrowLeftOutlined,
  CloseCircleOutlined,
  CheckOutlined,
  FileAddOutlined,
  CheckCircleOutlined,
  WalletOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  // Debug log khi component nhận dữ liệu mới
  useEffect(() => {
    if (appointmentData) {
      console.log("AppointmentDetails received data:", appointmentData);
    }
  }, [appointmentData]);

  const statusConfig = {
    waiting_for_confirmation: { color: "gold", text: "Chờ xác nhận" },
    accepted: { color: "green", text: "Đã tiếp nhận" },
    completed: { color: "blue", text: "Đã hoàn thành" },
    cancelled: { color: "red", text: "Đã hủy" },
    doctor_day_off: { color: "red", text: "Bác sĩ nghỉ" },
    patient_not_coming: { color: "red", text: "Bệnh nhân không đến" },
  };

  // Cải thiện safeAccess để in log khi không tìm thấy đường dẫn
  const safeAccess = (obj, path, defaultValue = "N/A") => {
    try {
      const result = path.split(".").reduce((o, p) => {
        if (o === null || o === undefined) {
          console.log(
            `Path error at ${p} in ${path}, object is null/undefined`
          );
          return undefined;
        }
        return o[p];
      }, obj);

      if (result === undefined || result === null) {
        console.log(`Property at path "${path}" is ${result}`);
        return defaultValue;
      }
      return result;
    } catch (e) {
      console.log(`Error accessing path "${path}":`, e.message);
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
                  navigate(`/doctor/medical-records/create/${appointmentId}`);
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
    console.log("No appointment data provided to AppointmentDetails");
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

  // Log detailed data properties
  console.log("Appointment ID:", appointmentData.appointment_id);
  console.log("Appointment Info:", appointmentData.appointment_info);
  console.log("Family Member:", appointmentData.familyMember);
  console.log("Medical Record:", appointmentData.medical_record);
  console.log("Prescription:", appointmentData.prescription);

  // Extract all needed data with safe accessors
  const appointmentId =
    safeAccess(appointmentData, "appointment_info.id") ||
    safeAccess(appointmentData, "appointment_id");
  const appointmentDateTime =
    safeAccess(appointmentData, "appointment_info.datetime") ||
    safeAccess(appointmentData, "appointment_datetime");
  const appointmentStatus =
    safeAccess(appointmentData, "appointment_info.status") ||
    safeAccess(appointmentData, "status");
  const appointmentFees =
    safeAccess(appointmentData, "appointment_info.fees") ||
    safeAccess(appointmentData, "fees");

  const patientName =
    safeAccess(appointmentData, "familyMember.name") ||
    safeAccess(appointmentData, "family_name");
  const patientEmail =
    safeAccess(appointmentData, "familyMember.email") ||
    safeAccess(appointmentData, "family_email");
  const patientGender =
    safeAccess(appointmentData, "familyMember.gender") ||
    safeAccess(appointmentData, "family_gender");
  const patientDob =
    safeAccess(appointmentData, "familyMember.dob") ||
    safeAccess(appointmentData, "family_dob");

  return (
    <>
      {contextHolder}
      <Drawer
        open={open}
        onClose={onClose}
        width="70%"
        title={
          <Flex justify="space-between" align="center">
            <div className="flex items-center gap-2">
              <span className="text-lg">Chi tiết cuộc hẹn</span>
              <span className="text-gray-400">#{appointmentId}</span>
            </div>
            {appointmentStatus && (
              <Tag
                color={getStatusTag(appointmentStatus).props.color}
                className="px-4 py-1"
              >
                {getStatusTag(appointmentStatus).props.children}
              </Tag>
            )}
          </Flex>
        }
      >
        <div className="space-y-6 mb-6">
          {/* Thông tin cuộc hẹn */}
          <Card title="Thông tin cuộc hẹn" className="shadow-sm">
            <Descriptions column={1} className="pb-4">
              <Descriptions.Item label="Thời gian khám">
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
              {appointmentStatus === "cancelled" && (
                <>
                  <Descriptions.Item label="Lý do hủy">
                    {safeAccess(
                      appointmentData,
                      "appointment_info.cancel_reason"
                    ) ||
                      safeAccess(appointmentData, "cancel_reason") ||
                      "Không có lý do"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Người hủy">
                    {safeAccess(
                      appointmentData,
                      "appointment_info.cancelled_by"
                    ) ||
                      safeAccess(appointmentData, "cancelled_by") ||
                      "Không có thông tin"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Thời gian hủy">
                    {formatDate(
                      safeAccess(
                        appointmentData,
                        "appointment_info.cancelled_at"
                      ) || safeAccess(appointmentData, "cancelled_at")
                    )}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
          </Card>

          <Divider />

          {/* Thông tin bệnh nhân */}
          <Card title="Thông tin bệnh nhân" className="shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <Avatar
                size={64}
                icon={<UserOutlined />}
                className="bg-blue-900"
              />
              <div>
                <div className="text-lg font-medium">{patientName}</div>
                <div className="text-gray-500">{patientEmail}</div>
              </div>
            </div>
            <Descriptions column={1}>
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
          </Card>

          <Divider />

          {/* Hồ sơ bệnh án */}
          {(safeAccess(appointmentData, "medical_record") !== "N/A" ||
            safeAccess(appointmentData, "medical_record_id") !== "N/A") && (
            <>
              <Card title="Hồ sơ bệnh án" className="shadow-sm">
                <Descriptions column={1}>
                  <Descriptions.Item label="Chẩn đoán" className="font-medium">
                    {safeAccess(appointmentData, "medical_record.diagnosis")}
                  </Descriptions.Item>
                  <Descriptions.Item label="Triệu chứng">
                    {safeAccess(appointmentData, "medical_record.symptoms")}
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
              </Card>
              <Divider />
            </>
          )}

          {/* Đơn thuốc */}
          {(safeAccess(appointmentData, "prescription") !== "N/A" ||
            safeAccess(appointmentData, "prescription_id") !== "N/A") && (
            <>
              <Card
                title={
                  <Flex justify="space-between" align="center">
                    <span>Đơn thuốc</span>
                    <Tag
                      color={
                        safeAccess(appointmentData, "prescription.status") ===
                        "completed"
                          ? "success"
                          : safeAccess(
                              appointmentData,
                              "prescription.status"
                            ) === "processing"
                          ? "processing"
                          : "warning"
                      }
                    >
                      {safeAccess(appointmentData, "prescription.status") ===
                      "pending_prepare"
                        ? "Chờ chuẩn bị"
                        : safeAccess(appointmentData, "prescription.status") ===
                          "pending"
                        ? "Chờ xử lý"
                        : safeAccess(appointmentData, "prescription.status") ===
                          "processing"
                        ? "Đang xử lý"
                        : safeAccess(appointmentData, "prescription.status") ===
                          "completed"
                        ? "Đã hoàn thành"
                        : safeAccess(appointmentData, "prescription.status") ===
                          "cancelled"
                        ? "Đã hủy"
                        : safeAccess(appointmentData, "prescription.status")}
                    </Tag>
                  </Flex>
                }
                className="shadow-sm"
              >
                {safeAccess(appointmentData, "prescription.medicines") !==
                  "N/A" &&
                Array.isArray(appointmentData.prescription.medicines) &&
                appointmentData.prescription.medicines.length > 0 ? (
                  <div className="space-y-4">
                    {appointmentData.prescription.medicines.map(
                      (medicine, index) => {
                        console.log("Medicine data API format:", medicine);
                        return (
                          <Card
                            key={medicine?.id || index}
                            size="small"
                            className="bg-gray-50"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-blue-900">
                                  {safeAccess(medicine, "name")}
                                </div>
                                <div className="text-sm text-gray-500 mt-2 space-y-1">
                                  <div>
                                    Số lượng: {safeAccess(medicine, "quantity")}
                                  </div>
                                  <div>
                                    Liều dùng:{" "}
                                    {safeAccess(medicine, "dosage") || "N/A"}
                                  </div>
                                  <div>
                                    Tần suất:{" "}
                                    {safeAccess(medicine, "frequency") || "N/A"}
                                  </div>
                                  <div>
                                    Thời gian dùng:{" "}
                                    {safeAccess(medicine, "duration") || "N/A"}
                                  </div>
                                  <div>
                                    Hướng dẫn:{" "}
                                    {safeAccess(medicine, "instructions") ||
                                      "N/A"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <Empty description="Không có thông tin chi tiết thuốc" />
                )}

                {/* Hiển thị thông tin bổ sung của đơn thuốc nếu có */}
                {safeAccess(appointmentData, "prescription.note") !== "N/A" && (
                  <div className="mt-4 pt-3 border-t">
                    <div className="font-medium mb-1">Ghi chú đơn thuốc:</div>
                    <div className="text-gray-600">
                      {safeAccess(appointmentData, "prescription.note")}
                    </div>
                  </div>
                )}
              </Card>
              <Divider />
            </>
          )}

          {/* Đánh giá */}
          {safeAccess(appointmentData, "feedback") !== "N/A" && (
            <Card title="Đánh giá từ bệnh nhân" className="shadow-sm">
              <Rate
                disabled
                defaultValue={safeAccess(appointmentData, "feedback.rating")}
              />
              <div className="mt-4">
                <div className="font-medium mb-2">Nhận xét:</div>
                <div className="text-gray-600 italic">
                  "{safeAccess(appointmentData, "feedback.comment")}"
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Action buttons */}
        <Divider />
        <div className="flex justify-end">
          {renderActionButtons(appointmentStatus, appointmentId)}
        </div>
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
