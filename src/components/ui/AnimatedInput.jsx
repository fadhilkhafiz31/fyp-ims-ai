import { useState } from "react";
import * as motion from "motion/react-client";

export default function AnimatedInput({
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  className = "",
  icon,
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);

  const handleChange = (e) => {
    setHasValue(!!e.target.value);
    if (onChange) onChange(e);
  };

  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
          {icon}
        </div>
      )}
      <motion.input
        type={type}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        required={required}
        className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none transition-colors ${className}`}
        animate={{
          borderColor: isFocused ? "#3b82f6" : "#d1d5db",
          boxShadow: isFocused ? "0 0 0 3px rgba(59, 130, 246, 0.1)" : "0 0 0 0px",
        }}
        transition={{ duration: 0.2 }}
        {...props}
      />
      {isFocused && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          exit={{ scaleX: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </div>
  );
}

