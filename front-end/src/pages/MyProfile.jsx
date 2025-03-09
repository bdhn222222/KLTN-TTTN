import React, { useState } from "react";
import { assets } from "../assets/assets";

const MyProfile = () => {
  const [userData, setUserData] = useState({
    name: "Edward Vincent",
    image: assets.profile_pic,
    email: "richardjameswap@gmail.com",
    phone: "+1 123 456 7890",
    address: {
      line1: "57th Cross Richmond",
      line2: "Circle Church Road, London",
    },
    gender: "Male",
    dob: "2000-01-20",
  });

  const [isEdit, setIsEdit] = useState(false);

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 max-w-md mx-auto">
      {/* Profile Image */}
      <div className="flex flex-col items-center">
        <img
          className="w-32 h-32 rounded-full object-cover shadow-md"
          src={userData.image}
          alt="Profile"
        />

        {isEdit ? (
          <input
            className="text-xl font-semibold mt-4 text-center border-b-2 border-gray-300 focus:border-primary outline-none transition"
            type="text"
            value={userData.name}
            onChange={(e) =>
              setUserData((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        ) : (
          <p className="text-xl font-semibold mt-4 text-gray-800">
            {userData.name}
          </p>
        )}
      </div>

      <hr className="w-full border-t border-gray-300 my-5" />

      {/* Contact Information */}
      <div className="text-gray-700">
        <h3 className="text-lg font-medium text-gray-500 mb-3">
          Contact Information
        </h3>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Email:</span>
            <span className="text-primary">{userData.email}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-medium">Phone:</span>
            {isEdit ? (
              <input
                className="border rounded-lg px-2 py-1 w-40 focus:ring-2 focus:ring-primary outline-none"
                type="text"
                value={userData.phone}
                onChange={(e) =>
                  setUserData((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            ) : (
              <span>{userData.phone}</span>
            )}
          </div>

          <div>
            <span className="font-medium">Address:</span>
            {isEdit ? (
              <div className="mt-1">
                <input
                  className="border rounded-lg px-2 py-1 w-full mb-2 focus:ring-2 focus:ring-primary outline-none"
                  type="text"
                  value={userData.address.line1}
                  onChange={(e) =>
                    setUserData((prev) => ({
                      ...prev,
                      address: { ...prev.address, line1: e.target.value },
                    }))
                  }
                />
                <input
                  className="border rounded-lg px-2 py-1 w-full focus:ring-2 focus:ring-primary outline-none"
                  type="text"
                  value={userData.address.line2}
                  onChange={(e) =>
                    setUserData((prev) => ({
                      ...prev,
                      address: { ...prev.address, line2: e.target.value },
                    }))
                  }
                />
              </div>
            ) : (
              <p className="text-gray-600">
                {userData.address.line1}, {userData.address.line2}
              </p>
            )}
          </div>
        </div>
      </div>

      <hr className="w-full border-t border-gray-300 my-5" />

      {/* Basic Information */}
      <div className="text-gray-700">
        <h3 className="text-lg font-medium text-gray-500 mb-3">
          Basic Information
        </h3>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Gender:</span>
            {isEdit ? (
              <select
                className="border rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary outline-none"
                value={userData.gender}
                onChange={(e) =>
                  setUserData((prev) => ({ ...prev, gender: e.target.value }))
                }
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            ) : (
              <span>{userData.gender}</span>
            )}
          </div>

          <div className="flex justify-between">
            <span className="font-medium">Birthday:</span>
            {isEdit ? (
              <input
                className="border rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary outline-none"
                type="date"
                value={userData.dob}
                onChange={(e) =>
                  setUserData((prev) => ({ ...prev, dob: e.target.value }))
                }
              />
            ) : (
              <span>{userData.dob}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-dark transition-all shadow-md"
          onClick={() => setIsEdit(!isEdit)}
        >
          {isEdit ? "Save Information" : "Edit Profile"}
        </button>
      </div>
    </div>
  );
};

export default MyProfile;
