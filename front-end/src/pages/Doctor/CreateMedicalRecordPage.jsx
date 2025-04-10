import React, { useState, useEffect, useContext } from 'react';
import { Layout, Card, Form, Input, Button, Select, InputNumber, Checkbox, Space, notification, Spin, Modal } from 'antd';
import { PlusOutlined, MinusCircleOutlined, MenuUnfoldOutlined, MenuFoldOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import NavbarDoctor from '../../components/Doctor/NavbarDoctor';
import MenuDoctor from '../../components/Doctor/MenuDoctor';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import dayjs from 'dayjs';

const { Content, Sider } = Layout;
const { TextArea } = Input;

const CreateMedicalRecordPage = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appointmentDetail, setAppointmentDetail] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { appointment_id } = useParams();
  const { url1 } = useContext(AppContext);
  const [api, contextHolder] = notification.useNotification();
  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);
  const [isBackModalVisible, setIsBackModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Notification helper
  const showNotification = (type, message, description) => {
    api[type]({
      message: message,
      description: description,
      placement: 'topRight',
      duration: 3,
    });
  };

  // Fetch appointment details
  useEffect(() => {
    const fetchAppointmentDetail = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${url1}/doctor/appointments/${appointment_id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        console.log('API Response full:', response.data);
        const appointmentData = response.data.data;
        console.log('Appointment Data:', appointmentData);
        console.log('Patient Info in API:', appointmentData.patient);

        setAppointmentDetail(appointmentData);
        
        // Check if medical record or prescription exists
        if (appointmentData.medical_record || 
            (appointmentData.prescription && appointmentData.prescription.prescription_id)) {
          setIsEditMode(true);
          
          // Prepare form data from existing records
          const formData = {};
          
          // Fill medical record data if exists
          if (appointmentData.medical_record) {
            formData.diagnosis = appointmentData.medical_record.diagnosis;
            formData.treatment = appointmentData.medical_record.treatment;
            formData.notes = appointmentData.medical_record.notes;
          }
          
          // Fill prescription data if exists
          if (appointmentData.prescription && appointmentData.prescription.prescription_id) {
            // Set prescription note if available
            formData.prescription_note = appointmentData.prescription.note || "";
            // Sửa lỗi logic - chỉ gán true nếu không có giá trị, giữ nguyên false nếu đã là false
            formData.use_hospital_pharmacy = appointmentData.prescription.use_hospital_pharmacy === undefined ? true : appointmentData.prescription.use_hospital_pharmacy;
            
            // Format medicines data for form
            if (appointmentData.prescription.prescriptionMedicines && 
                Array.isArray(appointmentData.prescription.prescriptionMedicines) && 
                appointmentData.prescription.prescriptionMedicines.length > 0) {
                
              console.log('Found prescription medicines:', appointmentData.prescription.prescriptionMedicines);
              
              // Lưu lại các thuộc tính đầy đủ của thuốc
              formData.medicines = appointmentData.prescription.prescriptionMedicines.map(med => ({
                medicine_id: med.medicine_id,
                quantity: med.quantity || 1,
                dosage: med.dosage || "",
                frequency: med.frequency || "",
                duration: med.duration || "",
                instructions: med.instructions || "",
                // Lưu lại thông tin gốc để sử dụng sau này
                prescription_medicine_id: med.prescription_medicine_id,
                created_at: med.created_at,
                updated_at: med.updated_at
              }));
            } else {
              console.log('No prescription medicines found in the data');
              formData.medicines = [{}]; // Default empty medicine
            }
          }
          
          console.log('Setting form values:', formData);
          // Set form values
          form.setFieldsValue(formData);
        }
      } catch (error) {
        console.error('Error fetching appointment details:', error);
        showNotification(
          'error',
          'Error',
          'Unable to load appointment details'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentDetail();
  }, [appointment_id, url1, form]);

  // Fetch medicines list
  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        const response = await axios.get(`${url1}/doctor/medicines`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        console.log('Medicines data:', response.data.medicines);
        setMedicines(response.data.medicines);
      } catch (error) {
        console.error('Error fetching medicines:', error);
        showNotification('error', 'Error', 'Unable to load medicine list');
      }
    };

    fetchMedicines();
  }, [url1]);

  const handleSubmit = () => {
    // Validate form first
    form.validateFields()
      .then(() => {
        setIsSubmitModalVisible(true);
      })
      .catch((error) => {
        console.log('Form validation failed:', error);
      });
  };

  const handleBack = () => {
    setIsBackModalVisible(true);
  };

  const handleConfirmSubmit = async () => {
    const values = form.getFieldsValue();
    console.log('Form values to submit:', values);
    setIsSubmitModalVisible(false);
    try {
      setLoading(true);

      // Verify that we have appointment detail data
      if (!appointmentDetail) {
        console.error('Missing appointment details');
        showNotification(
          'error',
          'Error',
          'Missing appointment information. Please refresh and try again.'
        );
        setLoading(false);
        return;
      }
      
      console.log('Appointment Detail Data:', appointmentDetail);
      
      // Check if we're in edit mode or creating new
      const isUpdateMode = isEditMode;
      console.log('Operation mode:', isUpdateMode ? 'UPDATE' : 'CREATE');
      
      // Create or update medical record
      try {
        const medicalRecordResponse = await axios.post(`${url1}/doctor/medical-records`, {
          appointment_id: Number(appointment_id),
        diagnosis: values.diagnosis,
        treatment: values.treatment,
          notes: values.notes || ""
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

        console.log('Medical record processed successfully:', medicalRecordResponse.data);
        
        // Process prescription (create or update)
        try {
          // Make sure medicines array is valid
          if (!values.medicines || !Array.isArray(values.medicines)) {
            throw new Error('Invalid medicines data format');
          }
          
          // Validate each medicine entry carefully
          console.log('Raw medicines data:', values.medicines);
          
          // Filter out any incomplete medicine entries and ensure all fields have valid values
          const validMedicines = [];
          
          for (let i = 0; i < values.medicines.length; i++) {
            const med = values.medicines[i];
            
            // Skip empty entries
            if (!med || !med.medicine_id) {
              console.log(`Skipping medicine at index ${i} - missing medicine_id`);
              continue;
            }
            
            // Validate required fields and types
            const quantity = Number(med.quantity);
            if (isNaN(quantity) || quantity < 1) {
              console.log(`Invalid quantity for medicine ${med.medicine_id}: ${med.quantity}`);
              continue;
            }
            
            if (!med.dosage || med.dosage.trim() === '') {
              console.log(`Missing dosage for medicine ${med.medicine_id}`);
              continue;
            }
            
            if (!med.frequency || med.frequency.trim() === '') {
              console.log(`Missing frequency for medicine ${med.medicine_id}`);
              continue;
            }
            
            if (!med.duration || med.duration.trim() === '') {
              console.log(`Missing duration for medicine ${med.medicine_id}`);
              continue;
            }
            
            // Add valid medicine to the list
            validMedicines.push({
              medicine_id: Number(med.medicine_id),
              quantity: quantity,
              dosage: String(med.dosage).trim(),
              frequency: String(med.frequency).trim(),
              duration: String(med.duration).trim(),
              instructions: med.instructions ? String(med.instructions).trim() : ""
            });
          }
          
          console.log(`Found ${validMedicines.length} valid medicines out of ${values.medicines.length} total`);
          
          if (validMedicines.length === 0) {
            throw new Error('No valid medicines found. Please add at least one medicine with complete information.');
          }
          
          // Extract patient_id from appointment details
          // Check all possible paths based on API response structure
          let patient_id = null;
          
          if (appointmentDetail.patient && typeof appointmentDetail.patient.id !== 'undefined') {
            patient_id = appointmentDetail.patient.id;
          } else if (appointmentDetail.patient && typeof appointmentDetail.patient.patient_id !== 'undefined') {
            patient_id = appointmentDetail.patient.patient_id;
          } else if (appointmentDetail.Patient && appointmentDetail.Patient.patient_id) {
            patient_id = appointmentDetail.Patient.patient_id;
          } else if (appointmentDetail.appointment_info && appointmentDetail.appointment_info.patient_id) {
            patient_id = appointmentDetail.appointment_info.patient_id;
          }
          
          // If we still don't have patient_id, make another API call to get it
          if (!patient_id) {
            console.log('Patient ID not found in appointment details, attempting to fetch directly');
            try {
              const appointmentResponse = await axios.get(`${url1}/doctor/appointments/${appointment_id}`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              });
              const freshData = appointmentResponse.data.data;
              console.log('Fresh appointment data:', freshData);
              
              // Try to extract patient_id from the fresh data
              if (freshData.patient && typeof freshData.patient.id !== 'undefined') {
                patient_id = freshData.patient.id;
              } else if (freshData.patient && typeof freshData.patient.patient_id !== 'undefined') {
                patient_id = freshData.patient.patient_id;
              } else if (freshData.Patient && freshData.Patient.patient_id) {
                patient_id = freshData.Patient.patient_id;
              }
            } catch (error) {
              console.error('Error fetching fresh appointment data:', error);
            }
          }
          
          console.log('Extracted patient_id:', patient_id);
          
          if (!patient_id) {
            console.error('Could not determine patient_id from appointment data');
            throw new Error('Could not determine patient ID. Please refresh and try again.');
          }
          
          // Check if we need to update or create a new prescription
          let prescriptionResponse;
          
          if (isUpdateMode && appointmentDetail.prescription && appointmentDetail.prescription.prescription_id) {
            console.log('Updating existing prescription:', appointmentDetail.prescription.prescription_id);
            
            // Lấy danh sách thuốc cũ từ dữ liệu API
            const existingMedicines = appointmentDetail.prescription.prescriptionMedicines || [];
            console.log('Existing medicines:', existingMedicines);
            
            // Chuẩn bị dữ liệu cho thuốc - kết hợp giữa thông tin cũ và mới
            const updatedMedicines = validMedicines.map(medicine => {
              // Tìm thuốc tương ứng trong danh sách cũ (nếu có)
              const existingMedicine = existingMedicines.find(m => m.medicine_id === medicine.medicine_id);
              
              if (existingMedicine) {
                // Nếu thuốc đã tồn tại, giữ lại prescription_medicine_id và thêm thông tin mới
                return {
                  ...medicine,
                  prescription_medicine_id: existingMedicine.prescription_medicine_id
                };
              }
              
              // Nếu là thuốc mới, chỉ cần thông tin mới
              return medicine;
            });
            
            // Prepare prescription update data
            const prescriptionUpdateData = {
              prescription_id: appointmentDetail.prescription.prescription_id,
              appointment_id: Number(appointment_id),
              patient_id: Number(patient_id),
              medicines: updatedMedicines,
              use_hospital_pharmacy: values.use_hospital_pharmacy, // Truyền giá trị trực tiếp
              note: values.prescription_note ? String(values.prescription_note).trim() : ""
            };
            
            console.log('Sending prescription update data:', JSON.stringify(prescriptionUpdateData, null, 2));
            
            try {
              // Try to update the prescription if an update endpoint exists
              const stringifiedUpdateData = JSON.stringify(prescriptionUpdateData);
              console.log('Update string data being sent:', stringifiedUpdateData);
              
              prescriptionResponse = await axios({
                method: 'put',
                url: `${url1}/doctor/prescriptions/${appointmentDetail.prescription.prescription_id}`,
                data: prescriptionUpdateData,
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
                }
              });
              console.log('Prescription updated successfully:', prescriptionResponse.data);
            } catch (updateError) {
              console.error('Error updating prescription:', updateError);
              
              // Nếu lỗi xảy ra khi use_hospital_pharmacy=false, thử lại với use_hospital_pharmacy=true
              // Chỉ retry khi giá trị hiện tại là false
              if (updateError.response && values.use_hospital_pharmacy === false) {
                console.log('Error occurred with use_hospital_pharmacy=false during update, retrying with use_hospital_pharmacy=true');
                
                try {
                  prescriptionResponse = await axios({
                    method: 'put',
                    url: `${url1}/doctor/prescriptions/${appointmentDetail.prescription.prescription_id}`,
                    data: { ...prescriptionUpdateData, use_hospital_pharmacy: true },
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  console.log('Prescription updated successfully with use_hospital_pharmacy=true:', prescriptionResponse.data);
                  
                  // Thông báo cho người dùng
                  showNotification(
                    'warning',
                    'Note',
                    'Prescription was updated with hospital pharmacy option enabled to avoid errors'
                  );
                  return; // Continue with normal flow
                } catch (retryUpdateError) {
                  console.error('Update retry also failed, falling back to create:', retryUpdateError);
                  // Continue to fallback code below
                }
              }
              
              console.log('Falling back to creating a new prescription');
              
              // If update fails (e.g., endpoint doesn't exist), fall back to creating a new one
              const newPrescriptionData = {
                appointment_id: Number(appointment_id),
                patient_id: Number(patient_id),
                medicines: validMedicines,
                use_hospital_pharmacy: values.use_hospital_pharmacy, // Truyền giá trị trực tiếp
                note: values.prescription_note ? String(values.prescription_note).trim() : "",
                status: "pending_prepare"
              };
              
              try {
                const stringifiedNewData = JSON.stringify(newPrescriptionData);
                console.log('New prescription data after update failure:', stringifiedNewData);
                
                prescriptionResponse = await axios({
                  method: 'post',
                  url: `${url1}/doctor/prescriptions`,
                  data: newPrescriptionData,
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                  }
                });
                console.log('Prescription created successfully:', prescriptionResponse.data);
              } catch (createError) {
                console.error('Error creating new prescription after update failure:', createError);
                
                // Nếu lỗi xảy ra khi use_hospital_pharmacy=false, thử lại với use_hospital_pharmacy=true
                if (createError.response && values.use_hospital_pharmacy === false) {
                  console.log('Error occurred with use_hospital_pharmacy=false during create, retrying with use_hospital_pharmacy=true');
                  
                  prescriptionResponse = await axios({
                    method: 'post',
                    url: `${url1}/doctor/prescriptions`,
                    data: { ...newPrescriptionData, use_hospital_pharmacy: true },
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  console.log('Prescription created successfully with use_hospital_pharmacy=true after update failure:', prescriptionResponse.data);
                  
                  // Thông báo cho người dùng
                  showNotification(
                    'warning',
                    'Note',
                    'Prescription was created with hospital pharmacy option enabled to avoid errors'
                  );
                } else {
                  throw createError; // Nếu vẫn lỗi, ném lỗi để xử lý bên ngoài
                }
              }
            }
          } else {
            console.log('Creating new prescription');
            
            // Prepare prescription data with all required fields
            const prescriptionData = {
              appointment_id: Number(appointment_id),
              patient_id: Number(patient_id),
              medicines: validMedicines,
              use_hospital_pharmacy: values.use_hospital_pharmacy, // Truyền giá trị trực tiếp
              note: values.prescription_note ? String(values.prescription_note).trim() : "",
              status: "pending_prepare" // Set initial prescription status
            };
            
            // Log giá trị use_hospital_pharmacy khi submit
            console.log("Checkbox value:", values.use_hospital_pharmacy);
            console.log("Final prescription data being sent:", prescriptionData);
            
            console.log('Sending prescription data:', JSON.stringify(prescriptionData, null, 2));
            
            // Send prescription data with explicit stringification
            try {
              const prescriptionDataString = JSON.stringify(prescriptionData);
              console.log('Stringified prescription data:', prescriptionDataString);
              
              prescriptionResponse = await axios({
                method: 'post',
                url: `${url1}/doctor/prescriptions`,
                data: prescriptionData,
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
                }
              });
              
              console.log('Prescription created successfully:', prescriptionResponse.data);
            } catch (prescriptionCreateError) {
              console.error('Error creating prescription:', prescriptionCreateError);
              
              // Nếu lỗi xảy ra khi use_hospital_pharmacy=false, thử lại với use_hospital_pharmacy=true
              if (prescriptionCreateError.response && values.use_hospital_pharmacy === false) {
                console.log('Error occurred with use_hospital_pharmacy=false, retrying with use_hospital_pharmacy=true');
                
                try {
                  prescriptionResponse = await axios({
                    method: 'post',
                    url: `${url1}/doctor/prescriptions`,
                    data: { ...prescriptionData, use_hospital_pharmacy: true },
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  console.log('Prescription created successfully with use_hospital_pharmacy=true:', prescriptionResponse.data);
                  
                  // Thông báo cho người dùng
                  showNotification(
                    'warning',
                    'Note',
                    'Prescription was created with hospital pharmacy option enabled to avoid errors'
                  );
                } catch (retryError) {
                  console.error('Retry failed:', retryError);
                  throw prescriptionCreateError; // Ném lỗi ban đầu
                }
              } else {
                throw prescriptionCreateError;
              }
            }
          }
          
          // If we're not in update mode, complete the appointment
          if (!isUpdateMode) {
            // Complete the appointment and create Payment record with initial status
            try {
              // Call the completeAppointment endpoint to finish the appointment
              const completeResponse = await axios.post(`${url1}/doctor/appointments/complete`, {
                appointment_id: Number(appointment_id)
              }, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              });

              console.log('Appointment completed successfully:', completeResponse.data);
              
              showNotification(
                'success',
                'Success',
                'Medical record and prescription created successfully'
              );
            } catch (completeError) {
              console.error('Error completing appointment:', completeError);
              
              showNotification(
                'warning',
                'Partial Success',
                'Medical record and prescription processed, but failed to complete appointment'
              );
            }
          } else {
            showNotification(
              'success',
              'Success',
              'Medical record and prescription updated successfully'
            );
          }
          
          // Kiểm tra nếu đang trong chế độ cập nhật
          if (!isUpdateMode) {
            // Lấy trạng thái thực tế của prescription từ response API
            const actualPrescriptionStatus = prescriptionResponse?.data?.data?.status || "pending_prepare";
            console.log("Actual prescription status from API:", actualPrescriptionStatus);
            
            // Nếu tạo mới, sử dụng trạng thái thực tế từ API
            navigate(`/doctor/appointments/${appointment_id}/payment`, { 
              state: { 
                paymentStatus: "pending", 
                prescriptionStatus: actualPrescriptionStatus,
                appointmentStatus: "completed"
              }
            });
          } else {
            // Nếu đang cập nhật, lấy trạng thái từ API response nếu có
            const actualPrescriptionStatus = prescriptionResponse?.data?.data?.status || 
                                           appointmentDetail.prescription?.status || 
                                           "pending_prepare";
            console.log("Actual prescription status from API (update mode):", actualPrescriptionStatus);
            
            const currentPaymentStatus = appointmentDetail.payment?.status || "pending";
            const currentAppointmentStatus = appointmentDetail.appointment_info?.status || "completed";
            
            navigate(`/doctor/appointments/${appointment_id}/payment`, { 
              state: { 
                paymentStatus: currentPaymentStatus, 
                prescriptionStatus: actualPrescriptionStatus,
                appointmentStatus: currentAppointmentStatus
              }
            });
          }
          
        } catch (prescriptionError) {
          console.error('Error processing prescription:', prescriptionError);
          
          if (prescriptionError.response) {
            console.error('Error data:', prescriptionError.response.data);
            console.error('Error status:', prescriptionError.response.status);
          }
          
          // Show detailed error for prescription creation/update
          showNotification(
            'error',
            'Error processing prescription',
            prescriptionError.response?.data?.message || 
            prescriptionError.response?.data?.error || 
            prescriptionError.message || 
            'Failed to process prescription'
          );
          
          // Navigate back to the appointment list since we've already created/updated the medical record
      navigate('/doctor/appointments/accepted');
        }
      } catch (medicalRecordError) {
        console.error('Error processing medical record:', medicalRecordError);
        
        // Display specific error message from server
        const errorMessage = 
          medicalRecordError.response?.data?.message || 
          medicalRecordError.response?.data?.error || 
          'Unable to process medical record';
        
        showNotification(
          'error',
          'Error processing medical record',
          errorMessage
        );
      }
    } catch (error) {
      console.error('General error in form submission:', error);
      
      showNotification(
        'error',
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };
  

  const handleConfirmBack = () => {
    setIsBackModalVisible(false);
    navigate(-1); // Go back to previous page
  };

  if (loading && !appointmentDetail) {
    return <Spin size="large" className="flex justify-center items-center min-h-screen" />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
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
              <MenuUnfoldOutlined className="text-xl" onClick={() => setCollapsed(false)} />
            ) : (
              <MenuFoldOutlined className="text-xl" onClick={() => setCollapsed(true)} />
            )}
          </div>
          <MenuDoctor 
            collapsed={collapsed} 
            selectedKey="accepted"
          />
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
          {/* Fixed buttons container */}
          <div className="fixed top-16 right-0 left-[250px] z-10 bg-white shadow-sm transition-all duration-300 py-4 px-6"
               style={{ left: collapsed ? '80px' : '250px' }}>
            <div className="flex justify-between items-center">
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={handleBack}
                className="!text-blue-900 hover:!text-blue-700 border-0 shadow-none"
                type="text"
              >
                Back
              </Button>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={loading}
                className="!bg-blue-900 !text-white px-8 py-2 h-auto rounded-full font-light hover:!bg-blue-800 hover:!text-white border border-blue-800 transition duration-300"
              >
                {isEditMode ? 'Update' : 'Success'}
              </Button>
              {/* Submit Confirmation Modal */}
            <Modal
              title="Confirmation"
              open={isSubmitModalVisible}
              onOk={handleConfirmSubmit}
              onCancel={() => setIsSubmitModalVisible(false)}
              okText="Confirm"
              cancelText="Cancel"
              okButtonProps={{
                className: '!bg-blue-900 !text-white hover:!bg-blue-800'
              }}
            >
              <p>{isEditMode 
                ? 'Are you sure you want to update this medical record and prescription?' 
                : 'Are you sure you want to complete this medical record and prescription?'}</p>
            </Modal>

            {/* Back Confirmation Modal */}
            <Modal
              title="Confirmation"
              open={isBackModalVisible}
              onOk={handleConfirmBack}
              onCancel={() => setIsBackModalVisible(false)}
              okText="Confirm"
              cancelText="Cancel"
              okButtonProps={{
                className: '!bg-blue-900 !text-white hover:!bg-blue-800'
              }}
            >
              <p>Are you sure you want to leave? Unsaved changes will be lost.</p>
            </Modal>

            </div>
            
          </div>

          <Content style={{ margin: '24px 16px', marginTop: '80px', overflow: 'initial' }}>
            {/* Patient Information Card */}
            <Card title="Patient Information" className="shadow-sm mb-4">
              {appointmentDetail && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>Patient Name:</strong> {appointmentDetail.patient.name}</p>
                    <p><strong>Email:</strong> {appointmentDetail.patient.email}</p>
                  </div>
                  <div>
                    <p><strong>Appointment Time:</strong> {dayjs(appointmentDetail.appointment_info.datetime).format('DD/MM/YYYY HH:mm')}</p>
                    <p><strong>Fee:</strong> {appointmentDetail.appointment_info.fees?.toLocaleString('vi-VN')} VNĐ</p>
                  </div>
                </div>
              )}
            </Card>
            <br />

            {/* Medical Record and Prescription Form */}
            <Card title={isEditMode ? "Update Medical Record and Prescription" : "Create Medical Record and Prescription"} className="shadow-sm">
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                  use_hospital_pharmacy: true,
                  medicines: [{}]
                }}
              >
                {/* Medical Record Section */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">Medical Record</h2>
                  <Form.Item
                    name="diagnosis"
                    label="Diagnosis"
                    rules={[{ required: true, message: 'Please enter a diagnosis' }]}
                  >
                    <TextArea rows={4} />
                  </Form.Item>

                  <Form.Item
                    name="treatment"
                    label="Treatment Method"
                    rules={[{ required: true, message: 'Please enter a treatment method' }]}
                  >
                    <TextArea rows={4} />
                  </Form.Item>

                  <Form.Item
                    name="notes"
                    label="Notes"
                  >
                    <TextArea rows={3} />
                  </Form.Item>
                </div>

                {/* Prescription Section */}
                <div>
                  <h2 className="text-lg font-semibold mb-4">Prescription</h2>
                  
                  <Form.List name="medicines">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                            <Form.Item
                              {...restField}
                              name={[name, 'medicine_id']}
                              rules={[{ required: true, message: 'Please select a medicine' }]}
                            >
                              <Select
                                showSearch
                                placeholder="Select medicine"
                                style={{ width: 200 }}
                                filterOption={(input, option) =>
                                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={medicines.map(med => ({
                                  value: med.medicine_id,
                                  label: `${med.name} (${med.unit})`
                                }))}
                              />
                            </Form.Item>

                            <Form.Item
                              {...restField}
                              name={[name, 'quantity']}
                              rules={[{ required: true, message: 'Enter quantity' }]}
                            >
                              <InputNumber min={1} placeholder="Quantity" />
                            </Form.Item>

                            <Form.Item
                              {...restField}
                              name={[name, 'dosage']}
                              rules={[{ required: true, message: 'Enter dosage' }]}
                            >
                              <Input placeholder="Dosage" />
                            </Form.Item>

                            <Form.Item
                              {...restField}
                              name={[name, 'frequency']}
                              rules={[{ required: true, message: 'Enter frequency' }]}
                            >
                              <Input placeholder="Frequency" />
                            </Form.Item>

                            <Form.Item
                              {...restField}
                              name={[name, 'duration']}
                              rules={[{ required: true, message: 'Enter duration' }]}
                            >
                              <Input placeholder="Duration" />
                            </Form.Item>

                            <Form.Item
                              {...restField}
                              name={[name, 'instructions']}
                            >
                              <Input placeholder="Instructions" />
                            </Form.Item>

                            <MinusCircleOutlined onClick={() => remove(name)} />
                          </Space>
                        ))}
                        <Form.Item>
                          <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                            Add Medicine
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>

                  <Form.Item
                    name="prescription_note"
                    label="Prescription Notes"
                  >
                    <TextArea rows={2} />
                  </Form.Item>

                  <Form.Item
                    name="use_hospital_pharmacy"
                    valuePropName="checked"
                  >
                    <Checkbox>Use hospital pharmacy</Checkbox>
                  </Form.Item>
                </div>

                
              </Form>
            </Card>

            
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default CreateMedicalRecordPage; 