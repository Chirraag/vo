import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  PhoneOff,
  CreditCard,
  Settings,
  LogOut,
  Phone,
  Wallet,
  Speech
} from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { getUserDialingCredits } from "../utils/db";

interface NavbarProps {
  onExpansionChange?: (expanded: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onExpansionChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [dialingCredits, setDialingCredits] = useState<number | null>(null);

  useEffect(() => {
    onExpansionChange?.(isHovered);
  }, [isHovered, onExpansionChange]);

  useEffect(() => {
    const fetchDialingCredits = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const credits = await getUserDialingCredits(user.id);
        setDialingCredits(credits);
      }
    };

    fetchDialingCredits();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navItems = [
    {
      path: "/campaigns",
      icon: <Speech size={16} />,
      text: "Campaigns",
    },
    {
      path: "/create",
      icon: <PlusCircle size={16} />,
      text: "Create Campaign",
    },
    { path: "/dnc-list", icon: <PhoneOff size={16} />, text: "DNC List" },
    { path: "/pricing", icon: <Wallet size={16} />, text: "Add Credits" },
    { path: "/settings", icon: <Settings size={16} />, text: "Settings" },
  ];

  return (
    <>
      <nav
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`bg-white h-screen fixed top-0 left-0 z-50 transition-all duration-300 border-r border-black/5 ${
          isHovered ? "w-56" : "w-14"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-100">
            {isHovered && (
              <div className="flex items-center space-x-3">
                <div className="relative flex items-center justify-center w-8 h-8 bg-black/5 rounded-lg">
                  <img src="/recall-logo-black.png" alt="Recall" className="w-7 h-7 object-contain" />
                  <div className="absolute inset-0 rounded-lg ring-1 ring-black/10"></div>
                </div>
                <span className="font-['Outfit'] text-2xl font-bold text-black">Recall</span>
              </div>
            )}
            {!isHovered && (
              <div className="relative flex items-center justify-center w-8 h-8 bg-black/5 rounded-lg mx-auto">
                <img src="/recall-logo-black.png" alt="Recall" className="w-7 h-7 object-contain" />
                <div className="absolute inset-0 rounded-lg ring-1 ring-black/10"></div>
              </div>
            )}
          </div>
          <nav className="flex-1 px-2 py-2">
            <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center ${
                    isHovered ? "space-x-3" : "justify-center"
                  } px-2 py-2 rounded-lg transition-all duration-200 text-xs ${
                    location.pathname === item.path
                      ? "bg-black text-white font-semibold shadow-sm"
                      : "text-gray-600 hover:bg-gray-50/50 hover:text-gray-900 text-sm font-medium"
                  }`}
                >
                  {item.icon}
                  <span className={`whitespace-nowrap transition-opacity duration-200 ${
                    isHovered ? "opacity-100" : "opacity-0 w-0"
                  }`}>
                    {item.text}
                  </span>
                </Link>
              </li>
            ))}
            </ul>
          </nav>
          <div className="p-3">
            {isHovered ? (
              <div className="bg-black/[0.02] rounded-xl p-4 mb-4 border border-black/5 shadow-inner">
                <h3 className="text-sm font-medium text-black/70 mb-1">
                  Available Credits
                </h3>
                <p className="text-2xl font-bold text-black bg-gradient-to-r from-black to-black/80 bg-clip-text">
                  {dialingCredits !== null
                    ? dialingCredits.toLocaleString()
                    : "Loading..."}
                </p>
              </div>
            ) : (
              <div className="mb-4 text-center">
                <CreditCard size={20} className="mx-auto text-black/70" />
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`flex items-center ${
                isHovered ? "space-x-3" : "justify-center"
              } w-full px-2 py-2 rounded-lg text-black/60 hover:bg-black/5 hover:text-black transition-colors text-sm font-medium`}
            >
              <LogOut size={16} />
              {isHovered && (
                <span className="whitespace-nowrap transition-opacity duration-200">
                  Logout
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};



export default Navbar