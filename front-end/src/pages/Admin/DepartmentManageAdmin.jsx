import React, { useState, useEffect, useContext } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  notification,
  Modal,
  Form,
  Input,
  Upload,
  Space,
  Descriptions,
  InputNumber,
  Empty,
  Image,
  Divider,
} from "antd";
import {
  EyeOutlined,
  EditOutlined,
  UploadOutlined,
  SaveOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  DollarOutlined,
  LoadingOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";

const DepartmentManageAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [specializations, setSpecializations] = useState([]);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState("");
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [specializationInfo, setSpecializationInfo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const [imageUrl, setImageUrl] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [formValues, setFormValues] = useState({});
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: "topRight",
      duration: 3,
    });
  };

  const fetchSpecializations = async (page = 1, limit = 10, search = "") => {
    try {
      setLoading(true);
      const response = await axios.get(`${url1}/admin/specializations`, {
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
        console.log("Specializations data:", response.data);
        setSpecializations(response.data.data);
        setPagination({
          current: response.data.pagination.current_page,
          pageSize: response.data.pagination.per_page,
          total: response.data.pagination.total,
        });
      } else {
        console.error("Invalid data format from API:", response.data);
        setSpecializations([]);
      }
    } catch (error) {
      console.error("Error fetching specializations:", error);
      setSpecializations([]);
      showNotification(
        "error",
        "Tải dữ liệu thất bại",
        "Không thể tải danh sách chuyên khoa, vui lòng thử lại sau"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecializations(pagination.current, pagination.pageSize, searchText);
  }, []);

  const handleTableChange = (pagination) => {
    fetchSpecializations(pagination.current, pagination.pageSize, searchText);
  };

  const handleSearch = (value) => {
    setSearchText(value);
    fetchSpecializations(1, pagination.pageSize, value);
  };

  const fetchSpecializationDetails = async (specializationId) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${url1}/admin/specializations/${specializationId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      console.log("Specialization details:", response.data);
      if (response.data.success) {
        const specializationData = response.data.data;
        setSpecializationInfo(specializationData);
        setImageUrl(specializationData.image || "");
        setIsModalVisible(true);
        setIsEditing(false);
        setUploadedFile(null);
      }
    } catch (error) {
      console.error("Error fetching specialization details:", error);
      showNotification(
        "error",
        "Lỗi",
        "Không thể tải thông tin chi tiết chuyên khoa"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    const feesValue = specializationInfo.fees
      ? parseInt(specializationInfo.fees.replace(/[^\d]/g, ""))
      : 0;

    form.setFieldsValue({
      name: specializationInfo.name,
      fees: feesValue,
    });
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setIsEditing(false);
    setSpecializationInfo(null);
    form.resetFields();
    setUploadedFile(null);
  };

  const handleSubmit = async (values) => {
    setFormValues(values);
    setConfirmModalVisible(true); // Bật modal xác nhận
  };

  const handleConfirmUpdate = async () => {
    try {
      setLoadingUpdate(true);

      const formData = new FormData();

      // Add text fields
      if (formValues.name) {
        formData.append("name", formValues.name);
      }
      if (formValues.fees) {
        formData.append("fees", formValues.fees);
      }

      // Only append image if there's a new file uploaded
      if (uploadedFile instanceof File) {
        formData.append("image", uploadedFile);
      }

      // Make API request
      const response = await axios({
        method: "patch",
        url: `${url1}/admin/specializations/${specializationInfo.specialization_id}`,
        data: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 20000,
      });

      console.log("Update response:", response.data);

      if (response.data.success) {
        showNotification(
          "success",
          "Thành công",
          "Cập nhật chuyên khoa thành công"
        );
        setIsEditing(false);
        setUploadedFile(null);

        // Reload the data to show updated values
        await fetchSpecializationDetails(specializationInfo.specialization_id);
        await fetchSpecializations(
          pagination.current,
          pagination.pageSize,
          searchText
        );
      }
    } catch (error) {
      console.error("Error updating specialization:", error);
      let errorMessage = "Không thể cập nhật chuyên khoa";

      if (error.code === "ERR_NETWORK") {
        errorMessage = "Không thể kết nối đến máy chủ.";
      } else if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else {
        errorMessage = error.message || errorMessage;
      }

      showNotification("error", "Lỗi", errorMessage);
    } finally {
      setConfirmModalVisible(false);
      setLoadingUpdate(false);
    }
  };

  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
    if (!isJpgOrPng) {
      showNotification(
        "error",
        "Lỗi tệp tin",
        "Chỉ cho phép tải lên file JPG/PNG"
      );
      return false;
    }

    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      showNotification(
        "error",
        "Lỗi kích thước",
        "Kích thước hình ảnh phải nhỏ hơn 2MB"
      );
      return false;
    }

    return true;
  };

  const getBase64 = (img, callback) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => callback(reader.result));
    reader.readAsDataURL(img);
  };

  const handleImageUpload = async (info) => {
    const file = info.file.originFileObj;
    if (!file) return;

    setUploadLoading(true);
    try {
      // Hiển thị preview ảnh
      getBase64(file, (imageUrl) => {
        setImageUrl(imageUrl);
        setUploadedFile(file); // Đảm bảo đây là instance của File
        setUploadLoading(false);
      });
    } catch (error) {
      console.error("Error processing image:", error);
      showNotification("error", "Lỗi", "Không thể xử lý ảnh");
      setUploadLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (typeof value === "string") {
      const numericValue = value.replace(/[^\d]/g, "");
      return parseInt(numericValue).toLocaleString("vi-VN") + " VNĐ";
    }

    return value?.toLocaleString("vi-VN") + " VNĐ";
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
      title: "Tên chuyên khoa",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Số lượng bác sĩ",
      dataIndex: "doctor_count",
      key: "doctor_count",
      render: (count) => count || 0,
    },
    {
      title: "Phí khám",
      dataIndex: "fees",
      key: "fees",
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => fetchSpecializationDetails(record.specialization_id)}
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
      <Card
        title="Danh sách chuyên khoa"
        extra={
          <Input.Search
            placeholder="Tìm kiếm chuyên khoa"
            onSearch={handleSearch}
            style={{ width: 250 }}
            allowClear
          />
        }
      >
        <Table
          columns={columns}
          dataSource={specializations}
          loading={loading}
          rowKey="specialization_id"
          locale={{
            emptyText: <Empty description="Không có chuyên khoa nào" />,
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} chuyên khoa`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title={
          <div className="flex items-center">
            <span className="text-xl font-semibold text-blue-900">
              {isEditing ? "Chỉnh sửa chuyên khoa" : "Chi tiết chuyên khoa"}
            </span>
          </div>
        }
        open={isModalVisible}
        onCancel={handleCancel}
        width={800}
        footer={[
          <Button key="close" onClick={handleCancel}>
            Đóng
          </Button>,
          !isEditing && (
            <Button
              key="edit"
              type="primary"
              icon={<EditOutlined />}
              onClick={handleEdit}
              className="!bg-blue-600 !text-white hover:!bg-blue-700"
            >
              Chỉnh sửa
            </Button>
          ),
          isEditing && (
            <Button
              key="save"
              type="primary"
              icon={<SaveOutlined />}
              onClick={form.submit}
              loading={loading}
              className="!bg-green-600 !text-white hover:!bg-green-700"
            >
              Lưu thay đổi
            </Button>
          ),
        ]}
      >
        {specializationInfo && (
          <div className="mt-4">
            {isEditing ? (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                  name: specializationInfo.name,
                  fees: parseInt(specializationInfo.fees.replace(/[^\d]/g, "")),
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Form.Item
                      name="name"
                      label="Tên chuyên khoa"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập tên chuyên khoa",
                        },
                      ]}
                    >
                      <Input placeholder="Nhập tên chuyên khoa" />
                    </Form.Item>

                    <Form.Item
                      name="fees"
                      label="Phí khám (VNĐ)"
                      rules={[
                        { required: true, message: "Vui lòng nhập phí khám" },
                      ]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        step={10000}
                        formatter={(value) =>
                          `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                        placeholder="Nhập phí khám"
                      />
                    </Form.Item>
                  </div>
                  <div>
                    <Form.Item label="Hình ảnh chuyên khoa">
                      <Upload
                        name="image"
                        listType="picture-card"
                        className="avatar-uploader"
                        showUploadList={false}
                        beforeUpload={beforeUpload}
                        onChange={handleImageUpload}
                        action=""
                        customRequest={({ onSuccess }) => {
                          setTimeout(() => {
                            onSuccess("ok");
                          }, 0);
                        }}
                      >
                        {imageUrl ? (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <img
                              src={imageUrl}
                              alt="Chuyên khoa"
                              style={{
                                width: "130px",
                                height: "130px",
                                objectFit: "cover",
                                borderRadius: "8px",
                              }}
                            />
                          </div>
                        ) : (
                          <div>
                            {uploadLoading ? (
                              <LoadingOutlined />
                            ) : (
                              <PlusOutlined />
                            )}
                            <div style={{ marginTop: 8 }}>Tải lên</div>
                          </div>
                        )}
                      </Upload>
                      <div className="text-sm text-gray-500 mt-2">
                        Nhấp vào ô trên để tải lên hoặc thay đổi hình ảnh (Kích
                        thước: 130x130)
                      </div>
                    </Form.Item>
                  </div>
                </div>
              </Form>
            ) : (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-lg mb-3 text-blue-900 flex items-center">
                      <MedicineBoxOutlined className="mr-2" /> Thông tin chuyên
                      khoa
                    </h3>
                    <Descriptions
                      column={1}
                      bordered
                      className="bg-white rounded-lg"
                    >
                      <Descriptions.Item
                        label="Tên chuyên khoa"
                        labelStyle={{ fontWeight: "bold" }}
                      >
                        {specializationInfo.name}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label="Phí khám"
                        labelStyle={{ fontWeight: "bold" }}
                      >
                        {specializationInfo.fees}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label="Số lượng bác sĩ"
                        labelStyle={{ fontWeight: "bold" }}
                      >
                        {specializationInfo.doctor_count} bác sĩ
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-3 text-blue-900 flex items-center">
                      <UserOutlined className="mr-2" /> Hình ảnh chuyên khoa
                    </h3>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 flex justify-center items-center">
                      {specializationInfo.image ? (
                        <Image
                          src={specializationInfo.image}
                          alt={specializationInfo.name}
                          width={130}
                          height={130}
                          style={{
                            objectFit: "cover",
                            borderRadius: "8px",
                          }}
                          preview={{
                            mask: (
                              <div className="flex items-center">
                                <EyeOutlined className="mr-2" />
                                Xem ảnh
                              </div>
                            ),
                          }}
                        />
                      ) : (
                        <Empty
                          description="Không có hình ảnh"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={
          <div className="flex items-center text-warning">
            <ExclamationCircleOutlined className="mr-2 text-yellow-500" />
            <span>Xác nhận cập nhật</span>
          </div>
        }
        open={confirmModalVisible}
        onCancel={() => setConfirmModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setConfirmModalVisible(false)}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            loading={loadingUpdate}
            onClick={handleConfirmUpdate}
          >
            Xác nhận
          </Button>,
        ]}
      >
        <p>Bạn có chắc chắn muốn cập nhật thông tin chuyên khoa này?</p>
        <p className="text-gray-500">
          Các thay đổi sẽ được áp dụng ngay lập tức và có thể ảnh hưởng đến các
          bác sĩ và cuộc hẹn liên quan.
        </p>
      </Modal>
    </>
  );
};

export default DepartmentManageAdmin;
