import React, { useRef, useEffect } from 'react';

interface ContextMenuProps {
    x: number;
    y: number;
    onCopy: () => void;
    onPaste: () => void;
    onClose: () => void;
    isPasteDisabled: boolean;
    onToggle: () => void;
    isEnabled: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onCopy, onPaste, onClose, isPasteDisabled, onToggle, isEnabled }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) { onClose(); }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [onClose]);

  const menuStyle: React.CSSProperties = { top: `${y}px`, left: `${x}px`, position: 'fixed', zIndex: 1001 };

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-gray-800/30 backdrop-blur-[4px] rounded-lg shadow-xl text-gray-200 w-36 overflow-hidden"
      onClick={(e) => e.stopPropagation()} 
      onContextMenu={(e) => e.preventDefault()} 
    >
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-2 hover:bg-primary-accent/50 hover:text-white transition-colors text-base"
      >
        {isEnabled ? 'Disable Step' : 'Enable Step'}
      </button>
      <button
        onClick={onCopy}
        className="w-full text-left px-4 py-2 hover:bg-primary-accent/50 hover:text-white transition-colors text-base"
      >
        Copy
      </button>
      <button
        onClick={onPaste}
        disabled={isPasteDisabled}
        className="w-full text-left px-4 py-2 hover:bg-primary-accent/50 transition-colors disabled:text-gray-500 disabled:hover:bg-transparent text-base"
      >
        Paste
      </button>
    </div>
  );
};
