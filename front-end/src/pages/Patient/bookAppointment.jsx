import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { AppContext } from "../../context/AppContext";
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
} from "@ant-design/icons";

// Kích hoạt plugins cho dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

const { Step } = Steps;
const { Option } = Select;

const BookAppointment = () => {
  const navigate = useNavigate();
  const { url1 } = useContext(AppContext);
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
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);

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
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/patient/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.data) {
        const userData = response.data.data;
        setPatientData({
          username: userData.username || "",
          dob: userData.dob || "",
          phone_number: userData.phone_number || "",
          gender: userData.gender || "male",
        });

        // Đặt giá trị cho form
        form.setFieldsValue({
          username: userData.username || "",
          dob: userData.dob ? dayjs(userData.dob) : null,
          phone_number: userData.phone_number || "",
          gender: userData.gender || "male",
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Đặt giá trị mẫu
      const sampleUserData = {
        username: "Người dùng",
        dob: "1990-01-01",
        phone_number: "0123456789",
        gender: "male",
      };

      setPatientData(sampleUserData);
      form.setFieldsValue({
        ...sampleUserData,
        dob: dayjs(sampleUserData.dob),
      });
    }
  };

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

      console.log("Symptoms API response:", response.data);

      if (response.data.success && response.data.data) {
        const symptomsData = response.data.data.data || [];
        setSymptoms(symptomsData);
        console.log("Set symptoms:", symptomsData);
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
    console.log("Current symptoms state:", symptoms);
  }, [symptoms]);

  // Lấy danh sách chuyên khoa
  const fetchSpecializations = async () => {
    try {
      const response = await axios.get(`${url1}/patient/specializations`);
      setSpecializations(response.data.data);
    } catch (error) {
      console.error("Error fetching specializations:", error);
      // Dữ liệu mẫu nếu API không hoạt động
      setSpecializations([
        { specialization_id: 1, name: "Nhi" },
        { specialization_id: 2, name: "Tim mạch" },
        { specialization_id: 3, name: "Tổng hợp" },
        { specialization_id: 4, name: "Da liễu" },
      ]);
      notification.error({
        message: "Lỗi kết nối",
        description: "Sử dụng dữ liệu mẫu cho chuyên khoa",
      });
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [url1, navigate, form]);

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
    const dates = [];
    let currentDate = dayjs().tz("Asia/Ho_Chi_Minh");

    for (let i = 0; i < 14; i++) {
      const date = currentDate.add(i, "day");
      const day = date.day(); // 0 = Sunday, 6 = Saturday

      if (day !== 0 && day !== 6) {
        dates.push({
          value: date.format("YYYY-MM-DD"),
          label: date.format("DD/MM/YYYY"),
          day: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][day],
          isToday: i === 0,
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
  };

  // Xử lý khi chọn chuyên khoa
  const handleSpecializationSelect = (specializationId) => {
    setSelectedSpecialization(specializationId);
    setShowSpecializationModal(false);
    setShowDoctorModal(true);
    setCurrentPage(1); // Reset lại trang khi chọn chuyên khoa mới
  };

  // Xử lý khi chọn bác sĩ
  const handleDoctorSelect = (doctorId) => {
    setSelectedDoctor(doctorId);
    setShowDoctorModal(false);
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
              backgroundColor: selectedMember === "self" ? "#e6f7ff" : "white",
              border:
                selectedMember === "self"
                  ? "2px solid #1890ff"
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
                    ? "2px solid #1890ff"
                    : "1px solid #f0f0f0",
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

  // Thêm items cho Tabs
  const tabItems = [
    {
      key: "doctor",
      label: "Đặt lịch theo bác sĩ",
      children: (
        <div className="mb-6">
          <Button
            type="primary"
            size="large"
            icon={<MedicineBoxOutlined />}
            onClick={() => setShowSpecializationModal(true)}
            className="mb-4"
          >
            Chọn chuyên khoa và bác sĩ
          </Button>

          {selectedDoctor && (
            <Card
              className="mt-4"
              title={
                <div className="text-blue-600">
                  <MedicineBoxOutlined /> Bác sĩ đã chọn
                </div>
              }
            >
              <div className="flex items-center">
                {doctors &&
                doctors.length > 0 &&
                doctors.find(
                  (d) => d.doctor_id.toString() === selectedDoctor.toString()
                )?.user?.avatar_url ? (
                  <Avatar
                    size={64}
                    src={
                      doctors.find(
                        (d) =>
                          d.doctor_id.toString() === selectedDoctor.toString()
                      )?.user?.avatar_url
                    }
                  />
                ) : (
                  <Avatar
                    size={64}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: "#1890ff" }}
                  />
                )}
                <div className="ml-4">
                  <h3 className="text-lg font-medium">
                    {(doctors &&
                      doctors.length > 0 &&
                      doctors.find(
                        (d) =>
                          d.doctor_id.toString() === selectedDoctor.toString()
                      )?.user?.username) ||
                      "Bác sĩ đã chọn"}
                  </h3>
                  <p className="text-gray-500">
                    {(doctors &&
                      doctors.length > 0 &&
                      doctors.find(
                        (d) =>
                          d.doctor_id.toString() === selectedDoctor.toString()
                      )?.Specialization?.name) ||
                      ""}{" "}
                    {(doctors &&
                      doctors.length > 0 &&
                      doctors.find(
                        (d) =>
                          d.doctor_id.toString() === selectedDoctor.toString()
                      )?.degree) ||
                      ""}
                  </p>
                  <p className="text-sm">
                    {(doctors &&
                      doctors.length > 0 &&
                      doctors.find(
                        (d) =>
                          d.doctor_id.toString() === selectedDoctor.toString()
                      )?.description) ||
                      ""}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      ),
    },
    {
      key: "symptoms",
      label: "Đặt lịch theo triệu chứng",
      children: (
        <div className="mb-6">
          <Card
            title={
              <div className="text-blue-600">
                <CheckCircleOutlined /> Chọn triệu chứng
              </div>
            }
          >
            {symptoms && symptoms.length > 0 ? (
              <Checkbox.Group
                onChange={handleSymptomToggle}
                value={selectedSymptoms}
              >
                <Row gutter={[16, 16]}>
                  {symptoms.map((symptom) => (
                    <Col span={8} key={symptom.symptom_id}>
                      <Card hoverable size="small">
                        <Checkbox value={symptom.symptom_id}>
                          {symptom.name}
                        </Checkbox>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Checkbox.Group>
            ) : (
              <Empty description="Không có triệu chứng nào" />
            )}
          </Card>
        </div>
      ),
    },
  ];

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
                    label="Họ và tên"
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
                    label="Ngày sinh"
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
                    label="Số điện thoại"
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
                    label="Giới tính"
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
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            tabBarStyle={{ marginBottom: 24 }}
            items={tabItems}
          />

          <Divider />

          <div className="mt-6">
            <Card
              title={
                <div>
                  <CalendarOutlined /> Chọn thời gian khám
                </div>
              }
            >
              <div className="mb-4">
                <h3 className="text-base font-medium mb-2">Ngày khám</h3>
                <Radio.Group
                  onChange={(e) => setSelectedDate(e.target.value)}
                  value={selectedDate}
                  buttonStyle="solid"
                >
                  <div className="flex flex-wrap gap-2">
                    {getAvailableDates().map((date) => (
                      <Radio.Button key={date.value} value={date.value}>
                        <div className="text-center">
                          <div>{date.day}</div>
                          <div className="font-medium">
                            {date.value.split("-")[2]}
                          </div>
                          <div className="text-xs">
                            {date.label.split("/").slice(1).join("/")}
                          </div>
                        </div>
                      </Radio.Button>
                    ))}
                  </div>
                </Radio.Group>
              </div>

              {selectedDate && (
                <div>
                  <h3 className="text-base font-medium mb-2">
                    <ClockCircleOutlined /> Ca khám
                  </h3>
                  <Radio.Group
                    onChange={(e) => handleSessionSelect(e.target.value)}
                    value={selectedSession}
                    buttonStyle="solid"
                  >
                    <Radio.Button value="morning">
                      Ca sáng (8:00 - 11:30)
                    </Radio.Button>
                    <Radio.Button value="afternoon">
                      Ca chiều (13:30 - 17:00)
                    </Radio.Button>
                  </Radio.Group>

                  {selectedSession && (
                    <div className="mt-4">
                      <h3 className="text-base font-medium mb-2">
                        <ClockCircleOutlined /> Giờ khám
                      </h3>
                      <Radio.Group
                        onChange={(e) => setSelectedTime(e.target.value)}
                        value={selectedTime}
                        buttonStyle="solid"
                      >
                        <div className="flex flex-wrap gap-2">
                          {getSessionTimes().map((time) => (
                            <Radio.Button key={time} value={time}>
                              {time}
                            </Radio.Button>
                          ))}
                        </div>
                      </Radio.Group>
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
            <p>
              <strong>Số điện thoại:</strong>{" "}
              {patientData.phone_number || "Chưa có thông tin"}
            </p>
            <p>
              <strong>Giới tính:</strong>{" "}
              {patientData.gender === "male" ? "Nam" : "Nữ"}
            </p>
          </Card>

          <Card title="Thông tin lịch hẹn" className="mt-4">
            <p>
              <strong>Ngày giờ khám:</strong>{" "}
              {selectedDate && selectedTime
                ? `${dayjs(selectedDate).format("DD/MM/YYYY")} ${selectedTime}`
                : "Chưa chọn"}
            </p>

            {activeTab === "doctor" ? (
              <div className="mt-2">
                <p>
                  <strong>Bác sĩ:</strong>{" "}
                  {doctors && doctors.length > 0 && selectedDoctor
                    ? doctors.find(
                        (d) =>
                          d.doctor_id.toString() === selectedDoctor.toString()
                      )?.user?.username || "Chưa chọn"
                    : "Chưa chọn"}
                </p>
                <p>
                  <strong>Chuyên khoa:</strong>{" "}
                  {doctors && doctors.length > 0 && selectedDoctor
                    ? doctors.find(
                        (d) =>
                          d.doctor_id.toString() === selectedDoctor.toString()
                      )?.Specialization?.name || "Chưa chọn"
                    : "Chưa chọn"}
                </p>
              </div>
            ) : (
              <div className="mt-2">
                <p>
                  <strong>Triệu chứng:</strong>
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {symptoms &&
                    symptoms.length > 0 &&
                    selectedSymptoms &&
                    selectedSymptoms.map((symptomId) => (
                      <Tag key={symptomId} color="blue">
                        {symptoms.find((s) => s.symptom_id === symptomId)
                          ?.name || ""}
                      </Tag>
                    ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      ),
    },
  ];

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
                <Button type="primary" onClick={nextStep}>
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
          grid={{ gutter: 16, column: 3 }}
          dataSource={specializations || []}
          renderItem={(spec) => (
            <List.Item>
              <Card
                hoverable
                onClick={() =>
                  handleSpecializationSelect(spec?.specialization_id)
                }
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
        title={`Chọn bác sĩ ${
          specializations &&
          specializations.length > 0 &&
          selectedSpecialization
            ? specializations.find(
                (s) => s.specialization_id === selectedSpecialization
              )?.name || ""
            : ""
        }`}
        open={showDoctorModal}
        onCancel={() => setShowDoctorModal(false)}
        footer={null}
        width={800}
      >
        <List
          dataSource={doctorsBySpecialization[selectedSpecialization] || []}
          renderItem={(doctor) => (
            <List.Item>
              <Card
                hoverable
                onClick={() => handleDoctorSelect(doctor.doctor_id)}
                className="w-full"
              >
                <div className="flex">
                  <Avatar
                    size={64}
                    src={doctor?.user?.avatar_url || undefined}
                  />
                  <div className="ml-4">
                    <h3 className="font-medium">
                      {doctor?.user?.username || "Bác sĩ"}
                    </h3>
                    <p>{doctor?.degree || ""}</p>
                    <p className="text-sm text-gray-500">
                      {doctor?.description || ""}
                    </p>
                    <div className="mt-1">
                      <Tag color="blue">
                        Kinh nghiệm: {doctor?.experience || ""}
                      </Tag>
                    </div>
                  </div>
                </div>
              </Card>
            </List.Item>
          )}
          pagination={{
            onChange: (page) => handlePageChange(page),
            pageSize: 4,
            current: currentPage,
            total: (doctorsBySpecialization[selectedSpecialization] || [])
              .length,
          }}
        />
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

      {/* <Footer /> */}
    </div>
  );
};

export default BookAppointment;
