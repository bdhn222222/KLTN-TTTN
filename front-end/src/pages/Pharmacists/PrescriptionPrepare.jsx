import React, { useState, useEffect, useContext } from 'react';
import { Card, Tag, Button, Typography, notification, Spin, Input, Row, Col, Space, Empty, Badge, Pagination, Tooltip, Modal, List, Layout } from 'antd';
import { SearchOutlined, EyeOutlined, CheckCircleOutlined, MedicineBoxOutlined, PhoneOutlined, CalendarOutlined, UserOutlined, ClockCircleOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import NavbarPhar from '../../components/Pharmacist/NavbarPhar';
import MenuPhar from '../../components/Pharmacist/MenuPhar';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import PrescriptionDetails from '../../components/Pharmacist/PrescriptionDetails';

const { Title, Text, Paragraph } = Typography;
const { Meta } = Card;
const { Sider, Content } = Layout;

const PrescriptionPrepare = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9); // Changed to 9 for 3x3 grid
  const [total, setTotal] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [medicinesModalVisible, setMedicinesModalVisible] = useState(false);
  const { url1, user } = useContext(AppContext);
  const navigate = useNavigate();
  const [api, contextHolder] = notification.useNotification();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(null);

  useEffect(() => {
    fetchPrescriptions();
  }, [page, pageSize]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Using params object for better readability and consistency
      const response = await axios.get(`${url1}/pharmacist/prescriptions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          status: 'pending_prepare',
          page: page,
          limit: pageSize
        }
      });

      if (response.data.success) {
        // Log the entire response to inspect the data structure
        console.log('API Response:', response.data.data);
        
        // Ensure we only process prescriptions with pending_prepare status
        const pendingPrepare = response.data.data.prescriptions.filter(
          prescription => prescription.status === 'pending_prepare'
        );
        
        // Log the filtered prescriptions for debugging
        console.log('Filtered Prescriptions:', pendingPrepare);
        
        setPrescriptions(pendingPrepare);
        setTotal(response.data.data.pagination.total_records);
      } else {
        showNotification('error', 'Error', 'Failed to load prescriptions');
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      showNotification(
        'error',
        'Error',
        error.response?.data?.message || 'Failed to load prescriptions'
      );
    } finally {
      setLoading(false);
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

  const handleSearch = (value) => {
    setSearchText(value);
  };

  const handleViewPrescription = (prescriptionId) => {
    setSelectedPrescriptionId(prescriptionId);
    setDrawerVisible(true);
  };

  const handleStartPrepare = async (prescriptionId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${url1}/pharmacist/prescriptions/${prescriptionId}/start-prepare`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        showNotification('success', 'Success', 'Started preparing prescription');
        fetchPrescriptions();
      } else {
        showNotification('error', 'Error', 'Failed to start preparing prescription');
      }
    } catch (error) {
      console.error('Error starting prescription preparation:', error);
      showNotification(
        'error',
        'Error',
        error.response?.data?.message || 'Failed to start preparing prescription'
      );
    } finally {
      setLoading(false);
    }
  };

  const showMedicinesModal = (prescription) => {
    console.log('Selected Prescription:', prescription);
    console.log('Medicines:', prescription.medicines);
    setSelectedPrescription(prescription);
    setMedicinesModalVisible(true);
  };

  // Filter prescriptions based on search text
  const filteredPrescriptions = prescriptions.filter((prescription) => {
    const searchLower = searchText.toLowerCase();
    return (
      prescription.prescription_id.toString().includes(searchLower) ||
      (prescription.appointment?.doctor?.name || '').toLowerCase().includes(searchLower) ||
      (prescription.appointment?.patient?.name || '').toLowerCase().includes(searchLower) ||
      (prescription.appointment?.patient?.phone_number || '').includes(searchLower)
    );
  });

  const handleDrawerClose = () => {
    setDrawerVisible(false);
    setSelectedPrescriptionId(null);
  };

  const handlePrescriptionUpdated = () => {
    fetchPrescriptions();
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
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
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 64,
            bottom: 0,
          }}
        >
          <div className="logo" />
          <div className="flex justify-end p-4">
            {collapsed ? (
              <MenuUnfoldOutlined className="text-xl cursor-pointer" onClick={() => setCollapsed(false)} />
            ) : (
              <MenuFoldOutlined className="text-xl cursor-pointer" onClick={() => setCollapsed(true)} />
            )}
          </div>
          <MenuPhar collapsed={collapsed} selectedKey="pending_prepare" />
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
          <Content style={{ margin: '24px 16px', overflow: 'initial' }}>
            <Card bordered={false} className="shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <Title level={4}>
                  Pending Preparation Prescriptions
                </Title>
                <Input 
                  placeholder="Search by ID, patient or doctor..." 
                  prefix={<SearchOutlined />} 
                  style={{ width: 300 }}
                  onChange={(e) => handleSearch(e.target.value)}
                  value={searchText}
                  allowClear
                />
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center p-10">
                  <Spin size="large" />
                </div>
              ) : filteredPrescriptions.length === 0 ? (
                <Empty description="No prescriptions pending preparation found" />
              ) : (
                <>
                  <Row gutter={[24, 24]}>
                    {filteredPrescriptions.map(prescription => (
                      <Col xs={24} sm={24} md={12} lg={8} key={prescription.prescription_id}>
                        <Card 
                          hoverable
                          className="h-full"
                          actions={[
                            <Tooltip >
                              <Button 
                                className="!text-blue-900"
                                icon={<EyeOutlined />} 
                                onClick={() => handleViewPrescription(prescription.prescription_id)}
                              >
                                View Details
                              </Button>
                            </Tooltip>,
                            <Tooltip >
                              <Button 
                                
                                icon={<CheckCircleOutlined />} 
                                onClick={() => handleStartPrepare(prescription.prescription_id)}
                                className="!bg-blue-900 !text-white"
                              >
                                Start Prepare
                              </Button>
                            </Tooltip>
                          ]}
                        >
                          <div className="flex justify-between mb-3">
                            <div className=" items-center space-x-2">
                            {/* <Badge status="processing" className="mr-2" /> */}
                            <Text strong>Prescription #{prescription.prescription_id}</Text>
                            </div>
                            <Tag color="gold" className="ml-2">
                              <ClockCircleOutlined /> pending
                            </Tag>
                          </div>
                          
                          <div className="mb-3">
                            <CalendarOutlined className="mr-2 text-gray-500" />
                            <Text className="mr-2">Created:</Text>
                            <Text strong>{dayjs(prescription.created_at).format('DD/MM/YYYY HH:mm')}</Text>
                          </div>
                          
                          <div className="mb-3">
                            <UserOutlined className="mr-2 text-gray-500" />
                            <Text className="mr-2">Patient:</Text>
                            <Text strong>{prescription.appointment?.patient?.name || prescription.appointment?.patient?.user?.username || 'N/A'}</Text>
                          </div>
                          
                          {prescription.appointment?.patient?.phone_number && (
                            <div className="mb-3">
                              <PhoneOutlined className="mr-2 text-gray-500" />
                              <Text className="mr-2">Phone:</Text>
                              <Text strong>{prescription.appointment.patient.phone_number}</Text>
                            </div>
                          )}
                          
                          <div className="mb-3">
                            <UserOutlined className="mr-2 text-gray-500" />
                            <Text className="mr-2">Doctor:</Text>
                            <Text strong>{prescription.appointment?.doctor?.name || prescription.appointment?.doctor?.user?.username || 'N/A'}</Text>
                          </div>
                          
                          <div className="mt-3">
                            <Button 
                              type="dashed" 
                              block 
                              onClick={() => showMedicinesModal(prescription)}
                            >
                              View Medicines ({prescription.medicines?.length || 0})
                            </Button>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  
                  <Pagination
                    current={page}
                    pageSize={pageSize}
                    total={total}
                    onChange={(page, pageSize) => {
                      setPage(page);
                      setPageSize(pageSize);
                    }}
                    showSizeChanger
                    pageSizeOptions={['9', '18', '27']}
                    showTotal={(total) => `Total ${total} prescriptions`}
                    className="mt-6 flex justify-end"
                  />
                </>
              )}
            </Card>
          </Content>
        </Layout>
      </Layout>

      {/* Medicines Modal */}
      <Modal
        title={`Medicines for Prescription #${selectedPrescription?.prescription_id || ''}`}
        open={medicinesModalVisible}
        onCancel={() => setMedicinesModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedPrescription && (
          <List
            dataSource={selectedPrescription.medicines || []}
            renderItem={(item, index) => (
              <List.Item>
                <Card style={{ width: '100%' }} className="mb-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <Text strong>{item.medicine?.name || 'Unknown Medicine'}</Text>
                      <Tag color={item.medicine?.status === 'Còn hàng' ? 'green' : 'red'}>
                        {item.medicine?.status || 'Unknown Status'}
                      </Tag>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Text type="secondary">Quantity:</Text>
                        <Text strong className="ml-2">{item.prescribed.quantity}</Text>
                      </div>
                      <div>
                        <Text type="secondary">Price:</Text>
                        <Text strong className="ml-2">{item.prescribed.total_price}</Text>
                      </div>
                      <div>
                        <Text type="secondary">Dosage:</Text>
                        <Text className="ml-2">{item.prescribed.dosage}</Text>
                      </div>
                      <div>
                        <Text type="secondary">Frequency:</Text>
                        <Text className="ml-2">{item.prescribed.frequency}</Text>
                      </div>
                      <div>
                        <Text type="secondary">Duration:</Text>
                        <Text className="ml-2">{item.prescribed.duration}</Text>
                      </div>
                    </div>
                    
                    {item.prescribed.instructions && (
                      <div>
                        <Text type="secondary">Instructions:</Text>
                        <Paragraph className="ml-2 mb-0">{item.prescribed.instructions}</Paragraph>
                      </div>
                    )}
                  </div>
                </Card>
              </List.Item>
            )}
            locale={{
              emptyText: 'No medicines in this prescription'
            }}
          />
        )}
      </Modal>

      {/* Prescription Details Drawer */}
      <PrescriptionDetails
        visible={drawerVisible}
        prescriptionId={selectedPrescriptionId}
        onClose={handleDrawerClose}
        onUpdate={handlePrescriptionUpdated}
      />
    </Layout>
  );
};

export default PrescriptionPrepare;
