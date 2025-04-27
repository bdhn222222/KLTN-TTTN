import React, { useState, useEffect, useContext } from "react";
import {
  Card,
  Table,
  Button,
  Avatar,
  Space,
  Tag,
  notification,
  Modal,
  Select,
  Form,
  DatePicker,
  TimePicker,
  Alert,
} from "antd";
import {
  CheckOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import dayjs from "dayjs";
import "dayjs/locale/vi";

dayjs.locale("vi");

const AppointmentWTCAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [specializations, setSpecializations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [form] = Form.useForm();

  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: "topRight",
      duration: 3,
    });
  };

  const fetchSpecializations = async () => {
    try {
      const response = await axios.get(`${url1}/admin/specializations`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.data && response.data.data) {
        setSpecializations(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching specializations:", error);
    }
  };

  const fetchDoctorsBySpecialization = async (specializationId) => {
    try {
      const response = await axios.get(`${url1}/admin/doctors`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.data && response.data.data) {
        // Lọc bác sĩ theo khoa được chọn
        const filteredDoctors = response.data.data.filter(
          (doctor) => doctor.specialization_id === specializationId
        );
        setDoctors(filteredDoctors);
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
    }
  };

  const handleSpecializationChange = (value) => {
    setSelectedSpecialization(value);
    form.setFieldValue("doctor_id", undefined);
    fetchDoctorsBySpecialization(value);
  };

  const disabledTime = () => ({
    disabledHours: () => [
      ...Array.from({ length: 8 }, (_, i) => i),
      ...Array.from({ length: 7 }, (_, i) => i + 17),
    ],
    disabledMinutes: () =>
      Array.from({ length: 60 }, (_, i) => i).filter((m) => m % 30 !== 0),
  });

  const showConfirmModal = (record) => {
    setSelectedAppointment(record);
    setSelectedSpecialization(record.Doctor.Specialization.specialization_id);
    form.setFieldsValue({
      doctor_id: record.Doctor.doctor_id,
      appointment_date: dayjs(record.appointment_datetime),
      appointment_time: dayjs(record.appointment_datetime),
    });
    fetchDoctorsBySpecialization(
      record.Doctor.Specialization.specialization_id
    );
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    handleCancelAppointment(selectedAppointment.appointment_id);

    setIsModalVisible(false);
    setSelectedAppointment(null);
    setErrorMessage("");
    form.resetFields();
  };

  const handleCancelAppointment = async (appointmentId) => {
    try {
      await axios.patch(
        `${url1}/admin/appointments/${appointmentId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      showNotification(
        "success",
        "Huỷ lịch hẹn thành công",
        "Cuộc hẹn đã được huỷ thành công"
      );
      setIsModalVisible(false);
      fetchAppointments();
    } catch (error) {
      let errorMessage = "";
      if (error.response?.status === 401) {
        errorMessage = "Bạn không có quyền thực hiện thao tác này";
      } else if (error.response?.status === 404) {
        errorMessage = "Không tìm thấy cuộc hẹn";
      } else if (error.response?.status === 400) {
        errorMessage =
          error.response.data.message || "Cuộc hẹn đã được huỷ trước đó";
      } else {
        errorMessage = "Có lỗi xảy ra, vui lòng thử lại sau";
      }
      setErrorMessage(errorMessage);
    }
  };

  const handleConfirm = async () => {
    try {
      setErrorMessage("");
      const values = await form.validateFields();
      const formattedDateTime = dayjs(
        `${values.appointment_date.format(
          "YYYY-MM-DD"
        )} ${values.appointment_time.format("HH:mm")}`
      ).format();

      await acceptAppointment(selectedAppointment.appointment_id, {
        ...values,
        appointment_datetime: formattedDateTime,
      });
    } catch (error) {
      if (error.errorFields) {
        setErrorMessage("Vui lòng điền đầy đủ thông tin bắt buộc");
      }
      console.error("Validation failed:", error);
    }
  };

  const acceptAppointment = async (appointmentId, values) => {
    try {
      await axios.patch(
        `${url1}/admin/appointments/${appointmentId}/accept`,
        values,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      showNotification(
        "success",
        "Xác nhận thành công",
        "Cuộc hẹn đã được xác nhận thành công"
      );

      setIsModalVisible(false);
      form.resetFields();
      fetchAppointments();
    } catch (error) {
      console.error("Error accepting appointment:", error);

      // let errorMessage = "";
      // if (error.response?.status === 401) {
      //   errorMessage = "Bạn không có quyền thực hiện thao tác này";
      // } else if (error.response?.status === 404) {
      //   errorMessage = "Không tìm thấy cuộc hẹn";
      // } else if (error.response?.status === 400) {
      //   errorMessage =
      //     error.response.data.message || "Cuộc hẹn đã được xác nhận trước đó";
      // } else {
      //   errorMessage = "Có lỗi xảy ra, vui lòng thử lại sau";
      // }

      setErrorMessage(error.response.data.message);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url1}/admin/appointments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        params: {
          appointmentStatus: "waiting_for_confirmation",
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
      if (error.response) {
        console.error("Error response:", error.response);
        console.error("Error status:", error.response.status);
        console.error("Error data:", error.response.data);
      }
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
    console.log("Component mounted");
    fetchAppointments();
    fetchSpecializations();
  }, []);

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
      title: "Thời gian đặt lịch",
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
          onClick={() => showConfirmModal(record)}
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
      <Card title="Danh sách cuộc hẹn chờ xác nhận">
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
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button
            key="cancel"
            danger
            onClick={() =>
              handleCancelAppointment(selectedAppointment?.appointment_id)
            }
          >
            Huỷ lịch
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleConfirm}
            className="!bg-blue-900"
          >
            Xác nhận
          </Button>,
        ]}
        width={800}
      >
        {errorMessage && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
              <CloseCircleOutlined className="text-red-500" />
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {selectedAppointment && (
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              doctor_id: selectedAppointment?.Doctor?.doctor_id,
              appointment_date: dayjs(selectedAppointment.appointment_datetime),
              appointment_time: dayjs(selectedAppointment.appointment_datetime),
            }}
          >
            <div className="grid grid-cols-2 gap-8">
              {/* Cột trái - Thông tin bệnh nhân */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-3 text-blue-900">
                    Thông tin bệnh nhân
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Họ tên:</span>{" "}
                      {selectedAppointment.FamilyMember?.username}
                    </p>
                    <p>
                      <span className="font-medium">Số điện thoại:</span>{" "}
                      {selectedAppointment.FamilyMember?.phone_number}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {selectedAppointment.FamilyMember?.email}
                    </p>
                    <p>
                      <span className="font-medium">Giới tính:</span>{" "}
                      {selectedAppointment.FamilyMember?.gender === "female"
                        ? "Nữ"
                        : "Nam"}
                    </p>
                    <p>
                      <span className="font-medium">Ngày sinh:</span>{" "}
                      {dayjs(
                        selectedAppointment.FamilyMember?.date_of_birth
                      ).format("DD/MM/YYYY")}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-3 text-blue-900">
                    Thông tin khoa
                  </h3>
                  <p>
                    <span className="font-medium">Khoa:</span>{" "}
                    {selectedAppointment.Doctor?.Specialization?.name}
                  </p>
                  <p className="mt-2">
                    <span className="font-medium">Phí khám:</span>{" "}
                    {selectedAppointment.fees?.toLocaleString("vi-VN")} VNĐ
                  </p>
                </div>
              </div>

              {/* Cột phải - Form chỉnh sửa */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-3 text-blue-900">
                    Thông tin lịch hẹn
                  </h3>

                  <Form.Item
                    name="doctor_id"
                    label="Bác sĩ"
                    rules={[
                      { required: true, message: "Vui lòng chọn bác sĩ" },
                    ]}
                  >
                    <Select placeholder="Chọn bác sĩ">
                      {doctors.map((doctor) => (
                        <Select.Option
                          key={doctor.doctor_id}
                          value={doctor.doctor_id}
                        >
                          {doctor.user.username}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="appointment_date"
                    label="Ngày khám"
                    rules={[
                      { required: true, message: "Vui lòng chọn ngày khám" },
                    ]}
                  >
                    <DatePicker
                      format="DD/MM/YYYY"
                      className="w-full"
                      disabledDate={(current) => {
                        return current && current < dayjs().startOf("day");
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="appointment_time"
                    label="Giờ khám"
                    rules={[
                      { required: true, message: "Vui lòng chọn giờ khám" },
                    ]}
                  >
                    <TimePicker
                      format="HH:mm"
                      className="w-full"
                      minuteStep={30}
                      showNow={false}
                      hideDisabledOptions
                      disabledTime={disabledTime}
                    />
                  </Form.Item>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-start space-x-2 text-sm text-blue-800">
                    <InfoCircleOutlined className="text-blue-500 mt-1" />
                    <span>Vui lòng xác nhận lịch hẹn sau khi đã liên hệ.</span>
                  </div>
                </div>
              </div>
            </div>
          </Form>
        )}
      </Modal>
    </>
  );
};

export default AppointmentWTCAdmin;
