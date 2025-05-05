import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { assets } from "../../assets/assets";
import { Button, Avatar, Dropdown } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { AppContext } from "../../context/AppContext";

function NavbarPhar() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AppContext);

  const items = [
    {
      key: "profile",
      icon: <SettingOutlined />,
      label: "Thông tin cá nhân",
      onClick: () => navigate("/pharmacists/profile"),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Log out",
      onClick: () => {
        logout();
        navigate("/login");
      },
    },
  ];

  return (
    <div className="flex items-center justify-between py-4 px-6 md:px-10 bg-white shadow-sm fixed w-full z-10">
      {/* Logo and Role */}
      <div className="flex items-center gap-2">
        <img
          className="w-28 cursor-pointer"
          src={assets.logo}
          alt="Logo"
          onClick={() => navigate("/pharmacists/prescription/pending_prepare")}
        />
        <div className="flex items-center gap-1 bg-blue-100 px-3 py-1 rounded-full">
          <UserOutlined className="!text-blue-900" />
          <span className="text-blue-900 font-medium">Pharmacists</span>
        </div>
      </div>

      {/* User Profile */}
      {user ? (
        <Dropdown menu={{ items }} placement="bottomRight">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="text-right">
              <div className="font-medium">{user.username}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
            <Avatar
              size={40}
              icon={<UserOutlined className="text-white" />}
              className="bg-blue-900"
            />
          </div>
        </Dropdown>
      ) : (
        <Button
          //   icon={<LogoutOutlined />}
          onClick={() => navigate("/login")}
          //   size="medium"
          className="!bg-blue-900 !text-white px-6 py-2 rounded-full font-light hidden md:block hover:!bg-blue-800 hover:!text-white border border-blue-800 transition duration-300"
        >
          Log out
        </Button>
      )}
    </div>
  );
}

export default NavbarPhar;
