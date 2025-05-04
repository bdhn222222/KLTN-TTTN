import React, { useState } from "react";
import { Menu } from "antd";
import { useNavigate } from "react-router-dom";
import {
  CalendarOutlined,
  DollarOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  CheckSquareOutlined,
  WalletOutlined,
  BankOutlined,
} from "@ant-design/icons";

const MenuAdmin = ({ collapsed }) => {
  const navigate = useNavigate();
  const [openKeys, setOpenKeys] = useState(["appointments"]);

  const items = [
    {
      key: "appointments",
      icon: <CalendarOutlined className="!text-blue-900" />,
      label: <span className="text-blue-900">Quản lý lịch hẹn</span>,
      children: [
        {
          key: "waiting",
          icon: <ClockCircleOutlined className="text-blue-900" />,
          label: "Chờ xác nhận",
          onClick: () => navigate("/admin/appointments/waiting-to-confirm"),
        },
        {
          key: "accepted",
          icon: <CheckCircleOutlined className="text-blue-900" />,
          label: "Đã xác nhận",
          onClick: () => navigate("/admin/appointments/accepted"),
        },
        // {
        //   key: "completed",
        //   icon: <CheckSquareOutlined className="text-blue-900" />,
        //   label: "Completed",
        //   onClick: () => navigate("/admin/appointments/completed"),
        // },
        {
          key: "cancelled",
          icon: <CloseCircleOutlined className="text-blue-900" />,
          label: "Đã hủy",
          onClick: () => navigate("/admin/appointments/cancelled"),
        },
        {
          key: "mark-patient-not-coming",
          icon: <CloseCircleOutlined className="text-blue-900" />,
          label: "Bệnh nhân không đến",
          onClick: () => navigate("/admin/appointments/patient-not-coming"),
        },
      ],
    },
    {
      key: "payments",
      icon: <DollarOutlined className="text-blue-900" />,
      label: <span className="text-blue-900">Quản lý thanh toán</span>,
      children: [
        {
          key: "unpaid",
          icon: <WalletOutlined className="text-blue-900" />,
          label: "Cần thanh toán",
          onClick: () => navigate("/admin/payments/unpaid"),
        },
        {
          key: "paid",
          icon: <BankOutlined className="text-blue-900" />,
          label: "Đã thanh toán",
          onClick: () => navigate("/admin/payments/paid"),
        },
      ],
    },
    // {
    //   key: "patients",
    //   icon: <UserOutlined className="text-blue-900" />,
    //   label: <span className="text-blue-900">Patient Management</span>,
    //   onClick: () => navigate("/admin/patients"),
    // },
    {
      key: "management",
      icon: <TeamOutlined className="text-blue-900" />,
      label: <span className="text-blue-900">Quản lý chung</span>,
      children: [
        {
          key: "departments",
          icon: <MedicineBoxOutlined className="text-blue-900" />,
          label: "Chuyên khoa",
          onClick: () => navigate("/admin/management/departments"),
        },
        {
          key: "doctors",
          icon: <UserOutlined className="text-blue-900" />,
          label: "Bác sĩ",
          onClick: () => navigate("/admin/management/doctors"),
        },
      ],
    },
  ];

  const onOpenChange = (keys) => {
    setOpenKeys(keys);
  };

  return (
    <Menu
      mode="inline"
      openKeys={openKeys}
      onOpenChange={onOpenChange}
      style={{ width: collapsed ? 80 : 250 }}
      items={items}
      theme="light"
      className="border-r-0 [&_.ant-menu-item-selected]:!bg-blue-900 [&_.ant-menu-item-selected]:!text-white [&_.ant-menu-item:hover]:!text-blue-900 [&_.ant-menu-submenu-title:hover]:!text-blue-500 [&_.ant-menu-item-active]:!text-blue-900 [&_.ant-menu-submenu-active]:!text-blue-900"
    />
  );
};

export default MenuAdmin;
