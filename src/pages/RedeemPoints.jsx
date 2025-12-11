import { useState, useEffect, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { functions, db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import * as motion from "motion/react-client";
import TopNavigation from "../components/TopNavigation";
import { PageReady } from "../components/NProgressBar";
import { Link, useLocation } from "react-router-dom";
import { useDarkMode } from "../contexts/DarkModeContext";
import AnimatedIcon from "../components/ui/AnimatedIcon";

// Customer-specific SideNavigation
function CustomerSideNavigation({ onClose, toast }) {
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const isDashboardActive = location.pathname === "/dashboard";
  const isChatbotActive = location.pathname === "/guest-chatbot-full";
  const isRedeemPointsActive = location.pathname === "/redeem-points";

  const menuItems = [
    { icon: "grid", label: "Dashboard", path: "/dashboard", active: isDashboardActive },
    { icon: "chatbot", label: "SmartStockAI Assistant", path: "/guest-chatbot-full", active: isChatbotActive },
    { icon: "gift", label: "Redeem Points", path: "/redeem-points", active: isRedeemPointsActive },
    { icon: "user", label: "My Profile", path: "#", isMock: true },
    { icon: "gear", label: "Settings", path: "#", isMock: true },
    { icon: "logout", label: "Log Out", path: "/login" },
    { icon: "question", label: "Help & Support", path: "#", isMock: true },
  ];

  const getIcon = (iconName) => {
    const icons = {
      grid: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      chatbot: (
        <span className="text-xl">🤖</span>
      ),
      gift: (
        <span className="text-xl">🎁</span>
      ),
      user: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      gear: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      question: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      logout: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4-4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12H9" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16v1a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3h3a3 3 0 013 3v1" />
        </svg>
      ),
    };
    return icons[iconName] || icons.grid;
  };

  const handleMockClick = (e, item) => {
    if (item.isMock) {
      e.preventDefault();
      toast.info(`${item.label} - Coming soon!`);
    }
  };

  return (
    <motion.aside
      className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-[calc(100vh-4rem)] overflow-y-auto fixed left-0 top-16 z-40"
      initial={{ x: -256, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -256, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
    >
      <nav className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span className="text-xl">
                {isDarkMode ? '☀️' : '🌙'}
              </span>
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Customer Dashboard</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <motion.ul
          className="space-y-2"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.05
              }
            }
          }}
        >
          {menuItems.map((item, index) => (
            <motion.li
              key={`${item.icon}-${item.label}-${index}`}
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 }
              }}
              transition={{ duration: 0.3 }}
            >
              <Link
                to={item.path}
                onClick={(e) => handleMockClick(e, item)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  item.active
                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <AnimatedIcon hoverRotate={item.icon === "gear"} hoverScale={true}>
                  {getIcon(item.icon)}
                </AnimatedIcon>
                <span className="font-medium">{item.label}</span>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </nav>
    </motion.aside>
  );
}

export default function RedeemPoints() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [success, setSuccess] = useState(null);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const { toast } = useToast();
  const { user } = useAuth();
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Fetch user points balance in real-time
  useEffect(() => {
    if (!user?.uid) return;

    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          // Use loyaltyPoints field (matches Firebase function)
          setPointsBalance(userData.loyaltyPoints || 0);
        } else {
          setPointsBalance(0);
        }
      },
      (error) => {
        console.error("Error fetching user points:", error);
        setPointsBalance(0);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleRedeem = async (e) => {
    if (e) e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setSuccess(null);
    const redeemFn = httpsCallable(functions, 'redeemLoyaltyCode');

    try {
      const result = await redeemFn({ code: code.toUpperCase().trim() });
      const pointsAwarded = result.data?.pointsAwarded || 0;
      setSuccess(`Successfully redeemed! ${pointsAwarded} points have been added to your account.`);
      toast.success(`Points added successfully! You earned ${pointsAwarded} points.`);
      setCode("");
      setIsScanning(false);
    } catch (error) {
      console.error(error);
      const errorMessage = error.message || "Invalid code. Please check your receipt.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isScanning && scannerRef.current && !html5QrCodeRef.current) {
      // Dynamically import html5-qrcode
      import("html5-qrcode").then((module) => {
        const Html5QrcodeClass = module.Html5Qrcode;
        const html5QrCode = new Html5QrcodeClass(scannerRef.current.id);
        html5QrCodeRef.current = html5QrCode;

        html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            setCode(decodedText.toUpperCase().trim());
            setIsScanning(false);
            toast.info("QR Code detected!");
            html5QrCode.stop().then(() => {
              html5QrCodeRef.current = null;
            }).catch(() => {
              html5QrCodeRef.current = null;
            });
          },
          (errorMessage) => {
            // Ignore scanning errors (they're frequent while scanning)
          }
        ).catch((err) => {
          console.error("QR Scanner error:", err);
          setIsScanning(false);
          if (err?.message?.includes("permission") || err?.message?.includes("Permission")) {
            toast.error("Camera permission denied. Please enable camera access in your browser settings.");
          } else {
            toast.error("Failed to access camera. Please try again.");
          }
          html5QrCodeRef.current = null;
        });
      }).catch((importErr) => {
        console.error("Failed to import html5-qrcode:", importErr);
        setIsScanning(false);
        toast.error("Failed to load QR scanner. Please refresh the page.");
      });
    } else if (!isScanning && html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().then(() => {
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }).catch(() => {
        html5QrCodeRef.current = null;
      });
    }

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        html5QrCodeRef.current = null;
      }
    };
  }, [isScanning, toast]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageReady />
      <TopNavigation role="customer" onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      
      <div className="flex">
        {/* Side Navigation */}
        {sidebarOpen && (
          <CustomerSideNavigation
            onClose={() => setSidebarOpen(false)}
            toast={toast}
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 ${sidebarOpen ? "ml-64" : ""} p-6`}>
          {/* Points Balance Display - Outside Card */}
          <div className="max-w-md mx-auto mb-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6 text-center shadow-md"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">You currently have:</p>
              <p className="text-3xl font-bold text-green-700 dark:text-green-400 flex items-center justify-center gap-2">
                {pointsBalance} Points <span className="text-3xl">🎉</span>
              </p>
            </motion.div>
          </div>

          <div className="max-w-md mx-auto py-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700"
        >
          <div className="bg-[#0F5132] p-6 text-center">
            <span className="text-4xl mb-2 block">🎁</span>
            <h1 className="text-2xl font-bold text-white">Redeem Points</h1>
            <p className="text-green-100 text-sm mt-1">
              Scan receipt QR or enter code manually
            </p>
          </div>

          <div className="p-8">
            {/* Camera View */}
            {isScanning && (
              <div className="mb-6 rounded-xl overflow-hidden border-2 border-[#0F5132] relative">
                <div 
                  id="qr-reader" 
                  ref={scannerRef}
                  className="w-full"
                  style={{ minHeight: "300px" }}
                />
                <button 
                  onClick={() => setIsScanning(false)}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition z-10"
                  aria-label="Close camera"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2 pb-2 bg-white/90 dark:bg-gray-900/90">
                  Point camera at QR code
                </p>
              </div>
            )}

            {success ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                  🎉
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Awesome!</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{success}</p>
                <button 
                  onClick={() => setSuccess(null)} 
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Redeem another code
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleRedeem} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Receipt Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. RECEIPT-8832-X"
                      className="flex-1 px-4 py-3 text-center text-lg font-mono uppercase border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                      maxLength={50}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setIsScanning(!isScanning)}
                      className="px-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                      title="Scan QR Code"
                      disabled={loading}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading || !code.trim()}
                  type="submit"
                  className="w-full py-3 px-4 bg-[#0F5132] hover:bg-[#0d4528] text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Processing...</span>
                    </>
                  ) : (
                    "Claim Points"
                  )}
                </motion.button>
              </form>
            )}
          </div>
        </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
