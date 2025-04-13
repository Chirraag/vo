import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Phone, Trash2, Plus, PieChart, Copy, Search, Activity, CheckCircle, AlertCircle, Filter, Clock, Calendar, Eye, Menu, X, MoreVertical, SmartphoneCharging, Bug } from "lucide-react";
import {
  getCampaigns,
  deleteCampaign,
  Campaign,
  addCampaign,
  getContacts,
  addContacts,
} from "../utils/db";

const CampaignList: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("alpha");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchCampaigns = async () => {
    try {
      const fetchedCampaigns = await getCampaigns();
      setCampaigns(fetchedCampaigns);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setError("Failed to load campaigns. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns
    .filter((campaign) =>
      campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.status.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "alpha") {
        return a.title.localeCompare(b.title);
      } else if (sortBy === "status") {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteCampaign(id);
      await fetchCampaigns(); // Refresh the campaigns list
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting campaign:", err);
      setError("Failed to delete campaign. Please try again.");
    }
  };

  const handleDuplicate = async (
    event: React.MouseEvent,
    campaign: Campaign,
  ) => {
    event.stopPropagation();
    if (!campaign.id) return;

    try {
      setDuplicating(campaign.id);

      // Create new campaign with copied data, including localTouchEnabled
      const newCampaign: Omit<Campaign, "id"> = {
        title: `${campaign.title} (Copy)`,
        description: campaign.description,
        agentId: campaign.agentId,
        outboundNumber: campaign.outboundNumber,
        status: "Scheduled",
        progress: 0,
        hasRun: false,
        userId: campaign.userId,
        localTouchEnabled: campaign.localTouchEnabled,
      };

      // Add new campaign and get its ID
      const newCampaignId = await addCampaign(newCampaign);

      // Get contacts from original campaign
      const originalContacts = await getContacts(campaign.id);

      // Create new contacts for the duplicated campaign, including dynamicVariables
      if (originalContacts.length > 0) {
        const newContacts = originalContacts.map((contact) => ({
          phoneNumber: contact.phoneNumber,
          firstName: contact.firstName,
          campaignId: newCampaignId,
          dynamicVariables: contact.dynamicVariables,
        }));

        await addContacts(newContacts);
      }

      // Refresh campaigns list
      await fetchCampaigns();
    } catch (err) {
      console.error("Error duplicating campaign:", err);
      setError("Failed to duplicate campaign. Please try again.");
    } finally {
      setDuplicating(null);
    }
  };

  const getStatusDetails = (status: string) => {
    switch (status) {
      case "Completed":
        return {
          color: "text-emerald-600",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          icon: <CheckCircle className="w-4 h-4 mr-1.5" />
        };
      case "In Progress":
        return {
          color: "text-amber-600",
          bg: "bg-amber-50",
          border: "border-amber-200",
          icon: <Activity className="w-4 h-4 mr-1.5" />
        };
      case "Failed":
        return {
          color: "text-red-600",
          bg: "bg-red-50",
          border: "border-red-200",
          icon: <AlertCircle className="w-4 h-4 mr-1.5" />
        };
      default:
        return {
          color: "text-blue-600",
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: <Clock className="w-4 h-4 mr-1.5" />
        };
    }
  };

  // Empty state and loader components
  const EmptyState = () => (
    <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
      <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
        <Phone className="h-10 w-10 text-blue-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">No Campaigns Found</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {searchTerm 
          ? `No campaigns match your search for "${searchTerm}"`
          : "Get started by creating your first outbound calling campaign"}
      </p>
      <Link
        to="/create"
        className="inline-flex items-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200 shadow-sm text-sm font-medium"
      >
        <Plus className="mr-2 h-5 w-5" />
        Create New Campaign
      </Link>
    </div>
  );

  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center h-64">
      <div className="w-16 h-16 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-600 font-medium">Loading campaigns...</p>
    </div>
  );

  const ErrorState = () => (
    <div className="bg-red-50 rounded-xl p-8 text-center border border-red-100">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-red-800 mb-2">Something went wrong</h3>
      <p className="text-red-700 mb-6">{error}</p>
      <button
        onClick={fetchCampaigns}
        className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 shadow-sm"
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Section with Glass Morphism */}
        <div className="relative mb-12 bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 rounded-2xl p-8 overflow-hidden shadow-xl">
          {/* Background decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 mix-blend-overlay">
            <div className="absolute -top-24 -left-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -right-10 w-80 h-80 bg-purple-500 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Campaigns</h1>
                <p className="text-gray-300 max-w-xl">
                  Create, manage and track your AI-powered outbound calling campaigns
                </p>
              </div>
              <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                <div className="relative group flex-grow md:flex-grow-0">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search campaigns..."
                    className="w-full md:w-64 pl-10 pr-4 py-2.5 rounded-xl border-2 border-white/10 bg-white/10 text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 group-focus-within:text-blue-500 transition-colors duration-200" />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none pl-10 pr-8 py-2.5 rounded-xl border-2 border-white/10 bg-white/10 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200"
                  >
                    <option value="alpha">Alphabetical</option>
                    <option value="status">By Status</option>
                  </select>
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <Link
                  to="/create"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all duration-200 inline-flex items-center text-sm font-semibold shadow-lg hover:shadow-blue-600/20 hover:-translate-y-0.5"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  New Campaign
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Status Pills */}
        <div className="mb-8 flex flex-wrap gap-2">
          {['All', 'Scheduled', 'In Progress', 'Completed', 'Failed'].map((status) => (
            <button 
              key={status}
              onClick={() => setSearchTerm(status === 'All' ? '' : status)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                (status === 'All' && !searchTerm) || searchTerm === status
                  ? 'bg-blue-100 text-blue-800 shadow-sm border-2 border-blue-200'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        
        {/* Campaigns Grid or Empty State */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : filteredCampaigns.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => {
              const statusDetails = getStatusDetails(campaign.status);
              return (
                <div
                  key={campaign.id}
                  className={`group relative bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-100 h-full flex flex-col ${hoveredCard === campaign.id ? 'ring-1 ring-blue-300' : ''}`}
                  onClick={() => navigate(`/campaign/${campaign.id}`)}
                  onMouseEnter={() => setHoveredCard(campaign.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {/* Top line accent color based on status */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${statusDetails.bg.replace('bg-', 'bg-')} rounded-t-xl`}></div>
                  
                  <div className="flex-grow space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col flex-grow mr-4">
                        <h2 className="text-xl font-bold text-gray-900 truncate">
                          {campaign.title}
                        </h2>
                        <div className={`inline-flex items-center mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${statusDetails.color} ${statusDetails.bg} ${statusDetails.border}`}>
                          {statusDetails.icon}
                          {campaign.status}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
                      {campaign.description || "No description provided"}
                    </p>
                    
                    {/* Campaign details */}
                    <div className="flex space-x-4 my-4">
                      <div className="flex-1 bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Progress</p>
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mr-2">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${campaign.progress || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-gray-700">{campaign.progress || 0}%</span>
                        </div>
                      </div>
                      
                      <div className={`flex-1 flex items-center p-3 rounded-lg ${campaign.localTouchEnabled ? 'bg-indigo-50' : 'bg-gray-50'}`}>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Local Touch</p>
                          <div className="flex items-center">
                            {campaign.localTouchEnabled ? (
                              <span className="inline-flex items-center text-sm font-medium text-indigo-600">
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Enabled
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-sm font-medium text-gray-600">
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                Disabled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                    <div className="text-xs text-gray-600 font-medium">
                      {campaign.outboundNumber ? (
                        <span className="flex items-center" title="Outbound Number">
                          <SmartphoneCharging className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                          {campaign.outboundNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
                        </span>
                      ) : (
<span className="flex items-center text-indigo-600" title="Local Touch Enabled">
  {/* Replace the inline SVG with your Bug icon component */}
  <Bug className="w-3.5 h-3.5 mr-1.5" />
  Smart Local Touch
</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/campaign/${campaign.id}/analytics`);
                        }}
                        className="text-gray-500 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors duration-200"
                        title="View Analytics"
                      >
                        <PieChart size={18} />
                      </button>
                      
                      <button
                        onClick={(e) => handleDuplicate(e, campaign)}
                        disabled={duplicating === campaign.id}
                        className={`text-gray-500 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors duration-200 ${duplicating === campaign.id ? 'opacity-50 cursor-wait' : ''}`}
                        title="Duplicate Campaign"
                      >
                        {duplicating === campaign.id ? (
                          <span className="block w-4.5 h-4.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <Copy size={18} />
                        )}
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(campaign.id || null);
                        }}
                        className="text-gray-500 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors duration-200"
                        title="Delete Campaign"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Delete Confirmation Modal */}
                  {showDeleteConfirm === campaign.id && (
                    <div 
                      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(null);
                      }}
                    >
                      <div 
                        className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center mb-4">
                          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-4">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900">Delete Campaign</h3>
                        </div>
                        <p className="text-gray-700 mb-6">
                          Are you sure you want to delete the campaign "<span className="font-medium">{campaign.title}</span>"? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors duration-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => campaign.id && handleDelete(campaign.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add some CSS animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default CampaignList;