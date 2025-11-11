import { useState, useEffect } from "react";
import { getStores, createContactMessage } from "../lib/db";
import { PageReady } from "../components/NProgressBar";

export default function Contact() {
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem("contactViewMode");
    return saved || "project";
  });
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
    includeStore: false,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    localStorage.setItem("contactViewMode", viewMode);
  }, [viewMode]);

  // Load stores on mount (needed for Store Directory in project view and stores view)
  useEffect(() => {
    setLoading(true);
    setError(null);
    getStores()
      .then((data) => {
        setStores(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []); // Load once on mount

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!formData.email.includes("@")) {
      errors.email = "Please enter a valid email address";
    }
    if (!formData.message.trim()) {
      errors.message = "Message is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await createContactMessage({
        name: formData.name,
        email: formData.email,
        message: formData.message,
        includeStore: formData.includeStore,
      });
      setSubmitSuccess(true);
      setFormData({ name: "", email: "", message: "", includeStore: false });
      setFormErrors({});
      // Hide success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err) {
      setSubmitError(err.message || "Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div>
      <PageReady />

      {/* Toggle Control */}
      <div className="flex justify-end mb-6">
        <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-1">
          <button
            type="button"
            onClick={() => setViewMode("project")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6A4E] ${
              viewMode === "project"
                ? "bg-[#2E6A4E] text-white"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            aria-pressed={viewMode === "project"}
          >
            Project contact
          </button>
          <button
            type="button"
            onClick={() => setViewMode("stores")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6A4E] ${
              viewMode === "stores"
                ? "bg-[#2E6A4E] text-white"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            aria-pressed={viewMode === "stores"}
          >
            Local markets
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-right mb-6 -mt-4">
        Switch to view local market info.
      </p>

      {viewMode === "project" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Project Contact */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Get in Touch
            </h1>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Project Contact
              </h2>
              <div className="space-y-3 text-gray-700 dark:text-gray-300">
                <p>
                  <strong>Developer:</strong> Project Owner
                </p>
                <p>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:contact@ims-ai.com"
                    className="text-[#2E6A4E] dark:text-green-400 hover:underline"
                  >
                    contact@ims-ai.com
                  </a>
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Send a Message
              </h2>

              {submitSuccess && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-green-800 dark:text-green-200 text-sm">
                    Message sent! We'll get back to you soon.
                  </p>
                </div>
              )}

              {submitError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-800 dark:text-red-200 text-sm">{submitError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E6A4E] dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 ${
                      formErrors.name
                        ? "border-red-500 dark:border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                    aria-invalid={!!formErrors.name}
                    aria-describedby={formErrors.name ? "name-error" : undefined}
                  />
                  {formErrors.name && (
                    <p id="name-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E6A4E] dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 ${
                      formErrors.email
                        ? "border-red-500 dark:border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                    aria-invalid={!!formErrors.email}
                    aria-describedby={formErrors.email ? "email-error" : undefined}
                  />
                  {formErrors.email && (
                    <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {formErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E6A4E] dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 ${
                      formErrors.message
                        ? "border-red-500 dark:border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                    aria-invalid={!!formErrors.message}
                    aria-describedby={formErrors.message ? "message-error" : undefined}
                  />
                  {formErrors.message && (
                    <p id="message-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {formErrors.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeStore"
                    name="includeStore"
                    checked={formData.includeStore}
                    onChange={handleChange}
                    className="w-4 h-4 text-[#2E6A4E] border-gray-300 rounded focus:ring-[#2E6A4E] dark:bg-gray-800 dark:border-gray-600"
                  />
                  <label
                    htmlFor="includeStore"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Include my store name (optional)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#2E6A4E] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#235a43] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6A4E]"
                >
                  {submitting ? "Sending..." : "Send"}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Store Directory */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Store Directory
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                    ></div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600 dark:text-red-400 mb-2">Error loading stores</p>
                  <button
                    onClick={() => {
                      setError(null);
                      setViewMode("stores");
                    }}
                    className="text-sm text-[#2E6A4E] dark:text-green-400 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : stores.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No stores yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {stores.map((store) => (
                    <div
                      key={store.id}
                      className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0"
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {store.storeName || store.name || "Unnamed Store"}
                      </h3>
                      {store.phone && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          📞 {store.phone}
                        </p>
                      )}
                      {store.address && (
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            📍 {store.address}
                          </p>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#2E6A4E] dark:text-green-400 hover:underline ml-2"
                          >
                            View on Map
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Local Markets
          </h1>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
                >
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">
                Error loading stores: {error}
              </p>
              <button
                onClick={() => {
                  setError(null);
                  setViewMode("stores");
                }}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : stores.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No stores available at this time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {store.storeName || store.name || "Unnamed Store"}
                  </h3>
                  {store.phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      📞 {store.phone}
                    </p>
                  )}
                  {store.address && (
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                        📍 {store.address}
                      </p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#2E6A4E] dark:text-green-400 hover:underline ml-2 whitespace-nowrap"
                      >
                        View on Map
                      </a>
                    </div>
                  )}
                  {store.storeId && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      ID: {store.storeId}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

