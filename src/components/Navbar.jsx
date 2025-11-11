import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Site Title */}
          <div className="flex items-center">
            <NavLink
              to="/dashboard"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 hover:text-[#2E6A4E] dark:hover:text-green-400 transition-colors"
            >
              IMS + AI
            </NavLink>
          </div>

          {/* Right: Navigation Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `rounded-2xl px-3 sm:px-4 py-2 text-sm font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6A4E] ${
                  isActive
                    ? "bg-gray-100/60 dark:bg-white/10 text-gray-900 dark:text-gray-100 font-semibold"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600"
                }`
              }
              aria-current="page"
            >
              Home
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `rounded-2xl px-3 sm:px-4 py-2 text-sm font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6A4E] ${
                  isActive
                    ? "bg-gray-100/60 dark:bg-white/10 text-gray-900 dark:text-gray-100 font-semibold"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600"
                }`
              }
              aria-current="page"
            >
              About Us
            </NavLink>
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `rounded-2xl px-3 sm:px-4 py-2 text-sm font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6A4E] ${
                  isActive
                    ? "bg-gray-100/60 dark:bg-white/10 text-gray-900 dark:text-gray-100 font-semibold"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600"
                }`
              }
              aria-current="page"
            >
              Contact
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

