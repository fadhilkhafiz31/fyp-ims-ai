import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { user, authReady } = useAuth();
  const navigate = useNavigate();
  
  // Determine home link based on authentication status
  const homeLink = user && authReady ? "/dashboard" : "/about";
  const isAuthenticated = user && authReady;

  // Prevent navigation to dashboard if not authenticated
  const handleLogoClick = (e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      navigate("/about");
    }
  };

  const handleHomeClick = (e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      navigate("/login");
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Site Title */}
          <div className="flex items-center">
            <NavLink
              to={homeLink}
              onClick={handleLogoClick}
              className="flex items-center transition-opacity hover:opacity-80"
            >
              <img
                src="/Logo SmartStockAI White.png"
                alt="SmartStock AI Logo"
                className="h-10 w-auto brightness-0 dark:brightness-100"
              />
            </NavLink>
          </div>

          {/* Right: Navigation Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <NavLink
                to="/dashboard"
                onClick={handleHomeClick}
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
            ) : null}
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

