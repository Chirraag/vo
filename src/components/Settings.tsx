import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { updateUserRetellApiKey } from "../utils/db";
import {
  Key,
  Save,
  Error,
  Lock,
  Security,
  CheckCircle,
  WatchLater,
  ArrowForward,
} from "@mui/icons-material";

import TokenIcon from "@mui/icons-material/Token";

const Settings: React.FC = () => {
  const [retellApiKey, setRetellApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
    <div className="min-h-screen bg-secondary">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 text-black font-primary">
            Settings
          </h1>
          <p className="text-black/70 font-primary">
            Manage your account settings and API configurations
          </p>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-2xl shadow-md border border-black/5 overflow-hidden transform transition-all duration-300 hover:shadow-lg">
          <div className="p-6 border-b border-black/5 bg-black/[0.02]">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-custom-primary/10 rounded-xl flex items-center justify-center">
                <TokenIcon sx={{ fontSize: 24 }} className="text-black" />
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-black font-primary">
                  API Configuration
                </h2>
                <p className="text-sm text-black/70 font-primary">
                  Manage your Retell API credentials securely
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="retellApiKey"
                  className="block text-sm font-bold text-black mb-2 flex items-center font-primary"
                >
                  Retell API Key
                </label>
                <div className="relative group">
                  <input
                    type={showKey ? "text" : "password"}
                    id="retellApiKey"
                    value={retellApiKey}
                    onChange={(e) => setRetellApiKey(e.target.value)}
                    className="font-primary block w-full pl-12 pr-16 py-3 bg-white border border-black/10 rounded-xl shadow-sm focus:ring-2 focus:ring-black/20 focus:border-black transition-all duration-200 group-hover:border-black/20"
                    placeholder="Enter your Retell API Key"
                    required
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Key
                      sx={{ fontSize: 20 }}
                      className="text-black/40 group-hover:text-black transition-colors duration-200"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={toggleShowKey}
                    className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-bold rounded-md bg-black/5 text-black/70 hover:bg-black/10 hover:text-black transition-colors duration-200 font-primary"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="mt-2 text-sm text-black/60 flex items-center font-primary">
                  <Lock sx={{ fontSize: 16 }} className="mr-1 text-black/40" />
                  Your API key is securely stored and encrypted
                </p>
              </div>

              {error && (
                <div className="bg-custom-primary/10 border-l-4 border-custom-primary p-4 rounded-lg animate-fade-in">
                  <div className="flex">
                    <Error sx={{ fontSize: 20 }} className="text-black" />
                    <p className="ml-3 text-sm text-black font-primary">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-custom-yellow/10 border-l-4 border-custom-yellow p-4 rounded-lg animate-fade-in">
                  <div className="flex items-center">
                    <CheckCircle sx={{ fontSize: 20 }} className="text-black" />
                    <div className="ml-3">
                      <p className="text-sm text-black font-primary">
                        API key updated successfully!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow font-primary"
                >
                  {loading ? (
                    <>
                      <WatchLater
                        sx={{ fontSize: 18 }}
                        className="mr-2 animate-spin"
                      />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save sx={{ fontSize: 18 }} className="mr-2" />
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
