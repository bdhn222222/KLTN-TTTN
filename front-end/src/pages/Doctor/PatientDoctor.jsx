import React, { useState, useEffect, useContext } from "react";
import {
  Layout,
  Card,
  Table,
  Button,
  Avatar,
  Space,
  Input,
  Row,
  Col,
  notification,
  Spin,
} from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import NavbarDoctor from "../../components/Doctor/NavbarDoctor";
import MenuDoctor from "../../components/Doctor/MenuDoctor";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import dayjs from "dayjs";

const { Sider, Content } = Layout;
const { Search } = Input;

const PatientDoctor = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const navigate = useNavigate();
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();

  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: "topRight",
      duration: 3,
    });
  };

  const fetchPatients = async (page = 1, limit = 10, search = "") => {
    try {
      setLoading(true);
      const response = await axios.get(`${url1}/doctor/patients`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        params: {
          page,
          limit,
          search,
        },
      });

      if (response.data && response.data.data) {
        console.log("API Response (fetchPatients):", response.data);
        setPatients(response.data.data);
        setPagination({
          current: response.data.pagination.current_page,
          pageSize: response.data.pagination.per_page,
          total: response.data.pagination.total,
        });
      } else {
        console.error("Invalid data format from API:", response.data);
        setPatients([]);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      setPatients([]);
      showNotification(
        "error",
        "Tải dữ liệu thất bại",
        "Không thể tải danh sách bệnh nhân, vui lòng thử lại sau"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleTableChange = (pagination) => {
    fetchPatients(pagination.current, pagination.pageSize, searchText);
  };

  const handleSearch = (value) => {
    setSearchText(value);
    fetchPatients(1, pagination.pageSize, value);
  };

  const handleViewDetails = (familyMemberId) => {
    navigate(`/doctor/patients/${familyMemberId}/detail`);
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "family_member_id",
      key: "family_member_id",
      width: "10%",
    },
    {
      title: "Tên bệnh nhân",
      dataIndex: "username",
      key: "username",
      width: "30%",
      render: (text, record) => (
        <div className="flex items-center gap-2">
          <Avatar
            src={record.avatar}
            icon={!record.avatar && <UserOutlined />}
            className="bg-blue-900"
          />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone_number",
      key: "phone_number",
      width: "20%",
    },
    {
      title: "Giới tính",
      dataIndex: "gender",
      key: "gender",
      width: "15%",
      render: (gender) =>
        gender === "male" ? "Nam" : gender === "female" ? "Nữ" : "Khác",
    },
    {
      title: "Lịch hẹn gần nhất",
      dataIndex: "last_appointment",
      key: "last_appointment",
      width: "15%",
      render: (date) => (date ? dayjs(date).format("DD/MM/YYYY") : "N/A"),
    },
    {
      title: "Thao tác",
      key: "action",
      width: "10%",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record.family_member_id)}
          className="!bg-blue-900 !text-white px-6 py-2 rounded-full font-light hover:!bg-blue-800 hover:!text-white border border-blue-800 transition duration-300"
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {contextHolder}
      <NavbarDoctor />
      <Layout>
        <Sider
          width={250}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          theme="light"
          style={{
            overflow: "auto",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 64,
            bottom: 0,
          }}
        >
          <div className="logo" />
          <div className="flex justify-end p-4">
            {collapsed ? (
              <MenuUnfoldOutlined
                className="text-xl"
                onClick={() => setCollapsed(false)}
              />
            ) : (
              <MenuFoldOutlined
                className="text-xl"
                onClick={() => setCollapsed(true)}
              />
            )}
          </div>
          <MenuDoctor collapsed={collapsed} />
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
          <Content style={{ margin: "24px 16px", overflow: "initial" }}>
            <Card title="Danh sách bệnh nhân" className="shadow-sm">
              <Row gutter={[16, 16]} className="mb-4">
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Search
                    placeholder="Tìm kiếm bệnh nhân..."
                    allowClear
                    enterButton={<SearchOutlined />}
                    size="middle"
                    onSearch={handleSearch}
                    className="w-full"
                  />
                </Col>
              </Row>

              <Table
                columns={columns}
                dataSource={patients}
                rowKey="family_member_id"
                loading={loading}
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showTotal: (total) => `Tổng số ${total} bệnh nhân`,
                }}
                onChange={handleTableChange}
              />
            </Card>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default PatientDoctor;
