import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { specialityData } from "../assets/assets";
import { FilterOutlined, CloseOutlined } from "@ant-design/icons";

const Doctors = () => {
  const navigate = useNavigate();
  const { speciality } = useParams();
  const { doctors } = useContext(AppContext);

  const [filterDoctors, setFilterDoctors] = useState([]);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    if (!doctors) {
      console.error("Doctors data is missing!");
      return;
    }
    if (speciality) {
      setFilterDoctors(doctors.filter((doc) => doc.speciality === speciality));
    } else {
      setFilterDoctors(doctors);
    }
  }, [doctors, speciality]);

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Tiêu đề */}
      <p className="text-gray-700 font-medium mb-4">
        Browse through the doctors' specialties
      </p>

      {/* BỘ LỌC */}
      <div className="relative flex flex-col sm:flex-row items-start gap-4">
        {/* Nút mở bộ lọc trên Mobile */}
        <button
          className={`py-2 px-4 border rounded-lg text-sm flex items-center gap-2 transition-all sm:hidden ${
            showFilter
              ? "bg-primary text-white"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
          onClick={() => setShowFilter((prev) => !prev)}
        >
          <FilterOutlined className="text-lg" />
          <span>Filter</span>
        </button>

        {/* Danh sách bộ lọc */}
        <div
          className={`absolute top-full left-0 w-full sm:w-auto bg-white shadow-lg rounded-lg transition-all duration-300 overflow-hidden ${
            showFilter
              ? "max-h-96 opacity-100 scale-100"
              : "max-h-0 opacity-0 scale-95"
          } sm:relative sm:max-h-full sm:opacity-100 sm:scale-100 sm:shadow-none`}
        >
          <div className="flex flex-col sm:flex-row sm:gap-3 p-4 sm:p-0">
            {specialityData.map((item, index) => (
              <p
                key={index}
                onClick={() => {
                  navigate(
                    speciality === item.speciality
                      ? "/doctors"
                      : `/doctors/${item.speciality}`
                  );
                  setShowFilter(false);
                }}
                className={`w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg hover:bg-indigo-50 transition-all duration-300 cursor-pointer ${
                  speciality === item.speciality
                    ? "bg-indigo-100 text-indigo-800 font-medium"
                    : "bg-white"
                }`}
              >
                {item.speciality}
              </p>
            ))}
          </div>

          {/* Nút Clear Filter (Hiển thị khi có filter) */}
          {speciality && (
            <div className="p-3 border-t text-center">
              <button
                onClick={() => navigate("/doctors")}
                className="text-red-500 hover:text-red-600 flex items-center gap-2 mx-auto"
              >
                <CloseOutlined />
                Clear Filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DANH SÁCH BÁC SĨ */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filterDoctors.length > 0 ? (
          filterDoctors.map((item) => (
            <div
              key={item._id}
              onClick={() => navigate(`/appointment/${item._id}`)}
              className="border border-blue-200 rounded-xl overflow-hidden cursor-pointer hover:translate-y-[-5px] transition-all duration-300 hover:shadow-md"
            >
              <img className="bg-blue-50 w-full" src={item.image} alt="" />

              <div className="p-4">
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <p className="w-2 h-2 rounded-full bg-green-500"></p>
                  <p>Available</p>
                </div>
                <p className="text-gray-900 text-lg font-medium">{item.name}</p>
                <p className="text-gray-600 text-sm">{item.speciality}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No doctors available.</p>
        )}
      </div>
    </div>
  );
};

export default Doctors;
