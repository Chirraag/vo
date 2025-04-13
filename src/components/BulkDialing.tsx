import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { X, BarChart2, PieChart, Copy, Speech, SmartphoneCharging, Bug, Cloud, Cat, AlertCircle, Loader2, CheckCircle, ArrowLeft, Phone, HandCoins, PhoneOutgoing } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  getCampaign,
  getUserDialingCredits,
  addCampaign,
  addContacts,
  Campaign,
  Contact,
  CallLog,
} from '../utils/db';
import { supabase } from '../utils/supabaseClient';

// Interface definitions
interface ConcurrencyStatus {
  current_concurrency: number;
  concurrency_limit: number;
}

interface CallDetails {
  disconnection_reason: string;
  call_transcript: string;
  call_summary: string;
  call_recording: string;
  start_time: string;
}

// ContactsPopup component
interface ContactsPopupProps {
  setShowContactsPopup: (value: boolean) => void;
  campaignId: number;
}

const ContactsPopup: React.FC<ContactsPopupProps> = ({
  setShowContactsPopup,
  campaignId,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const CONTACTS_PER_PAGE = 100;

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const { data, count } = await supabase
          .from('contacts')
          .select('*', { count: 'exact' })
          .eq('campaignId', campaignId)
          .range((page - 1) * CONTACTS_PER_PAGE, page * CONTACTS_PER_PAGE - 1);

        setContacts(data || []);
        setTotalPages(Math.ceil((count || 0) / CONTACTS_PER_PAGE));
      } catch (err) {
        console.error('Error fetching contacts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [campaignId, page]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setShowContactsPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setShowContactsPopup]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={popupRef}
        className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] relative flex flex-col"
      >
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowContactsPopup(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-4">Campaign Contacts</h2>
            <div ref={scrollContainerRef} className="overflow-y-auto flex-grow">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">First Name</th>
                    <th className="px-4 py-2 text-left">Phone Number</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact, index) => (
                    <tr key={contact.id || index} className="border-b">
                      <td className="px-4 py-2">{contact.firstName}</td>
                      <td className="px-4 py-2">{contact.phoneNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-100 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-100 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const BulkDialing: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [dialingStatus, setDialingStatus] = useState<
    'idle' | 'dialing' | 'paused' | 'completed'
  >('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showContactsPopup, setShowContactsPopup] = useState(false);
  const [concurrencyStatus, setConcurrencyStatus] =
    useState<ConcurrencyStatus | null>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [purchaseLink, setPurchaseLink] = useState<string | null>(null);
  const [isRedialLoading, setIsRedialLoading] = useState(false);
  const concurrencyPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [contactsDialed, setContactsDialed] = useState(0);
  const [isLoadingDialedCount, setIsLoadingDialedCount] = useState(true);
  const campaignChannelRef = useRef<RealtimeChannel | null>(null);
  const creditsChannelRef = useRef<RealtimeChannel | null>(null);
  const [selectedCallLog, setSelectedCallLog] = useState<CallLog | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  // Function to fetch concurrency status
  const fetchConcurrencyStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('user_dialing_credits')
        .select('retell_api_key')
        .eq('userId', user.id)
        .single();

      if (!userData?.retell_api_key) return;

      const response = await axios.get(
        'https://api.retellai.com/get-concurrency',
        {
          headers: {
            Authorization: `Bearer ${userData.retell_api_key}`,
          },
        }
      );

      setConcurrencyStatus(response.data);
    } catch (error) {
      console.error('Error fetching concurrency status:', error);
    }
  }, []);

  // Start concurrency polling when dialing is active
  useEffect(() => {
    if (dialingStatus === 'dialing') {
      const startPolling = () => {
        // Initial fetch
        fetchConcurrencyStatus();
        
        // Set up polling every 10 seconds
        concurrencyPollingIntervalRef.current = setInterval(fetchConcurrencyStatus, 10000);
      };
      
      startPolling();
    } else {
      // Clear polling when not dialing
      if (concurrencyPollingIntervalRef.current) {
        clearInterval(concurrencyPollingIntervalRef.current);
        concurrencyPollingIntervalRef.current = null;
        setConcurrencyStatus(null); // Clear concurrency status when not dialing
      }
    }

    return () => {
      if (concurrencyPollingIntervalRef.current) {
        clearInterval(concurrencyPollingIntervalRef.current);
      }
    };
  }, [dialingStatus, fetchConcurrencyStatus]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!campaign?.id) return;

    // Initial fetch of dialed count
    const fetchInitialData = async () => {
      try {
        // Fetch call logs and count in a single query
        const { data: logs, count } = await supabase
          .from('call_logs')
          .select('*', { count: 'exact' })
          .eq('campaignId', campaign.id);
        
        setCallLogs(logs || []);
        setContactsDialed(count || 0);
        setHasAnalyzed(logs?.some(log => log.disconnection_reason) || false);
      } catch (err) {
        console.error('Error fetching dialed count:', err);
      } finally {
        setIsLoadingDialedCount(false);
      }
    };

    fetchInitialData();

    // Subscribe to campaign updates
    const campaignChannel = supabase
      .channel(`campaign-${campaign.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
          filter: `id=eq.${campaign.id}`,
        },
        (payload) => {
          const updatedCampaign = payload.new;
          setCampaign(updatedCampaign);
          setProgress(updatedCampaign.progress);
          
          if (updatedCampaign.status === 'Completed') {
            setDialingStatus('completed');
          } else if (updatedCampaign.status === 'Paused') {
            setDialingStatus('paused');
          } else if (updatedCampaign.status === 'In Progress') {
            setDialingStatus('dialing');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_logs',
          filter: `campaignId=eq.${campaign.id}`,
        },
        async () => {
          // Fetch updated call logs
          const { data: updatedLogs, count } = await supabase
            .from('call_logs')
            .select('*', { count: 'exact' })
            .eq('campaignId', campaign.id);
            
          if (updatedLogs) {
            setCallLogs(updatedLogs);
            setContactsDialed(count || 0);
            setContactsDialed(count || 0);
          }
        }
      )
      .subscribe();

    campaignChannelRef.current = campaignChannel;

    return () => {
      campaignChannel.unsubscribe();
    };
  }, [campaign?.id]);

  // Setup credits subscription
  useEffect(() => {
    const setupCreditsSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const creditsChannel = supabase
        .channel(`credits-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_dialing_credits',
            filter: `userId=eq.${user.id}`,
          },
          (payload) => {
            setUserCredits(payload.new.dialing_credits);
          }
        )
        .subscribe();

      creditsChannelRef.current = creditsChannel;
    };

    setupCreditsSubscription();
    
    return () => {
      if (creditsChannelRef.current) {
        creditsChannelRef.current.unsubscribe();
        creditsChannelRef.current = null;
      }
    };
  }, []);

  // Cleanup subscriptions
  useEffect(() => {
    return () => {
      if (campaignChannelRef.current) {
        campaignChannelRef.current.unsubscribe();
        campaignChannelRef.current = null;
      }
      if (creditsChannelRef.current) {
        creditsChannelRef.current.unsubscribe();
        creditsChannelRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchUserCredits = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const credits = await getUserDialingCredits(user.id);
          setUserCredits(credits);
        }
      } catch (error) {
        console.error('Error fetching user credits:', error);
      }
    };

    fetchUserCredits();
  }, []);

  const handleRedial = async () => {
    if (!campaign || !callLogs.length) return;

    setIsRedialLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const successfulCallLogs = callLogs.filter((log) =>
        ['agent_hangup', 'user_hangup', 'call_transfer'].includes(
          log.disconnection_reason
        )
      );
      
      // Fetch all contacts for the campaign
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('campaignId', campaign.id);
        
      if (contactsError) throw contactsError;
      if (!contacts?.length) {
        alert('No contacts found for this campaign.');
        setIsRedialLoading(false);
        return;
      }

      const successfulContactIds = new Set(
        successfulCallLogs.map((log) => log.contactId)
      );

      const contactsToRedial = contacts.filter(
        (contact) => !successfulContactIds.has(contact.id!)
      );

      if (contactsToRedial.length === 0) {
        alert('No failed contacts to redial.');
        setIsRedialLoading(false);
        return;
      }

      const newCampaign: Omit<Campaign, 'id'> = {
        title: `${campaign.title} (Redial)`,
        description: campaign.description,
        agentId: campaign.agentId,
        outboundNumber: campaign.outboundNumber,
        status: 'Scheduled',
        progress: 0,
        hasRun: false,
        userId: user.id,
        localTouchEnabled: campaign.localTouchEnabled,
      };

      const newCampaignId = await addCampaign(newCampaign);

      await addContacts(
        contactsToRedial.map((contact) => ({
          phoneNumber: contact.phoneNumber,
          firstName: contact.firstName,
          campaignId: newCampaignId,
          dynamicVariables: contact.dynamicVariables,
        }))
      );

      navigate(`/campaign/${newCampaignId}`);
    } catch (error) {
      console.error('Error creating redial campaign:', error);
      setError('Failed to create redial campaign');
    } finally {
      setIsRedialLoading(false);
    }
  };

  const startBulkDialing = useCallback(async () => {
    if (!campaign) return;
    if (campaign.hasRun && campaign.status === 'Completed') {
      alert('This campaign has already been run and cannot be run again.');
      return;
    }
    setDialingStatus('dialing');
    console.log('Starting bulk dialing...');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await axios.post(
        'https://5cc0a660-34a6-48ba-bb1b-137d614d8813-00-1uwntfr4otxpr.sisko.replit.dev/api/start-bulk-dialing',
        {
          campaignId: campaign.id,
          userId: user.id,
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Bulk dialing failed');
      }
    } catch (error) {
      console.error('Error during bulk dialing:', error);
      setDialingStatus('idle');
      if (error.response && error.response.status === 402) {
        setPurchaseLink(error.response.data.purchaseLink);
      } else {
        alert('An error occurred during bulk dialing. Please try again.');
      }
    }
  }, [campaign]);

  const pauseOrResumeCampaign = useCallback(async () => {
    if (!campaign) return;

    // Optimistically update UI state
    const newStatus = campaign.status === "Paused" ? "In Progress" : "Paused";
    setDialingStatus(newStatus === "Paused" ? "paused" : "dialing");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await axios.post(
        'https://5cc0a660-34a6-48ba-bb1b-137d614d8813-00-1uwntfr4otxpr.sisko.replit.dev/api/update-campaign-status',
        {
          campaignId: campaign.id,
          status: newStatus,
          userId: user.id,  // Add userId when resuming
          isResuming: newStatus === "In Progress" // Flag to indicate this is a resume operation
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.error || 'Failed to update campaign status'
        );
      }
      
      // Update local campaign state
      setCampaign(prev => prev ? { ...prev, status: newStatus } : prev);
    } catch (error) {
      console.error('Error updating campaign status:', error.message);
      // Revert UI state on error
      setDialingStatus(campaign.status === "Paused" ? "paused" : "dialing");
      alert('An error occurred while updating the campaign status.');
    }
  }, [campaign]);

  useEffect(() => {
    const loadCampaignData = async () => {
      if (id) {
        try {
          // Get campaign data
          const campaignData = await getCampaign(parseInt(id, 10));
          if (campaignData) {
            setCampaign(campaignData);
            setProgress(campaignData.progress);
            
            // Get total contacts count only
            const { count } = await supabase
              .from('contacts')
              .select('id', { count: 'exact' })
              .eq('campaignId', campaignData.id);
            
            setTotalContacts(count || 0);

            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (campaignData.hasRun) {
              if (campaignData.status === 'In Progress') {
                setDialingStatus('dialing');
              } else if (campaignData.status === 'Paused') {
                setDialingStatus('paused');
              } else if (campaignData.status === 'Completed') {
                setDialingStatus('completed');
              }
            } else {
              setDialingStatus('idle');
            }

            if (user) {
              const credits = await getUserDialingCredits(user.id);
              setUserCredits(credits);
            }
          } else {
            setError('Campaign not found');
          }
        } catch (err) {
          setError('Error loading campaign data');
          console.error('Error loading campaign data:', err);
        }
      }
    };

    loadCampaignData();
  }, [id]);

  const analyzeCallLogs = useCallback(async () => {
    if (!campaign) return;
    setIsAnalyzing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await axios.post(
        'https://5cc0a660-34a6-48ba-bb1b-137d614d8813-00-1uwntfr4otxpr.sisko.replit.dev/api/analyze-call-logs',
        {
          campaignId: campaign.id,
          userId: user.id,
        }
      );

      if (response.data.success) {
        setCallLogs(response.data.callLogs);
        setHasAnalyzed(true);
      } else {
        throw new Error(response.data.error || 'Call log analysis failed');
      }
    } catch (error) {
      console.error('Error during call log analysis:', error);
      alert('An error occurred during call log analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [campaign]);

  const handleCallLogClick = (log: CallLog) => {
    setSelectedCallLog(log);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-1/3 h-[500px] bg-gradient-to-bl from-blue-100/20 to-transparent z-0 rounded-bl-full opacity-70"></div>
      <div className="absolute bottom-0 left-0 w-1/4 h-[300px] bg-gradient-to-tr from-indigo-100/20 to-transparent z-0 rounded-tr-full opacity-70"></div>

      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/campaigns')}
                className="mr-4 p-2 hover:bg-black/5 rounded-full transition-colors duration-200 group"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-gray-900 group-hover:-translate-x-1 transition-all duration-200" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  {campaign?.title || 'Bulk Dialing'}
                  {campaign?.status === 'In Progress' && (
                    <span className="ml-3 text-sm bg-green-100 text-green-800 px-3 py-1.5 rounded-full animate-pulse flex items-center shadow-sm">
                      <Loader2 size={14} className="mr-1 animate-spin" />
                      Campaign Running
                    </span>
                  )}
                </h1>
                <p className="text-sm text-gray-500">Campaign Control Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(`/campaign/${campaign?.id}/analytics`)}
                className="flex items-center px-4 py-2.5 bg-black/5 text-black/70 rounded-lg hover:bg-black/10 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow"
              >
                <PieChart size={16} className="mr-2" />
                Analytics
              </button>
              <button
                onClick={() => setShowContactsPopup(true)}
                className="flex items-center px-4 py-2.5 bg-gradient-to-r from-black to-gray-800 text-white rounded-lg hover:from-black/95 hover:to-gray-800/95 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow transform hover:-translate-y-0.5"
              >
                <Phone size={16} className="mr-2" />
                View Contacts
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
            {error}
          </div>
        )}

        {campaign ? (
          <div className="space-y-6">
            {/* Campaign Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Contacts</span>
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors duration-200">
                    <Cat className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalContacts}</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Contacts Dialed</span>
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors duration-200">
                    <PhoneOutgoing className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
                {isLoadingDialedCount ? (
                  <div className="h-8 flex items-center">
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{contactsDialed}</p>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Available Credits</span>
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors duration-200">
                    <HandCoins className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {userCredits !== null ? <span className="bg-gradient-to-r from-black to-gray-700 bg-clip-text text-transparent">{userCredits.toLocaleString()}</span> : 'Loading...'}
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Campaign Status</span>
                  <Speech className="w-4 h-4 text-gray-400" />
                </div>
                <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${
                  campaign.status === 'In Progress' ? 'bg-green-100 text-green-800' :
                  campaign.status === 'Paused' ? 'bg-amber-100 text-amber-800' :
                  campaign.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {campaign.status}
                </div>
              </div>
            </div>

            {/* Progress Section */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Campaign Progress</h2>
                <span className="text-sm font-medium text-gray-900">{progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-black h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Concurrency Status */}
            {dialingStatus === 'dialing' && concurrencyStatus && (
              <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl"></div>
                
                <div className="relative">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <Bug className="w-5 h-5 text-white" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold">Concurrency Status</h3>
                    <p className="text-sm text-gray-300">Real-time calling metrics</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4">
                    <p className="text-sm text-gray-300 mb-1">Current Concurrency</p>
                    <p className="text-3xl font-bold">{concurrencyStatus.current_concurrency}</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4">
                    <p className="text-sm text-gray-300 mb-1">Concurrency Limit</p>
                    <p className="text-3xl font-bold">{concurrencyStatus.concurrency_limit}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-4 flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updates every 10 seconds
                </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mt-8">
              {dialingStatus === 'idle' && !campaign.hasRun && (
                <button
                  onClick={startBulkDialing}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-black to-gray-800 text-white rounded-xl hover:from-black/95 hover:to-gray-800/95 transition-all duration-200 font-medium shadow-sm hover:shadow transform hover:-translate-y-0.5"
                >
                  <Speech className="w-5 h-5 mr-2" />
                  Start Bulk Dialing
                </button>
              )}
              {(dialingStatus === 'dialing' || dialingStatus === 'paused') && (
                <button
                  onClick={pauseOrResumeCampaign}
                  className={`flex items-center px-6 py-3 rounded-xl transition-all duration-200 font-medium ${
                    dialingStatus === 'paused'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-sm hover:shadow transform hover:-translate-y-0.5'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm hover:shadow transform hover:-translate-y-0.5'
                  }`}
                >
                  {dialingStatus === 'paused' ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Resume Campaign
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 mr-2" />
                      Pause Campaign
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleRedial}
                disabled={isRedialLoading}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow transform hover:-translate-y-0.5"
              >
                <Copy className="w-5 h-5 mr-2" />
                {isRedialLoading ? 'Creating Redial...' : 'Redial Failed Contacts'}
              </button>
            </div>

            {/* Purchase Credits CTA */}
            {purchaseLink && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100 shadow-sm">
                <div className="flex items-start">
                  <AlertCircle className="w-6 h-6 text-amber-500 mt-1" />
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-amber-900 mb-2">
                      Insufficient Credits
                    </h3>
                    <p className="text-amber-800 mb-4">
                      Please purchase more credits to continue with your campaign.
                    </p>
                    <a
                      href={purchaseLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-sm hover:shadow transform hover:-translate-y-0.5"
                    >
                      Purchase Credits
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Completed Campaign Notice */}
            {campaign.hasRun && campaign.status === 'Completed' && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 shadow-sm">
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-blue-500 mt-1" />
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-blue-900">
                      Campaign Completed
                    </h3>
                    <p className="text-blue-800">
                      This campaign has finished running and cannot be run again.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        )}

        {showContactsPopup && (
          <ContactsPopup
            setShowContactsPopup={setShowContactsPopup}
            campaignId={campaign?.id!}
          />
        )}
      </div>
    </div>
  );
};

export default BulkDialing;