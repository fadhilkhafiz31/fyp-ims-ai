import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useStore } from "../contexts/StoreContext";
import { useDarkMode } from "../contexts/DarkModeContext";
import { useToast } from "../contexts/ToastContext";
import { doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { updatePassword, sendEmailVerification, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { db } from "../lib/firebase";
import TopNavigation from "../components/TopNavigation";
import SideNavigation from "../components/SideNavigation";
import * as motion from "motion/react-client";

export default function StaffProfile() {
  const { user, role } = useAuth();
  const { stores, storeId } = useStore();
  const { isDarkMode } = useDarkMode();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [profileData, setProfileData] = useState({
    displayName: "",
    email: "",
    phone: "",
    employeeId: "",
    hireDate: null,
    department: "Store Associate",
    storeAssignment: "",
    storeName: ""
  });
  
  const [customerRatings, setCustomerRatings] = useState([]);
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    showForm: false
  });

  // Sample customer ratings data (in real app, this would come from database)
  const sampleRatings = [
    {
      id: 1,
      customerName: "Ahmad Rahman",
      rating: 5,
      comment: "Very friendly staff! Always helpful and polite.",
      date: new Date(2024, 11, 20),
      serviceType: "Customer Assistance"
    },
    {
      id: 2,
      customerName: "Sarah Lee",
      rating: 5,
      comment: "Excellent service. Staff was very knowledgeable about products.",
      date: new Date(2024, 11, 18),
      serviceType: "Product Inquiry"
    },
    {
      id: 3,
      customerName: "David Tan",
      rating: 4,
      comment: "Good service, staff was patient with my questions.",
      date: new Date(2024, 11, 15),
      serviceType: "Checkout Assistance"
    },
    {
      id: 4,
      customerName: "Maria Santos",
      rating: 5,
      comment: "Amazing staff! Very professional and courteous.",
      date: new Date(2024, 11, 12),
      serviceType: "Customer Service"
    },
    {
      id: 5,
      customerName: "John Wong",
      rating: 5,
      comment: "Staff went above and beyond to help me find what I needed.",
      date: new Date(2024, 11, 10),
      serviceType: "Product Location"
    }
  ];

  // Load user profile data
  useEffect(() => {
    if (user) {
      loadProfileData();
      setCustomerRatings(sampleRatings);
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Find store name from storeId
        const assignedStore = stores.find(store => store.id === userData.storeAssignment);
        
        setProfileData({
          displayName: userData.displayName || user.displayName || "",
          email: user.email || "",
          phone: userData.phone || "",
          employeeId: userData.employeeId || `EMP${user.uid.slice(-6).toUpperCase()}`,
          hireDate: userData.hireDate || userData.createdAt || null,
          department: userData.department || "Store Associate",
          storeAssignment: userData.storeAssignment || storeId || "",
          storeName: assignedStore?.name || "99 Speedmart Main Branch"
        });
      } else {
        // Set default values for new staff
        setProfileData(prev => ({
          ...prev,
          displayName: user.displayName || "",
          email: user.email || "",
          employeeId: `EMP${user.uid.slice(-6).toUpperCase()}`,
          department: "Store Associate",
          storeName: "99 Speedmart Main Branch"
        }));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (passwordChange.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(user.email, passwordChange.currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Send email verification for password change
      await sendEmailVerification(user);
      toast.info("Verification email sent. Please check your email to confirm password change.");
      
      // Update password
      await updatePassword(user, passwordChange.newPassword);
      
      setPasswordChange({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        showForm: false
      });
      
      toast.success("Password updated successfully!");
    } catch (error) {
      console.error("Error changing password:", error);
      if (error.code === "auth/wrong-password") {
        toast.error("Current password is incorrect");
      } else {
        toast.error("Failed to change password");
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    return new Date(timestamp).toLocaleDateString();
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <span
        key={index}
        className={`text-lg ${
          index < rating ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"
        }`}
      >
        ★
      </span>
    ));
  };

  const averageRating = customerRatings.length > 0 
    ? (customerRatings.reduce((sum, rating) => sum + rating.rating, 0) / customerRatings.length).toFixed(1)
    : "0.0";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <TopNavigation role={role} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopNavigation role={role} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      
      <div className="flex">
        {/* Side Navigation */}
        {sidebarOpen && (
          <SideNavigation
            activeItemCount={0}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 ${sidebarOpen ? "ml-64" : ""} transition-all duration-300`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Profile Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8"
            >
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {profileData.displayName ? profileData.displayName.charAt(0).toUpperCase() : "S"}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {profileData.displayName || "Staff Member"}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">{profileData.email}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Staff
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {profileData.department}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Employee since {formatDate(profileData.hireDate)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Rating</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageRating}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Customer Reviews</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{customerRatings.length}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Store Assignment</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{profileData.storeName}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-8">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: "profile", label: "Profile Info", icon: "👤" },
                    { id: "work", label: "Work Details", icon: "💼" },
                    { id: "performance", label: "Performance", icon: "⭐" },
                    { id: "security", label: "Security", icon: "🔒" }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                        activeTab === tab.id
                          ? "border-green-500 text-green-600 dark:text-green-400"
                          : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Profile Info Tab */}
                {activeTab === "profile" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Personal Information</h3>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          ℹ️ Profile information can only be edited by administrators
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profileData.displayName}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={profileData.email}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={profileData.phone}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Employee ID
                        </label>
                        <input
                          type="text"
                          value={profileData.employeeId}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Work Details Tab */}
                {activeTab === "work" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Work Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Employee Details</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Employee ID:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{profileData.employeeId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Hire Date:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{formatDate(profileData.hireDate)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Department:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{profileData.department}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Store Assignment</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Store Name:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{profileData.storeName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Store ID:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{profileData.storeAssignment || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Role:</span>
                            <span className="font-medium text-gray-900 dark:text-white">Staff Member</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Performance Tab */}
                {activeTab === "performance" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Customer Feedback</h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-yellow-500">{averageRating}</span>
                        <div className="flex">{renderStars(Math.round(parseFloat(averageRating)))}</div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">({customerRatings.length} reviews)</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {customerRatings.map((rating) => (
                        <div key={rating.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{rating.customerName}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{rating.serviceType}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-1">
                                {renderStars(rating.rating)}
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(rating.date)}</p>
                            </div>
                          </div>
                          
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <p className="text-green-800 dark:text-green-200 italic">"{rating.comment}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Security Tab */}
                {activeTab === "security" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Security Settings</h3>
                    
                    <div className="space-y-6">
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Password</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Change your account password</p>
                          </div>
                          <button
                            onClick={() => setPasswordChange(prev => ({ ...prev, showForm: !prev.showForm }))}
                            className="px-4 py-2 text-green-600 dark:text-green-400 border border-green-600 dark:border-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
                          >
                            {passwordChange.showForm ? 'Cancel' : 'Change Password'}
                          </button>
                        </div>
                        
                        {passwordChange.showForm && (
                          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Current Password
                              </label>
                              <input
                                type="password"
                                value={passwordChange.currentPassword}
                                onChange={(e) => setPasswordChange(prev => ({ ...prev, currentPassword: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                New Password
                              </label>
                              <input
                                type="password"
                                value={passwordChange.newPassword}
                                onChange={(e) => setPasswordChange(prev => ({ ...prev, newPassword: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Confirm New Password
                              </label>
                              <input
                                type="password"
                                value={passwordChange.confirmPassword}
                                onChange={(e) => setPasswordChange(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                            
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                🔒 For security, we'll send a verification email before changing your password.
                              </p>
                            </div>
                            
                            <button
                              onClick={handlePasswordChange}
                              disabled={!passwordChange.currentPassword || !passwordChange.newPassword || !passwordChange.confirmPassword}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Update Password
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
                          </div>
                          <button
                            onClick={() => toast.info("Two-factor authentication setup coming soon!")}
                            className="px-4 py-2 text-green-600 dark:text-green-400 border border-green-600 dark:border-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
                          >
                            Setup 2FA
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}