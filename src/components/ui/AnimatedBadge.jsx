import * as motion from "motion/react-client";
import { useEffect, useState } from "react";

export default function AnimatedBadge({ count, className = "" }) {
  const [prevCount, setPrevCount] = useState(count);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (count !== prevCount) {
      setIsAnimating(true);
      setPrevCount(count);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [count, prevCount]);

  if (count === 0) return null;

  return (
    <motion.span
      className={`ml-auto w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center ${className}`}
      initial={{ scale: 0 }}
      animate={{
        scale: isAnimating ? [1, 1.3, 1] : 1,
      }}
      transition={{
        duration: 0.35,
        ease: "easeOut",
      }}
    >
      <motion.span
        key={count}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
      >
        {count}
      </motion.span>
    </motion.span>
  );
}

