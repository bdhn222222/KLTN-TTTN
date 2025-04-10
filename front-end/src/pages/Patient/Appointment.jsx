import { useContext, useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import { assets } from "../../assets/assets";
import RelatedDoctors from "../../components/Patient/RelatedDoctorsPatient";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

const Appointment = () => {
  const { docId } = useParams();
  const { doctors } = useContext(AppContext);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedTime, setSelectedTime] = useState("");

  // Lấy thông tin bác sĩ
  useEffect(() => {
    const doctor = doctors.find((doc) => doc._id === docId);
    setDoctorInfo(doctor);
  }, [doctors, docId]);

  // Tạo danh sách ngày và slots làm việc
  const availableSlots = useMemo(() => {
    if (!doctorInfo) return [];
    const today = new Date();
    return Array.from({ length: 30 }, (_, day) => {
      const date = new Date(today);
      date.setDate(today.getDate() + day);

      return Array.from({ length: (21 - 10) * 2 }, (_, i) => {
        const time = new Date(date);
        time.setHours(10 + Math.floor(i / 2), (i % 2) * 30, 0);
        return {
          datetime: time,
          time: time.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      });
    });
  }, [doctorInfo]);

  // Kiểm tra slot đã đặt, ngày nghỉ, hoặc slot đã qua
  const isSlotBooked = (slot) => false;
  const isOffDay = (date) => false;
  const isTimeSlotPassed = (slot) => slot.datetime < new Date();

  // Đặt lịch
  const handleBookAppointment = () => {
    if (!selectedTime) {
      toast.error("Vui lòng chọn thời gian khám");
      return;
    }
    toast.success("Đặt lịch thành công!");
  };

  return (
    doctorInfo && (
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-6"
        >
          {/* Thông tin bác sĩ */}
          <div className="sm:w-1/3">
            <div className="sticky top-4 bg-white p-6 rounded-xl shadow-lg">
              <img
                className="w-full h-64 object-cover rounded-lg"
                src={doctorInfo.image}
                alt={doctorInfo.name}
              />
              <h2 className="text-2xl font-bold mt-4">{doctorInfo.name}</h2>
              <p className="text-primary mt-1">
                {doctorInfo.degree} - {doctorInfo.speciality}
              </p>
              <p className="mt-2 text-gray-600">{doctorInfo.about}</p>
              <p className="mt-4 font-semibold text-primary text-lg">
                ${doctorInfo.fees} per appointment
              </p>
            </div>
          </div>

          {/* Chọn lịch */}
          <div className="sm:w-2/3 bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Chọn ngày & giờ khám
            </h3>

            {/* Chọn ngày */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                <div
                  key={day}
                  className="text-center p-2 text-sm font-semibold text-gray-600"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Danh sách ngày */}
            <div className="grid grid-cols-7 gap-2">
              {availableSlots.map((item, index) => {
                const isDisabled = isOffDay(item[0].datetime);
                return (
                  <button
                    key={index}
                    onClick={() => !isDisabled && setSelectedDayIndex(index)}
                    className={`p-2 rounded-lg text-sm font-medium transition-all ${
                      selectedDayIndex === index
                        ? "bg-primary text-white"
                        : isDisabled
                        ? "bg-gray-200 text-gray-400"
                        : "bg-white border"
                    }`}
                    disabled={isDisabled}
                  >
                    {item[0].datetime.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Chọn giờ */}
            <h4 className="text-lg font-medium text-gray-700 mt-6">
              Khung giờ còn trống
            </h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
              {availableSlots[selectedDayIndex]?.map((item, index) => {
                const isDisabled = isTimeSlotPassed(item) || isSlotBooked(item);
                return (
                  <button
                    key={index}
                    onClick={() => !isDisabled && setSelectedTime(item.time)}
                    className={`p-2 rounded-lg text-sm transition-all ${
                      selectedTime === item.time
                        ? "bg-primary text-white"
                        : isDisabled
                        ? "bg-gray-200 text-gray-400"
                        : "bg-white border"
                    }`}
                    disabled={isDisabled}
                  >
                    {item.time}
                  </button>
                );
              })}
            </div>

            {/* Đặt lịch */}
            <button
              onClick={handleBookAppointment}
              className={`w-full mt-8 py-3 rounded-lg font-medium transition-all ${
                !selectedTime
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 text-white"
              }`}
              disabled={!selectedTime}
            >
              {selectedTime ? "Đặt lịch" : "Chọn giờ trước"}
            </button>
          </div>
        </motion.div>

        {/* Gợi ý bác sĩ khác */}
        <RelatedDoctors docId={docId} speciality={doctorInfo.speciality} />
      </div>
    )
  );
};

export default Appointment;
