import React from 'react';

interface PanelProps {
    title?: string | null;
    children?: React.ReactNode;
    className?: string;
    headerControls?: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ title, children = null, className = '', headerControls = null }) => {
  return (
    <div className={`flex flex-col border-b border-gray-800 bg-panel-bg ${className}`}>
      {title && (
        <div className="flex justify-between items-center border-b border-gray-800 flex-none">
          <h2 className="text-base md:text-xs px-3 py-1 text-gray-500 tracking-wider font-semibold uppercase">
            {title}
          </h2>
          {headerControls && <div className="px-2">{headerControls}</div>}
        </div>
      )}
      <div className="flex-grow flex flex-col min-h-0">{children}</div>
    </div>
  );
};