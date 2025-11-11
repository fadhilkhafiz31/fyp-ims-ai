import Navbar from "../components/Navbar";

/**
 * AppLayout - Wraps pages with Navbar and optional container
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content
 * @param {boolean} props.fullWidth - If true, children take full width (no container). Default: false
 */
export default function AppLayout({ children, fullWidth = false }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      {fullWidth ? (
        <>{children}</>
      ) : (
        <main className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
      )}
    </div>
  );
}

