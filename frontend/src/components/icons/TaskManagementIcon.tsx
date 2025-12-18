import React from 'react';

interface TaskManagementIconProps {
  style?: React.CSSProperties;
  className?: string;
}

const TaskManagementIcon: React.FC<TaskManagementIconProps> = ({ style, className }) => (
  <img 
    src="/renwuguanli.svg"
    alt="Task Management"
    style={{ 
      width: '16px', 
      height: '16px', 
      objectFit: 'contain',
      ...style 
    }}
    className={className}
  />
);

export default TaskManagementIcon;














