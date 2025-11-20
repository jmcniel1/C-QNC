import React from 'react';

interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    color?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange, color = '#f59e0b' }) => {
    return (
      <label className="flex items-center justify-between w-full cursor-pointer">
        <span className="text-gray-400 text-base md:text-[10px] mr-2">{label}</span>
        <button
          onClick={() => onChange(!checked)}
          className={`w-8 h-4 rounded-full p-0.5 transition-colors`}
          style={{ backgroundColor: checked ? color : '#333333' }}
        >
          <div
            className={`w-3 h-3 bg-gray-200 rounded-full transition-transform ${
              checked ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </label>
    );
};
