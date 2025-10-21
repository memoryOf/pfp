import React from 'react';

interface ScenarioManagementIconProps {
  style?: React.CSSProperties;
  className?: string;
}

const ScenarioManagementIcon: React.FC<ScenarioManagementIconProps> = ({ style, className }) => (
  <img 
    src="/cjgl.svg" 
    alt="Scenario Management" 
    style={{ 
      width: '16px', 
      height: '16px', 
      objectFit: 'contain',
      ...style 
    }}
    className={className}
  />
);

export default ScenarioManagementIcon;

