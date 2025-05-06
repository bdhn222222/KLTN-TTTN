import React, { useState, useEffect, useContext } from "react";
import {
  Card,
  Table,
  Button,
  Typography,
  notification,
  Spin,
  Input,
  Layout,
  Space,
  Tag,
  Tooltip,
  Divider,
  Modal,
  Form,
  InputNumber,
  message,
} from "antd";
import {
  SearchOutlined,
  EyeOutlined,
  MedicineBoxOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FilterOutlined,
  ReloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import NavbarPhar from "../../components/Pharmacist/NavbarPhar";
import MenuPhar from "../../components/Pharmacist/MenuPhar";
import { AppContext } from "../../context/AppContext";
import "./PrescriptionPrepare.css";

const { Title, Text } = Typography;
const { Sider, Content } = Layout;
const { TextArea } = Input;

const ManagementMedicine = () => {
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  const navigate = useNavigate();

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [addMedicineForm] = Form.useForm();
  const [addingMedicine, setAddingMedicine] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Fetch medicines
  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(`${url1}/pharmacist/medicines`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          page: pagination.current,
          limit: pagination.pageSize,
          search: searchText || undefined,
        },
      });

      if (response.data.success) {
        setMedicines(response.data.data.medicines);
        setPagination({
          ...pagination,
          total: response.data.data.pagination.total_records,
        });
      } else {
        showNotification("error", "Lỗi", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching medicines:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể tải danh sách thuốc"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [pagination.current, pagination.pageSize]);

  const showNotification = (type, message, description) => {
    api[type]({
      message,
      description,
      placement: "topRight",
      duration: 4,
    });
  };

  const handleTableChange = (pagination) => {
    setPagination({
      ...pagination,
    });
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setPagination({
      ...pagination,
      current: 1, // Reset to first page when searching
    });
    // Only fetch when the search button is clicked or Enter is pressed
  };

  const handleSearchSubmit = () => {
    fetchMedicines();
  };

  const handleViewDetails = (medicineId) => {
    navigate(`/pharmacist/medicines/${medicineId}`);
  };

  const handleRefresh = () => {
    setSearchText("");
    setPagination({
      ...pagination,
      current: 1,
    });
    fetchMedicines();
  };

  // Modal functions
  const showAddModal = () => {
    setIsAddModalVisible(true);
  };

  const handleAddModalCancel = () => {
    addMedicineForm.resetFields();
    setIsAddModalVisible(false);
  };

  const handleAddMedicine = async () => {
    try {
      const values = await addMedicineForm.validateFields();
      // console.log(values);
      setAddingMedicine(true);

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${url1}/pharmacist/medicines/add`,
        values,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        showNotification("success", "Thành công", "Thêm thuốc mới thành công");
        addMedicineForm.resetFields();
        setIsAddModalVisible(false);
        fetchMedicines(); // Refresh the medicine list
      } else {
        showNotification("error", "Lỗi", response.data.message);
      }
    } catch (error) {
      console.error("Error adding medicine:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể thêm thuốc mới"
      );
    } finally {
      setAddingMedicine(false);
    }
  };

  // Table columns definition
  const columns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      align: "center",
      render: (text, record, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: "Tên thuốc",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Space>
          <MedicineBoxOutlined style={{ color: "#1890ff" }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: "Đơn vị",
      dataIndex: "unit",
      key: "unit",
      width: 100,
      align: "center",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Giá",
      dataIndex: "price",
      key: "price",
      width: 150,
      align: "right",
      render: (text) => {
        // Format as Vietnamese currency
        const formattedPrice = new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(text);
        return <Text type="success">{formattedPrice}</Text>;
      },
    },
    {
      title: "Nhà cung cấp",
      dataIndex: "supplier",
      key: "supplier",
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip title={text}>
          <span>{text || "Không có"}</span>
        </Tooltip>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record.medicine_id)}
          className="card-action-button"
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {contextHolder}
      <NavbarPhar />
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
                className="text-xl cursor-pointer"
                onClick={() => setCollapsed(false)}
              />
            ) : (
              <MenuFoldOutlined
                className="text-xl cursor-pointer"
                onClick={() => setCollapsed(true)}
              />
            )}
          </div>
          <MenuPhar collapsed={collapsed} selectedKey="medicines" />
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
          <Content style={{ margin: "24px 16px", overflow: "initial" }}>
            <Card bordered={false} className="shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <Title level={4}>
                  <MedicineBoxOutlined className="mr-2" />
                  Quản lý thuốc
                </Title>
                <Space size={10}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={showAddModal}
                  >
                    Thêm thuốc
                  </Button>
                  <Input.Search
                    placeholder="Tìm kiếm theo tên thuốc hoặc nhà cung cấp..."
                    allowClear
                    enterButton={<SearchOutlined />}
                    size="middle"
                    value={searchText}
                    onChange={(e) => handleSearch(e.target.value)}
                    onSearch={handleSearchSubmit}
                    style={{ width: 350 }}
                  />
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    title="Làm mới"
                  />
                </Space>
              </div>

              <Divider className="my-4" />

              <Table
                columns={columns}
                dataSource={medicines}
                rowKey="medicine_id"
                pagination={{
                  ...pagination,
                  // showSizeChanger: true,
                  // showQuickJumper: true,
                  showTotal: (total) => `Tổng cộng ${total} loại thuốc`,
                  // pageSizeOptions: ["10", "20", "50"],
                }}
                loading={loading}
                onChange={handleTableChange}
                size="middle"
                bordered
                className="medicine-table"
              />
            </Card>
          </Content>
        </Layout>
      </Layout>

      {/* Modal thêm thuốc mới */}
      <Modal
        title="Thêm thuốc mới"
        open={isAddModalVisible}
        onCancel={handleAddModalCancel}
        footer={[
          <Button key="back" onClick={handleAddModalCancel}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={addingMedicine}
            onClick={handleAddMedicine}
          >
            Thêm thuốc
          </Button>,
        ]}
      >
        <Form
          form={addMedicineForm}
          layout="vertical"
          initialValues={{
            supplier: "",
            description: "",
          }}
        >
          <Form.Item
            name="name"
            label="Tên thuốc"
            rules={[{ required: true, message: "Vui lòng nhập tên thuốc" }]}
          >
            <Input placeholder="Nhập tên thuốc" />
          </Form.Item>

          <Form.Item
            name="unit"
            label="Đơn vị"
            rules={[{ required: true, message: "Vui lòng nhập đơn vị" }]}
          >
            <Input placeholder="Ví dụ: viên, chai, hộp, ..." />
          </Form.Item>

          <Form.Item
            name="price"
            label="Giá (VNĐ)"
            rules={[
              { required: true, message: "Vui lòng nhập giá thuốc" },
              {
                type: "number",
                min: 0,
                message: "Giá phải lớn hơn hoặc bằng 0",
              },
            ]}
          >
            <InputNumber
              placeholder="Nhập giá thuốc"
              style={{ width: "100%" }}
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
            />
          </Form.Item>

          <Form.Item name="supplier" label="Nhà cung cấp">
            <Input placeholder="Nhập tên nhà cung cấp" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea
              placeholder="Nhập mô tả về thuốc"
              rows={4}
              maxLength={1000}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default ManagementMedicine;
