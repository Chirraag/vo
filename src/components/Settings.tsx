import React, { useState, useEffect } from "react";
import { Key, Save, AlertCircle, Lock, Vault, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { updateUserRetellApiKey } from "../utils/db";

const Settings: React.FC = () => {
  const [retellApiKey, setRetellApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user found");

        const { data, error } = await supabase
          .from("user_dialing_credits")
          .select("retell_api_key")
          .eq("userId", user.id)
          .single();

        if (error) throw error;
        if (data?.retell_api_key) {
          setRetellApiKey(data.retell_api_key);
        }
      } catch (err) {
        console.error("Error fetching API key:", err);
        setError("Failed to load API key");
      }
    };

    fetchApiKey();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user found");

      await updateUserRetellApiKey(user.id, retellApiKey);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Error updating API key:", err);
      setError("Failed to update API key");
    } finally {
      setLoading(false);
    }
  };

  const toggleShowKey = () => setShowKey(!showKey);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header with subtle gradient text */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 font-outfit">Settings</h1>
          <p className="text-gray-600">Manage your account settings and API configurations</p>
        </div>

        {/* Settings Card with subtle shadow and animation */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-lg">
          <div className="p-6 border-b border-gray-50 bg-gray-50/50">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center transform transition-all duration-300 group-hover:scale-110">
                <Vault className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold text-gray-900">API Configuration</h2>
                <p className="text-sm text-gray-600">Manage your Retell API credentials securely</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <div className="space-y-6">
              <div>
                <label htmlFor="retellApiKey" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <div className="h-4 w-4 mr-2 text-blue-500 text-xl" />
                  Retell API Key
                </label>
                <div className="relative group">
                  <input
                    type={showKey ? "text" : "password"}
                    id="retellApiKey"
                    value={retellApiKey}
                    onChange={(e) => setRetellApiKey(e.target.value)}
                    className="block w-full pl-12 pr-16 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 group-hover:border-blue-300"
                    placeholder="Enter your Retell API Key"
                    required
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-gray-500 group-hover:text-blue-500 transition-colors duration-200" />
                  </div>
                  <button
                    type="button"
                    onClick={toggleShowKey}
                    className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors duration-200"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-600 flex items-center">
                  <Lock className="w-4 h-4 mr-1 text-gray-400" />
                  Your API key is securely stored and encrypted
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-fade-in">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <p className="ml-3 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-lg animate-fade-in">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <div className="ml-3">
                      <p className="text-sm text-emerald-700">API key updated successfully!</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-xl font-medium text-sm hover:from-gray-800 hover:to-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow transform hover:-translate-y-0.5"
                >
                  {loading ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;