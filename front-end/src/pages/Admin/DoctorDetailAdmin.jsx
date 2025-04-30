import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Descriptions,
  Avatar,
  Tabs,
  Table,
  Tag,
  Button,
  Empty,
  Space,
  Statistic,
  Modal,
  Form,
  Input,
  Select,
  message,
} from "antd";
import {
  UserOutlined,
  MedicineBoxOutlined,
  CalendarOutlined,
  HistoryOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import locale from "antd/es/date-picker/locale/vi_VN";

dayjs.locale("vi");

const { TabPane } = Tabs;
const { TextArea } = Input;

const DoctorDetailAdmin = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { url1 } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [daysOff, setDaysOff] = useState([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    completed_paid: 0,
    cancelled: 0,
  });
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [specializations, setSpecializations] = useState([]);
  const [dayOffs, setDayOffs] = useState([]);
  const [isAffectedModalVisible, setIsAffectedModalVisible] = useState(false);
  const [selectedAffectedAppointments, setSelectedAffectedAppointments] =
    useState([]);

  useEffect(() => {
    fetchDoctorDetails();
    fetchDoctorAppointments();
    fetchDoctorStats();
    fetchDoctorDaysOff();
    fetchSpecializations();
  }, [doctorId]);

  const fetchSpecializations = async () => {
    try {
      const response = await axios.get(`${url1}/admin/specializations`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.data.success) {
        setSpecializations(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching specializations:", error);
    }
  };

  const fetchDoctorDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url1}/admin/doctors/${doctorId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.data.success) {
        setDoctor(response.data.data);
        form.setFieldsValue({
          full_name: response.data.data.full_name,
          specialization_id: response.data.data.specialization_id,
          experience: response.data.data.experience,
          certificates: response.data.data.certificates,
        });
      }
    } catch (error) {
      console.error("Error fetching doctor details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorAppointments = async () => {
    try {
      const response = await axios.get(
        `${url1}/admin/doctors/${doctorId}/appointments`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.data.success) {
        setAppointments(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  const fetchDoctorStats = async () => {
    try {
      const response = await axios.get(
        `${url1}/admin/doctors/${doctorId}/stats`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const fetchDoctorDaysOff = async () => {
    try {
      const response = await axios.get(
        `${url1}/admin/doctors/day-off/${doctorId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.data.success) {
        setDayOffs(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching doctor days off:", error);
    }
  };

  const appointmentColumns = [
    {
      title: "STT",
      key: "index",
      width: 70,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Thời gian",
      dataIndex: "appointment_datetime",
      key: "appointment_datetime",
      render: (date) => dayjs(date).format("HH:mm DD/MM/YYYY"),
    },
    {
      title: "Bệnh nhân",
      key: "patient",
      render: (_, record) => (
        <div>
          <div className="font-medium">
            {record.FamilyMember?.username || "Không có thông tin"}
          </div>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_, record) => {
        const statusMap = {
          completed: { color: "success", text: "Đã khám" },
          cancelled: { color: "error", text: "Đã hủy" },
          pending: { color: "processing", text: "Chờ khám" },
          accepted: { color: "warning", text: "Đã xác nhận" },
        };
        const status = statusMap[record.status] || statusMap.pending;
        return (
          <div>
            <Tag color={status.color}>{status.text}</Tag>
            {record.cancelled_by && (
              <div className="text-gray-500 text-sm mt-1">
                Hủy bởi: {record.cancelled_by}
                {record.cancel_reason && (
                  <div>Lý do: {record.cancel_reason}</div>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Thanh toán",
      key: "payment",
      render: (_, record) => {
        const payment = record.Payments?.[0];
        if (payment) {
          return (
            <Tag color="success">
              {payment.payment_method === "cash"
                ? "Tiền mặt"
                : payment.payment_method}{" "}
              - {payment.amount.toLocaleString()}đ
            </Tag>
          );
        }
        return <Tag color="default">Chưa thanh toán</Tag>;
      },
    },
  ];

  const handleEdit = async (values) => {
    try {
      const response = await axios.put(
        `${url1}/admin/doctors/${doctorId}`,
        values,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.data.success) {
        message.success("Cập nhật thông tin bác sĩ thành công");
        setIsEditModalVisible(false);
        fetchDoctorDetails();
      }
    } catch (error) {
      console.error("Error updating doctor:", error);
      message.error("Cập nhật thông tin bác sĩ thất bại");
    }
  };

  if (!doctor) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/admin/management/doctors")}
        >
          Quay lại
        </Button>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => setIsEditModalVisible(true)}
          className="!bg-blue-900 !text-white hover:!bg-blue-800"
        >
          Chỉnh sửa
        </Button>
      </div>

      <Card>
        <div className="flex items-start space-x-6 mb-6">
          <Avatar
            src={doctor.user?.avatar}
            size={120}
            icon={<UserOutlined />}
            style={{
              backgroundColor: "#f5f5f5",
            }}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-blue-900 mb-2">
                  {doctor.user.username}
                </h1>
                <p className="text-lg text-gray-600">
                  <MedicineBoxOutlined className="mr-2" />
                  {doctor.Specialization?.name}
                </p>
              </div>
              <Space size="large">
                {/* <Statistic
                  title="Tổng lượt khám"
                  value={statistics.total}
                  prefix={<TeamOutlined />}
                /> */}
                <Statistic
                  title="Đã hoàn thành"
                  value={statistics.completed_paid}
                  valueStyle={{ color: "#3f8600" }}
                  prefix={<CheckCircleOutlined />}
                />
                <Statistic
                  title="Đã hủy"
                  value={statistics.cancelled}
                  valueStyle={{ color: "#cf1322" }}
                  prefix={<CloseCircleOutlined />}
                />
              </Space>
            </div>
          </div>
        </div>

        <Tabs defaultActiveKey="1">
          <TabPane
            tab={
              <span>
                <UserOutlined />
                Thông tin cá nhân
              </span>
            }
            key="1"
          >
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Email" span={2}>
                {doctor.user?.email}
              </Descriptions.Item>
              <Descriptions.Item label="Kinh nghiệm" span={2}>
                {doctor.experience_years || "Chưa cập nhật"}
              </Descriptions.Item>
              <Descriptions.Item label="Bằng cấp/Chứng chỉ" span={2}>
                {doctor.degree || "Chưa cập nhật"}
              </Descriptions.Item>
            </Descriptions>
          </TabPane>

          <TabPane
            tab={
              <span>
                <HistoryOutlined />
                Lịch sử khám bệnh
              </span>
            }
            key="2"
          >
            <Table
              columns={appointmentColumns}
              dataSource={appointments}
              rowKey="appointment_id"
              pagination={{
                pageSize: 10,
                showTotal: (total) => `Tổng ${total} lượt khám`,
              }}
              locale={{
                emptyText: <Empty description="Không có lịch sử khám bệnh" />,
              }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <CalendarOutlined />
                Lịch nghỉ
              </span>
            }
            key="3"
          >
            <div className="bg-white p-4 rounded-lg">
              {dayOffs.length > 0 ? (
                <Table
                  dataSource={dayOffs}
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showTotal: (total) => `Tổng ${total} ngày nghỉ`,
                  }}
                  columns={[
                    {
                      title: "Ngày",
                      dataIndex: "date",
                      key: "date",
                      render: (date) => dayjs(date).format("DD/MM/YYYY"),
                    },
                    {
                      title: "Thời gian nghỉ",
                      key: "timeOff",
                      render: (_, record) => {
                        let text = "";
                        if (record.morning && record.afternoon) {
                          text = "Cả ngày";
                        } else if (record.morning) {
                          text = "Buổi sáng";
                        } else if (record.afternoon) {
                          text = "Buổi chiều";
                        }
                        return (
                          <Tag
                            color={
                              record.morning && record.afternoon
                                ? "error"
                                : "warning"
                            }
                          >
                            {text}
                          </Tag>
                        );
                      },
                    },
                    {
                      title: "Lý do",
                      dataIndex: "reason",
                      key: "reason",
                    },
                    {
                      title: "Cuộc hẹn bị ảnh hưởng",
                      key: "affected",
                      render: (_, record) => (
                        <div>
                          {record.affected_appointments?.length > 0 ? (
                            <Space>
                              <Tag color="blue">
                                Số lượng: {record.affected_appointments.length}
                              </Tag>
                              <Button
                                type="primary"
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => {
                                  setSelectedAffectedAppointments(
                                    record.affected_appointments
                                  );
                                  setIsAffectedModalVisible(true);
                                }}
                                className="!bg-blue-600"
                              >
                                Xem chi tiết
                              </Button>
                            </Space>
                          ) : (
                            <span className="text-gray-500">Không có</span>
                          )}
                        </div>
                      ),
                    },
                  ]}
                />
              ) : (
                <Empty description="Không có ngày nghỉ nào" />
              )}
            </div>
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="Chỉnh sửa thông tin bác sĩ"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEdit}
          initialValues={{
            full_name: doctor.full_name,
            specialization_id: doctor.specialization_id,
            experience: doctor.experience,
            certificates: doctor.certificates,
          }}
        >
          <Form.Item
            name="full_name"
            label="Họ và tên"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="specialization_id"
            label="Chuyên khoa"
            rules={[{ required: true, message: "Vui lòng chọn chuyên khoa" }]}
          >
            <Select>
              {specializations.map((spec) => (
                <Select.Option
                  key={spec.specialization_id}
                  value={spec.specialization_id}
                >
                  {spec.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="experience" label="Kinh nghiệm">
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item name="certificates" label="Bằng cấp/Chứng chỉ">
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item className="text-right">
            <Space>
              <Button onClick={() => setIsEditModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" className="!bg-blue-900">
                Lưu thay đổi
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Danh sách cuộc hẹn bị ảnh hưởng"
        open={isAffectedModalVisible}
        onCancel={() => {
          setIsAffectedModalVisible(false);
          setSelectedAffectedAppointments([]);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsAffectedModalVisible(false);
              setSelectedAffectedAppointments([]);
            }}
          >
            Đóng
          </Button>,
        ]}
        width={800}
      >
        <Table
          dataSource={selectedAffectedAppointments}
          rowKey="id"
          pagination={false}
          columns={[
            {
              title: "STT",
              key: "index",
              width: 60,
              render: (_, __, index) => index + 1,
            },
            {
              title: "Thời gian",
              key: "datetime",
              render: (_, record) =>
                dayjs(record.datetime).format("HH:mm DD/MM/YYYY"),
            },
            {
              title: "Bệnh nhân",
              dataIndex: "patient_name",
              key: "patient_name",
            },
            {
              title: "Số điện thoại",
              dataIndex: "patient_phone",
              key: "patient_phone",
            },
            {
              title: "Email",
              dataIndex: "patient_email",
              key: "patient_email",
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default DoctorDetailAdmin;
