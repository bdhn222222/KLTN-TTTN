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
  ScheduleOutlined,
} from '@ant-design/icons';

const MenuDoctor = ({ collapsed, selectedKey: propSelectedKey }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedKey, setSelectedKey] = useState('waiting');
  const [openKeys, setOpenKeys] = useState(['appointments']);

  useEffect(() => {
    // Nếu có selectedKey từ prop, ưu tiên sử dụng nó
    if (propSelectedKey) {
      setSelectedKey(propSelectedKey);
      return;
    }

    const path = location.pathname;
    // Map URL patterns to menu keys
    if (path.includes('waiting-to-confirm')) {
      setSelectedKey('waiting');
    } else if (path.includes('accepted')) {
      setSelectedKey('accepted');
    } else if (path.includes('completed')) {
      setSelectedKey('completed');
    } else if (path.includes('cancelled')) {
      setSelectedKey('cancelled');
    } else if (path.includes('patients')) {
      setSelectedKey('patients');
    } else if (path.includes('profile')) {
      setSelectedKey('profile');
    } else if (path.includes('schedule')) {
      setSelectedKey('schedule');
    }

    // Keep appointments submenu open when in appointments section
    if (path.includes('appointments')) {
      setOpenKeys(['appointments']);
    }
  }, [location.pathname, propSelectedKey]);

  const items = [
    {
      key: 'appointments',
      icon: <CalendarOutlined className="!text-blue-900" />,
      label: <span className="text-blue-900">Appointments</span>,
      children: [
        {
          key: 'waiting',
          icon: <ClockCircleOutlined className="text-blue-900" />,
          label: 'Unconfirmed',
          onClick: () => navigate('/doctor/appointments/waiting-to-confirm')
        },
        {
          key: 'accepted',
          icon: <CheckCircleOutlined className="text-blue-900" />,
          label: 'Comfirmed',
          onClick: () => navigate('/doctor/appointments/accepted')
        },
        {
          key: 'completed',
          icon: <CheckSquareOutlined className="text-blue-900" />,
          label: 'Completed',
          onClick: () => navigate('/doctor/appointments/completed')
        },
        {
          key: 'cancelled',
          icon: <CloseCircleOutlined className="text-blue-900" />,
          label: 'Cancelled',
          onClick: () => navigate('/doctor/appointments/cancelled')
        },
      ]
    },
    {
      key: 'patients',
      icon: <TeamOutlined className="text-blue-900" />,
      label: 'Patients',
      onClick: () => navigate('/doctor/patients')
    },
    {
      key: 'profile',
      icon: <UserOutlined className="text-blue-900" />,
      label: 'Profile',
      onClick: () => navigate('/doctor/profile')
    },
    {
      key: 'schedule',
      icon: <ScheduleOutlined className="text-blue-900" />,
      label: 'Schedule',
      onClick: () => navigate('/doctor/schedule')
    }
  ];

  const onOpenChange = (keys) => {
    setOpenKeys(keys);
  };

  return (
    <Menu
      onClick={({ key }) => setSelectedKey(key)}
      selectedKeys={[selectedKey]}
      openKeys={openKeys}
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

export default MenuDoctor;
