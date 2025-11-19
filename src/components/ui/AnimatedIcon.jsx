import * as motion from "motion/react-client";

export default function AnimatedIcon({ 
  children, 
  hoverRotate = false, 
  hoverScale = true,
  className = "",
  ...props 
}) {
  return (
    <motion.span
      className={className}
      whileHover={{
        rotate: hoverRotate ? 360 : 0,
        scale: hoverScale ? 1.2 : 1,
      }}
      transition={{
        duration: 0.3,
        ease: "easeInOut",
      }}
      {...props}
    >
      {children}
    </motion.span>
  );
}

