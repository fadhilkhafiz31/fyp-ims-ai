import * as motion from "motion/react-client";

export default function Rotate() {
  return (
    <motion.div
      className="w-[100px] h-[100px] bg-[#ff0088] rounded-[5px]"
      animate={{ rotate: 360 }}
      transition={{ duration: 1 }}
    />
  );
}

