import { Link } from "react-router-dom";
import * as motion from "motion/react-client";
import { useState } from "react";

export default function AnimatedLink({ to, children, className = "", ...props }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      to={to}
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {children}
      <motion.span
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-current"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        style={{ originX: 0 }}
      />
    </Link>
  );
}

