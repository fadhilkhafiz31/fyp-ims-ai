import { useState, useEffect, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import { useToast } from "../contexts/ToastContext";
import * as motion from "motion/react-client";
import TopNavigation from "../components/TopNavigation";
import { PageReady } from "../components/NProgressBar";

export default function RedeemPoints() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [success, setSuccess] = useState(null);
  const { toast } = useToast();
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

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
      <TopNavigation role="customer" />
      
      <div className="max-w-md mx-auto px-6 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700"
        >
          <div className="bg-[#0F5132] p-6 text-center">
            <span className="text-4xl mb-2 block">🧾</span>
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
                      placeholder="e.g. SALE-8832-X"
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
    </div>
  );
}
