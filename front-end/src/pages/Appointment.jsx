import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { assets } from "../assets/assets";
import RelatedDoctors from "../components/RelatedDoctors";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

const Appointment = () => {
  // Constants
  const WORKING_HOURS = {
    START: 10,
    END: 21,
  };
  const SLOT_DURATION = 30;
  const DAYS_TO_SHOW = 30;

  // States và Context
  const { docId } = useParams();
  const { doctors } = useContext(AppContext);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState([]);
  const [doctorOffDays, setDoctorOffDays] = useState([]);

  // Khởi tạo dữ liệu
  useEffect(() => {
    const doctor = doctors.find(doc => doc._id === docId);
    setDoctorInfo(doctor);
    if (doctor) {
      generateAvailableSlots();
      generateDoctorOffDays(); 
    }
  }, [doctors, docId]);

  const generateTimeSlotsForDay = (date) => {
      const slots = [];
      const startTime = new Date(date.setHours(WORKING_HOURS.START, 0, 0));
      const endTime = new Date(date.setHours(WORKING_HOURS.END, 0, 0));

      let currentTime = new Date(startTime);
      while (currentTime < endTime) {
        slots.push({
          datetime: new Date(currentTime),
          time: currentTime.toLocaleTimeString([], { 
            hour: "2-digit", 
            minute: "2-digit" 
          }),
        });
        currentTime.setMinutes(currentTime.getMinutes() + SLOT_DURATION);
      }
      return slots;
    };

    // Giả lập slots đã được đặt
  const simulateBookedSlots = (slots) => { // mô phỏng slots đã được đặt
    const booked = [];
    slots.forEach(daySlots => {
      daySlots.forEach(slot => {
        if (Math.random() < 0.3) { // 30% slots sẽ được book
          booked.push({
            date: slot.datetime,
            time: slot.time
          });
        }
      });
    });
    setBookedSlots(booked);

  };
  
  // Tạo lịch còn trống
  const generateAvailableSlots = () => {
    const slots = [];
    const today = new Date();

    for (let day = 0; day < DAYS_TO_SHOW; day++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + day);
      
      const daySlots = generateTimeSlotsForDay(currentDate);
      slots.push(daySlots);
    }

    setAvailableSlots(slots);
    // Giả lập slots đã book
    simulateBookedSlots(slots);
  };

  // Tạo ngày nghỉ giả lập cho bác sĩ
  const generateDoctorOffDays = () => {
    const today = new Date();
    const offDaysList = [2, 5, 10].map(day => {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      return date;
    });
    setDoctorOffDays(offDaysList);
  };

  // Kiểm tra ngày nghỉ
  const isOffDay = (date) => {
    if (!date || !doctorOffDays.length) return false;
    return doctorOffDays.some(off => 
      off.getDate() === date.getDate() && 
      off.getMonth() === date.getMonth()
    );
  };

  // Kiểm tra slot đã được đặt
  const isSlotBooked = (date, time) => {
    if (!date || !time) return false;
    return bookedSlots.some(slot => 
      slot.time === time && 
      new Date(slot.date).getDate() === new Date(date).getDate() &&
      new Date(slot.date).getMonth() === new Date(date).getMonth()
    );
  };

  // Kiểm tra thời gian đã qua
  const isTimeSlotPassed = (slot) => {
    if (!slot?.datetime) return false;
    const now = new Date();
    const slotDate = new Date(slot.datetime);
    if (
      now.getDate() === slotDate.getDate() &&
      now.getMonth() === slotDate.getMonth()
    ) {
      return new Date(now.getTime() + 15 * 60000) >= slotDate;
    }
    return false;
  };

  // Xử lý chọn giờ
  const handleTimeSelection = (time) => {
    setSelectedTime(time);
  };

  // Xử lý đặt lịch
  const handleBookAppointment = () => {
    if (!selectedTime) {
      toast.error("Vui lòng chọn thời gian khám");
      return;
    }
    if (isOffDay(availableSlots[selectedDayIndex][0].datetime)) {
      toast.error("Không thể đặt lịch vào ngày nghỉ của bác sĩ");
      return;
    }
    // Xử lý logic đặt lịch...
  };

  return (
    doctorInfo && (
      <div className="container mx-auto px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-6 mb-8"
        >
          {/* Thông tin bác sĩ*/}
          <div className="sm:w-1/3">
            <div className="sticky top-4">
              <img
                className="w-[400px] h-[300px] object-cover rounded-xl shadow-lg"
                src={doctorInfo.image}
                alt=" "
              />
              <div className="mt-4 bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-800">{doctorInfo.name}</h2>
                  <img className="w-5" src={assets.verified_icon} alt="Verified" />
                </div>
                <p className="text-primary font-medium mt-2">
                  {doctorInfo.degree} - {doctorInfo.speciality}
                </p>
                <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm mt-2">
                  {doctorInfo.experience}
                </span>
                <p className="mt-4 text-left text-gray-600">{doctorInfo.about}</p>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-gray-600">
                    Appointment fee:
                    <span className="text-primary font-bold text-xl">
                      {doctorInfo.currencySymbol}
                      $ {doctorInfo.fees} 
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking */}
          <div className="sm:w-2/3">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Select Appointment Date & Time</h3>
              
              {/* Calendar View */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-700">Select Date</h4>
                  <p className="text-sm text-gray-500">Available for next 30 days</p>
                </div>

                {/* lịch - booking */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                    <div key={day} className="text-center p-2">
                      <span className="text-sm font-semibold text-gray-600">{day}</span>
                    </div>
                  ))}
                </div>

                {/* Lưới */}
                <div className="max-h-[360px] overflow-y-auto">
                  <div className="grid grid-cols-7 gap-1.5 p-2">
                    {/* Thẻ trống trước ngày đầu tiên */}
                    {availableSlots[0]?.[0] && [...Array(availableSlots[0][0].datetime.getDay())].map((_, index) => (
                      <div key={`empty-${index}`} className="p-2"></div>
                    ))}

                    {/* Calendar Days */}
                    {availableSlots.map((item, index) => {
                      const isOff = item[0] && isOffDay(item[0].datetime);
                      const hasTime = item.some(slot => !isSlotBooked(slot.datetime, slot.time));
                      const isDisabled = isOff || !hasTime;

                      return (
                        <div
                          key={index}
                          onClick={() => !isDisabled && setSelectedDayIndex(index)}
                          className={`
                            relative p-1.5 rounded-lg transition-all text-center
                            ${isDisabled 
                              ? 'bg-gray-50' 
                              : item[0] && 'hover:shadow-sm cursor-pointer hover:border-primary/50'}
                            ${!isDisabled && selectedDayIndex === index
                              ? "bg-primary text-white shadow-sm"
                              : "bg-white border hover:border-primary"}
                            ${!hasTime && !isOff ? 'opacity-50' : ''}
                            min-h-[70px] flex flex-col justify-between
                          `}
                        >
                          {item[0] && (
                            <>
                              <div className="text-right">
                                <span className={`text-[10px] ${
                                  isDisabled 
                                    ? 'text-gray-400'
                                    : selectedDayIndex === index 
                                      ? 'text-white/80' 
                                      : 'text-gray-500'
                                }`}>
                                  {["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][item[0].datetime.getMonth()]}
                                </span>
                              </div>
                              <div className="flex flex-col items-center gap-0.5">
                                <p className={`text-base font-bold ${
                                  isDisabled ? 'text-gray-400' : ''
                                }`}>
                                  {item[0].datetime.getDate()}
                                </p>
                                <div>
                                  {isOff ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">
                                      Off
                                    </span>
                                  ) : !hasTime ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                      Full
                                    </span>
                                  ) : (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full 
                                      ${selectedDayIndex === index 
                                        ? 'bg-white/20' 
                                        : 'bg-primary/10 text-primary'}`
                                    }>
                                      {selectedTime ? "Open" : `${item.length} slots`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                          {isDisabled && (
                            <div className="absolute inset-0 bg-gray-50/50 rounded-lg">
                              {isOff && (
                                <div className="flex items-center justify-center h-full">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Time Slots Section */}
              <div className="mt-8 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-medium text-gray-700">
                    Available Time Slots
                    {availableSlots[selectedDayIndex]?.[0] && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        for {["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][availableSlots[selectedDayIndex][0].datetime.getMonth()]}{' '}
                        {availableSlots[selectedDayIndex][0].datetime.getDate()}
                      </span>
                    )}
                  </h4>
                  {selectedTime && (
                    <button
                      onClick={() => {
                        setSelectedTime("");
                      }}
                      className="text-sm text-primary hover:text-primary/80"
                    >
                      Clear Time Filter
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {availableSlots.length > 0 &&
                    availableSlots[selectedDayIndex].map((item, index) => {
                      const isPassed = isTimeSlotPassed(item);
                      const isBooked = isSlotBooked(item.datetime, item.time);
                      const isDisabled = isBooked || isPassed;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => !isDisabled && handleTimeSelection(item.time)}
                          disabled={isDisabled}
                          className={`p-2 rounded-lg text-sm font-medium transition-all
                            ${item.time === selectedTime
                              ? "bg-primary text-white shadow-md"
                              : isDisabled
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                            }
                          `}
                        >
                          {item.time.toLowerCase()}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Book Button */}
              <button
                onClick={handleBookAppointment}
                className={`w-full mt-8 py-3 rounded-lg font-medium transition-all
                  ${isOffDay(availableSlots[selectedDayIndex]?.[0]?.datetime)
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-primary hover:bg-primary/90"
                  } text-white`}
                disabled={isOffDay(availableSlots[selectedDayIndex]?.[0]?.datetime)}
              >
                {isOffDay(availableSlots[selectedDayIndex]?.[0]?.datetime)
                  ? "Not Available"
                  : "Book Appointment"
                }
              </button>
            </div>
          </div>
        </motion.div>

        {/* Related Doctors Section */}
        <RelatedDoctors docId={docId} speciality={doctorInfo.speciality} />
      </div>
    )
  );
};

export default Appointment;
