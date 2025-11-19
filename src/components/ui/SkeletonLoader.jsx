import * as motion from "motion/react-client";

export function SkeletonCard() {
  return (
    <motion.div
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-3">
        <motion.div
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
          animate={{
            background: [
              "linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
              "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)",
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            backgroundSize: "200% 100%",
          }}
        />
        <motion.div
          className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"
          animate={{
            background: [
              "linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
              "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)",
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
            delay: 0.2,
          }}
          style={{
            backgroundSize: "200% 100%",
          }}
        />
        <motion.div
          className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"
          animate={{
            background: [
              "linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
              "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)",
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
            delay: 0.4,
          }}
          style={{
            backgroundSize: "200% 100%",
          }}
        />
      </div>
    </motion.div>
  );
}

export function SkeletonTableRow() {
  return (
    <motion.div
      className="grid grid-cols-10 gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.div
          key={i}
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
          animate={{
            background: [
              "linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
              "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)",
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.1,
          }}
          style={{
            backgroundSize: "200% 100%",
          }}
        />
      ))}
    </motion.div>
  );
}

export function SkeletonKPI() {
  return (
    <motion.div
      className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"
        animate={{
          background: [
            "linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
            "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)",
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          backgroundSize: "200% 100%",
        }}
      />
      <motion.div
        className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"
        animate={{
          background: [
            "linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
            "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)",
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
          delay: 0.2,
        }}
        style={{
          backgroundSize: "200% 100%",
        }}
      />
    </motion.div>
  );
}

