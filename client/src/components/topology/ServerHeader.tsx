import React from 'react';

interface ServerHeaderProps {
  id: string;
  role: 'compute' | 'storage' | 'k8s' | 'gpu';
  sub: string;
  botCount: number;
}

export const ServerHeader: React.FC<ServerHeaderProps> = ({ id, role, sub, botCount }) => {
  const isEmpty = botCount === 0;

  return (
    <div className={`tp-server${isEmpty ? ' empty' : ''}`}>
      <div className="mk" data-role={role}>
        {id.slice(0, 2).toUpperCase()}
      </div>
      <div className="info">
        <div className="n">{id}</div>
        <div className="sub">{sub}</div>
      </div>
      <div className="badge">
        {isEmpty ? '— no bot —' : <>{botCount} bot{botCount > 1 ? 's' : ''}</>}
      </div>
    </div>
  );
};
