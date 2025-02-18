import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { specialityData } from "../assets/assets";
import { useNavigate } from "react-router-dom";

const Doctors = () => {
  const navigate = useNavigate();
  const { speciality } = useParams();
  const [filterDoctors, setFilterDoctors] = useState([]); //lọc
  const { doctors } = useContext(AppContext); //kho

  const applyFilter = () => {
    if (speciality) { // chọn bs theo khoa
      setFilterDoctors(doctors.filter((doc) => doc.speciality === speciality)); // lọc theo tên khoa
    } else {
      setFilterDoctors(doctors); // hiển thị tất cả bác sĩ
    }
  };

  useEffect(() => { // dữ liệu được chạy lại nếu 1 trong 2 biến thay đổi - mỗi lần click chuột lọc khoa, dữ liệu sẽ được lọc theo filter đó
    applyFilter();
  }, [doctors, speciality]);

  return (
    <div>
      {/* Khoa */}
      <div className="flex flex-col sm:flex-row items-start gap-5 mt-5"> 
        <div className="flex flex-col gap-4 text-sm text-gray-600">
          {specialityData.map((item, index) => (
            <p
              onClick={() =>
                speciality === item.speciality ? navigate("/doctors") // lần 2 click chuột vào bộ lọc
                  : navigate(`/doctors/${item.speciality}`) // lần 1 click chuột vào bộ lọc
              }
              className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded hover:bg-indigo-50 transition-all duration-300 cursor-pointer ${
                speciality === item.speciality ? "bg-indigo-50 text-black" : ""
              }`}
              key={index}
            >
              {item.speciality}
            </p>
          ))}
        </div>
        {/* Bác sĩ */}
        <div className="w-full grid grid-cols-auto gap-4 gap-y-6">
          {filterDoctors.map((item) => (
            <div
              onClick={() => navigate(`/appointment/${item._id}`)}
              className="border border-blue-200 rounded-xl overflow-hidden cursor-pointer hover:translate-y-[-10px] transition-all duration-300 "
              key={item._id} // lấy theo id doctor
            >
              <img className="bg-blue-50" src={item.image} alt="" />
              <div className="p-4">
                <div className="flex items-center gap-2 text-sm text-center text-green-500 ">
                  <p className="w-2 h-2 rounded-full bg-green-500"></p>
                  <p>Available</p>
                </div>
                <p className="text-gray-900 text-lg font-medium">{item.name}</p>
                <p className="text-gray-600 text-sm ">{item.speciality}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Doctors;