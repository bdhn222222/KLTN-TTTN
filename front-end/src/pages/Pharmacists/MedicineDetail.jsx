import React, { useState, useEffect, useContext } from "react";
import {
  Card,
  Button,
  Typography,
  notification,
  Spin,
  Layout,
  Space,
  Tag,
  Divider,
  Row,
  Col,
  Descriptions,
  Table,
  Breadcrumb,
  Statistic,
  Alert,
  Empty,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
  message,
  Dropdown,
} from "antd";
import {
  ArrowLeftOutlined,
  MedicineBoxOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HistoryOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  SyncOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import NavbarPhar from "../../components/Pharmacist/NavbarPhar";
import MenuPhar from "../../components/Pharmacist/MenuPhar";
import { AppContext } from "../../context/AppContext";
import "./PrescriptionPrepare.css";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Sider, Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;

const MedicineDetail = () => {
  const { medicineId } = useParams();
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  const navigate = useNavigate();

  const [medicineDetail, setMedicineDetail] = useState(null);
  const [batches, setBatches] = useState([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [isAddBatchModalVisible, setIsAddBatchModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isEditBatchModalVisible, setIsEditBatchModalVisible] = useState(false);
  const [isDeleteBatchModalVisible, setIsDeleteBatchModalVisible] =
    useState(false);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [updatingMedicine, setUpdatingMedicine] = useState(false);
  const [updatingBatch, setUpdatingBatch] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState(false);
  const [addBatchForm] = Form.useForm();
  const [editMedicineForm] = Form.useForm();
  const [editBatchForm] = Form.useForm();

  // Fetch medicine details
  const fetchMedicineDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${url1}/pharmacist/medicines/${medicineId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setMedicineDetail(response.data.data.medicine);
        setBatches(response.data.data.batches || []);
        setTotalQuantity(response.data.data.total_quantity || 0);
      } else {
        showNotification("error", "Lỗi", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching medicine details:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể tải thông tin thuốc"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicineDetail();
  }, [medicineId]);

  // Set initial form values when medicine details are loaded
  useEffect(() => {
    if (medicineDetail) {
      editMedicineForm.setFieldsValue({
        name: medicineDetail.name,
        unit: medicineDetail.unit,
        price: medicineDetail.price,
        supplier: medicineDetail.supplier || "",
        description: medicineDetail.description || "",
      });
    }
  }, [medicineDetail, isEditModalVisible]);

  const showNotification = (type, message, description) => {
    api[type]({
      message,
      description,
      placement: "topRight",
      duration: 4,
    });
  };

  const handleGoBack = () => {
    navigate("/pharmacist/medicines");
  };

  const handleRefresh = () => {
    fetchMedicineDetail();
  };

  const handleAddBatch = () => {
    setIsAddBatchModalVisible(true);
  };

  const handleEditMedicine = () => {
    setIsEditModalVisible(true);
  };

  const handleAddBatchSubmit = async () => {
    try {
      const values = await addBatchForm.validateFields();
      const token = localStorage.getItem("token");

      // Format dates for API
      const formattedValues = {
        ...values,
        import_date: values.import_date.format("YYYY-MM-DD"),
        expiry_date: values.expiry_date.format("YYYY-MM-DD"),
      };
      console.log(formattedValues);

      const response = await axios.post(
        `${url1}/pharmacist/medicines/${medicineId}/batches`,
        formattedValues,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        showNotification(
          "success",
          "Thành công",
          "Thêm lô thuốc mới thành công"
        );
        addBatchForm.resetFields();
        setIsAddBatchModalVisible(false);
        fetchMedicineDetail(); // Refresh data
      } else {
        showNotification("error", "Lỗi", response.data.message);
      }
    } catch (error) {
      console.error("Error adding batch:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể thêm lô thuốc"
      );
    }
  };

  const handleEditMedicineSubmit = async () => {
    try {
      const values = await editMedicineForm.validateFields();
      setUpdatingMedicine(true);
      const token = localStorage.getItem("token");

      // Compare form values with current medicine details to determine what has changed
      const changedFields = {};
      if (values.name !== medicineDetail.name) changedFields.name = values.name;
      if (values.unit !== medicineDetail.unit) changedFields.unit = values.unit;
      if (values.price !== medicineDetail.price)
        changedFields.price = values.price;

      // Handle nullable fields
      if ((values.supplier || "") !== (medicineDetail.supplier || "")) {
        changedFields.supplier = values.supplier;
      }
      if ((values.description || "") !== (medicineDetail.description || "")) {
        changedFields.description = values.description;
      }

      // Only make API call if there are changes
      if (Object.keys(changedFields).length === 0) {
        message.info("Không có thông tin nào được thay đổi");
        setIsEditModalVisible(false);
        setUpdatingMedicine(false);
        return;
      }

      // Send only the changed fields to the API
      const response = await axios.patch(
        `${url1}/pharmacist/medicines/${medicineId}`,
        changedFields,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        showNotification(
          "success",
          "Thành công",
          "Cập nhật thông tin thuốc thành công"
        );
        setIsEditModalVisible(false);
        fetchMedicineDetail(); // Refresh data
      } else {
        showNotification("error", "Lỗi", response.data.message);
      }
    } catch (error) {
      console.error("Error updating medicine:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể cập nhật thông tin thuốc"
      );
    } finally {
      setUpdatingMedicine(false);
    }
  };

  // Handle edit batch
  const handleEditBatch = (batch) => {
    setCurrentBatch(batch);
    editBatchForm.setFieldsValue({
      batch_number: batch.batch_number,
      quantity: batch.current_quantity,
      expiry_date: batch.expiry_date ? dayjs(batch.expiry_date) : null,
    });
    setIsEditBatchModalVisible(true);
  };

  // Handle edit batch submit
  const handleEditBatchSubmit = async () => {
    try {
      const values = await editBatchForm.validateFields();
      setUpdatingBatch(true);
      const token = localStorage.getItem("token");

      // Format dates for API
      const formattedValues = {
        ...values,
        expiry_date: values.expiry_date
          ? values.expiry_date.format("YYYY-MM-DD")
          : null,
      };

      const response = await axios.patch(
        `${url1}/pharmacist/medicines/batches/${currentBatch.batch_id}`,
        formattedValues,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        showNotification(
          "success",
          "Thành công",
          "Cập nhật lô thuốc thành công"
        );
        setIsEditBatchModalVisible(false);
        fetchMedicineDetail(); // Refresh data
      } else {
        showNotification("error", "Lỗi", response.data.message);
      }
    } catch (error) {
      console.error("Error updating batch:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể cập nhật lô thuốc"
      );
    } finally {
      setUpdatingBatch(false);
    }
  };

  // Handle delete batch
  const handleDeleteBatch = (batch) => {
    // console.log(batch);
    setCurrentBatch(batch);
    setIsDeleteBatchModalVisible(true);
  };

  // Handle delete batch confirm
  const handleDeleteBatchConfirm = async () => {
    try {
      setDeletingBatch(true);
      const token = localStorage.getItem("token");

      const response = await axios.delete(
        `${url1}/pharmacist/medicines/batches/${currentBatch.batch_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        showNotification("success", "Thành công", "Xóa lô thuốc thành công");
        setIsDeleteBatchModalVisible(false);
        fetchMedicineDetail(); // Refresh data
      } else {
        showNotification("error", "Lỗi", response.data.message);
      }
    } catch (error) {
      console.error("Error deleting batch:", error);
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || "Không thể xóa lô thuốc"
      );
    } finally {
      setDeletingBatch(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount == null) return "0 VNĐ";

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return "N/A";
    return dayjs(date).format("DD/MM/YYYY");
  };

  // Get batch status
  const getBatchStatus = (batch) => {
    if (!batch.expiry_date) {
      return {
        status: "unknown",
        color: "gray",
        icon: <WarningOutlined />,
        text: "Không xác định",
      };
    }

    const expiryDate = dayjs(batch.expiry_date);
    const today = dayjs();
    const threeMonthsFromNow = today.add(3, "month");

    if (batch.status === "Disposed") {
      return {
        status: "disposed",
        color: "black",
        icon: <WarningOutlined />,
        text: "Đã hủy",
      };
    } else if (expiryDate.isBefore(today) || batch.status === "Expired") {
      return {
        status: "expired",
        color: "red",
        icon: <WarningOutlined />,
        text: "Hết hạn",
      };
    } else if (expiryDate.isBefore(threeMonthsFromNow)) {
      return {
        status: "expiring_soon",
        color: "orange",
        icon: <ExclamationCircleOutlined />,
        text: "Sắp hết hạn",
      };
    } else {
      return {
        status: "active",
        color: "green",
        icon: <CheckCircleOutlined />,
        text: "Còn hạn",
      };
    }
  };

  // Table columns for batches
  const batchColumns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      align: "center",
      render: (text, record, index) => index + 1,
    },
    {
      title: "Mã lô",
      dataIndex: "batch_number",
      key: "batch_number",
    },
    {
      title: "Số lượng hiện tại",
      dataIndex: "current_quantity",
      key: "current_quantity",
      align: "center",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Ngày nhập",
      dataIndex: "import_date",
      key: "import_date",
      render: (text) => formatDate(text),
    },
    {
      title: "Ngày hết hạn",
      dataIndex: "expiry_date",
      key: "expiry_date",
      render: (text) => formatDate(text),
    },
    {
      title: "Trạng thái",
      key: "status",
      align: "center",
      render: (_, record) => {
        const status = getBatchStatus(record);
        return (
          <Tag color={status.color} icon={status.icon}>
            {status.text}
          </Tag>
        );
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: "1",
                icon: <EditOutlined />,
                label: "Chỉnh sửa",
                onClick: () => handleEditBatch(record),
              },
              {
                key: "2",
                icon: <DeleteOutlined />,
                label: "Xóa",
                danger: true,
                onClick: () => handleDeleteBatch(record),
              },
            ],
          }}
          trigger={["hover"]}
          placement="bottomRight"
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
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
          style={{ boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)" }}
        >
          <div className="flex justify-center mt-3 mb-3">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: "16px", width: 64, height: 64 }}
            />
          </div>
          <MenuPhar selectedKey="9" />
        </Sider>

        <Layout className="site-layout" style={{ padding: "24px 24px" }}>
          <Content
            className="site-layout-background"
            style={{
              padding: 24,
              margin: 0,
              minHeight: 280,
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div className="mb-4">
              <Breadcrumb
                items={[
                  {
                    title: <a href="/pharmacist/">Trang chủ</a>,
                  },
                  {
                    title: <a href="/pharmacist/medicines">Danh sách thuốc</a>,
                  },
                  {
                    title: "Chi tiết thuốc",
                  },
                ]}
              />
            </div>

            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={handleGoBack}
                  className="mr-4"
                >
                  Quay lại
                </Button>
                <Title level={3} style={{ margin: 10 }}>
                  Chi tiết thuốc
                </Title>
              </div>
              <Space size={10}>
                <Button
                  type="default"
                  icon={<SyncOutlined />}
                  onClick={handleRefresh}
                  className="mr-3"
                >
                  Làm mới
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddBatch}
                >
                  Thêm lô thuốc
                </Button>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={handleEditMedicine}
                >
                  Sửa thông tin thuốc
                </Button>
              </Space>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Spin size="large" />
              </div>
            ) : medicineDetail ? (
              <>
                <Card
                  title={
                    <div className="flex items-center">
                      <MedicineBoxOutlined
                        style={{ fontSize: "24px", marginRight: "12px" }}
                      />
                      <span>Thông tin thuốc</span>
                    </div>
                  }
                  className="mb-6"
                >
                  <Row gutter={[24, 24]}>
                    <Col xs={24} md={16}>
                      <Descriptions
                        bordered
                        column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
                      >
                        <Descriptions.Item label="Mã thuốc">
                          {medicineDetail.medicine_id}
                        </Descriptions.Item>
                        <Descriptions.Item label="Tên thuốc">
                          <Text strong>{medicineDetail.name}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Đơn vị">
                          {medicineDetail.unit}
                        </Descriptions.Item>
                        <Descriptions.Item label="Đơn giá">
                          <Text type="danger">
                            {formatCurrency(medicineDetail.price)}
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Nhà cung cấp" span={2}>
                          {medicineDetail.supplier || "Chưa có thông tin"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Mô tả" span={2}>
                          {medicineDetail.description || "Chưa có mô tả"}
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                    <Col xs={24} md={8}>
                      <Card className="inventory-stats">
                        <Statistic
                          title="Tổng số lượng tồn kho của lô còn hạn"
                          value={totalQuantity}
                          suffix={medicineDetail.unit}
                          valueStyle={{
                            color: totalQuantity > 0 ? "#3f8600" : "#cf1322",
                          }}
                        />
                        <Divider />
                        <Statistic
                          title="Số lô thuốc"
                          value={batches.length}
                          valueStyle={{ color: "#1890ff" }}
                        />
                      </Card>
                    </Col>
                  </Row>
                </Card>
                <br />

                <Card
                  title={
                    <div className="flex items-center">
                      <HistoryOutlined
                        style={{ fontSize: "24px", marginRight: "12px" }}
                      />
                      <span>Danh sách lô thuốc</span>
                    </div>
                  }
                >
                  {batches.length > 0 ? (
                    <Table
                      columns={batchColumns}
                      dataSource={batches}
                      rowKey="batch_id"
                      pagination={{ pageSize: 5 }}
                      className="medicine-batch-table"
                    />
                  ) : (
                    <Empty description="Chưa có lô thuốc nào" />
                  )}
                </Card>
              </>
            ) : (
              <Alert
                message="Không tìm thấy thuốc"
                description="Thuốc bạn đang tìm kiếm không tồn tại hoặc đã bị xóa."
                type="error"
                showIcon
              />
            )}
          </Content>
        </Layout>
      </Layout>

      {/* Add Batch Modal */}
      <Modal
        title="Thêm lô thuốc mới"
        open={isAddBatchModalVisible}
        onCancel={() => setIsAddBatchModalVisible(false)}
        onOk={handleAddBatchSubmit}
        okText="Thêm lô"
        cancelText="Hủy"
      >
        <Form form={addBatchForm} layout="vertical">
          <Form.Item
            name="batch_number"
            label="Mã lô"
            rules={[
              { required: true, message: "Vui lòng nhập mã lô" },
              { max: 50, message: "Mã lô tối đa 50 ký tự" },
            ]}
          >
            <Input placeholder="Nhập mã lô" />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="Số lượng"
            rules={[
              { required: true, message: "Vui lòng nhập số lượng" },
              { type: "number", min: 1, message: "Số lượng phải lớn hơn 0" },
            ]}
          >
            <InputNumber
              type="number"
              min={1}
              style={{ width: "100%" }}
              placeholder="Nhập số lượng"
              addonAfter={medicineDetail?.unit}
            />
          </Form.Item>

          <Form.Item
            name="import_date"
            label="Ngày nhập"
            rules={[{ required: true, message: "Vui lòng chọn ngày nhập" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              placeholder="Chọn ngày nhập"
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            name="expiry_date"
            label="Ngày hết hạn"
            rules={[{ required: true, message: "Vui lòng chọn ngày hết hạn" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              placeholder="Chọn ngày hết hạn"
              format="DD/MM/YYYY"
              disabledDate={(current) => {
                // Disable dates before today
                return current && current < dayjs().endOf("day");
              }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Medicine Modal */}
      <Modal
        title="Chỉnh sửa thông tin thuốc"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsEditModalVisible(false)}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={updatingMedicine}
            onClick={handleEditMedicineSubmit}
          >
            Lưu thay đổi
          </Button>,
        ]}
        width={600}
      >
        <Form
          form={editMedicineForm}
          layout="vertical"
          initialValues={{
            name: medicineDetail?.name,
            unit: medicineDetail?.unit,
            price: medicineDetail?.price,
            supplier: medicineDetail?.supplier || "",
            description: medicineDetail?.description || "",
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
              style={{ width: "100%" }}
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
              placeholder="Nhập giá thuốc"
            />
          </Form.Item>

          <Form.Item name="supplier" label="Nhà cung cấp">
            <Input placeholder="Nhập tên nhà cung cấp" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea
              rows={4}
              placeholder="Nhập mô tả về thuốc"
              maxLength={1000}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Batch Modal */}
      <Modal
        title="Chỉnh sửa lô thuốc"
        open={isEditBatchModalVisible}
        onCancel={() => setIsEditBatchModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsEditBatchModalVisible(false)}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={updatingBatch}
            onClick={handleEditBatchSubmit}
          >
            Lưu thay đổi
          </Button>,
        ]}
      >
        <Form form={editBatchForm} layout="vertical">
          <Form.Item
            name="batch_number"
            label="Mã lô"
            rules={[
              { required: true, message: "Vui lòng nhập mã lô" },
              { max: 50, message: "Mã lô tối đa 50 ký tự" },
            ]}
          >
            <Input placeholder="Nhập mã lô" />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="Số lượng"
            rules={[
              { required: true, message: "Vui lòng nhập số lượng" },
              {
                type: "number",
                min: 0,
                message: "Số lượng phải lớn hơn hoặc bằng 0",
              },
            ]}
          >
            <InputNumber
              type="number"
              min={0}
              style={{ width: "100%" }}
              placeholder="Nhập số lượng"
              addonAfter={medicineDetail?.unit}
            />
          </Form.Item>

          <Form.Item
            name="expiry_date"
            label="Ngày hết hạn"
            rules={[{ required: true, message: "Vui lòng chọn ngày hết hạn" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              placeholder="Chọn ngày hết hạn"
              format="DD/MM/YYYY"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Batch Modal */}
      <Modal
        title="Xác nhận xóa lô thuốc"
        open={isDeleteBatchModalVisible}
        onCancel={() => setIsDeleteBatchModalVisible(false)}
        footer={[
          <Button
            key="back"
            onClick={() => setIsDeleteBatchModalVisible(false)}
          >
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            loading={deletingBatch}
            onClick={handleDeleteBatchConfirm}
          >
            Xóa
          </Button>,
        ]}
      >
        <p>Bạn có chắc chắn muốn xóa lô thuốc {currentBatch?.batch_number}?</p>
        <p>Hành động này không thể hoàn tác.</p>
      </Modal>
    </Layout>
  );
};

export default MedicineDetail;
