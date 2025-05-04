import React, { useState, useEffect, useContext } from "react";
import {
  Layout,
  Card,
  Form,
  Input,
  Button,
  Select,
  InputNumber,
  Checkbox,
  Space,
  notification,
  Spin,
  Modal,
} from "antd";
import {
  PlusOutlined,
  MinusCircleOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import NavbarDoctor from "../../components/Doctor/NavbarDoctor";
import MenuDoctor from "../../components/Doctor/MenuDoctor";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import dayjs from "dayjs";

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
  const showNotification = (type, message, description, duration = 5) => {
    api[type]({
      message: message,
      description: description,
      placement: "topRight",
      duration: duration,
      style:
        type === "success"
          ? {
              borderLeft: "4px solid #52c41a",
            }
          : type === "error"
          ? {
              borderLeft: "4px solid #ff4d4f",
            }
          : type === "warning"
          ? {
              borderLeft: "4px solid #faad14",
            }
          : {
              borderLeft: "4px solid #1890ff",
            },
    });
  };

  // Fetch appointment details
  useEffect(() => {
    const fetchAppointmentDetail = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${url1}/doctor/appointments/${appointment_id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        console.log("API Response full:", response.data);
        const appointmentData = response.data.data;
        console.log("Appointment Data:", appointmentData);
        console.log("FamilyMember Info in API:", appointmentData.familyMember);

        setAppointmentDetail(appointmentData);

        // Check if medical record or prescription exists
        if (
          appointmentData.medical_record ||
          (appointmentData.prescription &&
            appointmentData.prescription.prescription_id)
        ) {
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
          if (
            appointmentData.prescription &&
            appointmentData.prescription.prescription_id
          ) {
            // Set prescription note if available
            formData.prescription_note =
              appointmentData.prescription.note || "";
            // Sửa lỗi logic - chỉ gán true nếu không có giá trị, giữ nguyên false nếu đã là false
            formData.use_hospital_pharmacy =
              appointmentData.prescription.use_hospital_pharmacy === undefined
                ? true
                : appointmentData.prescription.use_hospital_pharmacy;

            // Format medicines data for form
            if (
              appointmentData.prescription.prescriptionMedicines &&
              Array.isArray(
                appointmentData.prescription.prescriptionMedicines
              ) &&
              appointmentData.prescription.prescriptionMedicines.length > 0
            ) {
              console.log(
                "Found prescription medicines:",
                appointmentData.prescription.prescriptionMedicines
              );

              // Lưu lại các thuộc tính đầy đủ của thuốc
              formData.medicines =
                appointmentData.prescription.prescriptionMedicines.map(
                  (med) => ({
                    medicine_id: med.medicine_id,
                    quantity: med.quantity || 1,
                    dosage: med.dosage || "",
                    frequency: med.frequency || "",
                    duration: med.duration || "",
                    instructions: med.instructions || "",
                    // Lưu lại thông tin gốc để sử dụng sau này
                    prescription_medicine_id: med.prescription_medicine_id,
                    created_at: med.created_at,
                    updated_at: med.updated_at,
                  })
                );
            } else {
              console.log("No prescription medicines found in the data");
              formData.medicines = [{}]; // Default empty medicine
            }
          }

          console.log("Setting form values:", formData);
          // Set form values
          form.setFieldsValue(formData);
        }
      } catch (error) {
        console.error("Error fetching appointment details:", error);
        showNotification("error", "Lỗi", "Không thể tải thông tin cuộc hẹn");
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
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        console.log("Medicines data:", response.data.medicines);
        setMedicines(response.data.medicines);
      } catch (error) {
        console.error("Error fetching medicines:", error);
        showNotification("error", "Error", "Unable to load medicine list");
      }
    };

    fetchMedicines();
  }, [url1]);

  const handleSubmit = () => {
    // Validate form first
    form
      .validateFields()
      .then(() => {
        setIsSubmitModalVisible(true);
      })
      .catch((error) => {
        console.log("Form validation failed:", error);
      });
  };

  const handleBack = () => {
    setIsBackModalVisible(true);
  };

  const handleConfirmSubmit = async () => {
    const values = form.getFieldsValue();
    console.log("Form values to submit:", values);
    setIsSubmitModalVisible(false);
    try {
      setLoading(true);

      // Verify that we have appointment detail data
      if (!appointmentDetail) {
        console.error("Missing appointment details");
        showNotification(
          "error",
          "Thiếu thông tin",
          "Không tìm thấy thông tin cuộc hẹn. Vui lòng làm mới trang và thử lại."
        );
        setLoading(false);
        return;
      }

      console.log("Appointment Detail Data:", appointmentDetail);

      // Check if we're in edit mode or creating new
      const isUpdateMode = isEditMode;
      console.log("Operation mode:", isUpdateMode ? "UPDATE" : "CREATE");

      // Create or update medical record
      try {
        // Show a loading notification
        showNotification(
          "info",
          "Đang xử lý",
          "Hệ thống đang xử lý hồ sơ y tế...",
          0 // No auto-close
        );

        const medicalRecordResponse = await axios.post(
          `${url1}/doctor/medical-records`,
          {
            appointment_id: Number(appointment_id),
            diagnosis: values.diagnosis,
            treatment: values.treatment,
            notes: values.notes || "",
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        console.log(
          "Medical record processed successfully:",
          medicalRecordResponse.data
        );

        // Close the loading notification
        api.destroy();

        // Show success notification for medical record
        showNotification(
          "success",
          "Hồ sơ y tế thành công",
          isUpdateMode
            ? "Đã cập nhật hồ sơ y tế của bệnh nhân"
            : "Đã tạo hồ sơ y tế mới cho bệnh nhân"
        );

        // Process prescription (create or update)
        try {
          // Show loading notification for prescription
          showNotification(
            "info",
            "Đang xử lý",
            "Hệ thống đang xử lý đơn thuốc...",
            0 // No auto-close
          );

          // Make sure medicines array is valid
          if (!values.medicines || !Array.isArray(values.medicines)) {
            throw new Error("Định dạng thuốc không hợp lệ");
          }

          // Validate each medicine entry carefully
          console.log("Raw medicines data:", values.medicines);

          // Filter out any incomplete medicine entries and ensure all fields have valid values
          const validMedicines = [];

          for (let i = 0; i < values.medicines.length; i++) {
            const med = values.medicines[i];

            // Skip empty entries
            if (!med || !med.medicine_id) {
              console.log(
                `Skipping medicine at index ${i} - missing medicine_id`
              );
              continue;
            }

            // Validate required fields and types
            const quantity = Number(med.quantity);
            if (isNaN(quantity) || quantity < 1) {
              console.log(
                `Invalid quantity for medicine ${med.medicine_id}: ${med.quantity}`
              );
              continue;
            }

            if (!med.dosage || med.dosage.trim() === "") {
              console.log(`Missing dosage for medicine ${med.medicine_id}`);
              continue;
            }

            if (!med.frequency || med.frequency.trim() === "") {
              console.log(`Missing frequency for medicine ${med.medicine_id}`);
              continue;
            }

            if (!med.duration || med.duration.trim() === "") {
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
              instructions: med.instructions
                ? String(med.instructions).trim()
                : "",
            });
          }

          console.log(
            `Found ${validMedicines.length} valid medicines out of ${values.medicines.length} total`
          );

          if (validMedicines.length === 0) {
            throw new Error(
              "Không tìm thấy thuốc hợp lệ. Vui lòng thêm ít nhất một loại thuốc với đầy đủ thông tin."
            );
          }

          // Extract family_member_id from appointment details
          // Check all possible paths based on API response structure
          let family_member_id = null;

          if (
            appointmentDetail.familyMember &&
            typeof appointmentDetail.familyMember.id !== "undefined"
          ) {
            family_member_id = appointmentDetail.familyMember.id;
          } else if (
            appointmentDetail.familyMember &&
            typeof appointmentDetail.familyMember.family_member_id !==
              "undefined"
          ) {
            family_member_id = appointmentDetail.familyMember.family_member_id;
          } else if (
            appointmentDetail.FamilyMember &&
            appointmentDetail.FamilyMember.family_member_id
          ) {
            family_member_id = appointmentDetail.FamilyMember.family_member_id;
          } else if (
            appointmentDetail.appointment_info &&
            appointmentDetail.appointment_info.family_member_id
          ) {
            family_member_id =
              appointmentDetail.appointment_info.family_member_id;
          }

          // If we still don't have family_member_id, make another API call to get it
          if (!family_member_id) {
            console.log(
              "Family member ID not found in appointment details, attempting to fetch directly"
            );
            try {
              const appointmentResponse = await axios.get(
                `${url1}/doctor/appointments/${appointment_id}`,
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                }
              );
              const freshData = appointmentResponse.data.data;
              console.log("Fresh appointment data:", freshData);

              // Try to extract family_member_id from the fresh data
              if (
                freshData.familyMember &&
                typeof freshData.familyMember.id !== "undefined"
              ) {
                family_member_id = freshData.familyMember.id;
              } else if (
                freshData.familyMember &&
                typeof freshData.familyMember.family_member_id !== "undefined"
              ) {
                family_member_id = freshData.familyMember.family_member_id;
              } else if (
                freshData.FamilyMember &&
                freshData.FamilyMember.family_member_id
              ) {
                family_member_id = freshData.FamilyMember.family_member_id;
              }
            } catch (error) {
              console.error("Error fetching fresh appointment data:", error);
              // Close the loading notification
              api.destroy();
              showNotification(
                "error",
                "Lỗi dữ liệu",
                "Không thể tải thông tin bệnh nhân từ máy chủ"
              );
            }
          }

          console.log("Extracted family_member_id:", family_member_id);

          if (!family_member_id) {
            console.error(
              "Could not determine family_member_id from appointment data"
            );
            throw new Error(
              "Không thể xác định ID thành viên gia đình. Vui lòng làm mới trang và thử lại."
            );
          }

          // Check if we need to update or create a new prescription
          let prescriptionResponse;

          if (
            isUpdateMode &&
            appointmentDetail.prescription &&
            appointmentDetail.prescription.prescription_id
          ) {
            console.log(
              "Updating existing prescription:",
              appointmentDetail.prescription.prescription_id
            );

            // Lấy danh sách thuốc cũ từ dữ liệu API
            const existingMedicines =
              appointmentDetail.prescription.prescriptionMedicines || [];
            console.log("Existing medicines:", existingMedicines);

            // Chuẩn bị dữ liệu cho thuốc - kết hợp giữa thông tin cũ và mới
            const updatedMedicines = validMedicines.map((medicine) => {
              // Tìm thuốc tương ứng trong danh sách cũ (nếu có)
              const existingMedicine = existingMedicines.find(
                (m) => m.medicine_id === medicine.medicine_id
              );

              if (existingMedicine) {
                // Nếu thuốc đã tồn tại, giữ lại prescription_medicine_id và thêm thông tin mới
                return {
                  ...medicine,
                  prescription_medicine_id:
                    existingMedicine.prescription_medicine_id,
                };
              }

              // Nếu là thuốc mới, chỉ cần thông tin mới
              return medicine;
            });

            // Prepare prescription update data
            const prescriptionUpdateData = {
              prescription_id: appointmentDetail.prescription.prescription_id,
              appointment_id: Number(appointment_id),
              family_member_id: Number(family_member_id),
              medicines: updatedMedicines,
              use_hospital_pharmacy: values.use_hospital_pharmacy, // Truyền giá trị trực tiếp
              note: values.prescription_note
                ? String(values.prescription_note).trim()
                : "",
            };

            console.log(
              "Sending prescription update data:",
              JSON.stringify(prescriptionUpdateData, null, 2)
            );

            try {
              // Try to update the prescription if an update endpoint exists
              const stringifiedUpdateData = JSON.stringify(
                prescriptionUpdateData
              );
              console.log(
                "Update string data being sent:",
                stringifiedUpdateData
              );

              prescriptionResponse = await axios({
                method: "put",
                url: `${url1}/doctor/prescriptions/${appointmentDetail.prescription.prescription_id}`,
                data: prescriptionUpdateData,
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                  "Content-Type": "application/json",
                },
              });
              console.log(
                "Prescription updated successfully:",
                prescriptionResponse.data
              );

              // Close loading notification
              api.destroy();

              // Show success notification
              showNotification(
                "success",
                "Đơn thuốc thành công",
                "Đã cập nhật đơn thuốc cho bệnh nhân"
              );
            } catch (updateError) {
              console.error("Error updating prescription:", updateError);

              // Close loading notification
              api.destroy();

              // Nếu lỗi xảy ra khi use_hospital_pharmacy=false, thử lại với use_hospital_pharmacy=true
              // Chỉ retry khi giá trị hiện tại là false
              if (
                updateError.response &&
                values.use_hospital_pharmacy === false
              ) {
                console.log(
                  "Error occurred with use_hospital_pharmacy=false during update, retrying with use_hospital_pharmacy=true"
                );

                // Show retry notification
                showNotification(
                  "warning",
                  "Đang thử lại",
                  "Có lỗi xảy ra, hệ thống đang thử lại với tùy chọn nhà thuốc bệnh viện...",
                  0
                );

                try {
                  prescriptionResponse = await axios({
                    method: "put",
                    url: `${url1}/doctor/prescriptions/${appointmentDetail.prescription.prescription_id}`,
                    data: {
                      ...prescriptionUpdateData,
                      use_hospital_pharmacy: true,
                    },
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem("token")}`,
                      "Content-Type": "application/json",
                    },
                  });

                  console.log(
                    "Prescription updated successfully with use_hospital_pharmacy=true:",
                    prescriptionResponse.data
                  );

                  // Close retry notification
                  api.destroy();

                  // Thông báo cho người dùng
                  showNotification(
                    "success",
                    "Đơn thuốc thành công",
                    "Đã cập nhật đơn thuốc với tùy chọn sử dụng nhà thuốc bệnh viện để tránh lỗi"
                  );
                  return; // Continue with normal flow
                } catch (retryUpdateError) {
                  console.error(
                    "Update retry also failed, falling back to create:",
                    retryUpdateError
                  );
                  // Close retry notification
                  api.destroy();

                  // Show fallback notification
                  showNotification(
                    "warning",
                    "Đang chuyển đổi phương thức",
                    "Không thể cập nhật đơn thuốc, đang thử tạo mới...",
                    0
                  );
                  // Continue to fallback code below
                }
              } else {
                // Show error for update failure
                showNotification(
                  "error",
                  "Lỗi cập nhật đơn thuốc",
                  updateError.response?.data?.message ||
                    "Không thể cập nhật đơn thuốc, đang thử phương pháp khác"
                );
              }

              console.log("Falling back to creating a new prescription");

              // If update fails (e.g., endpoint doesn't exist), fall back to creating a new one
              const newPrescriptionData = {
                appointment_id: Number(appointment_id),
                family_member_id: Number(family_member_id),
                medicines: validMedicines,
                use_hospital_pharmacy: values.use_hospital_pharmacy, // Truyền giá trị trực tiếp
                note: values.prescription_note
                  ? String(values.prescription_note).trim()
                  : "",
                status: "pending_prepare",
              };

              try {
                const stringifiedNewData = JSON.stringify(newPrescriptionData);
                console.log(
                  "New prescription data after update failure:",
                  stringifiedNewData
                );

                prescriptionResponse = await axios({
                  method: "post",
                  url: `${url1}/doctor/prescriptions`,
                  data: newPrescriptionData,
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json",
                  },
                });
                console.log(
                  "Prescription created successfully:",
                  prescriptionResponse.data
                );

                // Close loading/fallback notification
                api.destroy();

                // Show success notification
                showNotification(
                  "success",
                  "Đơn thuốc thành công",
                  "Đã tạo đơn thuốc mới cho bệnh nhân"
                );
              } catch (createError) {
                console.error(
                  "Error creating new prescription after update failure:",
                  createError
                );

                // Close loading/fallback notification
                api.destroy();

                // Nếu lỗi xảy ra khi use_hospital_pharmacy=false, thử lại với use_hospital_pharmacy=true
                if (
                  createError.response &&
                  values.use_hospital_pharmacy === false
                ) {
                  console.log(
                    "Error occurred with use_hospital_pharmacy=false during create, retrying with use_hospital_pharmacy=true"
                  );

                  // Show final retry notification
                  showNotification(
                    "warning",
                    "Đang thử lần cuối",
                    "Đang thử lại với tùy chọn nhà thuốc bệnh viện...",
                    0
                  );

                  try {
                    prescriptionResponse = await axios({
                      method: "post",
                      url: `${url1}/doctor/prescriptions`,
                      data: {
                        ...newPrescriptionData,
                        use_hospital_pharmacy: true,
                      },
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                          "token"
                        )}`,
                        "Content-Type": "application/json",
                      },
                    });

                    console.log(
                      "Prescription created successfully with use_hospital_pharmacy=true after update failure:",
                      prescriptionResponse.data
                    );

                    // Close retry notification
                    api.destroy();

                    // Thông báo cho người dùng
                    showNotification(
                      "success",
                      "Đơn thuốc thành công",
                      "Đã tạo đơn thuốc với tùy chọn sử dụng nhà thuốc bệnh viện để tránh lỗi"
                    );
                  } catch (finalError) {
                    // Close retry notification
                    api.destroy();

                    // Show final error
                    showNotification(
                      "error",
                      "Lỗi đơn thuốc",
                      "Đã thử mọi cách nhưng không thể xử lý đơn thuốc. Vui lòng thử lại sau."
                    );
                    throw finalError;
                  }
                } else {
                  // Show error for create failure
                  showNotification(
                    "error",
                    "Lỗi tạo đơn thuốc",
                    createError.response?.data?.message ||
                      "Không thể tạo đơn thuốc mới"
                  );
                  throw createError; // Nếu vẫn lỗi, ném lỗi để xử lý bên ngoài
                }
              }
            }
          } else {
            console.log("Creating new prescription");

            // Prepare prescription data with all required fields
            const prescriptionData = {
              appointment_id: Number(appointment_id),
              family_member_id: Number(family_member_id),
              medicines: validMedicines,
              use_hospital_pharmacy: values.use_hospital_pharmacy, // Truyền giá trị trực tiếp
              note: values.prescription_note
                ? String(values.prescription_note).trim()
                : "",
              status: "pending_prepare", // Set initial prescription status
            };

            // Log giá trị use_hospital_pharmacy khi submit
            console.log("Checkbox value:", values.use_hospital_pharmacy);
            console.log(
              "Final prescription data being sent:",
              prescriptionData
            );

            console.log(
              "Sending prescription data:",
              JSON.stringify(prescriptionData, null, 2)
            );

            // Send prescription data with explicit stringification
            try {
              const prescriptionDataString = JSON.stringify(prescriptionData);
              console.log(
                "Stringified prescription data:",
                prescriptionDataString
              );

              prescriptionResponse = await axios({
                method: "post",
                url: `${url1}/doctor/prescriptions`,
                data: prescriptionData,
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                  "Content-Type": "application/json",
                },
              });

              console.log(
                "Prescription created successfully:",
                prescriptionResponse.data
              );

              // Close loading notification
              api.destroy();

              // Show success notification
              showNotification(
                "success",
                "Đơn thuốc thành công",
                "Đã tạo đơn thuốc mới cho bệnh nhân"
              );
            } catch (prescriptionCreateError) {
              console.error(
                "Error creating prescription:",
                prescriptionCreateError
              );

              // Close loading notification
              api.destroy();

              // Nếu lỗi xảy ra khi use_hospital_pharmacy=false, thử lại với use_hospital_pharmacy=true
              if (
                prescriptionCreateError.response &&
                values.use_hospital_pharmacy === false
              ) {
                console.log(
                  "Error occurred with use_hospital_pharmacy=false, retrying with use_hospital_pharmacy=true"
                );

                // Show retry notification
                showNotification(
                  "warning",
                  "Đang thử lại",
                  "Có lỗi xảy ra, đang thử lại với tùy chọn nhà thuốc bệnh viện...",
                  0
                );

                try {
                  prescriptionResponse = await axios({
                    method: "post",
                    url: `${url1}/doctor/prescriptions`,
                    data: { ...prescriptionData, use_hospital_pharmacy: true },
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem("token")}`,
                      "Content-Type": "application/json",
                    },
                  });

                  console.log(
                    "Prescription created successfully with use_hospital_pharmacy=true:",
                    prescriptionResponse.data
                  );

                  // Close retry notification
                  api.destroy();

                  // Thông báo cho người dùng
                  showNotification(
                    "success",
                    "Đơn thuốc thành công",
                    "Đã tạo đơn thuốc với tùy chọn sử dụng nhà thuốc bệnh viện để tránh lỗi"
                  );
                } catch (retryError) {
                  console.error("Retry failed:", retryError);

                  // Close retry notification
                  api.destroy();

                  // Show final error
                  showNotification(
                    "error",
                    "Lỗi đơn thuốc",
                    "Không thể tạo đơn thuốc sau nhiều lần thử. Vui lòng kiểm tra lại thông tin thuốc."
                  );
                  throw prescriptionCreateError; // Ném lỗi ban đầu
                }
              } else {
                // Show detailed error
                showNotification(
                  "error",
                  "Lỗi tạo đơn thuốc",
                  prescriptionCreateError.response?.data?.message ||
                    "Không thể tạo đơn thuốc. Vui lòng kiểm tra dữ liệu và thử lại."
                );
                throw prescriptionCreateError;
              }
            }
          }

          // If we're not in update mode, complete the appointment
          if (!isUpdateMode) {
            // Complete the appointment and create Payment record with initial status
            try {
              // Show loading notification
              showNotification(
                "info",
                "Đang hoàn thành",
                "Đang hoàn thành lịch hẹn...",
                0
              );

              // Call the completeAppointment endpoint to finish the appointment
              const completeResponse = await axios.post(
                `${url1}/doctor/appointments/complete`,
                {
                  appointment_id: Number(appointment_id),
                },
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                }
              );

              console.log(
                "Appointment completed successfully:",
                completeResponse.data
              );

              // Close loading notification
              api.destroy();

              showNotification(
                "success",
                "Hoàn thành",
                "Hồ sơ y tế, đơn thuốc và cuộc hẹn đã được hoàn thành thành công",
                10
              );

              // Navigate back to the appointments page instead of payment page
              setTimeout(() => {
                navigate("/doctor/appointments/completed");
              }, 1500);
            } catch (completeError) {
              console.error("Error completing appointment:", completeError);

              // Close loading notification
              api.destroy();

              showNotification(
                "warning",
                "Hoàn thành một phần",
                "Hồ sơ y tế và đơn thuốc đã được xử lý, nhưng không thể hoàn thành cuộc hẹn. Lỗi: " +
                  (completeError.response?.data?.message || "Lỗi máy chủ"),
                10
              );

              // Still navigate back to appointments page
              setTimeout(() => {
                navigate("/doctor/appointments/accepted");
              }, 1500);
            }
          } else {
            showNotification(
              "success",
              "Hoàn thành",
              "Hồ sơ y tế và đơn thuốc đã được cập nhật thành công",
              5
            );

            // Navigate back to the appointments page
            setTimeout(() => {
              navigate("/doctor/appointments/accepted");
            }, 1500);
          }
        } catch (prescriptionError) {
          console.error("Error processing prescription:", prescriptionError);

          // Close loading notification
          api.destroy();

          if (prescriptionError.response) {
            console.error("Error data:", prescriptionError.response.data);
            console.error("Error status:", prescriptionError.response.status);
          }

          // Show detailed error for prescription creation/update
          showNotification(
            "error",
            "Lỗi khi xử lý đơn thuốc",
            prescriptionError.response?.data?.message ||
              prescriptionError.response?.data?.error ||
              prescriptionError.message ||
              "Không thể xử lý đơn thuốc",
            8
          );

          // Navigate back to the appointment list since we've already created/updated the medical record
          setTimeout(() => {
            navigate("/doctor/appointments/accepted");
          }, 2000);
        }
      } catch (medicalRecordError) {
        console.error("Error processing medical record:", medicalRecordError);

        // Close loading notification
        api.destroy();

        // Display specific error message from server
        const errorMessage =
          medicalRecordError.response?.data?.message ||
          medicalRecordError.response?.data?.error ||
          "Không thể xử lý hồ sơ y tế";

        showNotification("error", "Lỗi xử lý hồ sơ y tế", errorMessage, 8);

        // Don't navigate away so the user can fix the issue
      }
    } catch (error) {
      console.error("General error in form submission:", error);

      // Close any loading notifications
      api.destroy();

      showNotification(
        "error",
        "Lỗi không xác định",
        "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại hoặc liên hệ quản trị viên.",
        8
      );

      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBack = () => {
    setIsBackModalVisible(false);
    navigate(-1); // Go back to previous page
  };

  if (loading && !appointmentDetail) {
    return (
      <Spin
        size="large"
        className="flex justify-center items-center min-h-screen"
      />
    );
  }

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
          <MenuDoctor collapsed={collapsed} selectedKey="accepted" />
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 250, marginTop: 64 }}>
          {/* Fixed buttons container */}
          <div
            className="fixed top-16 right-0 left-[250px] z-10 bg-white shadow-sm transition-all duration-300 py-4 px-6"
            style={{ left: collapsed ? "80px" : "250px" }}
          >
            <div className="flex justify-between items-center">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleBack}
                className="!text-blue-900 hover:!text-blue-700 border-0 shadow-none"
                type="text"
              >
                Quay lại
              </Button>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={loading}
                className="!bg-blue-900 !text-white px-8 py-2 h-auto rounded-full font-light hover:!bg-blue-800 hover:!text-white border border-blue-800 transition duration-300"
              >
                {isEditMode ? "Cập nhật" : "Hoàn thành"}
              </Button>
              {/* Submit Confirmation Modal */}
              <Modal
                title="Xác nhận"
                open={isSubmitModalVisible}
                onOk={handleConfirmSubmit}
                onCancel={() => setIsSubmitModalVisible(false)}
                okText="Xác nhận"
                cancelText="Hủy"
                okButtonProps={{
                  className: "!bg-blue-900 !text-white hover:!bg-blue-800",
                }}
              >
                <p>
                  {isEditMode
                    ? "Bạn có chắc chắn muốn cập nhật hồ sơ y tế và đơn thuốc này?"
                    : "Bạn có chắc chắn muốn hoàn thành hồ sơ y tế và đơn thuốc này?"}
                </p>
              </Modal>

              {/* Back Confirmation Modal */}
              <Modal
                title="Xác nhận"
                open={isBackModalVisible}
                onOk={handleConfirmBack}
                onCancel={() => setIsBackModalVisible(false)}
                okText="Xác nhận"
                cancelText="Hủy"
                okButtonProps={{
                  className: "!bg-blue-900 !text-white hover:!bg-blue-800",
                }}
              >
                <p>
                  Bạn có chắc chắn muốn rời đi? Các thay đổi chưa lưu sẽ bị mất.
                </p>
              </Modal>
            </div>
          </div>

          <Content
            style={{
              margin: "24px 16px",
              marginTop: "80px",
              overflow: "initial",
            }}
          >
            {/* Patient Information Card */}
            <Card title="Thông tin bệnh nhân" className="shadow-sm mb-4">
              {appointmentDetail && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p>
                      <strong>Tên bệnh nhân:</strong>{" "}
                      {appointmentDetail.familyMember?.name ||
                        appointmentDetail.FamilyMember?.name ||
                        "N/A"}
                    </p>
                    <p>
                      <strong>Email:</strong>{" "}
                      {appointmentDetail.familyMember?.email ||
                        appointmentDetail.FamilyMember?.email ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Thời gian hẹn:</strong>{" "}
                      {appointmentDetail.appointment_info?.datetime
                        ? dayjs(
                            appointmentDetail.appointment_info.datetime
                          ).format("DD/MM/YYYY HH:mm")
                        : "N/A"}
                    </p>
                    <p>
                      <strong>Phí khám:</strong>{" "}
                      {appointmentDetail.appointment_info?.fees?.toLocaleString(
                        "vi-VN"
                      ) || "N/A"}{" "}
                      VNĐ
                    </p>
                  </div>
                </div>
              )}
            </Card>
            <br />

            {/* Medical Record and Prescription Form */}
            <Card
              title={
                isEditMode
                  ? "Cập nhật hồ sơ y tế và đơn thuốc"
                  : "Tạo hồ sơ y tế và đơn thuốc"
              }
              className="shadow-sm"
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                  use_hospital_pharmacy: true,
                  medicines: [{}],
                }}
              >
                {/* Medical Record Section */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">Hồ sơ y tế</h2>
                  <Form.Item
                    name="diagnosis"
                    label="Chẩn đoán"
                    rules={[
                      { required: true, message: "Vui lòng nhập chẩn đoán" },
                    ]}
                  >
                    <TextArea rows={4} />
                  </Form.Item>

                  <Form.Item
                    name="treatment"
                    label="Phương pháp điều trị"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập phương pháp điều trị",
                      },
                    ]}
                  >
                    <TextArea rows={4} />
                  </Form.Item>

                  <Form.Item name="notes" label="Ghi chú">
                    <TextArea rows={3} />
                  </Form.Item>
                </div>

                {/* Prescription Section */}
                <div>
                  <h2 className="text-lg font-semibold mb-4">Đơn thuốc</h2>

                  <Form.List name="medicines">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <Space
                            key={key}
                            style={{ display: "flex", marginBottom: 8 }}
                            align="baseline"
                          >
                            <Form.Item
                              {...restField}
                              name={[name, "medicine_id"]}
                              rules={[
                                {
                                  required: true,
                                  message: "Vui lòng chọn thuốc",
                                },
                              ]}
                            >
                              <Select
                                showSearch
                                placeholder="Chọn thuốc"
                                style={{ width: 200 }}
                                filterOption={(input, option) =>
                                  (option?.label ?? "")
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                                }
                                options={medicines.map((med) => ({
                                  value: med.medicine_id,
                                  label: `${med.name} (${med.unit})`,
                                }))}
                              />
                            </Form.Item>

                            <Form.Item
                              {...restField}
                              name={[name, "quantity"]}
                              rules={[
                                { required: true, message: "Nhập số lượng" },
                              ]}
                            >
                              <InputNumber min={1} placeholder="Số lượng" />
                            </Form.Item>

                            <Form.Item
                              {...restField}
                              name={[name, "dosage"]}
                              rules={[
                                { required: true, message: "Nhập liều dùng" },
                              ]}
                            >
                              <Input placeholder="Liều dùng" />
                            </Form.Item>

                            <Form.Item
                              {...restField}
                              name={[name, "frequency"]}
                              rules={[
                                { required: true, message: "Nhập tần suất" },
                              ]}
                            >
                              <Input placeholder="Tần suất" />
                            </Form.Item>

                            <Form.Item
                              {...restField}
                              name={[name, "duration"]}
                              rules={[
                                {
                                  required: true,
                                  message: "Nhập thời gian dùng",
                                },
                              ]}
                            >
                              <Input placeholder="Thời gian dùng" />
                            </Form.Item>

                            <Form.Item
                              {...restField}
                              name={[name, "instructions"]}
                            >
                              <Input placeholder="Hướng dẫn" />
                            </Form.Item>

                            <MinusCircleOutlined onClick={() => remove(name)} />
                          </Space>
                        ))}
                        <Form.Item>
                          <Button
                            type="dashed"
                            onClick={() => add()}
                            block
                            icon={<PlusOutlined />}
                          >
                            Thêm thuốc
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>

                  <Form.Item name="prescription_note" label="Ghi chú đơn thuốc">
                    <TextArea rows={2} />
                  </Form.Item>

                  <Form.Item
                    name="use_hospital_pharmacy"
                    valuePropName="checked"
                  >
                    <Checkbox>Sử dụng nhà thuốc bệnh viện</Checkbox>
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
