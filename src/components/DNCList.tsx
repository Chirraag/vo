import React, { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { supabase } from "../utils/supabaseClient";
import {
  Description,
  CloudUpload,
  Delete,
  Add,
  Search,
  Error,
  FileDownload,
  Close,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
  InsertDriveFile,
} from "@mui/icons-material";

import { CircularProgress } from "@mui/material";

import TokenIcon from "@mui/icons-material/Token";

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
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(
    null,
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isHoveredRow, setIsHoveredRow] = useState<string | null>(null);
  const [addEntryFieldError, setAddEntryFieldError] = useState<{
    phone?: string;
    name?: string;
  } | null>(null);

  // Fetch DNC list with pagination
  const fetchDNCList = async (page: number, searchQuery: string = "") => {
    try {
      setLoading(true);

      // Get the current user's ID
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No authenticated user found");
      const userId = userData.user.id;

      // First, get total count for pagination
      const countQuery = supabase
        .from("dnc_list")
        .select("id", { count: "exact" })
        .eq("userId", userId); // Filter by current user

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
        .eq("userId", userId) // Filter by current user
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
        setAddEntryFieldError({
          phone: "Phone number should contain digits only",
        });
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
      // Get the current user's ID
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No authenticated user found");
      const userId = userData.user.id;

      // Fetch all records for export
      const { data, error } = await supabase
        .from("dnc_list")
        .select("phoneNumber, name")
        .eq("userId", userId) // Filter by current user
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
    <div className="min-h-screen bg-secondary py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-black/5 transform transition-all duration-300 hover:shadow-md">
          {/* Header with accent */}
          <div className="relative">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-custom-primary"></div>

            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold mb-1 text-black font-primary">
                    Do Not Call List
                  </h1>
                  <p className="text-black/70 font-primary">
                    Manage phone numbers excluded from your outbound campaigns
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleExport}
                    className="flex items-center px-4 py-2.5 bg-black/5 text-black rounded-lg hover:bg-black/10 transition-all duration-200 text-sm font-bold font-primary"
                  >
                    <FileDownload sx={{ fontSize: 18 }} className="mr-2" />
                    Export List
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center px-4 py-2.5 bg-custom-primary text-white rounded-lg hover:bg-custom-primary/90 transition-all duration-200 shadow-sm hover:shadow text-sm font-bold font-primary"
                  >
                    <Add sx={{ fontSize: 18 }} className="mr-2" />
                    Add Number
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Information Banner */}
          <div className="mx-6 mb-6 bg-custom-purple/5 rounded-xl p-4 border border-custom-purple/10">
            <div className="flex items-start">
              <TokenIcon
                sx={{ fontSize: 24 }}
                className="text-black flex-shrink-0 mt-1"
              />
              <div className="ml-4">
                <h3 className="text-md font-bold text-black font-primary">
                  About the Do Not Call List
                </h3>
                <p className="mt-1 text-black/70 text-sm font-primary">
                  Numbers in this list will be automatically excluded from all
                  outbound calling campaigns. This helps ensure compliance with
                  privacy regulations and customer preferences.
                </p>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="px-6 pb-6">
            {/* File Upload Section */}
            <div className="mb-8 bg-white rounded-xl p-5 border border-black/5 shadow-sm">
              <div className="flex items-start">
                <InsertDriveFile
                  sx={{ fontSize: 24 }}
                  className="text-black/70 mr-4 hidden sm:block"
                />
                <div className="flex-1">
                  <div className="flex items-center mb-4">
                    <h2 className="text-lg font-bold text-black font-primary">
                      Bulk Upload Numbers
                    </h2>
                    <div className="ml-3 px-2 py-0.5 bg-custom-yellow/10 text-black rounded text-xs font-bold border border-custom-yellow/10 font-primary">
                      Excel Files
                    </div>
                  </div>

                  <div
                    {...getRootProps()}
                    className={`mt-1 flex flex-col items-center justify-center px-6 pt-8 pb-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                      isDragActive
                        ? "border-custom-primary bg-custom-primary/5"
                        : "border-black/20 hover:border-custom-primary/50 hover:bg-custom-primary/5"
                    } ${processingUpload ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="mb-4 text-4xl">
                      <CloudUpload
                        sx={{ fontSize: 48 }}
                        className={
                          isDragActive ? "text-custom-primary" : "text-black/40"
                        }
                      />
                    </div>

                    <p className="mb-2 text-sm text-black font-bold font-primary">
                      <span className="font-bold">Click to upload</span> or drag
                      and drop
                    </p>
                    <p className="text-xs text-black/60 text-center max-w-xs font-primary">
                      Upload Excel file (.xlsx or .xls) with columns titled
                      "Phone" and "Name" to add multiple numbers at once
                    </p>

                    <input {...getInputProps()} />
                  </div>

                  {uploadProgress !== null && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-black font-primary">
                          Processing file...
                        </span>
                        <span className="text-sm font-bold text-black font-primary">
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-custom-primary rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {uploadSummary && (
                    <div className="mt-4 bg-custom-yellow/5 border border-custom-yellow/10 rounded-lg p-4 animate-fade-in">
                      <div className="flex items-start">
                        <CheckCircle
                          sx={{ fontSize: 20 }}
                          className="text-black mt-0.5 flex-shrink-0"
                        />
                        <div className="ml-3">
                          <h3 className="text-sm font-bold text-black font-primary">
                            Upload Summary
                          </h3>
                          <div className="mt-2 text-sm text-black/70 space-y-1 font-primary">
                            <p>
                              Total entries processed:{" "}
                              <span className="font-bold">
                                {uploadSummary.total}
                              </span>
                            </p>
                            <p>
                              New entries added:{" "}
                              <span className="font-bold">
                                {uploadSummary.added}
                              </span>
                            </p>
                            <p>
                              Duplicate entries skipped:{" "}
                              <span className="font-bold">
                                {uploadSummary.skipped}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className="mt-4 bg-custom-primary/5 border border-custom-primary/10 rounded-lg p-4 animate-fade-in">
                      <div className="flex items-start">
                        <Error
                          sx={{ fontSize: 20 }}
                          className="text-black mt-0.5 flex-shrink-0"
                        />
                        <div className="ml-3">
                          <h3 className="text-sm font-bold text-black font-primary">
                            Upload Error
                          </h3>
                          <p className="mt-1 text-sm text-black/70 font-primary">
                            {uploadError}
                          </p>
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
                <Search sx={{ fontSize: 20 }} className="text-black/50" />
              </div>
              <input
                type="text"
                placeholder="Search by phone number or name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="w-full pl-10 pr-4 py-3 bg-white border border-black/10 rounded-xl focus:ring-2 focus:ring-black/20 focus:border-black transition-all duration-200 text-black font-primary"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-black/40 hover:text-black/70"
                >
                  <Close sx={{ fontSize: 20 }} />
                </button>
              )}
            </div>

            {/* DNC List Table */}
            {loading ? (
              <div className="flex justify-center items-center h-64 bg-black/[0.02] rounded-xl">
                <div className="flex flex-col items-center">
                  <CircularProgress
                    size={40}
                    className="text-custom-primary mb-3"
                  />
                  <p className="text-black/70 font-primary font-bold">
                    Loading records...
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-custom-primary/5 border border-custom-primary/10 text-black px-4 py-8 rounded-xl text-center">
                <Error
                  sx={{ fontSize: 32 }}
                  className="text-black mb-3 mx-auto"
                />
                <p className="font-bold font-primary">{error}</p>
                <button
                  onClick={() => fetchDNCList(currentPage, searchTerm)}
                  className="mt-4 px-4 py-2 bg-custom-primary/10 text-black rounded-lg hover:bg-custom-primary/20 transition-colors duration-200 text-sm font-bold font-primary"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-black/5 shadow-sm bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-black/5">
                    <thead>
                      <tr className="bg-black/[0.02]">
                        <th className="px-5 py-3 text-left text-xs font-bold text-black/60 uppercase tracking-wider font-primary">
                          Phone Number
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-black/60 uppercase tracking-wider font-primary">
                          Name
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-bold text-black/60 uppercase tracking-wider font-primary">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-black/5">
                      {dncList.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-5 py-10 text-center">
                            {searchTerm ? (
                              <div className="flex flex-col items-center">
                                <div className="text-black/40 mb-3 w-16 h-16 flex items-center justify-center rounded-full bg-black/5">
                                  <Search sx={{ fontSize: 24 }} />
                                </div>
                                <p className="text-black/70 font-bold mb-1 font-primary">
                                  No results found
                                </p>
                                <p className="text-black/50 text-sm font-primary">
                                  No records match your search for "{searchTerm}
                                  "
                                </p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <div className="text-black/40 mb-3 w-16 h-16 flex items-center justify-center rounded-full bg-black/5">
                                  <Shield sx={{ fontSize: 24 }} />
                                </div>
                                <p className="text-black/70 font-bold mb-1 font-primary">
                                  Your Do Not Call list is empty
                                </p>
                                <button
                                  onClick={() => setShowAddModal(true)}
                                  className="mt-2 text-custom-primary hover:text-custom-primary/80 font-bold inline-flex items-center font-primary"
                                >
                                  <Add sx={{ fontSize: 16 }} />
                                  <span className="ml-1">
                                    Add your first number
                                  </span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : (
                        dncList.map((entry) => (
                          <tr
                            key={entry.id}
                            className={`hover:bg-custom-primary/5 transition-colors duration-200 ${isHoveredRow === entry.id ? "bg-custom-primary/[0.03]" : ""}`}
                            onMouseEnter={() => setIsHoveredRow(entry.id)}
                            onMouseLeave={() => setIsHoveredRow(null)}
                          >
                            <td className="px-5 py-3 text-sm font-bold text-black font-primary">
                              {formatPhoneNumber(entry.phoneNumber)}
                            </td>
                            <td className="px-5 py-3 text-sm text-black/70 font-primary">
                              {entry.name || (
                                <span className="text-black/40 italic font-primary">
                                  Not specified
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {deleteConfirmId === entry.id ? (
                                <div className="flex items-center justify-end space-x-2">
                                  <span className="text-xs text-black/50 font-primary">
                                    Confirm delete?
                                  </span>
                                  <button
                                    onClick={() => handleDelete(entry.id)}
                                    className="p-1.5 text-black bg-custom-primary/10 hover:bg-custom-primary/20 rounded-lg transition-colors duration-200"
                                    aria-label="Confirm delete"
                                  >
                                    <CheckCircle sx={{ fontSize: 16 }} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="p-1.5 text-black/60 hover:text-black bg-black/5 hover:bg-black/10 rounded-lg transition-colors duration-200"
                                    aria-label="Cancel delete"
                                  >
                                    <Close sx={{ fontSize: 16 }} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(entry.id)}
                                  className="p-1.5 text-black/50 hover:text-custom-primary hover:bg-custom-primary/10 rounded-lg transition-colors duration-200"
                                  aria-label="Delete entry"
                                >
                                  <Delete sx={{ fontSize: 18 }} />
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
                  <div className="border-t border-black/5 px-5 py-4 flex items-center justify-between bg-black/[0.02]">
                    <div className="text-sm text-black/60 font-primary">
                      Showing{" "}
                      <span className="font-bold text-black">
                        {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-bold text-black">
                        {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}
                      </span>{" "}
                      of{" "}
                      <span className="font-bold text-black">{totalCount}</span>{" "}
                      records
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className="p-2 rounded-md border border-black/10 enabled:hover:bg-black/5 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-black/[0.02]"
                        aria-label="Previous page"
                      >
                        <ChevronLeft sx={{ fontSize: 20 }} />
                      </button>
                      <div className="px-4 py-2 rounded-md bg-white border border-black/10 text-sm font-bold text-black font-primary">
                        Page {currentPage} of {totalPages}
                      </div>
                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                        disabled={currentPage >= totalPages}
                        className="p-2 rounded-md border border-black/10 enabled:hover:bg-black/5 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-black/[0.02]"
                        aria-label="Next page"
                      >
                        <ChevronRight sx={{ fontSize: 20 }} />
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
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-black/5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-black flex items-center font-primary">
                <Add
                  sx={{ fontSize: 24 }}
                  className="text-custom-primary mr-3"
                />
                Add to Do Not Call List
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-black/50 hover:text-black p-1 rounded-full hover:bg-black/5 transition-colors duration-200"
                aria-label="Close modal"
              >
                <Close sx={{ fontSize: 20 }} />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="phoneNumber"
                  className="block text-sm font-bold text-black mb-1 font-primary"
                >
                  Phone Number <span className="text-custom-primary">*</span>
                </label>
                <input
                  type="text"
                  id="phoneNumber"
                  value={newEntry.phoneNumber}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, phoneNumber: e.target.value })
                  }
                  className={`w-full px-4 py-3 border font-primary ${addEntryFieldError?.phone ? "border-custom-primary/50 focus:ring-custom-primary/20 focus:border-custom-primary" : "border-black/10 focus:ring-black/20 focus:border-black"} rounded-lg transition-colors duration-200`}
                  placeholder="Enter 10-digit number (e.g., 1234567890)"
                />
                {addEntryFieldError?.phone && (
                  <p className="mt-1 text-sm text-black flex items-center font-primary">
                    <Error
                      sx={{ fontSize: 16 }}
                      className="mr-1 text-custom-primary"
                    />
                    {addEntryFieldError.phone}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-bold text-black mb-1 font-primary"
                >
                  Name <span className="text-black/40">(optional)</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={newEntry.name}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-black/10 rounded-lg focus:ring-black/20 focus:border-black transition-colors duration-200 font-primary"
                  placeholder="Enter contact name"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-black bg-black/5 hover:bg-black/10 rounded-lg transition-colors duration-200 font-bold font-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEntry}
                  className="px-4 py-2.5 bg-custom-primary text-white rounded-lg hover:bg-custom-primary/90 transition-colors duration-200 font-bold shadow-sm hover:shadow transform hover:-translate-y-0.5 active:translate-y-0 font-primary"
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
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-up {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        .animate-scale-up {
          animation: scale-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
            forwards;
        }
      `}</style>
    </div>
  );
};

export default DNCList;
