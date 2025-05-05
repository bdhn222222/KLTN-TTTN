import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu } from "antd";
import {
  CalendarOutlined,
  TeamOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";

const MenuPhar = ({ collapsed, selectedKey: propSelectedKey }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedKey, setSelectedKey] = useState("pending_prepare");
  const [openKeys, setOpenKeys] = useState(["prescriptions"]);

  useEffect(() => {
    // Nếu có selectedKey từ prop, ưu tiên sử dụng nó
    if (propSelectedKey) {
      setSelectedKey(propSelectedKey);
      return;
    }

    const path = location.pathname;
    // Map URL patterns to menu keys
    if (path.includes("pending")) {
      setSelectedKey("pending_prepare");
    } else if (path.includes("waiting_payment")) {
      setSelectedKey("waiting_payment");
    } else if (path.includes("completed")) {
      setSelectedKey("completed");
    } else if (path.includes("cancelled")) {
      setSelectedKey("cancelled");
    } else if (path.includes("medicines")) {
      setSelectedKey("medicines");
    } else if (path.includes("profile")) {
      setSelectedKey("profile");
    }

    // Keep prescription submenu open when in prescriptions section
    if (path.includes("prescription") || path.includes("prescriptions")) {
      setOpenKeys(["prescriptions"]);
    }
  }, [location.pathname, propSelectedKey]);

  const items = [
    {
      key: "prescriptions",
      icon: <CalendarOutlined className="!text-blue-900" />,
      label: <span className="text-blue-900">Đơn thuốc</span>,
      children: [
        {
          key: "pending_prepare",
          icon: <ClockCircleOutlined className="text-blue-900" />,
          label: "Chờ chuẩn bị",
          onClick: () => navigate("/pharmacist/prescriptions/pending"),
        },
        {
          key: "completed",
          icon: <CheckSquareOutlined className="text-blue-900" />,
          label: "Đã hoàn thành",
          onClick: () => navigate("/pharmacist/prescriptions/completed"),
        },
      ],
    },
    {
      key: "medicines",
      icon: <TeamOutlined className="text-blue-900" />,
      label: "Thuốc",
      onClick: () => navigate("/pharmacist/medicines"),
    },
    {
      key: "profile",
      icon: <UserOutlined className="text-blue-900" />,
      label: "Tài khoản",
      onClick: () => navigate("/pharmacist/profile"),
    },
  ];

  const onOpenChange = (keys) => {
    setOpenKeys(keys);
  };

  return (
    <Menu
      onClick={({ key }) => setSelectedKey(key)}
      selectedKeys={[selectedKey]}
      openKeys={collapsed ? [] : openKeys}
      onOpenChange={onOpenChange}
      style={{ width: collapsed ? 80 : 250 }}
      mode="inline"
      inlineCollapsed={collapsed}
      items={items}
      theme="light"
      className="border-r-0 [&_.ant-menu-item-selected]:!bg-blue-900 [&_.ant-menu-item-selected]:!text-white [&_.ant-menu-item:hover]:!text-blue-900 [&_.ant-menu-submenu-title:hover]:!text-blue-500 [&_.ant-menu-item-active]:!text-blue-900 [&_.ant-menu-submenu-active]:!text-blue-900"
    />
  );
};

export default MenuPhar;
