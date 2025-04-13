import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { 
  Mail, 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  AlertCircle,
  Loader,
  CheckCircle,
  PhoneCall
} from "lucide-react";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [retellApiKey, setRetellApiKey] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string; api?: string}>({});
  const [successMessage, setSuccessMessage] = useState("");

  // Animation helper to transition between forms
  useEffect(() => {
    // Reset form errors when switching modes
    setErrors({});
    setSuccessMessage("");
  }, [isSignUp]);

  const validateForm = () => {
    const newErrors: {email?: string; password?: string; api?: string} = {};
    let isValid = true;

    // Email validation
    if (!email) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
      isValid = false;
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    // API Key validation (only for signup)
    if (isSignUp && !retellApiKey) {
      newErrors.api = "Retell API Key is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      if (isSignUp) {
        // Step 1: Sign up the user
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        const userId = data?.user?.id;
        const userEmail = data?.user?.email;

        if (userId && userEmail) {
          // Step 2: Insert a new row in user_dialing_credits table for the new user
          const { error: insertError } = await supabase
            .from("user_dialing_credits")
            .insert([
              {
                userId,
                dialing_credits: 200,
                email: userEmail,
                retell_api_key: retellApiKey,
              },
            ]);

          if (insertError) throw insertError;
          
          // Show success message
          setSuccessMessage("Account created successfully! Please check your email to verify your account.");
          // Clear form
          setEmail("");
          setPassword("");
          setRetellApiKey("");
        }
      } else {
        // Step 3: Log in the user
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setErrors({
        ...errors,
        email: error.message || "Authentication failed"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="w-full max-w-md">
          <div className="bg-white shadow-xl rounded-2xl p-8 relative overflow-hidden border border-gray-100">
            {/* Logo and Title */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-6">
                <div className="relative flex items-center justify-center w-12 h-12 bg-black/5 rounded-xl">
                  <img src="/recall-logo-black.png" alt="Recall" className="w-10 h-10 object-contain" />
                  <div className="absolute inset-0 rounded-xl ring-1 ring-black/10"></div>
                </div>
                <span className="font-['Outfit'] text-3xl font-bold text-black ml-3">Recall</span>
              </div>
            
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isSignUp ? "Create an Account" : "Welcome Back"}
              </h2>
              <p className="text-gray-600 mt-2">
                {isSignUp ? "Sign up to get started with AI Caller" : "Sign in to access your account"}
              </p>
            </div>
            
            {/* Success message */}
            {successMessage && (
              <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-lg flex items-start">
                <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{successMessage}</p>
              </div>
            )}
            
            <form onSubmit={handleAuth} className="space-y-6">
              {/* Email field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input 
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-3 text-gray-900 border ${
                      errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    } rounded-lg transition-colors shadow-sm`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>
              
              {/* Password field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`block w-full pl-10 pr-10 py-3 text-gray-900 border ${
                      errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    } rounded-lg transition-colors shadow-sm`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.password}
                  </p>
                )}
                {!isSignUp && (
                  <div className="mt-1">
                    <button
                      type="button"
                      className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
              
              {/* Retell API Key field (only for signup) */}
              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="retellApiKey">
                    Retell API Key
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="retellApiKey"
                      type="text"
                      placeholder="Enter your Retell API Key"
                      value={retellApiKey}
                      onChange={(e) => setRetellApiKey(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-3 text-gray-900 border ${
                        errors.api ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                      } rounded-lg transition-colors shadow-sm`}
                    />
                  </div>
                  {errors.api && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.api}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    You can get your API key from the Retell dashboard
                  </p>
                </div>
              )}
              
              {/* Auth buttons */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-2.5 px-4 rounded-lg hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium shadow-sm hover:shadow"
                >
                  {loading ? (
                    <>
                      <Loader className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {isSignUp ? "Create Account" : "Sign In"}
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </form>
            
            {/* Toggle between signup and login */}
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Need an account? Sign up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}