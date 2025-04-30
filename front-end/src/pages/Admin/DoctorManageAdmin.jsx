import React, { useState, useEffect, useContext } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Descriptions,
  Empty,
  Space,
  Input,
  Tag,
  Calendar,
  Badge,
  Tabs,
  Timeline,
  Avatar,
  Tooltip,
  Select,
} from "antd";
import {
  EyeOutlined,
  CalendarOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  MedicineBoxOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import locale from "antd/es/date-picker/locale/vi_VN";
import { useNavigate } from "react-router-dom";

dayjs.locale("vi");

const { TabPane } = Tabs;

const DoctorManageAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState("");
  const { url1 } = useContext(AppContext);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [doctorSchedules, setDoctorSchedules] = useState([]);
  const navigate = useNavigate();

  const fetchDoctors = async (page = 1, limit = 10, search = "") => {
    try {
      setLoading(true);
      console.log("Fetching doctors with params:", { page, limit, search });

      const response = await axios.get(`${url1}/admin/doctors`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        params: {
          page,
          limit,
          search,
        },
      });

      console.log("Doctors API response:", response.data);

      if (response.data && response.data.data) {
        setDoctors(response.data.data);
        setPagination({
          current: page,
          pageSize: limit,
          total: response.data.total || 0,
        });
        console.log("Updated doctors state:", response.data.data);
        console.log("Updated pagination:", {
          current: page,
          pageSize: limit,
          total: response.data.total || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      console.log("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors(pagination.current, pagination.pageSize, searchText);
  }, []);

  const handleTableChange = (pagination) => {
    fetchDoctors(pagination.current, pagination.pageSize, searchText);
  };

  const handleSearch = (value) => {
    setSearchText(value);
    fetchDoctors(1, pagination.pageSize, value);
  };

  const fetchDoctorDetails = async (doctorId) => {
    try {
      setLoading(true);
      console.log("Fetching doctor details for ID:", doctorId);

      const response = await axios.get(`${url1}/admin/doctors/${doctorId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      console.log("Doctor details API response:", response.data);

      if (response.data.success) {
        setSelectedDoctor(response.data.data);
        setIsModalVisible(true);
        console.log("Updated selected doctor:", response.data.data);
      }
    } catch (error) {
      console.error("Error fetching doctor details:", error);
      console.log("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorSchedules = async (doctorId) => {
    try {
      setLoading(true);
      console.log("Fetching schedules for doctor ID:", doctorId);

      const response = await axios.get(
        `${url1}/admin/doctors/${doctorId}/schedules`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("Doctor schedules API response:", response.data);

      if (response.data.success) {
        setDoctorSchedules(response.data.data);
        console.log("Updated doctor schedules:", response.data.data);
      }
    } catch (error) {
      console.error("Error fetching doctor schedules:", error);
      console.log("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    } finally {
      setLoading(false);
    }
  };

  const getScheduleType = (schedule) => {
    if (schedule.is_day_off) {
      return {
        type: "error",
        text: "Nghỉ cả ngày",
      };
    }
    if (schedule.morning && schedule.afternoon) {
      return {
        type: "success",
        text: "Làm cả ngày",
      };
    }
    if (schedule.morning) {
      return {
        type: "warning",
        text: "Làm buổi sáng",
      };
    }
    if (schedule.afternoon) {
      return {
        type: "processing",
        text: "Làm buổi chiều",
      };
    }
    return {
      type: "default",
      text: "Chưa xác định",
    };
  };

  const cellRender = (current, info) => {
    if (info.type === "date") {
      const date = current.format("YYYY-MM-DD");
      console.log("Rendering calendar cell for date:", date);

      const scheduleForDate = doctorSchedules.find(
        (s) => dayjs(s.date).format("YYYY-MM-DD") === date
      );

      if (!scheduleForDate) return null;

      const { type, text } = getScheduleType(scheduleForDate);
      console.log("Schedule found for date:", {
        date,
        type,
        text,
        schedule: scheduleForDate,
      });

      return <Badge status={type} text={text} />;
    }
    return null;
  };

  const columns = [
    {
      title: "STT",
      key: "index",
      width: 70,
      render: (_, __, index) =>
        index + 1 + (pagination.current - 1) * pagination.pageSize,
    },
    {
      title: "Bác sĩ",
      key: "doctor",
      render: (_, record) => (
        <div className="gap-1">
          <div className="flex items-center space-x-2">
            <Avatar
              style={{
                width: "40px",
                height: "40px",
                marginRight: "8px",
                overflow: "hidden",
                background: "#f5f5f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              src={record.user.avatar}
              size={40}
              icon={<UserOutlined />}
              className="mr-2"
            />
            <div>
              <div className="font-medium">{record.full_name}</div>
              <div className="text-gray-500 text-sm">
                {record.user?.username}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Chuyên khoa",
      key: "specialization",
      render: (_, record) => (
        <div className="flex items-center">
          <div>
            <div className="font-medium">{record.full_name}</div>
            <div className="text-gray-500 text-sm">
              {record.Specialization?.name}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Liên hệ",
      key: "contact",
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {/* <div>
            <PhoneOutlined className="mr-2 text-blue-600" />
            {record.phone}
          </div> */}
          <div>
            {/* <MailOutlined className="mr-2 text-blue-600" /> */}
            {record.user?.email}
          </div>
        </Space>
      ),
    },
    // {
    //   title: "Ngày sinh",
    //   dataIndex: "dob",
    //   key: "dob",
    //   render: (dob) => dayjs(dob).format("DD/MM/YYYY"),
    // },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() =>
              navigate(`/admin/management/doctors/${record.doctor_id}`)
            }
            className="!bg-blue-900 !text-white hover:!bg-blue-800"
          >
            Chi tiết
          </Button>
          <Button
            icon={<CalendarOutlined />}
            onClick={() => {
              setSelectedDoctor(record);
              fetchDoctorSchedules(record.doctor_id);
              setScheduleModalVisible(true);
            }}
            className="border-blue-900 !text-blue-900 hover:!text-blue-800 hover:border-blue-800"
          >
            Lịch làm việc
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="Danh sách bác sĩ"
        extra={
          <Input.Search
            placeholder="Tìm kiếm bác sĩ"
            onSearch={handleSearch}
            style={{ width: 300 }}
            allowClear
          />
        }
      >
        <Table
          columns={columns}
          dataSource={doctors}
          loading={loading}
          rowKey="doctor_id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} bác sĩ`,
          }}
          onChange={handleTableChange}
          locale={{
            emptyText: <Empty description="Không có bác sĩ nào" />,
          }}
        />
      </Card>

      {/* Modal xem chi tiết bác sĩ */}
      <Modal
        title={
          <div className="text-xl font-semibold text-blue-900 flex items-center">
            <UserOutlined className="mr-2" />
            Thông tin chi tiết bác sĩ
          </div>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setSelectedDoctor(null);
        }}
        width={800}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsModalVisible(false);
              setSelectedDoctor(null);
            }}
          >
            Đóng
          </Button>,
        ]}
      >
        {selectedDoctor && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start space-x-4 mb-6">
              <Avatar
                src={selectedDoctor.avatar}
                size={100}
                icon={<UserOutlined />}
              />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-blue-900 mb-2">
                  {selectedDoctor.full_name}
                </h2>
                <p className="text-gray-600">
                  <MedicineBoxOutlined className="mr-2" />
                  {selectedDoctor.specialization?.name}
                </p>
              </div>
            </div>

            <Descriptions column={2} bordered>
              <Descriptions.Item label="Email" span={2}>
                <MailOutlined className="mr-2 text-blue-600" />
                {selectedDoctor.user?.email}
              </Descriptions.Item>
              <Descriptions.Item label="Chuyên khoa">
                {selectedDoctor.specialization?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Kinh nghiệm">
                {selectedDoctor.experience || "Chưa cập nhật"}
              </Descriptions.Item>
              <Descriptions.Item label="Bằng cấp/Chứng chỉ">
                {selectedDoctor.certificates || "Chưa cập nhật"}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Modal xem lịch làm việc */}
      <Modal
        title={
          <div className="text-xl font-semibold text-blue-900 flex items-center">
            <CalendarOutlined className="mr-2" />
            Lịch làm việc - {selectedDoctor?.full_name}
          </div>
        }
        open={scheduleModalVisible}
        onCancel={() => {
          setScheduleModalVisible(false);
          setSelectedDoctor(null);
          setDoctorSchedules([]);
        }}
        width={1000}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setScheduleModalVisible(false);
              setSelectedDoctor(null);
              setDoctorSchedules([]);
            }}
          >
            Đóng
          </Button>,
        ]}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Calendar
              locale={locale}
              value={selectedDate}
              onChange={setSelectedDate}
              cellRender={cellRender}
            />
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-4 text-blue-900">
              <ClockCircleOutlined className="mr-2" />
              Chi tiết lịch làm việc
            </h3>
            <Timeline
              items={doctorSchedules
                .filter(
                  (schedule) =>
                    dayjs(schedule.date).format("YYYY-MM") ===
                    selectedDate.format("YYYY-MM")
                )
                .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                .map((schedule) => {
                  const { type, text } = getScheduleType(schedule);
                  return {
                    color: type === "error" ? "red" : "blue",
                    children: (
                      <>
                        <div className="font-medium">
                          {dayjs(schedule.date).format("DD/MM/YYYY")}
                        </div>
                        <div>
                          <Tag color={type}>{text}</Tag>
                        </div>
                        {schedule.note && (
                          <div className="text-gray-500 text-sm mt-1">
                            Ghi chú: {schedule.note}
                          </div>
                        )}
                      </>
                    ),
                  };
                })}
            />
            {doctorSchedules.length === 0 && (
              <Empty description="Không có lịch làm việc trong tháng này" />
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DoctorManageAdmin;
