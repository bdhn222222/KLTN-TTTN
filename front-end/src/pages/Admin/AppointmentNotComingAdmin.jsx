import React, { useState, useEffect, useContext } from "react";
import { Card, Table, Button, Tag, notification, Modal, Empty } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

// Cấu hình dayjs để xử lý UTC
dayjs.extend(utc);

const AppointmentNotComingAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Hàm hiển thị ngày giờ an toàn
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "Chưa có thông tin";
    return dayjs(dateStr, "DD-MM-YYYY HH:mm:ss").isValid()
      ? dayjs(dateStr, "DD-MM-YYYY HH:mm:ss").format("DD/MM/YYYY HH:mm")
      : "Ngày giờ không hợp lệ";
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
          appointmentStatus: "patient_not_coming",
        },
      });

      if (response.data && response.data.data) {
        console.log("Appointments data:", response.data.data);
        setAppointments(response.data.data);
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
      render: (record) => record.FamilyMember?.username || "N/A",
    },
    {
      title: "Số điện thoại",
      key: "phone_number",
      render: (record) => record.FamilyMember?.phone_number || "N/A",
    },
    {
      title: "Thời gian khám",
      key: "appointment_datetime",
      render: (record) =>
        dayjs(record.appointment_datetime).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Bác sĩ",
      key: "doctor_name",
      render: (record) => record.Doctor?.user?.username || "N/A",
    },
    {
      title: "Khoa",
      key: "specialization",
      render: (record) => record.Doctor?.Specialization?.name || "N/A",
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

  return (
    <>
      {contextHolder}
      <Card title="Danh sách cuộc hẹn không đến">
        <Table
          columns={columns}
          dataSource={appointments}
          loading={loading}
          rowKey="appointment_id"
          locale={{
            emptyText: <Empty description="Không có cuộc hẹn nào không đến" />,
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
          <span>
            Chi tiết cuộc hẹn{" "}
            <span className="font-bold text-blue-900">
              #{selectedAppointment?.appointment_id}
            </span>
          </span>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Đóng
          </Button>,
        ]}
        width={800}
      >
        {selectedAppointment && (
          <div>
            <div className="grid grid-cols-2 gap-8">
              {/* Cột trái */}
              <div>
                {/* Thông tin bệnh nhân */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h3 className="font-medium text-lg mb-3 text-blue-900">
                    Thông tin bệnh nhân
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Họ tên:</span>{" "}
                      {selectedAppointment.family_member?.username ||
                        "Chưa có thông tin"}
                    </p>
                    <p>
                      <span className="font-medium">Số điện thoại:</span>{" "}
                      {selectedAppointment.family_member?.phone_number ||
                        "Chưa có thông tin"}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {selectedAppointment.family_member?.email ||
                        "Chưa có thông tin"}
                    </p>
                    <p>
                      <span className="font-medium">Giới tính:</span>{" "}
                      {selectedAppointment.family_member?.gender === "female"
                        ? "Nữ"
                        : "Nam"}
                    </p>
                    <p>
                      <span className="font-medium">Ngày sinh:</span>{" "}
                      {selectedAppointment.family_member?.date_of_birth
                        ? dayjs(
                            selectedAppointment.family_member.date_of_birth
                          ).format("DD/MM/YYYY")
                        : "Chưa có thông tin"}
                    </p>
                  </div>
                </div>

                {/* Thông tin khoa */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-3 text-blue-900">
                    Thông tin khoa
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Khoa:</span>{" "}
                      {selectedAppointment.doctor?.specialization ||
                        "Chưa có thông tin"}
                    </p>
                    <p>
                      <span className="font-medium">Phí khám:</span>{" "}
                      {selectedAppointment.fees?.toLocaleString("vi-VN") +
                        " VNĐ"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cột phải */}
              <div>
                {/* Thông tin khám bệnh */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h3 className="font-medium text-lg mb-3 text-blue-900">
                    Thông tin khám bệnh
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Bác sĩ:</span>{" "}
                      {selectedAppointment.doctor?.username ||
                        "Chưa có thông tin"}
                    </p>
                    <p>
                      <span className="font-medium">Ngày và giờ khám:</span>{" "}
                      {formatDateTime(selectedAppointment.appointment_datetime)}
                    </p>
                    <p>
                      <span className="font-medium">Trạng thái:</span>{" "}
                      <Tag color="orange">Không đến khám</Tag>
                    </p>
                  </div>
                </div>

                {/* Ghi chú */}
                {/* <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                  <h3 className="font-medium text-lg mb-3 text-yellow-600">
                    Ghi chú
                  </h3>
                  <p>{selectedAppointment.notes || "Không có ghi chú"}</p>
                </div> */}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default AppointmentNotComingAdmin;
