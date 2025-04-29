import React, { useState, useEffect, useContext } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  notification,
  Modal,
  Space,
  Empty,
  Divider,
  Descriptions,
  Popconfirm,
  message,
} from "antd";
import {
  EyeOutlined,
  CheckCircleOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

// Cấu hình dayjs để xử lý UTC
dayjs.extend(utc);

const PaymentUnpaidAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "Chưa có thông tin";
    return dayjs(dateStr, "DD-MM-YYYY HH:mm:ss").isValid()
      ? dayjs(dateStr, "DD-MM-YYYY HH:mm:ss").format("DD/MM/YYYY HH:mm")
      : "Ngày giờ không hợp lệ";
  };

  // Hiển thị trạng thái thanh toán
  const getPaymentStatusTag = (status) => {
    if (!status || status === "pending") {
      return <Tag color="red">Chưa thanh toán</Tag>;
    } else if (status === "paid") {
      return <Tag color="green">Đã thanh toán</Tag>;
    } else {
      return <Tag color="gray">{status}</Tag>;
    }
  };

  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: "topRight",
      duration: 3,
    });
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url1}/admin/appointments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        params: {
          appointmentStatus: "completed",
          paymentStatus: "pending",
        },
      });

      if (response.data && response.data.data) {
        console.log("All appointments data:", response.data.data);

        // Lọc chỉ những cuộc hẹn có Payments không rỗng
        const withPendingPayment = response.data.data.filter((appt) => {
          // Kiểm tra nếu có mảng Payments và có ít nhất 1 payment
          if (Array.isArray(appt.Payments) && appt.Payments.length > 0) {
            return true;
          }

          // Hoặc kiểm tra nếu có object payment
          if (appt.payment && appt.payment.payment_id) {
            return true;
          }

          return false;
        });

        console.log("Filtered appointments with payments:", withPendingPayment);
        setAppointments(withPendingPayment);
      } else {
        console.error("Invalid data format from API:", response.data);
        setAppointments([]);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setAppointments([]);
      showNotification(
        "error",
        "Tải dữ liệu thất bại",
        "Không thể tải danh sách cuộc hẹn, vui lòng thử lại sau"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const getAppointmentDetails = async (appointmentId) => {
    try {
      const response = await axios.get(
        `${url1}/admin/appointments/${appointmentId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      console.log("Appointment details:", response.data.data);
      // Kiểm tra cấu trúc dữ liệu payment
      console.log("Payment data:", {
        payment: response.data.data.payment,
        Payments: response.data.data.Payments,
        paymentStatus: getPaymentStatus(response.data.data),
      });
      setSelectedAppointment(response.data.data);
      setIsModalVisible(true);
    } catch (error) {
      showNotification(
        "error",
        "Lỗi",
        "Không thể tải thông tin chi tiết cuộc hẹn"
      );
    }
  };

  // Kiểm tra trạng thái thanh toán
  const getPaymentStatus = (appointment) => {
    // Kiểm tra trong payment object
    if (appointment?.payment?.status) {
      return appointment.payment.status;
    }

    // Kiểm tra trong Payments array (lấy payment mới nhất)
    if (
      Array.isArray(appointment?.Payments) &&
      appointment.Payments.length > 0
    ) {
      // Sắp xếp theo thời gian tạo mới nhất
      const sortedPayments = [...appointment.Payments].sort((a, b) => {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });

      return sortedPayments[0].status || "pending";
    }

    // Mặc định là pending nếu không có
    return "pending";
  };

  // Lấy payment ID cho thanh toán
  const getPaymentId = (appointment) => {
    // Kiểm tra trong payment object
    if (appointment?.payment?.payment_id) {
      return appointment.payment.payment_id;
    }

    // Kiểm tra trong Payments array (lấy payment mới nhất)
    if (
      Array.isArray(appointment?.Payments) &&
      appointment.Payments.length > 0
    ) {
      // Sắp xếp theo thời gian tạo mới nhất
      const sortedPayments = [...appointment.Payments].sort((a, b) => {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });

      return sortedPayments[0].payment_id;
    }

    return null;
  };

  // Hàm xác định URL thanh toán dựa trên dữ liệu có sẵn
  const getPaymentEndpoint = (appointment) => {
    const paymentId = getPaymentId(appointment);

    // Nếu có payment_id, sử dụng nó
    if (paymentId) {
      return `${url1}/admin/payments/${paymentId}/status`;
    }

    // Nếu không có payment_id, tạo payment mới với appointment_id
    return `${url1}/admin/appointments/${appointment.appointment_id}/payments`;
  };

  const confirmPayment = async () => {
    if (!selectedAppointment) return;

    try {
      setConfirmLoading(true);

      const paymentId = getPaymentId(selectedAppointment);
      console.log("Payment ID to update:", paymentId);

      if (!paymentId) {
        showNotification(
          "error",
          "Không thể xác nhận thanh toán",
          "Không tìm thấy thông tin thanh toán cho cuộc hẹn này"
        );
        return;
      }

      // Gọi API cập nhật trạng thái thanh toán
      const response = await axios.patch(
        `${url1}/admin/payments/${paymentId}/status`,
        {
          status: "paid",
          payment_method: "cash",
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("Payment update response:", response.data);

      if (response.data && response.data.success) {
        showNotification(
          "success",
          "Thanh toán thành công",
          "Đã xác nhận thanh toán cuộc hẹn"
        );

        // Cập nhật lại danh sách
        fetchAppointments();
        setIsModalVisible(false);
      } else {
        throw new Error(
          response.data?.message || "Cập nhật trạng thái thất bại"
        );
      }
    } catch (error) {
      console.error("Error confirming payment:", error);

      // Hiển thị thông báo lỗi chi tiết
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Không thể xác nhận thanh toán, vui lòng thử lại sau";

      showNotification("error", "Xác nhận thanh toán thất bại", errorMessage);
    } finally {
      setConfirmLoading(false);
    }
  };

  const columns = [
    {
      title: "STT",
      key: "index",
      width: 70,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Tên bệnh nhân",
      key: "patient_name",
      render: (record) =>
        record.family_member?.username ||
        record.FamilyMember?.username ||
        "N/A",
    },
    {
      title: "Số điện thoại",
      key: "phone_number",
      render: (record) =>
        record.family_member?.phone_number ||
        record.FamilyMember?.phone_number ||
        "N/A",
    },
    {
      title: "Thời gian khám",
      key: "appointment_datetime",
      render: (record) =>
        record.appointment_datetime &&
        dayjs(record.appointment_datetime).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Bác sĩ",
      key: "doctor_name",
      render: (record) =>
        record.doctor?.username || record.Doctor?.user?.username || "N/A",
    },
    {
      title: "Khoa",
      key: "specialization",
      render: (record) =>
        record.doctor?.specialization ||
        record.Doctor?.Specialization?.name ||
        "N/A",
    },
    {
      title: "Phí khám",
      key: "fees",
      render: (record) => record.fees?.toLocaleString("vi-VN") + " VNĐ",
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => getAppointmentDetails(record.appointment_id)}
          className="!bg-blue-900 !text-white px-6 py-2 rounded-full font-light hover:!bg-blue-800 hover:!text-white border border-blue-800 transition duration-300"
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  const renderMedicines = () => {
    if (!selectedAppointment?.prescription?.medicines?.length) {
      return <Empty description="Không có thuốc" />;
    }

    return (
      <div className="bg-white p-4 rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên thuốc
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số lượng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Liều lượng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hướng dẫn
                </th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đơn giá
                </th> */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {selectedAppointment.prescription.medicines.map(
                (medicine, index) => (
                  <tr
                    key={medicine.prescription_medicine_id || index}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {medicine.medicine?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {medicine.quantity || 0} {medicine.medicine?.unit || ""}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {medicine.dosage || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {medicine.instructions || "N/A"}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {medicine.unit_price?.toLocaleString("vi-VN") + " VNĐ" ||
                        "N/A"}
                    </td> */}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Xác định liệu có hiển thị nút xác nhận thanh toán hay không dựa trên status
  const shouldShowPaymentButton = (appointment) => {
    const paymentStatus = getPaymentStatus(appointment);
    return paymentStatus === "pending" || !paymentStatus;
  };

  return (
    <>
      {contextHolder}
      <Card title="Danh sách cuộc hẹn chưa thanh toán">
        <Table
          columns={columns}
          dataSource={appointments}
          loading={loading}
          rowKey="appointment_id"
          locale={{
            emptyText: (
              <Empty description="Không có cuộc hẹn nào chưa thanh toán" />
            ),
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} cuộc hẹn`,
          }}
        />
      </Card>

      <Modal
        title={
          <div className="flex items-center">
            <span className="text-xl font-semibold text-blue-900">
              Chi tiết cuộc hẹn #{selectedAppointment?.appointment_id}
            </span>
            {/* {selectedAppointment?.status && (
              <Tag color="blue" className="ml-2">
                {selectedAppointment.status === "completed"
                  ? "Đã hoàn thành"
                  : selectedAppointment.status}
              </Tag>
            )} */}
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Đóng
          </Button>,
          selectedAppointment &&
            shouldShowPaymentButton(selectedAppointment) && (
              <Popconfirm
                key="confirm"
                title="Xác nhận thanh toán"
                description="Bạn đã nhận tiền mặt cho cuộc hẹn này chưa?"
                okText="Đã nhận tiền"
                cancelText="Chưa"
                onConfirm={confirmPayment}
                okButtonProps={{ loading: confirmLoading }}
              >
                <Button
                  type="primary"
                  loading={confirmLoading}
                  icon={<CheckCircleOutlined />}
                  className="!bg-green-600 !text-white hover:!bg-green-700"
                >
                  Xác nhận thanh toán
                </Button>
              </Popconfirm>
            ),
        ]}
      >
        {selectedAppointment && (
          <div className="mt-4">
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-medium text-lg mb-3 text-blue-900 flex items-center">
                    <FileTextOutlined className="mr-2" /> Thông tin bệnh nhân
                  </h3>
                  <Descriptions
                    column={1}
                    size="small"
                    bordered
                    className="bg-white rounded-lg"
                  >
                    <Descriptions.Item
                      label="Họ tên"
                      labelStyle={{ fontWeight: "bold" }}
                    >
                      {selectedAppointment.family_member?.username || "N/A"}
                    </Descriptions.Item>
                    <Descriptions.Item
                      label="Số điện thoại"
                      labelStyle={{ fontWeight: "bold" }}
                    >
                      {selectedAppointment.family_member?.phone_number || "N/A"}
                    </Descriptions.Item>
                    {/* <Descriptions.Item
                      label="Email"
                      labelStyle={{ fontWeight: "bold" }}
                    >
                      {selectedAppointment.family_member?.email || "N/A"}
                    </Descriptions.Item> */}
                    <Descriptions.Item
                      label="Ngày sinh"
                      labelStyle={{ fontWeight: "bold" }}
                    >
                      {selectedAppointment.family_member?.date_of_birth ||
                        "N/A"}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-3 text-blue-900 flex items-center">
                    <MedicineBoxOutlined className="mr-2" /> Thông tin khám bệnh
                  </h3>
                  <Descriptions
                    column={1}
                    size="small"
                    bordered
                    className="bg-white rounded-lg"
                  >
                    <Descriptions.Item
                      label="Bác sĩ"
                      labelStyle={{ fontWeight: "bold" }}
                    >
                      {selectedAppointment.doctor?.username || "N/A"}
                    </Descriptions.Item>
                    <Descriptions.Item
                      label="Khoa"
                      labelStyle={{ fontWeight: "bold" }}
                    >
                      {selectedAppointment.doctor?.specialization || "N/A"}
                    </Descriptions.Item>
                    <Descriptions.Item
                      label="Thời gian"
                      labelStyle={{ fontWeight: "bold" }}
                    >
                      {formatDateTime(selectedAppointment.appointment_datetime)}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-3 text-blue-900 flex items-center">
                    <DollarOutlined className="mr-2" /> Thông tin thanh toán
                  </h3>
                  <Descriptions
                    column={1}
                    size="small"
                    bordered
                    className="bg-white rounded-lg"
                  >
                    <Descriptions.Item
                      label="Phí khám"
                      labelStyle={{ fontWeight: "bold" }}
                    >
                      {selectedAppointment.fees?.toLocaleString("vi-VN") +
                        " VNĐ"}
                    </Descriptions.Item>

                    <Descriptions.Item
                      label="Tổng phí"
                      labelStyle={{ fontWeight: "bold", color: "red" }}
                    >
                      <span className="text-red-600 font-bold">
                        {(
                          (selectedAppointment.fees || 0) +
                          (selectedAppointment.prescription?.total || 0)
                        ).toLocaleString("vi-VN") + " VNĐ"}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item
                      label="Trạng thái"
                      labelStyle={{ fontWeight: "bold" }}
                    >
                      {getPaymentStatusTag(
                        getPaymentStatus(selectedAppointment)
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </div>
            </div>

            {selectedAppointment.medical_record && (
              <div className="mb-6">
                <Divider orientation="left">
                  <h3 className="font-medium text-lg text-blue-900 flex items-center">
                    <MedicineBoxOutlined className="mr-2" /> Hồ sơ bệnh án
                  </h3>
                </Divider>
                <div className="bg-white p-4 rounded-lg border border-blue-100">
                  <Descriptions
                    column={1}
                    bordered
                    labelStyle={{
                      fontWeight: "bold",
                      width: "30%",
                      verticalAlign: "top",
                    }}
                    contentStyle={{
                      width: "70%",
                    }}
                  >
                    <Descriptions.Item label="Chẩn đoán">
                      {selectedAppointment.medical_record.diagnosis ||
                        "Không có chẩn đoán"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Điều trị">
                      {selectedAppointment.medical_record.treatment ||
                        "Không có điều trị"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ghi chú">
                      {selectedAppointment.medical_record.notes ||
                        "Không có ghi chú"}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </div>
            )}

            {selectedAppointment.prescription && (
              <div>
                <Divider orientation="left">
                  <h3 className="font-medium text-lg text-blue-900 flex items-center">
                    <MedicineBoxOutlined className="mr-2" /> Đơn thuốc
                  </h3>
                </Divider>
                {renderMedicines()}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default PaymentUnpaidAdmin;
