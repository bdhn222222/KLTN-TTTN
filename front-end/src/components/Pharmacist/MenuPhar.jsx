import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'antd';
import {
  CalendarOutlined,
  TeamOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons';

const MenuPhar = ({ collapsed, selectedKey: propSelectedKey }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedKey, setSelectedKey] = useState('pending_prepare');
  const [openKeys, setOpenKeys] = useState(['prescription']);

  useEffect(() => {
    // Nếu có selectedKey từ prop, ưu tiên sử dụng nó
    if (propSelectedKey) {
      setSelectedKey(propSelectedKey);
      return;
    }

    const path = location.pathname;
    // Map URL patterns to menu keys
    if (path.includes('pending_prepare')) {
      setSelectedKey('pending_prepare');
    } else if (path.includes('waiting_payment')) {
      setSelectedKey('waiting_payment');
    } else if (path.includes('completed')) {
      setSelectedKey('completed');
    } else if (path.includes('cancelled')) {
      setSelectedKey('cancelled');
    } else if (path.includes('medicines')) {
      setSelectedKey('medicines');
    } else if (path.includes('profile')) {
      setSelectedKey('profile');
    }

    // Keep prescription submenu open when in prescription section
    if (path.includes('prescription')) {
      setOpenKeys(['prescription']);
    }
  }, [location.pathname, propSelectedKey]);

  const items = [
    {
      key: 'prescription',
      icon: <CalendarOutlined className="!text-blue-900" />,
      label: <span className="text-blue-900">Prescription</span>,
      children: [
        {
          key: 'pending_prepare',
          icon: <ClockCircleOutlined className="text-blue-900" />,
          label: 'Pending Prepare',
          onClick: () => navigate('/pharmacists/prescription/pending_prepare')
        },
        {
          key: 'waiting_payment',
          icon: <CheckCircleOutlined className="text-blue-900" />,
          label: 'Waiting Payment',
          onClick: () => navigate('/pharmacists/prescription/waiting_payment')
        },
        {
          key: 'completed',
          icon: <CheckSquareOutlined className="text-blue-900" />,
          label: 'Completed',
          onClick: () => navigate('/pharmacists/prescription/completed')
        },
        {
          key: 'cancelled',
          icon: <CloseCircleOutlined className="text-blue-900" />,
          label: 'Cancelled',
          onClick: () => navigate('/pharmacists/prescription/cancelled')
        },
      ]
    },
    {
      key: 'medicines',
      icon: <TeamOutlined className="text-blue-900" />,
      label: 'Medicines',
      onClick: () => navigate('/pharmacists/medicines')
    },
    {
      key: 'profile',
      icon: <UserOutlined className="text-blue-900" />,
      label: 'Profile',
      onClick: () => navigate('/pharmacists/profile')
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
