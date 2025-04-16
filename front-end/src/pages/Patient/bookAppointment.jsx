import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import {
  Steps,
  Form,
  Radio,
  Input,
  DatePicker,
  Card,
  Button,
  Select,
  Divider,
  Row,
  Col,
  Modal,
  Checkbox,
  Tabs,
  Tag,
  Pagination,
  Avatar,
  List,
  Badge,
  notification,
  Empty,
  Spin,
  message,
  Rate,
  Typography,
  Calendar,
  Alert,
} from "antd";
import {
  PlusOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  EditOutlined,
  UserAddOutlined,
  WomanOutlined,
  ManOutlined,
  MailOutlined,
  SolutionOutlined,
  CloudFilled,
} from "@ant-design/icons";

// Kích hoạt plugins cho dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

const { Step } = Steps;
const { Option } = Select;

const styles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  .specialization-card {
    height: 100%;
    transition: all 0.3s;
    cursor: pointer;
  }

  .specialization-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .specialization-card.selected {
    border: 2px solid #1890ff;
  }

  .specialization-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 16px;
  }

  .specialization-info {
    margin-top: 16px;
  }

  .specialization-info h3 {
    margin-bottom: 8px;
    color: #1890ff;
  }

  .doctor-card {
    height: 100%;
    transition: all 0.3s;
  }

  .doctor-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .doctor-card.selected {
    border: 2px solid #1890ff;
  }

  .doctor-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 16px;
  }

  .doctor-info {
    margin-top: 16px;
  }

  .doctor-info h3 {
    margin-bottom: 8px;
    color: #1890ff;
  }

  .custom-calendar .ant-picker-calendar {
    background: white;
    border-radius: 8px;
  }
  .custom-calendar .ant-picker-calendar-date-today {
    border-color: #1E3A8A;
  }
  .custom-calendar .ant-picker-calendar-date-selected {
    background: #1E3A8A;
    color: white;
  }
  .custom-calendar .ant-picker-calendar-date:hover {
    background: #F8FAFC;
  }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

const BookAppointment = () => {
  // const navigate = useNavigate();
  const { url1, navigate } = useContext(AppContext);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("doctor"); // "doctor" hoặc "symptoms"
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [familyMembersLoading, setFamilyMembersLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedMember, setSelectedMember] = useState("self");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [recommendedDoctor, setRecommendedDoctor] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [tempSelectedDate, setTempSelectedDate] = useState(null);
  const [doctorDayOffs, setDoctorDayOffs] = useState([]);
  const [dateMessage, setDateMessage] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);

  // Thêm state cho modal xác nhận
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [tempTabChange, setTempTabChange] = useState(null);

  // State cho modal
  const [showSpecializationModal, setShowSpecializationModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showMemberDetailModal, setShowMemberDetailModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState("self");
  const [editForm] = Form.useForm();
  const [addForm] = Form.useForm();
  const [doctorsBySpecialization, setDoctorsBySpecialization] = useState({});
  const [selectedSession, setSelectedSession] = useState(""); // "morning" hoặc "afternoon"
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6); // Số lượng bác sĩ hiển thị trên mỗi trang
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSpecializations, setLoadingSpecializations] = useState(false);
  const [loadingDoctorsBySpecialization, setLoadingDoctorsBySpecialization] =
    useState(false);

  // Form data cho bệnh nhân hoặc người thân
  const [patientData, setPatientData] = useState({
    username: "",
    dob: "",
    phone_number: "",
    gender: "male",
  });

  // Helpers để hiển thị mối quan hệ bằng tiếng Việt
  const relationshipLabels = {
    me: "Tôi",
    child: "Con",
    wife: "Vợ",
    husband: "Chồng",
    father: "Bố",
    mother: "Mẹ",
    other: "Khác",
  };

  // Add this state to store doctor info persistently
  const [doctorInfo, setDoctorInfo] = useState(null);

  // Lấy danh sách người thân
  const fetchFamilyMembers = async () => {
    setFamilyMembersLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        notification.error({
          message: "Lỗi xác thực",
          description: "Vui lòng đăng nhập lại",
          placement: "topRight",
          duration: 3,
        });
        navigate("/login");
        return;
      }

      const response = await axios.get(`${url1}/patient/family-members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success && response.data.data) {
        // Đảm bảo mỗi family member có trường dob tương thích với giao diện
        const familyMembersWithDob = response.data.data.map((member) => ({
          ...member,
          dob: member.date_of_birth || member.dob,
        }));

        // Kiểm tra xem đã có relationship "me" chưa
        const hasMeRelationship = familyMembersWithDob.some(
          (member) => member.relationship === "me"
        );

        if (!hasMeRelationship) {
          // Nếu chưa có, thêm thông tin người dùng hiện tại với relationship "me"
          const userResponse = await axios.get(`${url1}/patients/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (userResponse.data.success && userResponse.data.data) {
            const currentUser = userResponse.data.data;
            const meRelationship = {
              ...currentUser,
              relationship: "me",
              family_member_id: currentUser.user_id,
              dob: currentUser.date_of_birth || currentUser.dob,
            };
            familyMembersWithDob.unshift(meRelationship);
          }
        }

        setFamilyMembers(familyMembersWithDob);

        // Tự động chọn "me" làm người khám mặc định
        const meUser = familyMembersWithDob.find(
          (member) => member.relationship === "me"
        );
        if (meUser) {
          handleMemberSelect(meUser);
        }
      } else {
        notification.warning({
          message: "Chưa có người thân",
          description: "Bạn chưa thêm người thân nào vào danh sách",
          placement: "topRight",
          duration: 3,
        });
        setFamilyMembers([]);
      }
    } catch (error) {
      console.error("Error fetching family members:", error);
      if (error.response?.status === 401) {
        notification.error({
          message: "Lỗi xác thực",
          description: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          placement: "topRight",
          duration: 3,
        });
        navigate("/login");
      } else {
        notification.error({
          message: "Lỗi kết nối",
          description:
            "Không thể lấy danh sách người thân. Vui lòng thử lại sau.",
          placement: "topRight",
          duration: 3,
        });
      }
      setFamilyMembers([]);
    } finally {
      setFamilyMembersLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyMembers();
  }, [url1, navigate]);

  // Lấy thông tin chi tiết người thân
  const showMemberDetail = async (member) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        notification.error({
          message: "Lỗi xác thực",
          description: "Vui lòng đăng nhập lại",
        });
        navigate("/login");
        return;
      }

      // Đặt trạng thái loading
      setLoading(true);

      const response = await axios.get(
        `${url1}/patient/family-members/${member.family_member_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success && response.data.data) {
        const memberDetail = response.data.data;

        // Set form values với dữ liệu chi tiết
        editForm.setFieldsValue({
          username: memberDetail.username,
          gender: memberDetail.gender,
          dob: dayjs(memberDetail.date_of_birth),
          relationship: memberDetail.relationship,
          phone_number: memberDetail.phone_number,
          email: memberDetail.email || "",
        });

        // Cập nhật state với thông tin chi tiết
        setSelectedFamilyMember({
          ...member,
          ...memberDetail,
        });

        // Hiển thị modal
        setShowMemberDetailModal(true);
      } else {
        notification.warning({
          message: "Cảnh báo",
          description: "Không tìm thấy thông tin chi tiết",
        });
      }
    } catch (error) {
      console.error("Error fetching member detail:", error);
      if (error.response?.status === 401) {
        notification.error({
          message: "Lỗi xác thực",
          description: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        });
        navigate("/login");
      } else if (error.response?.status === 404) {
        notification.error({
          message: "Lỗi",
          description: "Không tìm thấy thông tin người thân",
        });
      } else {
        notification.error({
          message: "Lỗi",
          description: "Không thể lấy thông tin chi tiết người thân",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Lấy thông tin người dùng hiện tại
  // const fetchCurrentUser = async () => {
  //   try {
  //     const token = localStorage.getItem("token");
  //     const response = await axios.get(`${url1}/patient/profile`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });

  //     if (response.data.data) {
  //       const userData = response.data.data;
  //       setPatientData({
  //         username: userData.username || "",
  //         dob: userData.dob || "",
  //         phone_number: userData.phone_number || "",
  //         gender: userData.gender || "male",
  //       });

  //       // Đặt giá trị cho form
  //       form.setFieldsValue({
  //         username: userData.username || "",
  //         dob: userData.dob ? dayjs(userData.dob) : null,
  //         phone_number: userData.phone_number || "",
  //         gender: userData.gender || "male",
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Error fetching user profile:", error);
  //     // Đặt giá trị mẫu
  //     const sampleUserData = {
  //       username: "Người dùng",
  //       dob: "1990-01-01",
  //       phone_number: "0123456789",
  //       gender: "male",
  //     };

  //     setPatientData(sampleUserData);
  //     form.setFieldsValue({
  //       ...sampleUserData,
  //       dob: dayjs(sampleUserData.dob),
  //     });
  //   }
  // };

  // Lấy danh sách bác sĩ
  const fetchDoctors = async () => {
    try {
      const response = await axios.get(`${url1}/patient/doctors`);
      setDoctors(response.data.data);
      // Nhóm bác sĩ theo chuyên khoa
      if (response.data.data && response.data.data.length > 0) {
        groupDoctorsBySpecialization(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      // Dữ liệu mẫu nếu API không hoạt động
      const sampleDoctors = [
        {
          doctor_id: 1,
          user: {
            username: "Dr. Nguyễn",
            avatar_url: "https://randomuser.me/api/portraits/men/1.jpg",
          },
          Specialization: { specialization_id: 1, name: "Nhi" },
          degree: "Bác sĩ chuyên khoa I",
          experience: "5 năm",
          description: "Chuyên gia về bệnh nhi khoa",
        },
        {
          doctor_id: 2,
          user: {
            username: "Dr. Trần",
            avatar_url: "https://randomuser.me/api/portraits/women/2.jpg",
          },
          Specialization: { specialization_id: 2, name: "Tim mạch" },
          degree: "Bác sĩ chuyên khoa II",
          experience: "10 năm",
          description: "Chuyên gia về bệnh tim mạch",
        },
        {
          doctor_id: 3,
          user: {
            username: "Dr. Lê",
            avatar_url: "https://randomuser.me/api/portraits/men/3.jpg",
          },
          Specialization: { specialization_id: 3, name: "Tổng hợp" },
          degree: "Tiến sĩ Y khoa",
          experience: "8 năm",
          description: "Bác sĩ đa khoa",
        },
        {
          doctor_id: 4,
          user: {
            username: "Dr. Phạm",
            avatar_url: "https://randomuser.me/api/portraits/women/4.jpg",
          },
          Specialization: { specialization_id: 1, name: "Nhi" },
          degree: "Bác sĩ chuyên khoa I",
          experience: "7 năm",
          description: "Chuyên gia về bệnh nhi khoa",
        },
        {
          doctor_id: 5,
          user: {
            username: "Dr. Hoàng",
            avatar_url: "https://randomuser.me/api/portraits/men/5.jpg",
          },
          Specialization: { specialization_id: 2, name: "Tim mạch" },
          degree: "Bác sĩ chuyên khoa I",
          experience: "6 năm",
          description: "Chuyên gia về bệnh tim mạch",
        },
      ];
      setDoctors(sampleDoctors);
      groupDoctorsBySpecialization(sampleDoctors);
      notification.error({
        message: "Lỗi kết nối",
        description: "Sử dụng dữ liệu mẫu cho bác sĩ",
      });
    }
  };

  // Nhóm bác sĩ theo chuyên khoa
  const groupDoctorsBySpecialization = (doctorsList) => {
    const grouped = {};
    doctorsList.forEach((doctor) => {
      const specId = doctor.Specialization?.specialization_id;
      if (specId) {
        if (!grouped[specId]) {
          grouped[specId] = [];
        }
        grouped[specId].push(doctor);
      }
    });
    setDoctorsBySpecialization(grouped);
  };

  // Lấy danh sách triệu chứng
  const fetchSymptoms = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        notification.error({
          message: "Lỗi xác thực",
          description: "Vui lòng đăng nhập lại",
          placement: "topRight",
          duration: 3,
        });
        navigate("/login");
        return;
      }

      const response = await axios.get(`${url1}/patient/symptoms`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // console.log("Symptoms API response:", response.data);

      if (response.data.success && response.data.data) {
        const symptomsData = response.data.data.data || [];
        setSymptoms(symptomsData);
        // console.log("Set symptoms:", symptomsData);
      } else {
        setSymptoms([]);
        notification.warning({
          message: "Thông báo",
          description: response.data.message || "Không có triệu chứng nào",
          placement: "topRight",
          duration: 3,
        });
      }
    } catch (error) {
      console.error("Error fetching symptoms:", error);
      if (error.response?.status === 401) {
        notification.error({
          message: "Lỗi xác thực",
          description: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          placement: "topRight",
          duration: 3,
        });
        navigate("/login");
      } else {
        setSymptoms([]);
        notification.error({
          message: "Lỗi kết nối",
          description: "Không thể lấy danh sách triệu chứng",
          placement: "topRight",
          duration: 3,
        });
      }
    }
  };

  // Gọi API khi component mount
  useEffect(() => {
    fetchSymptoms();
  }, []);

  // Log symptoms state khi nó thay đổi
  useEffect(() => {
    // console.log("Current symptoms state:", symptoms);
  }, [symptoms]);

  // Lấy danh sách chuyên khoa
  const fetchSpecializations = useCallback(async () => {
    try {
      setLoadingSpecializations(true);
      const response = await axios.get(`${url1}/patient/specializations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.data.success) {
        setSpecializations(response.data.data);
      } else {
        message.error(
          response.data.message || "Không thể tải danh sách chuyên khoa"
        );
      }
    } catch (error) {
      console.error("Error fetching specializations:", error);
      message.error("Có lỗi xảy ra khi tải danh sách chuyên khoa");
    } finally {
      setLoadingSpecializations(false);
    }
  }, []);

  // Fetch doctors by specialization
  const fetchDoctorsBySpecialization = useCallback(
    async (specializationId) => {
      try {
        setLoadingDoctorsBySpecialization(true);
        const token = localStorage.getItem("token");
        if (!token) {
          message.error("Vui lòng đăng nhập lại");
          navigate("/login");
          return;
        }

        console.log("Fetching doctors for specialization:", specializationId);
        const response = await axios.get(
          `${url1}/patient/doctors?specialization_id=${specializationId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("Doctors API response:", response.data);

        if (response.data.success) {
          const doctorsData = response.data.data || [];
          console.log("Doctors data:", doctorsData);
          setDoctors(doctorsData);
          setShowDoctorModal(true);

          if (doctorsData.length === 0) {
            message.info("Không có bác sĩ nào trong chuyên khoa này");
          }
        } else {
          message.error(
            response.data.message || "Không thể tải danh sách bác sĩ"
          );
        }
      } catch (error) {
        console.error("Error fetching doctors:", error);
        if (error.response?.status === 401) {
          message.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          navigate("/login");
        } else {
          message.error("Có lỗi xảy ra khi tải danh sách bác sĩ");
        }
      } finally {
        setLoadingDoctorsBySpecialization(false);
      }
    },
    [url1, navigate]
  );

  // Handle specialization selection
  const handleSpecializationSelect = useCallback(
    (specialization) => {
      console.log("Selected specialization:", specialization);
      setSelectedSpecialization(specialization);
      setShowDoctorModal(true);
      fetchDoctorsBySpecialization(specialization.specialization_id);
    },
    [fetchDoctorsBySpecialization]
  );

  // useEffect(() => {
  //   fetchCurrentUser();
  // }, [url1, navigate, form]);

  useEffect(() => {
    fetchDoctors();
    fetchSpecializations();
  }, [url1, navigate]);

  // Function cập nhật thông tin người thân
  const handleUpdateMember = async () => {
    try {
      const values = await editForm.validateFields();
      const token = localStorage.getItem("token");

      // Format dữ liệu để gửi đến API
      const formattedValues = {
        username: values.username,
        gender: values.gender,
        date_of_birth: dayjs(values.dob).format("YYYY-MM-DD"),
        relationship: values.relationship,
        phone_number: values.phone_number,
        email: values.email || "",
      };

      const response = await axios.patch(
        `${url1}/patient/family-members/${selectedFamilyMember.family_member_id}`,
        formattedValues,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        notification.success({
          message: "Cập nhật thành công",
          description: "Thông tin người thân đã được cập nhật thành công!",
          placement: "topRight",
          duration: 3,
        });
        setShowMemberDetailModal(false);

        // Cập nhật danh sách người thân
        const updatedFamilyMembers = familyMembers.map((member) => {
          if (
            member.family_member_id === selectedFamilyMember.family_member_id
          ) {
            return {
              ...member,
              ...formattedValues,
              dob: formattedValues.date_of_birth,
            };
          }
          return member;
        });

        setFamilyMembers(updatedFamilyMembers);
      } else {
        notification.error({
          message: "Cập nhật thất bại",
          description:
            response.data.message || "Không thể cập nhật thông tin người thân",
          placement: "topRight",
          duration: 3,
        });
      }
    } catch (error) {
      console.error("Error updating member:", error);
      notification.error({
        message: "Cập nhật thất bại",
        description:
          error.response?.data?.message ||
          "Có lỗi xảy ra khi cập nhật thông tin",
        placement: "topRight",
        duration: 3,
      });
    }
  };

  // Function thêm người thân mới
  const handleAddMember = async () => {
    try {
      const values = await addForm.validateFields();

      // Format dữ liệu để gửi đến API
      const formattedValues = {
        username: values.username,
        gender: values.gender,
        date_of_birth: dayjs(values.dob).format("YYYY-MM-DD"),
        relationship: values.relationship,
        phone_number: values.phone_number,
        email: values.email || "",
      };

      const response = await axios.post(
        `${url1}/patient/add-family-member`,
        formattedValues,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.data.success) {
        const newMember = response.data.data;
        notification.success({
          message: "Thêm thành công",
          description: "Thêm người thân mới thành công!",
          placement: "topRight",
          duration: 3,
        });
        setShowAddMemberModal(false);

        // Thêm trường dob để tương thích với giao diện
        const memberWithDob = {
          ...newMember,
          dob: newMember.date_of_birth,
        };

        // Cập nhật danh sách người thân
        setFamilyMembers([...familyMembers, memberWithDob]);

        // Chọn người thân mới thêm vào để đặt lịch
        handleMemberSelect(memberWithDob);
      } else {
        notification.error({
          message: "Thêm thất bại",
          description: response.data.message || "Không thể thêm người thân mới",
          placement: "topRight",
          duration: 3,
        });
      }
    } catch (error) {
      if (error.response) {
        notification.error({
          message: "Thêm thất bại",
          description:
            error.response.data.message || "Không thể thêm người thân mới",
          placement: "topRight",
          duration: 3,
        });
      } else if (error.request) {
        notification.error({
          message: "Lỗi kết nối",
          description: "Không thể kết nối đến máy chủ",
          placement: "topRight",
          duration: 3,
        });
      } else {
        notification.error({
          message: "Lỗi",
          description: "Có lỗi xảy ra khi thêm người thân mới",
          placement: "topRight",
          duration: 3,
        });
      }
    }
  };

  // Xử lý khi thay đổi trang trong modal chọn bác sĩ
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Ngày có thể đặt lịch (hiện tại + 7 ngày tới, trừ thứ 7 và chủ nhật)
  const getAvailableDates = () => {
    const today = dayjs();
    const dates = [];
    let currentDate = today;

    // Get next 3 available weekdays
    while (dates.length < 3) {
      currentDate = currentDate.add(1, "day");
      if (currentDate.day() !== 0 && currentDate.day() !== 6) {
        // Skip weekends
        dates.push({
          date: currentDate,
          day: `Thứ ${
            currentDate.day() === 0 ? "Chủ nhật" : currentDate.day() + 1
          }`,
          disabled: false,
        });
      }
    }

    return dates;
  };

  // Lấy danh sách giờ khám theo ca
  const getSessionTimes = () => {
    if (!selectedSession) return [];

    const times = [];
    if (selectedSession === "morning") {
      // Ca sáng: 8:00-11:30, mỗi 30 phút
      for (let h = 8; h <= 11; h++) {
        for (let m of ["00", "30"]) {
          if (h === 11 && m === "30") continue;
          times.push(`${h.toString().padStart(2, "0")}:${m}`);
        }
      }
    } else {
      // Ca chiều: 13:30-17:00, mỗi 30 phút
      for (let h = 13; h <= 17; h++) {
        for (let m of ["00", "30"]) {
          if (h === 13 && m === "00") continue;
          if (h === 17 && m === "30") continue;
          times.push(`${h.toString().padStart(2, "0")}:${m}`);
        }
      }
    }
    return times;
  };

  // Xử lý khi thay đổi thông tin bệnh nhân/người thân
  const handlePatientDataChange = (changedValues, allValues) => {
    setPatientData({
      ...patientData,
      ...changedValues,
    });
  };

  // Xử lý khi chọn/bỏ chọn triệu chứng
  const handleSymptomToggle = (checkedValues) => {
    setSelectedSymptoms(checkedValues);
    if (checkedValues.length === 0) {
      setSelectedDoctor(null);
    }
  };

  // Xử lý khi chọn bác sĩ
  const handleDoctorSelect = async (doctor) => {
    console.log("Selected doctor:", doctor);
    setSelectedDoctor(doctor);
    setShowDoctorModal(false);

    try {
      // Fetch doctor's day off
      const response = await axios.get(
        `${url1}/patient/doctor/${doctor.doctor_id}/day-off`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.data.success) {
        const dayOffs = response.data.data || [];
        setDoctorDayOffs(dayOffs);
      }
    } catch (error) {
      console.error("Error fetching doctor's day off:", error);
      message.error("Không thể tải thông tin ngày nghỉ của bác sĩ");
    }
  };

  // Xử lý khi chọn ca (sáng/chiều)
  const handleSessionSelect = (session) => {
    setSelectedSession(session);
    setSelectedTime(""); // Reset thời gian khi chọn ca mới
  };

  // Chuyển đến bước tiếp theo
  const nextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  // Quay lại bước trước
  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  // Function để hiển thị modal thêm người thân mới
  const handleAddNewMember = () => {
    addForm.resetFields();
    setShowAddMemberModal(true);
  };

  // Function để xử lý khi chọn người thân
  const handleMemberSelect = (member) => {
    if (member === "add_new") {
      handleAddNewMember();
      return;
    }

    if (member === "self") {
      setSelectedMember("self");
      setSelectedFamilyMember("self");
      // Tìm thông tin "me" trong familyMembers
      const meMember = familyMembers.find((m) => m.relationship === "me");
      if (meMember) {
        setPatientData({
          username: meMember.username,
          dob: meMember.date_of_birth || meMember.dob,
          phone_number: meMember.phone_number,
          gender: meMember.gender,
        });
        form.setFieldsValue({
          username: meMember.username,
          dob: meMember.date_of_birth
            ? dayjs(meMember.date_of_birth)
            : dayjs(meMember.dob),
          phone_number: meMember.phone_number,
          gender: meMember.gender,
        });
      }
    } else if (member?.family_member_id) {
      setSelectedMember(member.family_member_id.toString());
      setSelectedFamilyMember(member);
      setPatientData({
        username: member.username,
        dob: member.date_of_birth || member.dob,
        phone_number: member.phone_number,
        gender: member.gender,
      });
      form.setFieldsValue({
        username: member.username,
        dob: member.date_of_birth
          ? dayjs(member.date_of_birth)
          : dayjs(member.dob),
        phone_number: member.phone_number,
        gender: member.gender,
      });
    }
  };

  // Map relationship với avatar tương ứng
  const getAvatarForRelationship = (relationship) => {
    switch (relationship) {
      case "me":
        return <UserOutlined style={{ fontSize: "24px" }} />;
      case "child":
        return <UserOutlined style={{ fontSize: "20px" }} />;
      case "wife":
        return <WomanOutlined style={{ fontSize: "24px" }} />;
      case "husband":
        return <ManOutlined style={{ fontSize: "24px" }} />;
      case "father":
        return <ManOutlined style={{ fontSize: "24px" }} />;
      case "mother":
        return <WomanOutlined style={{ fontSize: "24px" }} />;
      default:
        return <UserOutlined style={{ fontSize: "24px" }} />;
    }
  };

  // Function để render danh sách người thân
  const renderFamilyMembersList = () => {
    // Lọc ra các thành viên không phải "me"
    const otherMembers = familyMembers.filter(
      (member) => member.relationship !== "me"
    );

    return (
      <div
        className="family-members-container"
        style={{ marginBottom: "20px" }}
      >
        <div
          className="family-members-scroll"
          style={{
            display: "flex",
            overflowX: "auto",
            gap: "10px",
            padding: "10px 0",
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": {
              height: "6px",
            },
          }}
        >
          {/* Card cho bản thân - luôn hiển thị ở đầu */}
          <Card
            style={{
              width: 100,
              cursor: "pointer",
              backgroundColor: selectedMember === "self" ? "#white" : "white",
              border:
                selectedMember === "self"
                  ? "2px solid #1E3A8A"
                  : "1px solid #f0f0f0",
              flexShrink: 0,
            }}
            onClick={() => handleMemberSelect("self")}
          >
            <div style={{ textAlign: "center" }}>
              <Avatar
                size={40}
                style={{ backgroundColor: "#1890ff" }}
                icon={getAvatarForRelationship("me")}
              />
              <div style={{ fontSize: "12px", color: "#666", marginTop: 4 }}>
                {relationshipLabels["me"]}
              </div>
            </div>
          </Card>

          {/* Card thêm người thân mới */}
          <Card
            style={{
              width: 100,
              cursor: "pointer",
              backgroundColor: "#f0f0f0",
              flexShrink: 0,
            }}
            onClick={() => handleMemberSelect("add_new")}
          >
            <div style={{ textAlign: "center" }}>
              <Avatar
                size={40}
                style={{ backgroundColor: "#87d068" }}
                icon={<UserAddOutlined />}
              />
              <div style={{ fontSize: "12px", color: "#666", marginTop: 4 }}>
                Thêm
              </div>
            </div>
          </Card>

          {/* Danh sách người thân (không bao gồm "me") */}
          {otherMembers.map((member) => (
            <Card
              key={member.family_member_id}
              style={{
                width: 100,
                cursor: "pointer",
                border:
                  selectedMember === member.family_member_id.toString()
                    ? "2px solid #09437a"
                    : "1px solid #f0f0f0",
                backgroundColor:
                  selectedMember === member.family_member_id.toString()
                    ? "white"
                    : "white",
                flexShrink: 0,
              }}
              onClick={() => handleMemberSelect(member)}
            >
              <div style={{ textAlign: "center" }}>
                <Avatar
                  size={40}
                  style={{
                    backgroundColor:
                      member.gender === "male" ? "#1890ff" : "#ff6b81",
                  }}
                  icon={getAvatarForRelationship(member.relationship)}
                />
                <div style={{ fontSize: "12px", color: "#666", marginTop: 4 }}>
                  {relationshipLabels[member.relationship]}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // Update the doctor modal content
  const renderDoctorModal = () => (
    <Modal
      title={
        <div style={{ color: "#1E3A8A", fontWeight: 600 }}>
          Chọn bác sĩ Khoa {selectedSpecialization?.name}
        </div>
      }
      open={showDoctorModal}
      onCancel={() => setShowDoctorModal(false)}
      footer={null}
      width={800}
    >
      <Spin spinning={loadingDoctors}>
        {doctorsBySpecialization[selectedSpecialization?.specialization_id]
          ?.length > 0 ? (
          <div className="doctors-list">
            {doctorsBySpecialization[
              selectedSpecialization?.specialization_id
            ].map((doctor) => (
              <Card
                key={doctor.doctor_id}
                hoverable
                className={`doctor-card ${
                  selectedDoctor?.doctor_id === doctor.doctor_id
                    ? "selected"
                    : ""
                }`}
                onClick={() => handleDoctorSelect(doctor)}
                style={{
                  marginBottom: "16px",
                  borderColor:
                    selectedDoctor?.doctor_id === doctor.doctor_id
                      ? "#09437a"
                      : "#043059",
                  backgroundColor:
                    selectedDoctor?.doctor_id === doctor.doctor_id
                      ? "white"
                      : "white",
                }}
              >
                <div style={{ display: "flex", gap: "20px" }}>
                  <Avatar
                    size={100}
                    src={doctor.user?.avatar}
                    icon={<UserOutlined />}
                    style={{ flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: "8px" }}>
                      <h3
                        style={{
                          margin: 0,
                          color:
                            selectedDoctor?.doctor_id === doctor.doctor_id
                              ? "#043059"
                              : "#000000",
                          fontSize: "18px",
                          fontWeight: 600,
                        }}
                      >
                        {doctor.user?.username}
                      </h3>
                      <Tag
                        color={
                          selectedDoctor?.doctor_id === doctor.doctor_id
                            ? "#043059"
                            : "#666666"
                        }
                        style={{ marginTop: "4px" }}
                      >
                        {doctor.Specialization?.name}
                      </Tag>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "24px",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          color:
                            selectedDoctor?.doctor_id === doctor.doctor_id
                              ? "#043059"
                              : "#000000",
                        }}
                      >
                        <strong>Học vị:</strong>{" "}
                        {doctor.degree || "Chưa cập nhật"}
                      </div>
                      <div
                        style={{
                          color:
                            selectedDoctor?.doctor_id === doctor.doctor_id
                              ? "#043059"
                              : "#000000",
                        }}
                      >
                        <strong>Kinh nghiệm:</strong> {doctor.experience_years}{" "}
                        năm
                      </div>
                    </div>

                    <div style={{ marginBottom: "8px" }}>
                      <strong
                        style={{
                          color:
                            selectedDoctor?.doctor_id === doctor.doctor_id
                              ? "#043059"
                              : "#000000",
                        }}
                      >
                        Đánh giá:
                      </strong>{" "}
                      <Rate
                        disabled
                        defaultValue={doctor.rating || 0}
                        style={{
                          fontSize: "14px",
                          color:
                            selectedDoctor?.doctor_id === doctor.doctor_id
                              ? "#043059"
                              : "#666666",
                        }}
                      />
                      <span
                        style={{
                          marginLeft: "8px",
                          color:
                            selectedDoctor?.doctor_id === doctor.doctor_id
                              ? "#043059"
                              : "#666666",
                        }}
                      >
                        ({doctor.rating || 0})
                      </span>
                    </div>

                    <div>
                      <strong
                        style={{
                          color:
                            selectedDoctor?.doctor_id === doctor.doctor_id
                              ? "#043059"
                              : "#000000",
                        }}
                      >
                        Mô tả:
                      </strong>
                      <div
                        style={{
                          color:
                            selectedDoctor?.doctor_id === doctor.doctor_id
                              ? "#043059"
                              : "#666666",
                          marginTop: "4px",
                        }}
                      >
                        {doctor.description || "Chưa có mô tả"}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty
            description="Không có bác sĩ nào trong chuyên khoa này"
            style={{ margin: "20px 0" }}
          />
        )}
      </Spin>
    </Modal>
  );

  // Update the specialization card section
  const renderSpecializationCards = () => (
    <Card
      title={
        <div style={{ color: "#1E3A8A", fontWeight: 600 }}>
          <MedicineBoxOutlined /> Chọn chuyên khoa
        </div>
      }
      className="symptoms-card"
      style={{ marginBottom: "20px" }}
    >
      {specializations && specializations.length > 0 ? (
        <Row gutter={[12, 12]}>
          {specializations.map((specialization) => (
            <Col xs={12} sm={8} md={6} key={specialization.specialization_id}>
              <Card
                hoverable
                styles={{
                  body: { padding: "12px", textAlign: "center" },
                }}
                className={`specialization-card ${
                  selectedSpecialization?.specialization_id ===
                  specialization.specialization_id
                    ? "selected"
                    : ""
                }`}
                onClick={() => handleSpecializationSelect(specialization)}
                style={{
                  height: "50px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border:
                    selectedSpecialization?.specialization_id ===
                    specialization.specialization_id
                      ? "2px solid #1E3A8A"
                      : "1px solid #d9d9d9",
                  backgroundColor:
                    selectedSpecialization?.specialization_id ===
                    specialization.specialization_id
                      ? "white"
                      : "white",
                }}
              >
                {specialization.name}
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="Không có chuyên khoa nào" />
      )}
    </Card>
  );

  // Thêm items cho Tabs
  const tabItems = [
    {
      key: "doctor",
      label: "Đặt lịch theo bác sĩ",
      color: "#1E3A8A",
      children: (
        <div className="mb-6">
          {renderSpecializationCards()}
          {renderDoctorModal()}
        </div>
      ),
    },
    {
      key: "symptoms",
      label: "Đặt lịch theo triệu chứng",
      color: "#1E3A8A",
      children: (
        <div className="mb-6">
          <Card
            title={
              <div style={{ color: "#1E3A8A", fontWeight: 600 }}>
                <CheckCircleOutlined /> Chọn triệu chứng
              </div>
            }
            className="symptoms-card"
          >
            {symptoms && symptoms.length > 0 ? (
              <div
                style={{
                  height: "300px",
                  overflow: "auto",
                  padding: "8px",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#888 #f1f1f1",
                }}
                className="custom-scrollbar"
              >
                <Checkbox.Group
                  style={{ width: "100%" }}
                  value={selectedSymptoms}
                  onChange={handleSymptomToggle}
                  className="custom-checkbox-group"
                >
                  <Row
                    gutter={[16, 16]}
                    className="symptoms-scroll custom-scrollbar"
                  >
                    {symptoms.map((symptom) => (
                      <Col span={8} key={symptom.symptom_id}>
                        <Checkbox
                          value={symptom.symptom_id}
                          style={{
                            border: selectedSymptoms.includes(
                              symptom.symptom_id
                            )
                              ? "2px solid #1E3A8A"
                              : "1px solid #d9d9d9",
                            backgroundColor: selectedSymptoms.includes(
                              symptom.symptom_id
                            )
                              ? "white"
                              : "white",
                            borderRadius: "6px",
                            padding: "12px",
                            width: "100%",
                            marginRight: 0,
                          }}
                        >
                          <span
                            style={{
                              color: selectedSymptoms.includes(
                                symptom.symptom_id
                              )
                                ? "#1E3A8A"
                                : "#666666",
                              fontWeight: selectedSymptoms.includes(
                                symptom.symptom_id
                              )
                                ? 500
                                : 400,
                            }}
                          >
                            {symptom.name}
                          </span>
                        </Checkbox>
                      </Col>
                    ))}
                  </Row>
                </Checkbox.Group>
              </div>
            ) : (
              <Empty
                description="Không có triệu chứng nào"
                style={{ margin: "20px 0" }}
              />
            )}
          </Card>

          {loadingRecommendation && (
            <div style={{ textAlign: "center", margin: "20px 0" }}>
              <Spin tip="Đang tìm bác sĩ phù hợp..." />
            </div>
          )}

          {selectedDoctor && activeTab === "symptoms" && (
            <Card
              style={{
                marginTop: "20px",
                backgroundColor: "#white",
                borderBottom: "3px solid #1E3A8A",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "16px" }}
              >
                <Avatar
                  size={80}
                  src={selectedDoctor.user?.avatar}
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor: "#1E3A8A",
                    border: "1px solid #1E3A8A",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <h3
                    className="flex items-center gap-2"
                    style={{
                      margin: "0 0 4px 0",
                      color: "#1E3A8A",
                      fontSize: "16px",
                      fontWeight: 600,
                    }}
                  >
                    {selectedDoctor.user?.username}
                    <Tag color="#2646a3" className="ml-2 font-normal">
                      Khoa {selectedDoctor.Specialization?.name}
                    </Tag>
                  </h3>
                  <div style={{ color: "#666", fontSize: "14px" }}>
                    <strong>Chi phí khám:</strong>{" "}
                    {selectedDoctor.Specialization?.fees?.toLocaleString(
                      "vi-VN"
                    )}{" "}
                    VNĐ
                  </div>
                  {selectedDoctor.description && (
                    <div
                      style={{
                        color: "#666",
                        fontSize: "14px",
                        marginTop: "8px",
                      }}
                    >
                      <strong>Mô tả:</strong> {selectedDoctor.description}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      ),
    },
  ];

  // Add CSS styles
  const tabStyle = {
    ".antTabsTab": {
      color: "#1E3A8A !important",
      "&:hover": {
        color: "#2563EB !important",
      },
    },
    ".antTabsTabActive": {
      "& .antTabsTabBtn": {
        color: "#1E3A8A !important",
      },
    },
    ".antTabsInkBar": {
      backgroundColor: "#1E3A8A !important",
    },
  };

  // Thêm hàm xử lý khi chuyển tab
  const handleTabChange = (newActiveTab) => {
    // Nếu đang ở tab bác sĩ và đã chọn bác sĩ hoặc chuyên khoa
    if (activeTab === "doctor" && (selectedDoctor || selectedSpecialization)) {
      setTempTabChange(newActiveTab);
      setShowConfirmModal(true);
    }
    // Nếu đang ở tab triệu chứng và đã chọn triệu chứng
    else if (activeTab === "symptoms" && selectedSymptoms.length > 0) {
      setTempTabChange(newActiveTab);
      setShowConfirmModal(true);
    } else {
      // Nếu không có dữ liệu gì được chọn, chuyển tab trực tiếp
      setActiveTab(newActiveTab);
    }
  };
  // Hàm xác nhận chuyển tab
  const confirmTabChange = () => {
    setActiveTab(tempTabChange);
    if (tempTabChange === "symptoms") {
      setSelectedDoctor(null);
      setSelectedSpecialization(null);
      setDoctorDayOffs([]);
      // Reset thời gian
      setSelectedDate(null);
      setSelectedTime("");
      setTimeSlots([]);
      setTempSelectedDate(null);
    } else {
      setSelectedSymptoms([]);
      // Reset thời gian
      setSelectedDate(null);
      setSelectedTime("");
      setTimeSlots([]);
      setTempSelectedDate(null);
    }
    setShowConfirmModal(false);
  };

  // Nội dung các bước
  const steps = [
    {
      title: "Chọn người khám",
      content: (
        <div className="mt-8">
          {renderFamilyMembersList()}

          <Card
            title={
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Thông tin bệnh nhân</span>
                {selectedMember !== "self" && selectedMember !== "add_new" && (
                  <Button
                    type="link"
                    onClick={() => {
                      const member = familyMembers.find(
                        (m) => m.family_member_id.toString() === selectedMember
                      );
                      if (member) {
                        showMemberDetail(member);
                      }
                    }}
                  >
                    Chi tiết
                  </Button>
                )}
              </div>
            }
          >
            <Form
              form={form}
              layout="vertical"
              onValuesChange={handlePatientDataChange}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="username"
                    label={<span style={{ color: "#1E3A8A" }}>Họ và tên</span>}
                    rules={[
                      { required: true, message: "Vui lòng nhập họ tên!" },
                    ]}
                  >
                    <Input placeholder="Nhập họ và tên" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="dob"
                    label={<span style={{ color: "#1E3A8A" }}>Ngày sinh</span>}
                    rules={[
                      { required: true, message: "Vui lòng chọn ngày sinh!" },
                    ]}
                  >
                    <DatePicker
                      format="DD/MM/YYYY"
                      style={{ width: "100%" }}
                      placeholder="Chọn ngày sinh"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="phone_number"
                    label={
                      <span style={{ color: "#1E3A8A" }}>Số điện thoại</span>
                    }
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập số điện thoại!",
                      },
                    ]}
                  >
                    <Input placeholder="Nhập số điện thoại" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="gender"
                    label={<span style={{ color: "#1E3A8A" }}>Giới tính</span>}
                    rules={[
                      { required: true, message: "Vui lòng chọn giới tính!" },
                    ]}
                  >
                    <Radio.Group>
                      <Radio value="male">Nam</Radio>
                      <Radio value="female">Nữ</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </div>
      ),
    },
    {
      title: "Chọn phương thức đặt lịch",
      content: (
        <div className="mt-8">
          <Tabs
            defaultActiveKey="doctor"
            activeKey={activeTab}
            onChange={handleTabChange}
            type="card"
            tabBarStyle={{ marginBottom: 24 }}
            items={tabItems}
            className="custom-tabs"
            style={tabStyle}
          />

          <Divider />

          {/* Hiển thị thông tin bác sĩ đã chọn chỉ khi ở tab bác sĩ */}
          {activeTab === "doctor" && selectedDoctor && (
            <Card
              style={{
                marginBottom: "20px",
                backgroundColor: "#white",
                borderBottom: "3px solid #1E3A8A",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "16px" }}
              >
                <Avatar
                  size={80}
                  src={selectedDoctor.user?.avatar}
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor: "#1E3A8A",
                    border: "1px solid #1E3A8A",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <h3
                    className="flex items-center gap-2"
                    style={{
                      margin: "0 0 4px 0",
                      color: "#1E3A8A",
                      fontSize: "16px",
                      fontWeight: 600,
                    }}
                  >
                    {selectedDoctor.user?.username}
                    <Tag color="#2646a3" className="ml-2 font-normal">
                      Khoa {selectedDoctor.Specialization?.name}
                    </Tag>
                  </h3>
                  <div
                    style={{ display: "flex", gap: "8px", marginBottom: "4px" }}
                  >
                    <div>
                      <strong>Học vị:</strong>{" "}
                      {selectedDoctor.degree || "Chưa cập nhật"}
                    </div>
                  </div>
                  <div style={{ color: "#666", fontSize: "14px" }}>
                    <MailOutlined style={{ marginRight: "6px" }} />
                    {selectedDoctor.user?.email || "Chưa cập nhật email"}
                  </div>
                </div>
                <Button
                  className="!text-blue-900 !border-none !bg-white hover"
                  icon={<EditOutlined />}
                  onClick={() => setShowDoctorModal(true)}
                >
                  Thay đổi
                </Button>
              </div>
            </Card>
          )}

          <div className="mt-6">
            <Card
              title={
                <div style={{ color: "#1E3A8A", fontWeight: 600 }}>
                  <CalendarOutlined /> Chọn thời gian khám
                </div>
              }
            >
              <div className="mb-4">
                <Typography.Title
                  level={5}
                  style={{ marginBottom: 16, color: "#1E3A8A" }}
                >
                  Thời gian khám*
                </Typography.Title>
                <Row gutter={[16, 16]}>
                  {getAvailableDates().map((dateObj) => (
                    <Col span={6} key={dateObj.date.format("DD/MM")}>
                      <Card
                        hoverable
                        style={{
                          textAlign: "center",
                          cursor: "pointer",
                          height: "100px",
                          backgroundColor:
                            selectedDate &&
                            selectedDate.format("DD/MM") ===
                              dateObj.date.format("DD/MM")
                              ? "#F8FAFC"
                              : "white",
                          border:
                            selectedDate &&
                            selectedDate.format("DD/MM") ===
                              dateObj.date.format("DD/MM")
                              ? "2px solid #1E3A8A"
                              : "1px solid #d9d9d9",
                          borderRadius: "8px",
                        }}
                        styles={{
                          body: {
                            padding: "16px",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                          },
                        }}
                        onClick={() => handleDateSelect(dateObj.date)}
                      >
                        <div className="text-xl font-semibold text-blue-900">
                          {dateObj.date.format("DD/MM")}
                        </div>
                        <div className="text-sm text-gray-500">
                          {dateObj.date.day() === 0
                            ? "CN"
                            : `Thứ ${dateObj.date.day() + 1}`}
                        </div>
                      </Card>
                    </Col>
                  ))}
                  <Col span={6}>
                    <Card
                      hoverable
                      style={{
                        textAlign: "center",
                        cursor: "pointer",
                        height: "100px",
                        backgroundColor:
                          selectedDate &&
                          !getAvailableDates().some((d) =>
                            d.date.isSame(selectedDate, "day")
                          )
                            ? "#F8FAFC"
                            : "white",
                        border:
                          selectedDate &&
                          !getAvailableDates().some((d) =>
                            d.date.isSame(selectedDate, "day")
                          )
                            ? "2px solid #1E3A8A"
                            : "1px solid #d9d9d9",
                        borderRadius: "8px",
                      }}
                      bodyStyle={{
                        padding: "16px",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onClick={() => setShowCalendar(true)}
                    >
                      {selectedDate &&
                      !getAvailableDates().some((d) =>
                        d.date.isSame(selectedDate, "day")
                      ) ? (
                        <>
                          <div className="text-xl font-semibold text-blue-900">
                            {selectedDate.format("DD/MM")}
                          </div>
                          <div className="text-sm text-gray-500">
                            {selectedDate.day() === 0
                              ? "CN"
                              : `Thứ ${selectedDate.day() + 1}`}
                          </div>
                        </>
                      ) : (
                        <>
                          <CalendarOutlined
                            style={{
                              fontSize: "24px",
                              marginBottom: 4,
                              color: "#1E3A8A",
                            }}
                          />
                          <div className="text-lg font-semibold text-blue-900">
                            Ngày khác
                          </div>
                        </>
                      )}
                    </Card>
                  </Col>
                </Row>

                {/* Cập nhật Modal Calendar */}
                <Modal
                  title={
                    <div style={{ color: "#1E3A8A", fontWeight: 600 }}>
                      <CalendarOutlined /> Chọn ngày khám
                    </div>
                  }
                  open={showCalendar}
                  onCancel={() => {
                    setShowCalendar(false);
                    setTempSelectedDate(null);
                  }}
                  footer={[
                    <Button
                      key="cancel"
                      onClick={() => {
                        setShowCalendar(false);
                        setTempSelectedDate(null);
                      }}
                    >
                      Hủy
                    </Button>,
                    <Button
                      key="submit"
                      type="primary"
                      className="!bg-blue-900"
                      onClick={() => {
                        if (tempSelectedDate) {
                          setSelectedDate(tempSelectedDate);
                          updateAvailableTimeSlots(tempSelectedDate);
                          setShowCalendar(false);
                          setTempSelectedDate(null);
                          setSelectedTime(""); // Reset selected time when date changes
                        }
                      }}
                    >
                      Xác nhận
                    </Button>,
                  ]}
                  width={400}
                >
                  <div className="custom-calendar">
                    <Calendar
                      fullscreen={false}
                      style={{
                        borderRadius: "8px",
                      }}
                      disabledDate={(current) => {
                        const today = dayjs();
                        return current.isBefore(today, "day");
                      }}
                      onSelect={(date) => {
                        setTempSelectedDate(date);
                      }}
                      value={tempSelectedDate || selectedDate || dayjs()}
                      mode="month"
                    />
                  </div>
                </Modal>
              </div>

              {selectedDate && (
                <div>
                  {dateMessage && (
                    <Alert
                      message={dateMessage}
                      type={timeSlots.length === 0 ? "error" : "warning"}
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  {timeSlots.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-base font-medium mb-4">
                        <ClockCircleOutlined /> Giờ khám
                      </h3>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                        {timeSlots.map((time) => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`h-12 rounded-lg border transition-all duration-200 flex items-center justify-center text-base ${
                              selectedTime === time
                                ? "bg-blue-900 !text-white border-blue-900"
                                : "bg-white text-gray-700 border-gray-200 hover:border-blue-900 hover:text-blue-900"
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      ),
    },
    {
      title: "Xác nhận thông tin",
      content: (
        <div className="mt-8">
          <Card title="Thông tin người khám">
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <p>
                  <strong>Họ tên:</strong>{" "}
                  {patientData.username || "Chưa có thông tin"}
                </p>
                <p>
                  <strong>Ngày sinh:</strong>{" "}
                  {patientData.dob
                    ? dayjs(patientData.dob).isValid()
                      ? dayjs(patientData.dob).format("DD/MM/YYYY")
                      : "Chưa có thông tin"
                    : "Chưa có thông tin"}
                </p>
              </Col>
              <Col span={12}>
                <p>
                  <strong>Số điện thoại:</strong>{" "}
                  {patientData.phone_number || "Chưa có thông tin"}
                </p>
                <p>
                  <strong>Giới tính:</strong>{" "}
                  {patientData.gender === "male" ? "Nam" : "Nữ"}
                </p>
              </Col>
            </Row>
          </Card>

          <Card title="Thông tin lịch hẹn" className="mt-4">
            {activeTab === "doctor" && selectedDoctor ? (
              <div className="mt-2">
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <p>
                      <strong>Bác sĩ:</strong>{" "}
                      {selectedDoctor?.user?.username || "Chưa chọn"}
                    </p>
                    <p>
                      <strong>Chuyên khoa:</strong>{" "}
                      {selectedDoctor?.Specialization?.name || "Chưa chọn"}
                    </p>
                  </Col>
                  <Col span={12}>
                    <p>
                      <strong>Email:</strong>{" "}
                      {selectedDoctor?.user?.email || "Chưa cập nhật"}
                    </p>
                    <p>
                      <strong>Chi phí:</strong>{" "}
                      {selectedDoctor?.Specialization?.fees
                        ? `${selectedDoctor.Specialization.fees.toLocaleString(
                            "vi-VN"
                          )} VNĐ`
                        : "Chưa chọn"}
                    </p>
                  </Col>
                </Row>
              </div>
            ) : activeTab === "symptoms" ? (
              <div className="mt-2">
                {selectedDoctor ? (
                  <Row gutter={[16, 8]}>
                    <Col span={12}>
                      <p>
                        <strong>Bác sĩ:</strong>{" "}
                        {selectedDoctor?.user?.username || "Chưa chọn"}
                      </p>
                      <p>
                        <strong>Chuyên khoa:</strong>{" "}
                        {selectedDoctor?.Specialization?.name || "Chưa chọn"}
                      </p>
                    </Col>
                    <Col span={12}>
                      <p>
                        <strong>Email:</strong>{" "}
                        {selectedDoctor?.user?.email || "Chưa cập nhật"}
                      </p>
                      <p>
                        <strong>Chi phí:</strong>{" "}
                        {selectedDoctor?.Specialization?.fees
                          ? `${selectedDoctor.Specialization.fees.toLocaleString(
                              "vi-VN"
                            )} VNĐ`
                          : "Chưa chọn"}
                      </p>
                    </Col>
                  </Row>
                ) : (
                  <p>Không tìm thấy bác sĩ phù hợp.</p>
                )}
                <Divider style={{ margin: "12px 0" }} />
                <p>
                  <strong>Triệu chứng:</strong>
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {symptoms &&
                    symptoms.length > 0 &&
                    selectedSymptoms &&
                    selectedSymptoms.map((symptomId) => (
                      <Tag key={symptomId} color="#1E3A8A">
                        {symptoms.find((s) => s.symptom_id === symptomId)
                          ?.name || ""}
                      </Tag>
                    ))}
                </div>
              </div>
            ) : null}
            <Divider style={{ margin: "12px 0" }} />
            <p>
              <strong>Ngày giờ khám:</strong>{" "}
              {selectedDate && selectedTime
                ? `${dayjs(selectedDate).format("DD/MM/YYYY")} ${selectedTime}`
                : "Chưa chọn"}
            </p>
            <Alert
              message="Lưu ý"
              description={
                <div>
                  <p>
                    * Tổng đài viên sẽ gọi lại cho quý khách để xác nhận thông
                    tin thời gian đặt lịch và điều chỉnh nếu cần thiết.
                  </p>
                  <p>
                    * Vui lòng để ý điện thoại trong vòng 30 phút sau khi đặt
                    lịch.
                  </p>
                  <p>
                    * Nếu quá thời gian trên mà chưa nhận được cuộc gọi, quý
                    khách vui lòng liên hệ hotline: 1900 1234
                  </p>
                  <p>
                    * Chi phí khám sẽ được thanh toán sau khi hoàn thành khám
                    bệnh.
                  </p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          </Card>
        </div>
      ),
    },
  ];

  // Thêm hàm kiểm tra ngày nghỉ
  const isDayOff = (date) => {
    const formattedDate = dayjs(date).format("YYYY-MM-DD");
    return doctorDayOffs.find((dayOff) => dayOff.off_date === formattedDate);
  };

  // Hàm lấy các khung giờ buổi sáng
  const getMorningTimeSlots = () => {
    const slots = [];
    for (let h = 8; h <= 11; h++) {
      for (let m of ["00", "30"]) {
        if (h === 11 && m === "30") continue;
        slots.push(`${h.toString().padStart(2, "0")}:${m}`);
      }
    }
    return slots;
  };

  // Hàm lấy các khung giờ buổi chiều
  const getAfternoonTimeSlots = () => {
    const slots = [];
    for (let h = 13; h <= 17; h++) {
      for (let m of ["00", "30"]) {
        if (h === 13 && m === "00") continue;
        if (h === 17 && m === "30") continue;
        slots.push(`${h.toString().padStart(2, "0")}:${m}`);
      }
    }
    return slots;
  };

  // Thêm style cho card được chọn
  const DateCard = ({ date, isSelected, onClick }) => {
    const dayjs = require("dayjs");
    const d = dayjs(date);

    return (
      <div
        onClick={onClick}
        className={`cursor-pointer p-4 rounded-lg transition-all duration-300 ${
          isSelected
            ? "border-2 border-blue-900 bg-blue-50"
            : "border border-gray-200 hover:border-blue-900 hover:bg-blue-50"
        }`}
      >
        <div className="text-xl font-semibold text-blue-900 text-center">
          {d.format("DD/MM")}
        </div>
        <div className="text-gray-500 text-center">
          {`Thứ ${d.day() === 0 ? "CN" : d.day() + 1}`}
        </div>
      </div>
    );
  };

  // Cập nhật hàm updateAvailableTimeSlots để kiểm tra thời gian hiện tại
  const updateAvailableTimeSlots = (date) => {
    if (!date) {
      setTimeSlots([]);
      setDateMessage("");
      return;
    }

    const selectedDay = dayjs(date);
    const dayOfWeek = selectedDay.day();
    const now = dayjs();
    const isSameDay = selectedDay.isSame(now, "day");

    // Kiểm tra cuối tuần
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      setTimeSlots([]);
      setDateMessage("Không có lịch đặt vào cuối tuần");
      return;
    }

    // Kiểm tra ngày nghỉ của bác sĩ
    const dayOff = isDayOff(date);
    if (dayOff) {
      if (dayOff.off_morning && dayOff.off_afternoon) {
        setTimeSlots([]);
        setDateMessage("Bác sĩ nghỉ toàn bộ ngày này");
        return;
      }

      if (dayOff.off_morning) {
        setTimeSlots(getAfternoonTimeSlots());
        setDateMessage("Bác sĩ nghỉ buổi sáng, chỉ có lịch buổi chiều");
        return;
      }

      if (dayOff.off_afternoon) {
        setTimeSlots(getMorningTimeSlots());
        setDateMessage("Bác sĩ nghỉ buổi chiều, chỉ có lịch buổi sáng");
        return;
      }
    }

    // Lấy tất cả khung giờ có thể
    let availableSlots = [...getMorningTimeSlots(), ...getAfternoonTimeSlots()];

    // Nếu là ngày hiện tại, chỉ hiển thị các khung giờ từ 2 tiếng sau trở đi
    if (isSameDay) {
      const currentHour = now.hour();
      const currentMinute = now.minute();

      availableSlots = availableSlots.filter((slot) => {
        const [slotHour, slotMinute] = slot.split(":").map(Number);
        const slotTime = dayjs().hour(slotHour).minute(slotMinute);
        return slotTime.diff(now, "hour", true) >= 2;
      });

      if (availableSlots.length === 0) {
        setDateMessage("Không còn khung giờ nào phù hợp trong ngày hôm nay");
      }
    }

    setTimeSlots(availableSlots);
    setDateMessage("");
  };

  // Cập nhật phần render date selection
  const renderDateSelection = () => {
    const today = dayjs();
    const dates = [];

    // Tạo danh sách 3 ngày kế tiếp (không tính thứ 7, chủ nhật)
    let currentDate = today;
    while (dates.length < 3) {
      if (currentDate.day() !== 0 && currentDate.day() !== 6) {
        dates.push(currentDate);
      }
      currentDate = currentDate.add(1, "day");
    }

    return (
      <div>
        <div className="text-lg font-medium mb-4">Thời gian khám*</div>
        <div className="grid grid-cols-4 gap-4">
          {dates.map((date) => (
            <DateCard
              key={date.format("YYYY-MM-DD")}
              date={date}
              isSelected={selectedDate && selectedDate.isSame(date, "day")}
              onClick={() => {
                console.log("Date card clicked:", date.format("YYYY-MM-DD"));
                handleDateSelect(date);
              }}
            />
          ))}
          <div
            onClick={() => setShowCalendar(true)}
            className={`cursor-pointer p-4 rounded-lg border border-gray-200 hover:border-blue-900 hover:bg-blue-50 flex flex-col items-center justify-center ${
              selectedDate && !isDateInDefaultDates(selectedDate)
                ? "border-2 border-blue-900 bg-blue-50"
                : ""
            }`}
          >
            <CalendarOutlined className="text-2xl text-blue-900" />
            <div className="mt-2 text-center">
              {selectedDate && !isDateInDefaultDates(selectedDate) ? (
                <div>
                  <div className="text-lg font-semibold text-blue-900">
                    {selectedDate.format("DD/MM")}
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedDate.day() === 0
                      ? "CN"
                      : `Thứ ${selectedDate.day() + 1}`}
                  </div>
                </div>
              ) : (
                "Ngày khác"
              )}
            </div>
          </div>
        </div>

        {/* Hiển thị thông báo và khung giờ */}
        {dateMessage && (
          <Alert
            message={dateMessage}
            type={timeSlots.length === 0 ? "error" : "warning"}
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        {timeSlots.length > 0 && (
          <div className="mt-4">
            <h3 className="text-base font-medium mb-4">
              <ClockCircleOutlined /> Giờ khám
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`h-12 rounded-lg border transition-all duration-200 flex items-center justify-center text-base ${
                    selectedTime === time
                      ? "bg-blue-900 text-white border-blue-900"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-900 hover:text-blue-900"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Hàm lấy thông tin ngày nghỉ của bác sĩ
  const fetchDoctorDayOffs = async (doctorId) => {
    try {
      const response = await axios.get(
        `${url1}/patient/doctor/${doctorId}/day-off`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      if (response.data.success) {
        setDoctorDayOffs(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching doctor day offs:", error);
      notification.error({
        message: "Lỗi",
        description: "Không thể lấy thông tin ngày nghỉ của bác sĩ",
      });
    }
  };

  // Cập nhật useEffect để lấy thông tin ngày nghỉ khi chọn bác sĩ
  useEffect(() => {
    if (selectedDoctor?.doctor_id) {
      fetchDoctorDayOffs(selectedDoctor.doctor_id);
    }
  }, [selectedDoctor]);

  // Cập nhật hàm handleDateSelect
  const handleDateSelect = (date) => {
    const selectedDate = dayjs(date);
    setSelectedDate(selectedDate);
    setTempSelectedDate(null);
    updateAvailableTimeSlots(selectedDate);
  };

  // Thêm hàm kiểm tra ngày có trong danh sách 3 ngày mặc định không
  const isDateInDefaultDates = (date) => {
    if (!date) return false;
    const defaultDates = getAvailableDates().map((d) => d.date);
    return defaultDates.some((d) => d.isSame(date, "day"));
  };

  // Hàm xử lý khi xác nhận đặt lịch
  const handleFinish = async () => {
    try {
      setLoading(true);
      // const user_id = localStorage.getItem("user_id");
      const appointment_datetime = `${selectedDate.format(
        "YYYY-MM-DD"
      )}T${selectedTime}:00`;

      let bookingData = {
        appointment_datetime,
        family_member_id: parseInt(selectedMember),
        family_member_data: {
          username: patientData.username,
          dob: patientData.dob,
          phone_number: patientData.phone_number,
          gender: patientData.gender,
        },
      };

      if (selectedDoctor) {
        bookingData.doctor_id = selectedDoctor.doctor_id;
      }
      console.log(bookingData);

      // if (activeTab === "doctor") {
      //   // Booking by doctor
      //   if (!selectedDoctor) {
      //     notification.error({
      //       message: "Lỗi",
      //       description: "Vui lòng chọn bác sĩ",
      //     });
      //     return;
      //   }
      //   bookingData.doctor_id = selectedDoctor.doctor_id;
      // } else {
      //   // Booking by symptoms
      //   if (!selectedSymptoms || selectedSymptoms.length === 0) {
      //     notification.error({
      //       message: "Lỗi",
      //       description: "Vui lòng chọn ít nhất một triệu chứng",
      //     });
      //     return;
      //   }
      //   bookingData.symptoms = selectedSymptoms;
      // }

      const response = await axios.post(
        `${url1}/patient/appointments`,
        bookingData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.data.success) {
        toast.success("Đặt lịch hẹn thành công", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        setTimeout(() => {
          navigate("/my-appointments");
        }, 1000);
      }
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.error(error.response?.data?.message || "Đặt lịch hẹn thất bại", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep3 = () => {
    console.log("Current selectedDoctor in renderStep3:", selectedDoctor);

    const getDoctorInfo = () => {
      if (activeTab === "doctor" && selectedDoctor) {
        return {
          full_name: selectedDoctor.user?.username,
          specialization: selectedDoctor.Specialization?.name,
          fees: selectedDoctor.Specialization?.fees,
          degree: selectedDoctor.degree,
          experience_years: selectedDoctor.experience_years,
          description: selectedDoctor.description,
        };
      }
      return null;
    };

    const doctorInfo = getDoctorInfo();
    console.log("Processed doctor info:", doctorInfo);

    return (
      <div className="booking-confirmation">
        <h3>Xác nhận thông tin đặt lịch</h3>
        <div className="confirmation-details">
          <div className="detail-item">
            <span className="label">Bệnh nhân:</span>
            <span className="value">
              {selectedMember === "self"
                ? "Bản thân"
                : patientData?.full_name || "Không xác định"}
            </span>
          </div>

          {/* Doctor Information */}
          <div className="detail-item">
            <span className="label">Bác sĩ:</span>
            <span className="value">
              {doctorInfo?.full_name || "Chưa chọn"}
            </span>
          </div>
          <div className="detail-item">
            <span className="label">Chuyên khoa:</span>
            <span className="value">
              {doctorInfo?.specialization || "Chưa chọn"}
            </span>
          </div>
          {doctorInfo && (
            <>
              <div className="detail-item">
                <span className="label">Học vị:</span>
                <span className="value">
                  {doctorInfo.degree || "Chưa cập nhật"}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Kinh nghiệm:</span>
                <span className="value">{doctorInfo.experience_years} năm</span>
              </div>
              <div className="detail-item">
                <span className="label">Phí khám:</span>
                <span className="value">
                  {doctorInfo?.fees
                    ? `${doctorInfo.fees.toLocaleString("vi-VN")} VNĐ`
                    : "Chưa cập nhật"}
                </span>
              </div>
            </>
          )}

          {/* Appointment Time */}
          <div className="detail-item">
            <span className="label">Ngày hẹn:</span>
            <span className="value">{selectedDate?.format("DD/MM/YYYY")}</span>
          </div>
          <div className="detail-item">
            <span className="label">Giờ hẹn:</span>
            <span className="value">{selectedTime}</span>
          </div>

          {/* Symptoms if applicable */}
          {activeTab === "symptoms" && selectedSymptoms.length > 0 && (
            <div className="detail-item">
              <span className="label">Triệu chứng:</span>
              <span className="value">{selectedSymptoms.join(", ")}</span>
            </div>
          )}
        </div>

        <div className="confirmation-actions">
          <Button onClick={() => setCurrentStep(2)}>Quay lại</Button>
          <Button
            type="primary"
            onClick={handleFinish}
            loading={loading}
            disabled={!doctorInfo} // Disable if no doctor is selected
          >
            Xác nhận đặt lịch
          </Button>
        </div>
      </div>
    );
  };

  // Thêm function để gọi API getDoctorBySymptoms
  const fetchDoctorBySymptoms = async () => {
    // Kiểm tra có triệu chứng được chọn
    if (!selectedSymptoms || selectedSymptoms.length === 0) {
      notification.error({
        message: "Lỗi",
        description: "Vui lòng chọn ít nhất một triệu chứng",
      });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      notification.error({
        message: "Lỗi xác thực",
        description: "Vui lòng đăng nhập lại",
        placement: "topRight",
        duration: 3,
      });
      navigate("/login");
      return;
    }
    console.log(token);

    if (selectedDate && selectedTime) {
      try {
        setLoadingRecommendation(true);
        const appointment_datetime = `${selectedDate.format(
          "YYYY-MM-DD"
        )}T${selectedTime}:00`;

        // Prepare request body
        const requestBody = {
          symptoms: selectedSymptoms.map((symptom) => parseInt(symptom)), // Convert to numbers if they're strings
          appointment_datetime,
        };

        requestBody.family_member_id = parseInt(selectedMember);
        requestBody.family_member_data = {
          username: patientData.username,
          dob: patientData.dob,
          phone_number: patientData.phone_number,
          gender: patientData.gender,
        };

        console.log("Sending request with body:", requestBody); // Debug log

        const response = await axios.post(
          `${url1}/patient/doctor-by-symptoms`,
          {
            symptoms: selectedSymptoms.map((symptom) => parseInt(symptom)),
            appointment_datetime,
            family_member_id: parseInt(selectedMember),
            family_member_data: {
              username: patientData.username,
              dob: patientData.dob,
              phone_number: patientData.phone_number,
              gender: patientData.gender,
            },
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success) {
          const doctorData = response.data.data;
          // Format the doctor data to match the structure used elsewhere
          const formattedDoctor = {
            doctor_id: doctorData.doctor_id,
            user: {
              username: doctorData.doctor_name,
              email: doctorData.email || "", // Include email if available
            },
            Specialization: {
              name: doctorData.specialization,
              fees: doctorData.fees,
            },
            description: doctorData.description,
          };
          setSelectedDoctor(formattedDoctor);
        }
      } catch (error) {
        console.error("Error getting doctor recommendation:", error);
        if (error.response?.status === 401) {
          notification.error({
            message: "Lỗi xác thực",
            description: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          });
          navigate("/login");
        } else {
          notification.error({
            message: "Lỗi",
            description:
              error.response?.data?.message || "Không thể tìm bác sĩ phù hợp",
          });
          setSelectedDoctor(null); // Reset selectedDoctor on failure
        }
      } finally {
        setLoadingRecommendation(false);
      }
    }
  };

  // Add useEffect to call fetchDoctorBySymptoms when necessary conditions are met
  useEffect(() => {
    if (
      activeTab === "symptoms" &&
      selectedSymptoms.length > 0 &&
      selectedDate &&
      selectedTime
    ) {
      fetchDoctorBySymptoms();
    }
  }, [activeTab, selectedSymptoms, selectedDate, selectedTime]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* <Navbar /> */}

      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-primary text-white p-4">
            <h1 className="text-2xl font-semibold text-center">Đặt lịch hẹn</h1>
          </div>

          <div className="p-4">
            <Steps current={currentStep}>
              {steps.map((item) => (
                <Step key={item.title} title={item.title} />
              ))}
            </Steps>

            <div className="steps-content min-h-[500px]">
              {steps[currentStep].content}
            </div>

            <div className="steps-action mt-8 flex justify-end">
              {currentStep > 0 && (
                <Button onClick={prevStep} style={{ marginRight: 8 }}>
                  Quay lại
                </Button>
              )}

              {currentStep < steps.length - 1 && (
                <Button
                  onClick={nextStep}
                  className="!bg-blue-900 !text-white"
                  disabled={
                    currentStep === 1 &&
                    (!selectedDate || !selectedTime || timeSlots.length === 0)
                  }
                >
                  Tiếp theo
                </Button>
              )}

              {currentStep === steps.length - 1 && (
                <Button type="primary" onClick={handleFinish} loading={loading}>
                  Xác nhận đặt lịch
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        title="Chọn chuyên khoa"
        open={showSpecializationModal}
        onCancel={() => setShowSpecializationModal(false)}
        footer={null}
        width={700}
      >
        <List
          grid={{ gutter: 8, column: 3 }}
          dataSource={specializations || []}
          renderItem={(spec) => (
            <List.Item>
              <Card
                hoverable
                onClick={() => handleSpecializationSelect(spec)}
                className="text-center"
              >
                <div className="p-2">
                  <h3 className="font-medium">{spec?.name || ""}</h3>
                </div>
              </Card>
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title={
          <div style={{ color: "#1E3A8A", fontWeight: 600 }}>
            Chọn bác sĩ Khoa {selectedSpecialization?.name}
          </div>
        }
        open={showDoctorModal}
        onCancel={() => setShowDoctorModal(false)}
        footer={null}
        width={800}
      >
        <Spin spinning={loadingDoctors}>
          {doctorsBySpecialization[selectedSpecialization?.specialization_id]
            ?.length > 0 ? (
            <div className="doctors-list">
              {doctorsBySpecialization[
                selectedSpecialization?.specialization_id
              ].map((doctor) => (
                <Card
                  key={doctor.doctor_id}
                  hoverable
                  className={`doctor-card ${
                    selectedDoctor?.doctor_id === doctor.doctor_id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => handleDoctorSelect(doctor)}
                  style={{
                    marginBottom: "16px",
                    borderColor:
                      selectedDoctor?.doctor_id === doctor.doctor_id
                        ? "#1E3A8A"
                        : "#d9d9d9",
                    backgroundColor:
                      selectedDoctor?.doctor_id === doctor.doctor_id
                        ? "white"
                        : "white",
                    color:
                      selectedDoctor?.doctor_id === doctor.doctor_id
                        ? "#1E3A8A"
                        : "#black",
                  }}
                >
                  <div style={{ display: "flex", gap: "20px" }}>
                    <Avatar
                      size={100}
                      src={doctor.user?.avatar}
                      icon={<UserOutlined />}
                      style={{ flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: "8px" }}>
                        <h3
                          style={{
                            margin: 0,
                            color:
                              selectedDoctor?.doctor_id === doctor.doctor_id
                                ? "#043059"
                                : "#000000",
                            fontSize: "18px",
                            fontWeight: 600,
                          }}
                        >
                          {doctor.user?.username}
                        </h3>
                        <Tag
                          color={
                            selectedDoctor?.doctor_id === doctor.doctor_id
                              ? "#043059"
                              : "#666666"
                          }
                          style={{ marginTop: "4px" }}
                        >
                          {doctor.Specialization?.name}
                        </Tag>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "24px",
                          marginBottom: "8px",
                        }}
                      >
                        <div
                          style={{
                            color:
                              selectedDoctor?.doctor_id === doctor.doctor_id
                                ? "#043059"
                                : "#000000",
                          }}
                        >
                          <strong>Học vị:</strong>{" "}
                          {doctor.degree || "Chưa cập nhật"}
                        </div>
                        <div
                          style={{
                            color:
                              selectedDoctor?.doctor_id === doctor.doctor_id
                                ? "#043059"
                                : "#000000",
                          }}
                        >
                          <strong>Kinh nghiệm:</strong>{" "}
                          {doctor.experience_years} năm
                        </div>
                      </div>

                      <div style={{ marginBottom: "8px" }}>
                        <strong
                          style={{
                            color:
                              selectedDoctor?.doctor_id === doctor.doctor_id
                                ? "#043059"
                                : "#000000",
                          }}
                        >
                          Đánh giá:
                        </strong>{" "}
                        <Rate
                          disabled
                          defaultValue={doctor.rating || 0}
                          style={{
                            fontSize: "14px",
                            color:
                              selectedDoctor?.doctor_id === doctor.doctor_id
                                ? "#043059"
                                : "#666666",
                          }}
                        />
                        <span
                          style={{
                            marginLeft: "8px",
                            color:
                              selectedDoctor?.doctor_id === doctor.doctor_id
                                ? "#043059"
                                : "#666666",
                          }}
                        >
                          ({doctor.rating || 0})
                        </span>
                      </div>

                      <div>
                        <strong
                          style={{
                            color:
                              selectedDoctor?.doctor_id === doctor.doctor_id
                                ? "#043059"
                                : "#000000",
                          }}
                        >
                          Mô tả:
                        </strong>
                        <div
                          style={{
                            color:
                              selectedDoctor?.doctor_id === doctor.doctor_id
                                ? "#043059"
                                : "#666666",
                            marginTop: "4px",
                          }}
                        >
                          {doctor.description || "Chưa có mô tả"}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Empty
              description="Không có bác sĩ nào trong chuyên khoa này"
              style={{ margin: "20px 0" }}
            />
          )}
        </Spin>
      </Modal>

      {/* Modal Chi tiết người thân */}
      <Modal
        title="Chi tiết thông tin người thân"
        open={showMemberDetailModal}
        onCancel={() => setShowMemberDetailModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowMemberDetailModal(false)}>
            Hủy
          </Button>,
          <Button key="update" type="primary" onClick={handleUpdateMember}>
            Cập nhật
          </Button>,
        ]}
        width={600}
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="Họ tên"
                rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
              >
                <Input placeholder="Nhập họ tên" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="gender"
                label="Giới tính"
                rules={[{ required: true, message: "Vui lòng chọn giới tính" }]}
              >
                <Select>
                  <Select.Option value="male">Nam</Select.Option>
                  <Select.Option value="female">Nữ</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dob"
                label="Ngày sinh"
                rules={[{ required: true, message: "Vui lòng chọn ngày sinh" }]}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="relationship"
                label="Quan hệ"
                rules={[
                  { required: true, message: "Vui lòng chọn mối quan hệ" },
                ]}
              >
                <Select>
                  <Select.Option value="me">Bản thân</Select.Option>
                  <Select.Option value="child">Con</Select.Option>
                  <Select.Option value="father">Ba</Select.Option>
                  <Select.Option value="mother">Mẹ</Select.Option>
                  <Select.Option value="wife">Vợ</Select.Option>
                  <Select.Option value="husband">Chồng</Select.Option>
                  <Select.Option value="other">Khác</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone_number"
                label="Số điện thoại"
                rules={[
                  { required: true, message: "Vui lòng nhập số điện thoại" },
                ]}
              >
                <Input placeholder="Nhập số điện thoại" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: "email", message: "Email không hợp lệ" }]}
              >
                <Input placeholder="Nhập email (không bắt buộc)" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal thêm người thân mới */}
      <Modal
        title="Thêm người thân mới"
        open={showAddMemberModal}
        onCancel={() => setShowAddMemberModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowAddMemberModal(false)}>
            Hủy
          </Button>,
          <Button key="add" type="primary" onClick={handleAddMember}>
            Thêm
          </Button>,
        ]}
        width={600}
      >
        <Form
          form={addForm}
          layout="vertical"
          initialValues={{
            gender: "male",
            relationship: "other",
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="Họ tên"
                rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
              >
                <Input placeholder="Nhập họ tên" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="gender"
                label="Giới tính"
                rules={[{ required: true, message: "Vui lòng chọn giới tính" }]}
              >
                <Select>
                  <Select.Option value="male">Nam</Select.Option>
                  <Select.Option value="female">Nữ</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dob"
                label="Ngày sinh"
                rules={[{ required: true, message: "Vui lòng chọn ngày sinh" }]}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="relationship"
                label="Quan hệ"
                rules={[
                  { required: true, message: "Vui lòng chọn mối quan hệ" },
                ]}
              >
                <Select>
                  <Select.Option value="father">Ba</Select.Option>
                  <Select.Option value="mother">Mẹ</Select.Option>
                  <Select.Option value="wife">Vợ</Select.Option>
                  <Select.Option value="husband">Chồng</Select.Option>
                  <Select.Option value="child">Con</Select.Option>
                  <Select.Option value="other">Khác</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone_number"
                label="Số điện thoại"
                rules={[
                  { required: true, message: "Vui lòng nhập số điện thoại" },
                ]}
              >
                <Input placeholder="Nhập số điện thoại" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: "email", message: "Email không hợp lệ" }]}
              >
                <Input placeholder="Nhập email (không bắt buộc)" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal xác nhận chuyển tab */}
      <Modal
        title="Xác nhận chuyển đổi"
        open={showConfirmModal}
        onOk={confirmTabChange}
        onCancel={() => setShowConfirmModal(false)}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={{ className: "!bg-blue-900" }}
      >
        <p>
          {activeTab === "doctor"
            ? "Nếu chuyển sang đặt lịch theo triệu chứng, thông tin bác sĩ và chuyên khoa đã chọn sẽ bị mất. Bạn có chắc chắn muốn chuyển đổi?"
            : "Nếu chuyển sang đặt lịch theo bác sĩ, các triệu chứng đã chọn sẽ bị mất. Bạn có chắc chắn muốn chuyển đổi?"}
        </p>
      </Modal>
    </div>
  );
};

export default BookAppointment;
