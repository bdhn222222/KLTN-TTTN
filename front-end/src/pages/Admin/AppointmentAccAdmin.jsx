import React, { useState, useEffect, useContext, useRef } from "react";
import {
  Card,
  Table,
  Button,
  Avatar,
  Space,
  Tag,
  notification,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
} from "antd";
import {
  EyeOutlined,
  UserOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

// Set timezone to Asia/Ho_Chi_Minh
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

const AppointmentAccAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [form] = Form.useForm();
  const [cancelForm] = Form.useForm();
  const [errorMessage, setErrorMessage] = useState("");
  const prevIsEditing = useRef(false);

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
          appointmentStatus: "accepted",
        },
      });

      if (response.data && response.data.data) {
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

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "Chưa có thông tin";
    return dayjs(dateStr, "DD-MM-YYYY HH:mm:ss").isValid()
      ? dayjs(dateStr, "DD-MM-YYYY HH:mm:ss").format("DD/MM/YYYY HH:mm")
      : "Ngày giờ không hợp lệ";
  };

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

      const appointmentData = response.data.data;
      if (appointmentData) {
        setSelectedAppointment(appointmentData);

        // 🔵 Fetch doctors cùng khoa trước khi fill form
        const specializationId = appointmentData.specialization_id;
        if (specializationId) {
          const token = localStorage.getItem("token");
          const doctorResponse = await axios.get(
            `${url1}/admin/doctors/specialization/${specializationId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (doctorResponse.data.success) {
            setDoctors(doctorResponse.data.data);
          }
        }

        // 🔵 Sau khi có danh sách doctors mới set Form
        const dateTime = dayjs(
          appointmentData.appointment_datetime,
          "DD-MM-YYYY HH:mm:ss"
        );

        form.setFieldsValue({
          doctor_id: appointmentData.doctor?.doctor_id,
          appointment_date: dateTime,
          appointment_time: dateTime,
        });
      }
      setIsModalVisible(true);
    } catch (error) {
      showNotification(
        "error",
        "Lỗi",
        "Không thể tải thông tin chi tiết cuộc hẹn"
      );
    }
  };

  const handleFetchDoctorsBySpecialization = async () => {
    try {
      const specializationId = selectedAppointment?.specialization_id;

      if (!specializationId) {
        console.error("Không có specialization_id để fetch doctors");
        return;
      }

      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${url1}/admin/doctors/specialization/${specializationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        console.log("Doctors fetched:", response.data.data);
        setDoctors(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch doctors by specialization:", error);
    }
  };

  const handleCancel = async () => {
    try {
      const values = await cancelForm.validateFields();
      await axios.patch(
        `${url1}/admin/appointments/${selectedAppointment.appointment_id}/cancel`,
        { reason: values.reason },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      showNotification(
        "success",
        "Huỷ lịch thành công",
        "Cuộc hẹn đã được huỷ thành công"
      );
      setIsCancelModalVisible(false);
      setIsModalVisible(false);
      fetchAppointments();
    } catch (error) {
      showNotification(
        "error",
        "Huỷ lịch thất bại",
        "Không thể huỷ cuộc hẹn, vui lòng thử lại sau"
      );
    }
  };

  const handleUpdate = async () => {
    try {
      setErrorMessage("");
      const values = await form.validateFields();

      // Lấy doctor_id từ form
      const selectedDoctorId = values.doctor_id;

      // Kiểm tra thời gian có hợp lệ không
      const appointmentDate = values.appointment_date;
      const appointmentTime = values.appointment_time;
      const selectedDateTime = dayjs(
        `${appointmentDate.format("YYYY-MM-DD")} ${appointmentTime.format(
          "HH:mm"
        )}`
      );
      const now = dayjs();

      // Kiểm tra thời gian trước khi gửi request
      if (selectedDateTime.isBefore(now)) {
        setErrorMessage("Không thể đặt lịch trong quá khứ");
        return;
      }

      // Định dạng ngày giờ theo đúng format mà server mong đợi
      // Chuyển sang UTC để đảm bảo không bị lỗi múi giờ
      const formattedDateTime = selectedDateTime.format("YYYY-MM-DD HH:mm:00");

      console.log("Cập nhật cuộc hẹn với thông tin:", {
        doctor_id: selectedDoctorId,
        appointment_datetime: formattedDateTime,
      });

      const response = await axios.patch(
        `${url1}/admin/appointments/${selectedAppointment.appointment_id}/update`,
        {
          doctor_id: selectedDoctorId,
          appointment_datetime: formattedDateTime,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        showNotification(
          "success",
          "Cập nhật thành công",
          "Thông tin cuộc hẹn đã được cập nhật"
        );

        await getAppointmentDetails(selectedAppointment.appointment_id);
        setIsEditing(false);
        fetchAppointments();
      } else if (response.data.error) {
        setErrorMessage(response.data.error);
      }
    } catch (error) {
      console.error("Update error:", error);
      // Xử lý lỗi từ server
      if (error.response?.data?.error) {
        setErrorMessage(error.response.data.error);
      } else if (error.response?.status === 401) {
        setErrorMessage("Bạn không có quyền thực hiện thao tác này");
      } else if (error.response?.status === 404) {
        setErrorMessage("Không tìm thấy cuộc hẹn");
      } else if (error.response?.status === 400) {
        setErrorMessage(error.response.data.message || "Dữ liệu không hợp lệ");
      } else {
        setErrorMessage("Có lỗi xảy ra, vui lòng thử lại sau");
      }
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await axios.get(`${url1}/admin/doctors`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.data && response.data.data) {
        setDoctors(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (!prevIsEditing.current && isEditing && selectedAppointment) {
      const datetime = selectedAppointment.appointment_datetime;
      const localDateTime = dayjs(datetime).tz("Asia/Ho_Chi_Minh");

      if (localDateTime.isValid()) {
        form.setFieldsValue({
          doctor_id: selectedAppointment.doctor?.user?.username,
          appointment_date: localDateTime,
          appointment_time: localDateTime,
        });
      }
    }
    prevIsEditing.current = isEditing;
  }, [isEditing, selectedAppointment, form]);
  useEffect(() => {
    if (form && selectedAppointment?.doctor?.doctor_id) {
      form.setFieldsValue({
        doctor_id: selectedAppointment.doctor.doctor_id,
      });
    }
  }, [selectedAppointment]);
  const formatLocalDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "Chưa có thông tin";
    const formattedDate = dayjs(dateTimeStr).tz("Asia/Ho_Chi_Minh");
    return formattedDate.isValid()
      ? formattedDate.format("DD/MM/YYYY HH:mm")
      : "Ngày giờ không hợp lệ";
  };

  const getDoctorDisplayName = (doctor) => {
    if (!doctor || !doctor.user) return "Chưa có thông tin";
    return `${doctor.user.username || ""} ${
      doctor.user.email ? `(${doctor.user.email})` : ""
    }`.trim();
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
      render: (record) => record.Doctor?.user?.username,
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
  console.log(selectedAppointment), [selectedAppointment];
  return (
    <>
      {contextHolder}
      <Card title="Danh sách cuộc hẹn đã xác nhận">
        <Table
          columns={columns}
          dataSource={appointments}
          loading={loading}
          rowKey="appointment_id"
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
        onCancel={() => {
          setIsModalVisible(false);
          setIsEditing(false);
          setErrorMessage("");
        }}
        footer={[
          <Button
            key="cancel"
            danger
            onClick={() => setIsCancelModalVisible(true)}
          >
            Huỷ lịch
          </Button>,
          <Button
            key="edit"
            type="primary"
            onClick={() => {
              setIsEditing(!isEditing);
              setErrorMessage("");
            }}
          >
            {isEditing ? "Hủy chỉnh sửa" : "Cập nhật"}
          </Button>,
          isEditing && (
            <Button key="save" type="primary" onClick={handleUpdate}>
              Lưu
            </Button>
          ),
        ]}
        width={800}
      >
        {selectedAppointment && (
          <Form form={form} layout="vertical">
            {errorMessage && (
              <div className="mb-4">
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  <CloseCircleOutlined className="text-red-500" />
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-8">
              {/* Cột trái */}
              <div className="space-y-4">
                {/* Thông tin bệnh nhân */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-3 text-blue-900">
                    Thông tin bệnh nhân
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Họ tên:</span>{" "}
                      {selectedAppointment.family_member?.username}
                    </p>
                    <p>
                      <span className="font-medium">Số điện thoại:</span>{" "}
                      {selectedAppointment.family_member?.phone_number}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {selectedAppointment.family_member?.email}
                    </p>
                    <p>
                      <span className="font-medium">Giới tính:</span>{" "}
                      {selectedAppointment.family_member?.gender === "female"
                        ? "Nữ"
                        : "Nam"}
                    </p>
                    <p>
                      <span className="font-medium">Ngày sinh:</span>{" "}
                      {dayjs(
                        selectedAppointment.family_member?.date_of_birth
                      ).format("DD/MM/YYYY")}
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
                      {selectedAppointment.doctor?.specialization}
                    </p>
                    <p>
                      <span className="font-medium">Phí khám:</span>{" "}
                      {selectedAppointment.fees?.toLocaleString("vi-VN")} VNĐ
                    </p>
                  </div>
                </div>
              </div>

              {/* Cột phải - Thông tin khám bệnh */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-3 text-blue-900">
                    Thông tin khám bệnh
                  </h3>
                  <div className="space-y-2">
                    {isEditing ? (
                      <>
                        <Form.Item
                          name="doctor_id"
                          label="Bác sĩ"
                          rules={[
                            { required: true, message: "Vui lòng chọn bác sĩ" },
                          ]}
                          initialValue={selectedAppointment.doctor?.doctor_id}
                        >
                          <Select
                            placeholder="Chọn bác sĩ"
                            onFocus={handleFetchDoctorsBySpecialization}
                            showSearch
                            optionFilterProp="children"
                            style={{ width: "100%" }}
                          >
                            {doctors.map((doctor) => {
                              console.log("Doctor in dropdown:", doctor);
                              return (
                                <Select.Option
                                  key={doctor.doctor_id}
                                  value={doctor.doctor_id}
                                >
                                  {doctor.username ||
                                    doctor.name ||
                                    doctor?.user?.username ||
                                    `Bác sĩ #${doctor?.usename}` ||
                                    "Chưa có tên"}
                                </Select.Option>
                              );
                            })}
                          </Select>
                        </Form.Item>

                        <Form.Item
                          name="appointment_date"
                          label="Ngày khám"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng chọn ngày khám",
                            },
                          ]}
                        >
                          <DatePicker
                            format="DD/MM/YYYY"
                            className="w-full"
                            placeholder="Chọn ngày khám"
                            disabledDate={(current) => {
                              return (
                                current && current < dayjs().startOf("day")
                              );
                            }}
                          />
                        </Form.Item>

                        <Form.Item
                          name="appointment_time"
                          label="Giờ khám"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng chọn giờ khám",
                            },
                          ]}
                        >
                          <TimePicker
                            format="HH:mm"
                            className="w-full"
                            placeholder="Chọn giờ khám"
                            minuteStep={30}
                            showNow={false}
                            hideDisabledOptions
                            disabledTime={() => ({
                              disabledHours: () => [
                                ...Array.from({ length: 8 }, (_, i) => i),
                                ...Array.from({ length: 7 }, (_, i) => i + 17),
                              ],
                              disabledMinutes: () =>
                                Array.from({ length: 60 }, (_, i) => i).filter(
                                  (m) => m % 30 !== 0
                                ),
                            })}
                          />
                        </Form.Item>
                      </>
                    ) : (
                      <>
                        <p>
                          <span className="font-medium">Bác sĩ:</span>{" "}
                          {selectedAppointment.doctor?.username ||
                            "Chưa có tên"}
                        </p>
                        <p>
                          <span className="font-medium">Ngày và giờ khám:</span>{" "}
                          {formatDateTime(
                            selectedAppointment.appointment_datetime
                          )}
                        </p>
                        <p>
                          <span className="font-medium">Trạng thái:</span>{" "}
                          <Tag color="green">Đã xác nhận</Tag>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Form>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        title="Xác nhận huỷ lịch hẹn"
        open={isCancelModalVisible}
        onCancel={() => setIsCancelModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsCancelModalVisible(false)}>
            Quay lại
          </Button>,
          <Button key="submit" type="primary" danger onClick={handleCancel}>
            Xác nhận huỷ
          </Button>,
        ]}
      >
        <Form form={cancelForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do huỷ"
            rules={[
              { required: true, message: "Vui lòng nhập lý do huỷ" },
              { min: 3, message: "Lý do huỷ phải có ít nhất 3 ký tự" },
            ]}
          >
            <Input.TextArea rows={4} placeholder="Nhập lý do huỷ lịch hẹn..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AppointmentAccAdmin;
