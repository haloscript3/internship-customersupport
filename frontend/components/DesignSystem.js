import { useState } from 'react';


export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    outlineSecondary: 'btn-outline-secondary',
    ghost: 'btn-ghost',
    destructive: 'btn-destructive'
  };
  const sizeClasses = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg'
  };

  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};


export const Input = ({ 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'input';
  const variantClasses = {
    primary: '',
    secondary: 'input-secondary'
  };

  return (
    <input 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
};


export const Card = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
};

export const AuthCard = ({ 
  children, 
  type = 'user', 
  className = '', 
  ...props 
}) => {
  const headerClasses = type === 'user' ? 'auth-header-user' : 'auth-header-agent';
  
  return (
    <div className={`auth-card ${className}`} {...props}>
      {children}
    </div>
  );
};


export const PageContainer = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`page-container ${className}`} {...props}>
      {children}
    </div>
  );
};

export const ContentContainer = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`content-container ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CenteredContainer = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`centered-container ${className}`} {...props}>
      {children}
    </div>
  );
};


export const ChatContainer = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`chat-container ${className}`} {...props}>
      {children}
    </div>
  );
};

export const ChatHeader = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`chat-header ${className}`} {...props}>
      {children}
    </div>
  );
};

export const ChatMessages = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`chat-messages ${className}`} {...props}>
      {children}
    </div>
  );
};

export const ChatInputContainer = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`chat-input-container ${className}`} {...props}>
      {children}
    </div>
  );
};


export const MessageBubble = ({ 
  children, 
  type = 'user', 
  className = '', 
  ...props 
}) => {
  const typeClasses = {
    user: 'chat-bubble-user',
    agent: 'chat-bubble-agent',
    system: 'chat-bubble-system'
  };

  return (
    <div className={`${typeClasses[type]} ${className}`} {...props}>
      {children}
    </div>
  );
};


export const StatusIndicator = ({ 
  status = 'offline', 
  className = '', 
  ...props 
}) => {
  const statusClasses = {
    online: 'status-online',
    offline: 'status-offline',
    busy: 'status-busy'
  };

  return (
    <div className={`${statusClasses[status]} ${className}`} {...props} />
  );
};


export const LoadingSpinner = ({ 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`loading-spinner ${sizeClasses[size]} ${className}`} {...props} />
  );
};


export const Icon = ({ 
  name, 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const icons = {
    user: (
      <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
      </svg>
    ),
    agent: (
      <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
      </svg>
    ),
    chat: (
      <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"></path>
      </svg>
    ),
    send: (
      <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
      </svg>
    ),
    close: (
      <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
      </svg>
    ),
    menu: (
      <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
        <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path>
      </svg>
    ),
    history: (
      <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
      </svg>
    ),
    settings: (
      <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"></path>
      </svg>
    )
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      {icons[name] || icons.user}
    </div>
  );
};


export const NavItem = ({ 
  children, 
  active = false, 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'nav-item';
  const activeClasses = active ? 'nav-item-active' : '';

  return (
    <div className={`${baseClasses} ${activeClasses} ${className}`} {...props}>
      {children}
    </div>
  );
};


export const Alert = ({ 
  children, 
  type = 'info', 
  className = '', 
  ...props 
}) => {
  const typeClasses = {
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    success: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
    error: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
  };

  return (
    <div className={`p-4 rounded-lg border ${typeClasses[type]} ${className}`} {...props}>
      {children}
    </div>
  );
};


export const Badge = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const variantClasses = {
    primary: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200',
    secondary: 'bg-pink-100 dark:bg-pink-900/20 text-pink-800 dark:text-pink-200',
    success: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200',
    warning: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200',
    error: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};


export const Modal = ({ 
  children, 
  isOpen, 
  onClose, 
  className = '', 
  ...props 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        <div className={`inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${className}`} {...props}>
          {children}
        </div>
      </div>
    </div>
  );
};


export const Tooltip = ({ 
  children, 
  content, 
  className = '', 
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      {...props}
    >
      {children}
      {isVisible && (
        <div className="absolute z-10 px-2 py-1 text-sm text-white bg-gray-900 rounded-lg shadow-lg -top-8 left-1/2 transform -translate-x-1/2">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}; 