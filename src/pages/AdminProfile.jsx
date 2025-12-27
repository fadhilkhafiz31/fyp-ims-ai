import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useStore } from "../contexts/StoreContext";
import { useDarkMode } from "../contexts/DarkModeContext";
import { useToast } from "../contexts/ToastContext";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  deleteDoc,
  serverTimestamp 
} from "firebase/firestore";
import { 
  createUserWithEmailAndPassword, 
  updatePassword, 
  sendEmailVerification, 
  EmailAuthProvider, 
  reauthenticateWithCredential 
} from "firebase/auth";
import { db, auth } from "../lib/firebase";
import TopNavigation from "../components/TopNavigation";
import SideNavigation from "../components/SideNavigation";
import LocationSelector from "../components/LocationSelector";
import * as motion from "motion/react-client";

export default function AdminProfile() {
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
    adminLevel: "Super Admin",
    joinDate: null
  });
  
  const [staffList, setStaffList] = useState([]);
  const [systemStats, setSystemStats] = useState({
    totalStores: 0,
    totalProducts: 0,
    totalStaff: 0
  });
  
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [newStaff, setNewStaff] = useState({
    displayName: "",
    email: "",
    phone: "",
    password: "",
    storeAssignment: "",
    department: "Store Associate"
  });
  
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    showForm: false
  });

  // Load admin profile data
  useEffect(() => {
    if (user) {
      loadProfileData();
      loadStaffList();
      loadSystemStats();
    }
  }, [user, storeId]);

  const loadProfileData = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfileData({
          displayName: userData.displayName || user.displayName || "",
          email: user.email || "",
          phone: userData.phone || "",
          adminLevel: userData.adminLevel || "Super Admin",
          joinDate: userData.createdAt || null
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const loadStaffList = async () => {
    try {
      // Query users collection for staff members
      const staffQuery = query(
        collection(db, "users"),
        where("role", "==", "staff")
      );
      const staffSnapshot = await getDocs(staffQuery);
      const staff = staffSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by displayName on the client side since we removed orderBy
      staff.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
      
      setStaffList(staff);
    } catch (error) {
      console.error("Error loading staff:", error);
      toast.error("Failed to load staff list");
    }
  };

  const loadSystemStats = async () => {
    try {
      // Total stores
      const totalStores = stores.length;
      
      // Total products in selected store (or all if no store selected)
      let productsQuery;
      if (storeId) {
        productsQuery = query(
          collection(db, "inventory"),
          where("storeId", "==", storeId)
        );
      } else {
        productsQuery = collection(db, "inventory");
      }
      
      const productsSnapshot = await getDocs(productsQuery);
      const totalProducts = productsSnapshot.size;
      
      // Total staff
      const totalStaff = staffList.length;
      
      setSystemStats({
        totalStores,
        totalProducts,
        totalStaff
      });
    } catch (error) {
      console.error("Error loading system stats:", error);
    }
  };

  const handleCreateStaff = async () => {
    if (!newStaff.displayName || !newStaff.email || !newStaff.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Store current user info to restore session later
      const currentUser = auth.currentUser;
      const currentUserToken = await currentUser?.getIdToken();
      
      // Create user account (this will sign in the new user)
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        newStaff.email, 
        newStaff.password
      );
      
      // Add user data to Firestore using the user's UID as document ID
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        displayName: newStaff.displayName,
        email: newStaff.email,
        phone: newStaff.phone,
        role: "staff",
        department: newStaff.department,
        storeAssignment: newStaff.storeAssignment,
        employeeId: `EMP${userCredential.user.uid.slice(-6).toUpperCase()}`,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.uid
      });
      
      // Sign out the newly created user
      await auth.signOut();
      
      // Restore the admin session by signing them back in
      // Note: In a production environment, you'd want to use Firebase Admin SDK
      // For now, we'll let the auth context handle the re-authentication
      
      toast.success("Staff member created successfully! Please refresh if you were signed out.");
      setShowCreateStaff(false);
      setNewStaff({
        displayName: "",
        email: "",
        phone: "",
        password: "",
        storeAssignment: "",
        department: "Store Associate"
      });
      
      // Reload staff list after a short delay to ensure the document is created
      setTimeout(() => {
        loadStaffList();
      }, 1000);
      
    } catch (error) {
      console.error("Error creating staff:", error);
      
      // Provide more specific error messages
      if (error.code === "auth/email-already-in-use") {
        toast.error("Email is already registered");
      } else if (error.code === "auth/weak-password") {
        toast.error("Password should be at least 6 characters");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Invalid email address");
      } else if (error.code === "permission-denied") {
        toast.error("Permission denied. Please check your admin privileges.");
      } else {
        toast.error(`Failed to create staff member: ${error.message}`);
      }
    }
  };

  const handleEditStaff = async (staffId, updatedData) => {
    try {
      const staffRef = doc(db, "users", staffId);
      await updateDoc(staffRef, {
        ...updatedData,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      });
      
      toast.success("Staff member updated successfully!");
      setEditingStaff(null);
      loadStaffList();
    } catch (error) {
      console.error("Error updating staff:", error);
      toast.error("Failed to update staff member");
    }
  };

  const handleDeleteStaff = async (staffId, staffName) => {
    if (!window.confirm(`Are you sure you want to delete ${staffName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "users", staffId));
      toast.success("Staff member deleted successfully!");
      loadStaffList();
    } catch (error) {
      console.error("Error deleting staff:", error);
      toast.error("Failed to delete staff member");
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
      const credential = EmailAuthProvider.credential(user.email, passwordChange.currentPassword);
      await reauthenticateWithCredential(user, credential);
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
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {profileData.displayName ? profileData.displayName.charAt(0).toUpperCase() : "A"}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {profileData.displayName || "Administrator"}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">{profileData.email}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      Administrator
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold-100 text-gold-800 dark:bg-yellow-900 dark:text-yellow-200">
                      {profileData.adminLevel}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Admin since {formatDate(profileData.joinDate)}
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
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Stores</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{systemStats.totalStores}</p>
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
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {storeId ? "Products (Selected Store)" : "Total Products"}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{systemStats.totalProducts}</p>
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
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Staff</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{systemStats.totalStaff}</p>
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
                    { id: "staff", label: "Staff Management", icon: "👥" },
                    { id: "system", label: "System Overview", icon: "📊" },
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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Administrator Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profileData.displayName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                          onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Admin Level
                        </label>
                        <input
                          type="text"
                          value={profileData.adminLevel}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleEditStaff(user.uid, {
                        displayName: profileData.displayName,
                        phone: profileData.phone
                      })}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      Update Profile
                    </button>
                  </motion.div>
                )}

                {/* Staff Management Tab */}
                {activeTab === "staff" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Staff Management</h3>
                      <button
                        onClick={() => setShowCreateStaff(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      >
                        + Add New Staff
                      </button>
                    </div>

                    {/* Create Staff Modal */}
                    {showCreateStaff && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New Staff</h4>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Full Name *
                              </label>
                              <input
                                type="text"
                                value={newStaff.displayName}
                                onChange={(e) => setNewStaff(prev => ({ ...prev, displayName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Email *
                              </label>
                              <input
                                type="email"
                                value={newStaff.email}
                                onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Phone
                              </label>
                              <input
                                type="tel"
                                value={newStaff.phone}
                                onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Password *
                              </label>
                              <input
                                type="password"
                                value={newStaff.password}
                                onChange={(e) => setNewStaff(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Store Assignment
                              </label>
                              <select
                                value={newStaff.storeAssignment}
                                onChange={(e) => setNewStaff(prev => ({ ...prev, storeAssignment: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              >
                                <option value="">Select Store</option>
                                {stores.map((store) => (
                                  <option key={store.id} value={store.id}>
                                    {store.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          <div className="flex space-x-3 mt-6">
                            <button
                              onClick={handleCreateStaff}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            >
                              Create Staff
                            </button>
                            <button
                              onClick={() => setShowCreateStaff(false)}
                              className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Staff List */}
                    <div className="space-y-4">
                      {staffList.length > 0 ? (
                        staffList.map((staff) => (
                          <div key={staff.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                                    {staff.displayName ? staff.displayName.charAt(0).toUpperCase() : "S"}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{staff.displayName}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">{staff.email}</p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {staff.employeeId} • {staff.department}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setEditingStaff(staff)}
                                  className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteStaff(staff.id, staff.displayName)}
                                  className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No staff members</h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new staff member.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* System Overview Tab */}
                {activeTab === "system" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">System Overview</h3>
                    
                    <div className="space-y-6">
                      <LocationSelector label="Select store to view analytics:" />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-4">System Statistics</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Total Stores:</span>
                              <span className="font-medium text-gray-900 dark:text-white">{systemStats.totalStores}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">
                                {storeId ? "Products (Selected Store):" : "Total Products:"}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">{systemStats.totalProducts}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Total Staff:</span>
                              <span className="font-medium text-gray-900 dark:text-white">{systemStats.totalStaff}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h4>
                          <div className="space-y-2">
                            <button
                              onClick={() => setActiveTab("staff")}
                              className="w-full text-left px-3 py-2 text-sm bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300"
                            >
                              Manage Staff
                            </button>
                            <button
                              onClick={() => window.location.href = "/inventory"}
                              className="w-full text-left px-3 py-2 text-sm bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300"
                            >
                              View Inventory
                            </button>
                            <button
                              onClick={() => window.location.href = "/transactions"}
                              className="w-full text-left px-3 py-2 text-sm bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300"
                            >
                              View Transactions
                            </button>
                          </div>
                        </div>
                      </div>
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
                            <h4 className="font-medium text-gray-900 dark:text-white">Admin Password</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Change your administrator password</p>
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
                            <h4 className="font-medium text-gray-900 dark:text-white">Admin Privileges</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Full system access and staff management</p>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Active
                          </span>
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