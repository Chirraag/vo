import React, { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { supabase } from "../utils/supabaseClient";

// Custom icons as SVG components for better consistency and styling
const DocumentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5V19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 13C13.1046 13 14 12.1046 14 11C14 9.89543 13.1046 9 12 9C10.8954 9 10 9.89543 10 11C10 12.1046 10.8954 13 12 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 13V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 13L15 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 17L12 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LoaderIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin">
    <path d="M12 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 18V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4.93 4.93L7.76 7.76" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16.24 16.24L19.07 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4.93 19.07L7.76 16.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16.24 7.76L19.07 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface DNCEntry {
  id: string;
  phoneNumber: string;
  name: string;
}

interface UploadSummary {
  added: number;
  skipped: number;
  total: number;
}

const ITEMS_PER_PAGE = 50;
const BATCH_SIZE = 1000;

const DNCList: React.FC = () => {
  const [dncList, setDncList] = useState<DNCEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ phoneNumber: "", name: "" });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [processingUpload, setProcessingUpload] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isHoveredRow, setIsHoveredRow] = useState<string | null>(null);
  const [addEntryFieldError, setAddEntryFieldError] = useState<{phone?: string, name?: string} | null>(null);

  // Fetch DNC list with pagination
  const fetchDNCList = async (page: number, searchQuery: string = "") => {
    try {
      setLoading(true);

      // First, get total count for pagination
      const countQuery = supabase
        .from("dnc_list")
        .select("id", { count: "exact" });

      if (searchQuery) {
        countQuery.or(
          `phoneNumber.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`,
        );
      }

      const { count, error: countError } = await countQuery;

      if (countError) throw countError;
      setTotalCount(count || 0);

      // Then fetch the current page
      let query = supabase
        .from("dnc_list")
        .select("*")
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(
          `phoneNumber.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`,
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      setDncList(data || []);
    } catch (err) {
      console.error("Error fetching DNC list:", err);
      setError("Failed to load DNC list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDNCList(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  // Process batch of contacts with duplicate handling
  const processBatch = async (entries: any[], userId: string) => {
    // First check which numbers already exist
    const phoneNumbers = entries.map((entry) => entry.phoneNumber);
    const { data: existingEntries } = await supabase
      .from("dnc_list")
      .select("phoneNumber")
      .eq("userId", userId)
      .in("phoneNumber", phoneNumbers);

    // Create a Set of existing phone numbers for faster lookup
    const existingPhoneNumbers = new Set(
      existingEntries?.map((entry) => entry.phoneNumber) || [],
    );

    // Filter out entries that already exist
    const newEntries = entries.filter(
      (entry) => !existingPhoneNumbers.has(entry.phoneNumber),
    );

    if (newEntries.length > 0) {
      const { error } = await supabase.from("dnc_list").insert(
        newEntries.map((entry) => ({
          userId,
          phoneNumber: entry.phoneNumber,
          name: entry.name,
        })),
      );
      if (error) throw error;
    }

    return {
      added: newEntries.length,
      skipped: entries.length - newEntries.length,
    };
  };

  // Handle file upload with batch processing
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setUploadError(null);
    setProcessingUpload(true);
    setUploadProgress(0);
    setUploadSummary(null);

    if (file) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error("No authenticated user found");

        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: "binary" });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

            // Validate headers
            const headers = data[0] as string[];
            if (headers[0] !== "Phone" || headers[1] !== "Name") {
              throw new Error(
                'The first column must be titled "Phone" and the second column must be titled "Name".',
              );
            }

            // Process entries in batches
            const allEntries = data.slice(1).map((row: any) => ({
              phoneNumber: row[0]?.toString(),
              name: row[1]?.toString(),
            }));

            let totalAdded = 0;
            let totalSkipped = 0;

            for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
              const batch = allEntries.slice(i, i + BATCH_SIZE);
              const { added, skipped } = await processBatch(
                batch,
                userData.user.id,
              );

              totalAdded += added;
              totalSkipped += skipped;

              const progress = Math.round(
                ((i + batch.length) / allEntries.length) * 100,
              );
              setUploadProgress(progress);
            }

            setUploadSummary({
              added: totalAdded,
              skipped: totalSkipped,
              total: allEntries.length,
            });

            setUploadProgress(100);
            await fetchDNCList(1); // Refresh the first page
            setCurrentPage(1); // Reset to first page
          } catch (err: any) {
            console.error("Error processing file:", err);
            setUploadError(err.message || "Error processing file");
          }
        };
        reader.readAsBinaryString(file);
      } catch (err: any) {
        console.error("Error processing upload:", err);
        setUploadError(err.message || "Error processing upload");
      } finally {
        setProcessingUpload(false);
        setUploadProgress(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
    disabled: processingUpload,
  });

  // Handle manual entry
  const handleAddEntry = async () => {
    try {
      setAddEntryFieldError(null);
      
      // Basic validation
      if (!newEntry.phoneNumber.trim()) {
        setAddEntryFieldError({ phone: "Phone number is required" });
        return;
      }
      
      // Check if phone number contains only digits
      if (!/^\d+$/.test(newEntry.phoneNumber)) {
        setAddEntryFieldError({ phone: "Phone number should contain digits only" });
        return;
      }
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No authenticated user found");

      const { error } = await supabase.from("dnc_list").insert([
        {
          userId: userData.user.id,
          phoneNumber: newEntry.phoneNumber,
          name: newEntry.name,
        },
      ]);

      if (error) throw error;

      setShowAddModal(false);
      setNewEntry({ phoneNumber: "", name: "" });
      fetchDNCList(currentPage);
    } catch (err) {
      console.error("Error adding entry:", err);
      setError("Failed to add entry");
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      setDeleteConfirmId(null);
      const { error } = await supabase.from("dnc_list").delete().eq("id", id);
      if (error) throw error;

      // If we're on a page with only one item and it's not the first page,
      // go to the previous page after deletion
      if (dncList.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        fetchDNCList(currentPage);
      }
    } catch (err) {
      console.error("Error deleting entry:", err);
      setError("Failed to delete entry");
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      // Fetch all records for export
      const { data, error } = await supabase
        .from("dnc_list")
        .select("phoneNumber, name")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const exportData = (data || []).map((entry) => ({
        Phone: entry.phoneNumber,
        Name: entry.name,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "DNC List");
      XLSX.writeFile(
        wb,
        `dnc_list_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    } catch (err) {
      console.error("Error exporting data:", err);
      setError("Failed to export data");
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const formatPhoneNumber = (phoneNumber: string) => {
    // Simple formatting for display purposes
    if (phoneNumber.length === 10) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
    }
    return phoneNumber;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transform transition-all duration-300 hover:shadow-xl">
          {/* Header with gradient accent */}
          <div className="relative">
            {/* Top gradient bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-black to-black"></div>
            
            <div className="p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold mb-1 text-gray-900">
                    Do Not Call List
                  </h1>
                  <p className="text-gray-600">
                    Manage phone numbers excluded from your outbound campaigns
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleExport}
                    className="flex items-center px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 text-sm font-medium"
                  >
                    <span className="text-gray-600 mr-2">
                      <DownloadIcon />
                    </span>
                    Export List
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow text-sm font-medium"
                  >
                    <span className="mr-2">
                      <PlusIcon />
                    </span>
                    Add Number
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Information Banner */}
          <div className="mx-8 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-start">
              <div className="flex-shrink-0 text-blue-500 mt-1">
                <ShieldIcon />
              </div>
              <div className="ml-4">
                <h3 className="text-md font-semibold text-blue-700">About the Do Not Call List</h3>
                <p className="mt-1 text-blue-600 text-sm">
                  Numbers in this list will be automatically excluded from all outbound calling campaigns. 
                  This helps ensure compliance with privacy regulations and customer preferences.
                </p>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="px-8 pb-8">
            {/* File Upload Section */}
            <div className="mb-8 bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-start">
                <div className="hidden sm:block text-indigo-600 mr-4">
                  <FileIcon />
                </div>
                <div className="flex-1">
                  <div className="flex items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Bulk Upload Numbers</h2>
                    <div className="ml-3 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">Excel Files</div>
                  </div>
                  
                  <div
                    {...getRootProps()}
                    className={`mt-1 flex flex-col items-center justify-center px-6 pt-8 pb-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                      isDragActive 
                        ? "border-indigo-500 bg-indigo-50" 
                        : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30"
                    } ${processingUpload ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className={`mb-4 text-4xl ${isDragActive ? 'text-indigo-500' : 'text-gray-400'} transition-colors duration-300`}>
                      <UploadIcon />
                    </div>
                    
                    <p className="mb-2 text-sm text-gray-700">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 text-center max-w-xs">
                      Upload Excel file (.xlsx or .xls) with columns titled "Phone" and "Name" to add multiple numbers at once
                    </p>
                    
                    <input {...getInputProps()} />
                  </div>
                  
                  {uploadProgress !== null && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-indigo-700">
                          Processing file...
                        </span>
                        <span className="text-sm font-medium text-indigo-700">
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {uploadSummary && (
                    <div className="mt-4 bg-green-50 border border-green-100 rounded-lg p-4 animate-fade-in">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-0.5 text-green-500">
                          <CheckIcon />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-semibold text-green-800">
                            Upload Summary
                          </h3>
                          <div className="mt-2 text-sm text-green-700 space-y-1">
                            <p>Total entries processed: <span className="font-medium">{uploadSummary.total}</span></p>
                            <p>New entries added: <span className="font-medium">{uploadSummary.added}</span></p>
                            <p>Duplicate entries skipped: <span className="font-medium">{uploadSummary.skipped}</span></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {uploadError && (
                    <div className="mt-4 bg-red-50 border border-red-100 rounded-lg p-4 animate-fade-in">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-0.5 text-red-500">
                          <AlertIcon />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-semibold text-red-800">
                            Upload Error
                          </h3>
                          <p className="mt-1 text-sm text-red-700">{uploadError}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">
                  <SearchIcon />
                </span>
              </div>
              <input
                type="text"
                placeholder="Search by phone number or name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 text-gray-900"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <CloseIcon />
                </button>
              )}
            </div>

            {/* DNC List Table */}
            {loading ? (
              <div className="flex justify-center items-center h-64 bg-gray-50/50 rounded-xl">
                <div className="flex flex-col items-center">
                  <div className="text-indigo-600 mb-3">
                    <LoaderIcon />
                  </div>
                  <p className="text-gray-600">Loading records...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-8 rounded-lg text-center">
                <div className="text-red-500 mb-3">
                  <AlertIcon />
                </div>
                <p className="font-medium">{error}</p>
                <button 
                  onClick={() => fetchDNCList(currentPage, searchTerm)}
                  className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200 text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Phone Number
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {dncList.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-10 text-center">
                            {searchTerm ? (
                              <div className="flex flex-col items-center">
                                <div className="text-gray-400 mb-3 w-16 h-16 flex items-center justify-center rounded-full bg-gray-100">
                                  <SearchIcon />
                                </div>
                                <p className="text-gray-500 font-medium mb-1">No results found</p>
                                <p className="text-gray-400 text-sm">No records match your search for "{searchTerm}"</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <div className="text-gray-400 mb-3 w-16 h-16 flex items-center justify-center rounded-full bg-gray-100">
                                  <ShieldIcon />
                                </div>
                                <p className="text-gray-500 font-medium mb-1">Your Do Not Call list is empty</p>
                                <button 
                                  onClick={() => setShowAddModal(true)}
                                  className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center"
                                >
                                  <PlusIcon />
                                  <span className="ml-1">Add your first number</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : (
                        dncList.map((entry) => (
                          <tr 
                            key={entry.id}
                            className={`hover:bg-indigo-50/40 transition-colors duration-200 ${isHoveredRow === entry.id ? 'bg-indigo-50/30' : ''}`}
                            onMouseEnter={() => setIsHoveredRow(entry.id)}
                            onMouseLeave={() => setIsHoveredRow(null)}
                          >
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {formatPhoneNumber(entry.phoneNumber)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {entry.name || <span className="text-gray-400 italic">Not specified</span>}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {deleteConfirmId === entry.id ? (
                                <div className="flex items-center justify-end space-x-2">
                                  <span className="text-xs text-gray-500">Confirm delete?</span>
                                  <button
                                    onClick={() => handleDelete(entry.id)}
                                    className="p-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-200"
                                    aria-label="Confirm delete"
                                  >
                                    <CheckIcon />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="p-1.5 text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                                    aria-label="Cancel delete"
                                  >
                                    <CloseIcon />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(entry.id)}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                  aria-label="Delete entry"
                                >
                                  <TrashIcon />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {dncList.length > 0 && (
                  <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-medium text-gray-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                      <span className="font-medium text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span> of{" "}
                      <span className="font-medium text-gray-900">{totalCount}</span> records
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-md border border-gray-200 enabled:hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                        aria-label="Previous page"
                      >
                        <ChevronLeftIcon />
                      </button>
                      <div className="px-4 py-2 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-700">
                        Page {currentPage} of {totalPages}
                      </div>
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage >= totalPages}
                        className="p-2 rounded-md border border-gray-200 enabled:hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                        aria-label="Next page"
                      >
                        <ChevronRightIcon />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-100 animate-scale-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <span className="text-indigo-600 mr-3">
                  <PlusIcon />
                </span>
                Add to Do Not Call List
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
                aria-label="Close modal"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="phoneNumber"
                  value={newEntry.phoneNumber}
                  onChange={(e) => setNewEntry({ ...newEntry, phoneNumber: e.target.value })}
                  className={`w-full px-4 py-3 border ${addEntryFieldError?.phone ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'} rounded-lg transition-colors duration-200`}
                  placeholder="Enter 10-digit number (e.g., 1234567890)"
                />
                {addEntryFieldError?.phone && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <span className="mr-1 text-red-500">
                      <AlertIcon />
                    </span>
                    {addEntryFieldError.phone}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={newEntry.name}
                  onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                  placeholder="Enter contact name"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEntry}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium shadow-sm hover:shadow transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Add to List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scale-up {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        
        .animate-scale-up {
          animation: scale-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </div>
  );
};

export default DNCList;