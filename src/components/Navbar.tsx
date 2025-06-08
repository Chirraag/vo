import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Add,
  Block,
  Settings,
  Logout,
  AccountBalance,
  Campaign,
  CreditCard,
} from "@mui/icons-material";
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
      icon: <Campaign sx={{ fontSize: 20 }} />,
      text: "Campaigns",
    },
    {
      path: "/create",
      icon: <Add sx={{ fontSize: 20 }} />,
      text: "Create Campaign",
    },
    {
      path: "/dnc-list",
      icon: <Block sx={{ fontSize: 20 }} />,
      text: "DNC List",
    },
    {
      path: "/pricing",
      icon: <AccountBalance sx={{ fontSize: 20 }} />,
      text: "Add Credits",
    },
    {
      path: "/settings",
      icon: <Settings sx={{ fontSize: 20 }} />,
      text: "Settings",
    },
  ];

  return (
    <>
      <nav
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`bg-secondary h-screen fixed top-0 left-0 z-50 transition-all duration-300 border-r border-black/5 font-primary shadow-sm ${
          isHovered ? "w-52" : "w-14"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-4 border-b border-black/5">
            {isHovered ? (
              <div className="flex items-center space-x-3">
                <div className="relative flex items-center justify-center w-8 h-8 bg-black rounded-lg shadow-md">
                  <img
                    src="/recall-logo-black.png"
                    alt="Recall"
                    className="w-5 h-5 object-contain invert"
                  />
                </div>
                <span className="font-display text-xl font-bold text-black tracking-tight">
                  Recall
                </span>
              </div>
            ) : (
              <div className="relative flex items-center justify-center w-8 h-8 bg-black rounded-lg mx-auto shadow-md">
                <img
                  src="/recall-logo-black.png"
                  alt="Recall"
                  className="w-5 h-5 object-contain invert"
                />
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center ${
                        isHovered ? "space-x-3" : "justify-center"
                      } px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-black text-white font-bold"
                          : "text-black/70 hover:bg-black/5 hover:text-custom-primary font-bold"
                      }`}
                    >
                      <div
                        className={isActive ? "text-white" : "text-black/70"}
                      >
                        {item.icon}
                      </div>
                      <span
                        className={`whitespace-nowrap transition-opacity duration-200 text-sm ${
                          isHovered ? "opacity-100" : "opacity-0 w-0"
                        }`}
                      >
                        {item.text}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Credits and Logout Section */}
          <div className="p-3 mb-2">
            {isHovered ? (
              <div className="bg-black/5 rounded-xl p-3 mb-4 border border-black/10 shadow-sm">
                <h3 className="text-xs font-bold text-black/60 mb-1">
                  Available Credits
                </h3>
                <p className="text-2xl font-bold text-black">
                  {dialingCredits !== null
                    ? dialingCredits.toLocaleString()
                    : "Loading..."}
                </p>
              </div>
            ) : (
              <div className="mb-4 flex flex-col items-center">
                <div className="w-8 h-8 bg-black/10 rounded-lg flex items-center justify-center mb-1">
                  <CreditCard sx={{ fontSize: 16 }} className="text-black/70" />
                </div>
                <p className="text-xs font-bold text-black">
                  {dialingCredits !== null
                    ? dialingCredits.toLocaleString()
                    : "..."}
                </p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`flex items-center ${
                isHovered ? "space-x-3" : "justify-center"
              } w-full px-3 py-2 rounded-lg text-black/60 hover:bg-black/5 hover:text-custom-primary transition-colors font-bold`}
            >
              <Logout sx={{ fontSize: 20 }} />
              {isHovered && (
                <span className="whitespace-nowrap transition-opacity duration-200 text-sm">
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

export default Navbar;
