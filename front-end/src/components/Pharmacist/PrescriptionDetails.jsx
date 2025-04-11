import React, { useState, useEffect, useContext } from 'react';
import { Drawer, Typography, Button, Space, Card, List, Tag, Input, Form, Select, Spin, notification, Popconfirm, Row, Col, Divider, InputNumber, Modal, Empty } from 'antd';
import { CloseOutlined, DeleteOutlined, PlusOutlined, MinusOutlined, MedicineBoxOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const PrescriptionDetails = ({ 
  visible, 
  prescriptionId, 
  onClose, 
  onUpdate 
}) => {
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [availableMedicines, setAvailableMedicines] = useState([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [addMedicineModalVisible, setAddMedicineModalVisible] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [medicineForm] = Form.useForm();
  const [rejectReason, setRejectReason] = useState('');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();

  // Fetch prescription details when drawer becomes visible
  useEffect(() => {
    if (visible && prescriptionId) {
      fetchPrescriptionDetails();
      fetchAvailableMedicines();
    }
  }, [visible, prescriptionId]);

  const fetchPrescriptionDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${url1}/pharmacist/prescriptions/${prescriptionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Full API Response:', response);

      if (response.data.success) {
        console.log('Prescription details response:', response.data);
        console.log('Prescription data structure:', JSON.stringify(response.data.data, null, 2));
        
        // Kiểm tra xem dữ liệu có đúng cấu trúc không
        if (!response.data.data) {
          showNotification('error', 'Data Error', 'Response missing data object');
          setLoading(false);
          return;
        }
        
        setPrescription(response.data.data);
        
        // Kiểm tra và xử lý danh sách thuốc
        if (Array.isArray(response.data.data.medicines)) {
          console.log('Medicines array:', response.data.data.medicines);
          setMedicines(response.data.data.medicines);
        } else {
          console.error('Medicines is not an array or is missing:', response.data.data.medicines);
          setMedicines([]);
        }
      } else {
        showNotification('error', 'Error', response.data.message || 'Failed to fetch prescription details');
      }
    } catch (error) {
      console.error('Error fetching prescription details:', error);
      showNotification('error', 'Error', error.response?.data?.message || 'Failed to fetch prescription details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMedicines = async () => {
    try {
      setLoadingMedicines(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${url1}/pharmacist/medicines`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        // Only include medicines that are in stock
        const inStockMedicines = response.data.data.filter(medicine => !medicine.is_out_of_stock);
        setAvailableMedicines(inStockMedicines);
      } else {
        showNotification('error', 'Error', 'Failed to fetch available medicines');
      }
    } catch (error) {
      console.error('Error fetching available medicines:', error);
      showNotification('error', 'Error', error.response?.data?.message || 'Failed to fetch available medicines');
    } finally {
      setLoadingMedicines(false);
    }
  };

  const showNotification = (type, message, description) => {
    api[type]({
      message,
      description,
      placement: 'topRight',
      duration: 4
    });
  };

  const handleUpdateItem = async (prescriptionMedicineId, medicineId, field, value) => {
    // Create a new array with the updated medicine
    const updatedMedicines = medicines.map(medicine => {
      if (medicine.prescription_medicine_id === prescriptionMedicineId) {
        return {
          ...medicine,
          prescribed: {
            ...medicine.prescribed,
            [field]: value
          }
        };
      }
      return medicine;
    });

    setMedicines(updatedMedicines);

    try {
      const token = localStorage.getItem('token');
      
      // API endpoint yêu cầu original_medicine_id và new_medicine_id
      const updateData = {
        prescription_medicine_id: prescriptionMedicineId,
        original_medicine_id: medicineId,
        new_medicine_id: medicineId,  // Giữ nguyên thuốc
      };
      
      // Thêm trường cần cập nhật
      updateData[field] = value;
      
      // Nếu cập nhật số lượng, sử dụng actual_quantity trong API
      if (field === 'quantity') {
        updateData['actual_quantity'] = value;
        delete updateData.quantity;
      }
      
      console.log('Sending update data:', updateData);
      
      const response = await axios.patch(
        `${url1}/pharmacist/prescriptions/${prescriptionId}/update-item`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        showNotification('success', 'Success', 'Updated prescription item');
        fetchPrescriptionDetails(); // Refresh the prescription details
      } else {
        showNotification('error', 'Error', 'Failed to update prescription item');
      }
    } catch (error) {
      console.error('Error updating prescription item:', error);
      showNotification(
        'error',
        'Error',
        error.response?.data?.message || 'Failed to update prescription item'
      );
      // Revert changes on error
      fetchPrescriptionDetails();
    }
  };

  const handleRemoveMedicine = async (prescriptionMedicineId, medicineId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${url1}/pharmacist/prescriptions/${prescriptionId}/update-item`,
        {
          prescription_medicine_id: prescriptionMedicineId,
          original_medicine_id: medicineId,
          new_medicine_id: medicineId,
          actual_quantity: 0 // Setting quantity to 0 effectively removes the medicine
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        showNotification('success', 'Success', 'Removed medicine from prescription');
        fetchPrescriptionDetails(); // Refresh the prescription details
      } else {
        showNotification('error', 'Error', 'Failed to remove medicine');
      }
    } catch (error) {
      console.error('Error removing medicine:', error);
      showNotification(
        'error',
        'Error',
        error.response?.data?.message || 'Failed to remove medicine'
      );
    }
  };

  const handleAddMedicine = () => {
    medicineForm.resetFields();
    setAddMedicineModalVisible(true);
  };

  const handleAddMedicineSubmit = async () => {
    try {
      const values = await medicineForm.validateFields();
      const token = localStorage.getItem('token');
      
      // First we need to check if this medicine already exists in the prescription
      const existingMedicine = medicines.find(med => med.medicine?.medicine_id === values.medicine_id);
      
      if (existingMedicine) {
        // If medicine exists, we update its quantity
        const response = await axios.patch(
          `${url1}/pharmacist/prescriptions/${prescriptionId}/update-item`,
          {
            prescription_medicine_id: existingMedicine.prescription_medicine_id,
            medicine_id: values.medicine_id,
            quantity: parseInt(existingMedicine.prescribed.quantity) + parseInt(values.quantity),
            dosage: values.dosage,
            frequency: values.frequency,
            duration: values.duration,
            instructions: values.instructions
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (response.data.success) {
          showNotification('success', 'Success', 'Updated medicine quantity');
          setAddMedicineModalVisible(false);
          fetchPrescriptionDetails();
        }
      } else {
        // Nếu không có API add-item, chúng ta có thể sử dụng API update-item thay thế
        try {
          // Thử sử dụng API add-item
          const response = await axios.post(
            `${url1}/pharmacist/prescriptions/${prescriptionId}/add-item`,
            {
              medicine_id: values.medicine_id,
              quantity: values.quantity,
              dosage: values.dosage,
              frequency: values.frequency,
              duration: values.duration,
              instructions: values.instructions
            },
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          if (response.data.success) {
            showNotification('success', 'Success', 'Added new medicine to prescription');
            setAddMedicineModalVisible(false);
            fetchPrescriptionDetails();
          }
        } catch (error) {
          console.error('Error with add-item API, trying alternative approach:', error);
          
          // Nếu API add-item không tồn tại, chúng ta thử thêm trực tiếp vào danh sách medicines và thông báo cho người dùng
          showNotification('warning', 'API Notice', 'API untuk menambahkan obat baru tidak tersedia. Silakan hubungi admin untuk menambahkan fitur ini.');
          
          // Thêm thuốc vào UI tạm thời để hiển thị
          const selectedMed = availableMedicines.find(med => med.medicine_id === values.medicine_id);
          if (selectedMed) {
            // Đây chỉ là cách hiển thị tạm thời, không lưu vào database
            const tempMedicine = {
              prescription_medicine_id: `temp_${Date.now()}`,  // ID tạm thời
              medicine: {
                medicine_id: selectedMed.medicine_id,
                name: selectedMed.name,
                unit: selectedMed.unit,
                price: selectedMed.price,
                status: selectedMed.is_out_of_stock ? 'Tạm hết hàng' : 'Còn hàng'
              },
              prescribed: {
                quantity: values.quantity,
                dosage: values.dosage,
                frequency: values.frequency,
                duration: values.duration,
                instructions: values.instructions,
                total_price: `${(parseInt(values.quantity) * (parseInt(selectedMed.price) || 0)).toLocaleString('vi-VN')} VNĐ`
              }
            };
            
            setMedicines([...medicines, tempMedicine]);
            setAddMedicineModalVisible(false);
          }
        }
      }
    } catch (error) {
      console.error('Error adding medicine:', error);
      showNotification(
        'error',
        'Error',
        error.response?.data?.message || 'Failed to add medicine'
      );
    }
  };

  const handleRejectPrescription = async () => {
    if (!rejectReason.trim()) {
      showNotification('error', 'Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${url1}/pharmacist/prescriptions/${prescriptionId}/reject`,
        {
          reason: rejectReason
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        showNotification('success', 'Success', 'Prescription rejected successfully');
        setRejectModalVisible(false);
        onClose();
        if (onUpdate) onUpdate();
      } else {
        showNotification('error', 'Error', 'Failed to reject prescription');
      }
    } catch (error) {
      console.error('Error rejecting prescription:', error);
      showNotification(
        'error',
        'Error',
        error.response?.data?.message || 'Failed to reject prescription'
      );
    }
  };

  const handleConfirmPreparation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${url1}/pharmacist/prescriptions/${prescriptionId}/confirm-preparation`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        showNotification('success', 'Success', 'Prescription preparation confirmed');
        onClose();
        if (onUpdate) onUpdate();
      } else {
        showNotification('error', 'Error', 'Failed to confirm prescription preparation');
      }
    } catch (error) {
      console.error('Error confirming prescription preparation:', error);
      showNotification(
        'error',
        'Error',
        error.response?.data?.message || 'Failed to confirm prescription preparation'
      );
    }
  };

  const handleMedicineChange = (value) => {
    const selected = availableMedicines.find(med => med.medicine_id === value);
    setSelectedMedicine(selected);
  };

  const handleQuantityChange = (prescriptionMedicineId, medicineId, currentQuantity, change) => {
    const newQuantity = Math.max(1, parseInt(currentQuantity) + change);
    handleUpdateItem(prescriptionMedicineId, medicineId, 'quantity', newQuantity);
  };

  return (
    <>
      {contextHolder}
      <Drawer
        title={<Title level={4}>Prescription Details #{prescriptionId}</Title>}
        placement="right"
        closable={true}
        onClose={onClose}
        open={visible}
        width="50%"
        extra={
          <Space>
            <Button onClick={onClose}>Back</Button>
            <Button danger onClick={() => setRejectModalVisible(true)}>
              <CloseCircleOutlined /> Reject Prescription
            </Button>
            <Button type="primary" onClick={handleConfirmPreparation}>
              <CheckCircleOutlined /> Confirm Preparation
            </Button>
          </Space>
        }
      >
        {console.log('Render state - loading:', loading, 'prescription:', prescription)}
        {loading ? (
          <div className="flex justify-center items-center p-10">
            <Spin size="large" />
          </div>
        ) : prescription ? (
          <div className="space-y-6">
            {/* Debug Information - Chỉ hiển thị trong môi trường development */}
            {process.env.NODE_ENV === 'development' && (
              <Card title="Debug Information" className="shadow-sm">
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                  {JSON.stringify(prescription, null, 2)}
                </pre>
              </Card>
            )}
            
            {/* Patient Information */}
            <Card title="Patient Information" className="shadow-sm">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong>Name:</Text>{' '}
                  <Text>{prescription.appointment?.patient?.name || 'N/A'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Phone:</Text>{' '}
                  <Text>{prescription.appointment?.patient?.phone_number || 'N/A'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Appointment Date:</Text>{' '}
                  <Text>{prescription.appointment?.datetime || 'N/A'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Doctor:</Text>{' '}
                  <Text>{prescription.appointment?.doctor?.name || 'N/A'}</Text>
                </Col>
              </Row>
            </Card>

            {/* Medicines List */}
            <Card 
              title="Prescription Medicines" 
              className="shadow-sm" 
              extra={
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={handleAddMedicine}
                >
                  Add Medicine
                </Button>
              }
            >
              {Array.isArray(medicines) && medicines.length > 0 ? (
                <List
                  dataSource={medicines}
                  renderItem={(item) => (
                    <List.Item 
                      key={item.prescription_medicine_id}
                      actions={[
                        <Popconfirm
                          title="Are you sure you want to remove this medicine?"
                          onConfirm={() => handleRemoveMedicine(item.prescription_medicine_id, item.medicine?.medicine_id)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button danger icon={<DeleteOutlined />}>Remove</Button>
                        </Popconfirm>
                      ]}
                    >
                      <Card style={{ width: '100%' }} className="mb-2">
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between">
                            <Space>
                              <MedicineBoxOutlined className="text-blue-900" />
                              <Text strong>{item.medicine?.name || 'Unknown Medicine'}</Text>
                              {!item.medicine?.name && (
                                <Tag color="orange">
                                  Debugging: Check console for medicine structure
                                </Tag>
                              )}
                            </Space>
                            <Tag color={item.medicine?.status === 'Còn hàng' ? 'green' : 'red'}>
                              {item.medicine?.status || 'Unknown Status'}
                            </Tag>
                          </div>
                          
                          {process.env.NODE_ENV === 'development' && !item.medicine?.name && (
                            <div className="bg-gray-100 p-2 mb-2 rounded text-xs">
                              <Text strong>Medicine Object Debug:</Text>
                              <pre>{JSON.stringify(item.medicine, null, 2)}</pre>
                              <Text strong>Full Item Debug:</Text>
                              <pre>{JSON.stringify(item, null, 2)}</pre>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <Text type="secondary">Unit Price:</Text>
                              <Text strong className="ml-2">{item.medicine?.price || '0 VNĐ'}</Text>
                            </div>
                            <div>
                              <Text type="secondary">Quantity:</Text>
                              <div className="flex items-center ml-2">
                                <Button 
                                  size="small" 
                                  icon={<MinusOutlined />} 
                                  onClick={() => handleQuantityChange(
                                    item.prescription_medicine_id, 
                                    item.medicine?.medicine_id, 
                                    item.prescribed?.quantity || 0, 
                                    -1
                                  )}
                                />
                                <InputNumber
                                  min={1}
                                  style={{ margin: '0 8px', width: '60px' }}
                                  value={item.prescribed?.quantity}
                                  onChange={(value) => handleUpdateItem(
                                    item.prescription_medicine_id, 
                                    item.medicine?.medicine_id, 
                                    'quantity', 
                                    value
                                  )}
                                />
                                <Button 
                                  size="small" 
                                  icon={<PlusOutlined />} 
                                  onClick={() => handleQuantityChange(
                                    item.prescription_medicine_id, 
                                    item.medicine?.medicine_id, 
                                    item.prescribed?.quantity || 0, 
                                    1
                                  )}
                                />
                              </div>
                            </div>
                            <div>
                              <Text type="secondary">Dosage:</Text>
                              <div className="ml-2">
                                <Input 
                                  value={item.prescribed?.dosage} 
                                  onChange={(e) => handleUpdateItem(
                                    item.prescription_medicine_id, 
                                    item.medicine?.medicine_id, 
                                    'dosage', 
                                    e.target.value
                                  )}
                                />
                              </div>
                            </div>
                            <div>
                              <Text type="secondary">Frequency:</Text>
                              <div className="ml-2">
                                <Input 
                                  value={item.prescribed?.frequency} 
                                  onChange={(e) => handleUpdateItem(
                                    item.prescription_medicine_id, 
                                    item.medicine?.medicine_id, 
                                    'frequency', 
                                    e.target.value
                                  )}
                                />
                              </div>
                            </div>
                            <div>
                              <Text type="secondary">Duration:</Text>
                              <div className="ml-2">
                                <Input 
                                  value={item.prescribed?.duration} 
                                  onChange={(e) => handleUpdateItem(
                                    item.prescription_medicine_id, 
                                    item.medicine?.medicine_id, 
                                    'duration', 
                                    e.target.value
                                  )}
                                />
                              </div>
                            </div>
                            <div>
                              <Text type="secondary">Total Price:</Text>
                              <Text strong className="ml-2">
                                {(() => {
                                  // Tính toán tổng giá dựa trên số lượng và đơn giá
                                  const quantity = item.prescribed?.quantity || 0;
                                  const priceText = item.medicine?.price || '0 VNĐ';
                                  const price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
                                  return `${(quantity * price).toLocaleString('vi-VN')} VNĐ`;
                                })()}
                              </Text>
                            </div>
                          </div>
                          
                          <div className="mt-2">
                            <Text type="secondary">Instructions:</Text>
                            <div className="ml-2">
                              <Input.TextArea 
                                value={item.prescribed?.instructions} 
                                onChange={(e) => handleUpdateItem(
                                  item.prescription_medicine_id, 
                                  item.medicine?.medicine_id, 
                                  'instructions', 
                                  e.target.value
                                )}
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    </List.Item>
                  )}
                  locale={{
                    emptyText: 'No medicines in this prescription'
                  }}
                />
              ) : (
                <Empty description="No medicines found in this prescription" />
              )}
            </Card>

            {/* Payment Information (if available) */}
            {prescription.payment && (
              <Card title="Payment Information" className="shadow-sm">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Text strong>Status:</Text>{' '}
                    <Tag color={prescription.payment.status === 'paid' ? 'green' : 'volcano'}>
                      {prescription.payment.status === 'paid' ? 'PAID' : 'PENDING'}
                    </Tag>
                  </Col>
                  <Col span={12}>
                    <Text strong>Amount:</Text>{' '}
                    <Text>{prescription.payment.amount}</Text>
                  </Col>
                  {prescription.payment.payment_method && (
                    <Col span={12}>
                      <Text strong>Payment Method:</Text>{' '}
                      <Text>{prescription.payment.payment_method}</Text>
                    </Col>
                  )}
                  {prescription.payment.payment_date && (
                    <Col span={12}>
                      <Text strong>Payment Date:</Text>{' '}
                      <Text>{prescription.payment.payment_date}</Text>
                    </Col>
                  )}
                </Row>
              </Card>
            )}
          </div>
        ) : (
          <Empty description="No prescription details found" />
        )}
      </Drawer>

      {/* Add Medicine Modal */}
      <Modal
        title="Add Medicine to Prescription"
        open={addMedicineModalVisible}
        onCancel={() => setAddMedicineModalVisible(false)}
        onOk={handleAddMedicineSubmit}
        confirmLoading={loadingMedicines}
      >
        <Form
          form={medicineForm}
          layout="vertical"
        >
          <Form.Item
            name="medicine_id"
            label="Medicine"
            rules={[{ required: true, message: 'Please select a medicine' }]}
          >
            <Select
              showSearch
              placeholder="Select a medicine"
              optionFilterProp="children"
              onChange={handleMedicineChange}
              loading={loadingMedicines}
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {availableMedicines.map(medicine => (
                <Option key={medicine.medicine_id} value={medicine.medicine_id}>
                  {medicine.name} ({medicine.unit}) - {medicine.price}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedMedicine && (
            <>
              <div className="mb-4">
                <Text type="secondary">Available Quantity:</Text>{' '}
                <Text strong>{selectedMedicine.quantity || 0}</Text>
              </div>
              <div className="mb-4">
                <Text type="secondary">Price:</Text>{' '}
                <Text strong>{selectedMedicine.price}</Text>
              </div>
            </>
          )}

          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[
              { required: true, message: 'Please input quantity' },
              { type: 'number', min: 1, message: 'Quantity must be at least 1' }
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="dosage"
            label="Dosage"
            rules={[{ required: true, message: 'Please input dosage' }]}
          >
            <Input placeholder="E.g., 1 tablet" />
          </Form.Item>

          <Form.Item
            name="frequency"
            label="Frequency"
            rules={[{ required: true, message: 'Please input frequency' }]}
          >
            <Input placeholder="E.g., 3 times per day" />
          </Form.Item>

          <Form.Item
            name="duration"
            label="Duration"
            rules={[{ required: true, message: 'Please input duration' }]}
          >
            <Input placeholder="E.g., 7 days" />
          </Form.Item>

          <Form.Item
            name="instructions"
            label="Instructions"
            rules={[{ required: true, message: 'Please input instructions' }]}
          >
            <Input.TextArea rows={4} placeholder="Instructions for taking the medicine" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reject Prescription Modal */}
      <Modal
        title="Reject Prescription"
        open={rejectModalVisible}
        onCancel={() => setRejectModalVisible(false)}
        onOk={handleRejectPrescription}
        okText="Reject"
        okButtonProps={{ danger: true }}
      >
        <div className="mb-4">
          <Text>Please provide a reason for rejecting this prescription:</Text>
        </div>
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Enter rejection reason"
        />
      </Modal>
    </>
  );
};

export default PrescriptionDetails;
