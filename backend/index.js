const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const pLimit = require("p-limit"); // For concurrency control

const supabaseUrl = "https://epklqvqohpibcgbilrxd.supabase.co";
const supabaseAnonKey = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwa2xxdnFvaHBpYmNnYmlscnhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg2OTY4NDQsImV4cCI6MjA0NDI3Mjg0NH0.qyBBF8ep2PZg59VfTHi-zQy8XavWyAqIYxjJ_a5l8wA`;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();
const PORT = 3001;

// Add to your existing imports
const { createNumberMatchingGroups } = require("./phoneNumberMatcher");

app.use(cors());
app.use(express.json());

const checkDNCList = async (userId, phoneNumber) => {
  try {
    const { data, error } = await supabase
      .from("dnc_list")
      .select("id")
      .eq("userId", userId)
      .eq("phoneNumber", phoneNumber)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      throw error;
    }

    return !!data; // Returns true if number is in DNC list, false otherwise
  } catch (error) {
    console.error("Error checking DNC list:", error);
    throw error;
  }
};

// Helper function to fetch contacts associated with a campaign
const getContacts = async (campaignId) => {
  try {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("campaignId", campaignId);

    if (error) {
      console.error("Error fetching contacts:", error.message);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error("Error in getContacts function:", error.message);
    throw error;
  }
};

// Helper function to get user's Retell API key
const getUserRetellApiKey = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("user_dialing_credits")
      .select("retell_api_key")
      .eq("userId", userId)
      .single();

    if (error) throw error;
    return data?.retell_api_key;
  } catch (error) {
    console.error("Error fetching Retell API key:", error.message);
    throw error;
  }
};

// Helper function to get concurrency status from Retell AI API
const getConcurrencyStatus = async (retellApiKey) => {
  try {
    const response = await axios.get(
      "https://api.retellai.com/get-concurrency",
      {
        headers: {
          Authorization: `Bearer ${retellApiKey}`,
        },
        timeout: 10000, // Set a timeout for the request
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching concurrency status:", error.message);
    return null;
  }
};

// Helper function to create a phone call using Retell AI API
const createPhoneCall = async (
  fromNumber,
  toNumber,
  agentId,
  firstName,
  retellApiKey,
  contactId,
  dynamicVariables,
  retries = 0,
) => {
  // Create dynamic variables object starting with first_name
  const retell_llm_dynamic_variables = {
    name: firstName,
    // Add all dynamic variables from the contact
    ...(dynamicVariables || {}),
  };

  console.log(retell_llm_dynamic_variables);

  const data = {
    from_number: fromNumber,
    to_number: "+" + toNumber,
    override_agent_id: agentId,
    retell_llm_dynamic_variables: retell_llm_dynamic_variables,
  };

  try {
    const response = await axios.post(
      "https://api.retellai.com/v2/create-phone-call",
      data,
      {
        headers: {
          Authorization: `Bearer ${retellApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 20000, // Set a timeout for the request
      },
    );
    return response.data;
  } catch (error) {
    if (retries < 1) {
      // Exponential backoff
      const delay = Math.pow(2, retries) * 1000;
      console.warn(
        `Retrying createPhoneCall for ${firstName} in ${delay / 1000}s...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return createPhoneCall(
        fromNumber,
        toNumber,
        agentId,
        firstName,
        retellApiKey,
        contactId,
        dynamicVariables,
        retries + 1,
      );
    } else {
      console.error(
        `Error creating phone call for ${firstName}:`,
        error.message,
      );
      return null;
    }
  }
};

// Supabase helper function to update a campaign
const updateCampaign = async (id, updates) => {
  const { data, error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating campaign:", error.message);
    throw error;
  }
  return data;
};

// Supabase helper function to update a contact
const updateContact = async (id, updates) => {
  const { error } = await supabase
    .from("contacts")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating contact:", error.message);
    throw error;
  }
};

// Supabase helper function to add a call log
const addCallLog = async (callLog) => {
  const { error } = await supabase.from("call_logs").insert([
    {
      ...callLog,
      contactId: callLog.contactId,
    },
  ]);

  if (error) {
    console.error("Error adding call log:", error.message);
    throw error;
  }
};

//Endpoint to listen to payment updates
app.post("/status_lemon_squeezy_payment", async (req, res) => {
  console.log("Payment received: ", req.body.data);

  const paymentData = req.body.data;
  const userId = req.body.meta.custom_data.user_id;

  console.log("Payment received from user with id: ", userId);
  if (paymentData.attributes.status === "paid") {
    const amountPaid = paymentData.attributes.subtotal_usd / 100; // Convert cents to USD
    let creditsToAdd = 0;

    // Determine the number of credits to add based on the payment amount
    if (amountPaid === 25) {
      creditsToAdd = 5000;
    } else if (amountPaid === 100) {
      creditsToAdd = 25000;
    } else if (amountPaid === 500) {
      creditsToAdd = 150000;
    } else {
      console.error(`Unexpected payment amount: ${amountPaid} USD.`);
      return res.status(400).json({ error: "Invalid payment amount." });
    }

    try {
      console.log(`Adding ${creditsToAdd} credits to user ${userId}.`);

      // Call the RPC to increment the user's dialing credits
      const { data, error } = await supabase.rpc("increment_dialing_credits", {
        user_id: userId,
        credit_amount: creditsToAdd,
      });

      if (error) {
        console.error("Error updating user credits via RPC:", error.message);
        return res
          .status(500)
          .json({ error: "Failed to update user credits." });
      }

      console.log(`User ${userId} now has additional ${creditsToAdd} credits.`);
      res.status(200).send("Payment successful and credits updated.");
    } catch (error) {
      console.error("Error processing payment:", error.message);
      res.status(500).json({ error: "Internal server error." });
    }
  } else {
    console.log("Payment failed or incomplete.");
    res.status(200).send("Payment not successful.");
  }
});

const startBulkDialingProcess = async (
  campaignId,
  userId,
  contactsToCall = null,
  resuming = false,
) => {
  try {
    // Always fetch the LATEST campaign data to ensure we have the most recent settings
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error("Campaign not found:", campaignError?.message);
      return { success: false, error: "Campaign not found" };
    }

    // Get user's Retell API key
    const retellApiKey = await getUserRetellApiKey(userId);
    if (!retellApiKey) {
      return { success: false, error: "Retell API key not found for user" };
    }

    // If contactsToCall wasn't provided, fetch all contacts that haven't been called yet
    if (!contactsToCall) {
      const contacts = await getContacts(campaignId);
      contactsToCall = contacts.filter((contact) => !contact.callId);
    }

    if (!contactsToCall.length) {
      console.error("No contacts to call for campaign:", campaignId);
      return { success: false, error: "No contacts to call for this campaign" };
    }

    // Get ALL contacts for this campaign
    const { data: allContacts, error: allContactsError } = await supabase
      .from("contacts")
      .select("*")
      .eq("campaignId", campaignId);

    if (allContactsError) {
      console.error("Error fetching all contacts:", allContactsError.message);
      return { success: false, error: "Error fetching all contacts" };
    }

    // Calculate how many have already been called
    const totalContacts = allContacts.length;
    const alreadyCalledCount = allContacts.filter((c) => c.callId).length;

    // Initialize with already-called contacts if resuming
    let calledCount = resuming ? alreadyCalledCount : 0;

    console.log(
      `Starting campaign with ${calledCount}/${totalContacts} already called (${resuming ? "resuming" : "new campaign"})`,
    );

    // If resuming, immediately update the progress to reflect already called contacts
    if (resuming) {
      const initialProgress = Math.round((calledCount / totalContacts) * 100);
      console.log(
        `Setting initial progress to ${initialProgress}% for resumed campaign`,
      );
      await updateCampaign(campaignId, { progress: initialProgress });
    }

    // Check user's dialing credits
    const { data: userData, error: userError } = await supabase
      .from("user_dialing_credits")
      .select("dialing_credits")
      .eq("userId", userId)
      .single();

    if (userError) {
      console.error("Error fetching user data:", userError.message);
      return { success: false, error: "Error fetching user data" };
    }

    let userCredits = userData.dialing_credits;
    if (userCredits < contactsToCall.length) {
      const purchaseLink = `https://darwizpayment.edsplore.com/buy/628a4a2e-44f5-42f5-9565-489d58f52de4?checkout[custom][user_id]=${userId}`;
      return {
        success: false,
        error: "Insufficient dialing credits",
        purchaseLink: purchaseLink,
      };
    }

    console.log(
      `Updating campaign ${campaign.id} status to 'In Progress' and setting hasRun to true`,
    );
    await updateCampaign(campaign.id, { status: "In Progress", hasRun: true });

    let contactQueue = [...contactsToCall];
    const limit = pLimit(25);

    // If local touch is enabled, fetch all available numbers and create matching groups
    let numberMatchingGroups;
    if (campaign.localTouchEnabled) {
      const response = await axios.get(
        "https://api.retellai.com/list-phone-numbers",
        {
          headers: {
            Authorization: `Bearer ${retellApiKey}`,
          },
        },
      );
      const availableNumbers = response.data;
      numberMatchingGroups = createNumberMatchingGroups(
        contactQueue,
        availableNumbers,
      );
    }

    // Start bulk dialing in background
    (async () => {
      while (contactQueue.length > 0) {
        // CRITICAL: Fetch the latest campaign data to always use up-to-date settings
        const { data: latestCampaign, error: campaignError } = await supabase
          .from("campaigns")
          .select("*") // Select ALL fields to get latest settings
          .eq("id", campaignId)
          .single();

        if (campaignError) {
          console.error("Error fetching campaign data:", campaignError.message);
          break;
        }

        // Use the latest campaign data (settings may have been edited)
        const currentCampaign = latestCampaign;

        if (currentCampaign.status === "Paused") {
          console.log("Campaign is paused. Waiting to resume...");
          // Wait until the campaign status changes from 'Paused'
          while (true) {
            await new Promise((resolve) => setTimeout(resolve, 5000));

            const { data: checkCampaign, error: checkError } = await supabase
              .from("campaigns")
              .select("*") // Select ALL fields to get the latest settings
              .eq("id", campaignId)
              .single();

            if (checkError) {
              console.error(
                "Error fetching campaign data:",
                checkError.message,
              );
              break;
            }

            if (checkCampaign.status !== "Paused") {
              console.log(
                "Campaign resumed. Continuing with latest settings...",
              );
              break;
            }
          }

          // Don't continue processing this batch - go back to the beginning of the loop
          // to fetch the latest campaign data again after resuming
          continue;
        }

        // Check current concurrency
        console.log("Fetching current concurrency status");
        const concurrencyStatus = await getConcurrencyStatus(retellApiKey);

        if (!concurrencyStatus) {
          console.error(
            "Unable to fetch concurrency status. Skipping concurrency check...",
          );
        }

        let available_concurrency = 10; // Default value if concurrency status is unavailable

        if (concurrencyStatus) {
          const { current_concurrency, concurrency_limit } = concurrencyStatus;
          available_concurrency = concurrency_limit - current_concurrency;

          console.log(
            `Current concurrency: ${current_concurrency}, Concurrency limit: ${concurrency_limit}, Available concurrency: ${available_concurrency}`,
          );

          if (available_concurrency <= 0) {
            console.log("No available concurrency. Waiting for 5 seconds...");
            await new Promise((resolve) => setTimeout(resolve, 5000));
            continue;
          }
        } else {
          console.log(
            "Proceeding with default available concurrency due to inability to fetch status.",
          );
        }

        // Determine how many contacts we can process in this batch
        const batchSize = Math.min(available_concurrency, contactQueue.length);
        const batchContacts = contactQueue.splice(0, batchSize);

        console.log(`Processing batch of ${batchContacts.length} contacts`);

        // Initiate calls for batchContacts with concurrency limit
        const callPromises = batchContacts.map((contact) =>
          limit(async () => {
            try {
              // Check if number is in DNC list
              const isDNC = await checkDNCList(userId, contact.phoneNumber);
              if (isDNC) {
                console.log(`Skipping DNC number: ${contact.phoneNumber}`);
                calledCount++;
                const newProgress = Math.round(
                  (calledCount / totalContacts) * 100,
                );
                await updateCampaign(campaignId, { progress: newProgress });
                return;
              }

              // Fetch the latest credit count from the database
              const { data: latestUserData, error: latestUserError } =
                await supabase
                  .from("user_dialing_credits")
                  .select("dialing_credits")
                  .eq("userId", userId)
                  .single();

              if (latestUserError) {
                throw new Error(
                  `Error fetching latest user data: ${latestUserError.message}`,
                );
              }

              userCredits = latestUserData.dialing_credits;

              // Check if user has enough credits
              if (userCredits <= 0) {
                console.error("User ran out of credits during campaign");
                const purchaseLink = `https://darwizpayment.edsplore.com/buy/628a4a2e-44f5-42f5-9565-489d58f52de4?checkout[custom][user_id]=${userId}`;
                throw new Error(
                  `Insufficient credits. Purchase more at: ${purchaseLink}`,
                );
              }

              // Skip contacts that already have a callId
              if (contact.callId) {
                console.log(
                  `Contact ${contact.firstName} already has a callId. Skipping.`,
                );
                return;
              }

              // CRITICAL: Use the currentCampaign settings (latest from database)
              let outboundNumber = currentCampaign.outboundNumber;
              if (currentCampaign.localTouchEnabled && numberMatchingGroups) {
                // Find the best matching number from the groups
                for (const [
                  number,
                  contacts,
                ] of numberMatchingGroups.entries()) {
                  if (contacts.includes(contact.phoneNumber)) {
                    outboundNumber = number;
                    break;
                  }
                }
              }

              console.log(
                `Attempting to create call for contact ${contact.firstName} (${contact.phoneNumber}) using outbound number ${outboundNumber} and agent ${currentCampaign.agentId}`,
              );

              // CRITICAL: Use currentCampaign.agentId - the latest from database
              const callResponse = await createPhoneCall(
                outboundNumber,
                contact.phoneNumber,
                currentCampaign.agentId, // Use latest agent ID
                contact.firstName,
                retellApiKey,
                contact.id,
                contact.dynamicVariables,
              );

              if (callResponse) {
                console.log(
                  `Call created successfully for contact ${contact.firstName}, call ID: ${callResponse.call_id}`,
                );
                // Safely increment calledCount
                calledCount++;
                const newProgress = Math.round(
                  (calledCount / totalContacts) * 100,
                );
                console.log(`Updating campaign progress to ${newProgress}%`);

                // Decrement dialing credits
                userCredits--;
                console.log(`Updating dialing credits to ${userCredits}`);

                // Update credits in the database using a transaction
                const { data, error } = await supabase.rpc(
                  "decrement_dialing_credits",
                  {
                    user_id: userId,
                  },
                );

                if (error) {
                  throw new Error(
                    `Failed to update dialing credits: ${error.message}`,
                  );
                }

                // Ensure database updates are awaited
                await Promise.all([
                  updateCampaign(campaignId, { progress: newProgress }),
                  updateContact(contact.id, {
                    callId: callResponse.call_id,
                  }),
                  addCallLog({
                    campaignId: campaignId,
                    phoneNumber: contact.phoneNumber,
                    firstName: contact.firstName,
                    callId: callResponse.call_id,
                    contactId: contact.id,
                  }),
                ]);

                console.log(
                  `Contact ${contact.firstName} called successfully (${calledCount}/${totalContacts})`,
                );
              } else {
                console.error(`Failed to create call for ${contact.firstName}`);
              }
            } catch (error) {
              console.error(
                `Error processing contact ${contact.firstName}:`,
                error.message,
              );
              if (error.message.includes("Insufficient credits")) {
                throw error;
              }
            }
          }),
        );

        try {
          await Promise.allSettled(callPromises);
        } catch (error) {
          if (error.message.includes("Insufficient credits")) {
            console.error("Campaign stopped due to insufficient credits");
            await updateCampaign(campaignId, {
              status: "Paused",
              progress: Math.round((calledCount / totalContacts) * 100),
            });
            break;
          }
        }

        console.log(
          "Batch processing complete. Waiting for 2 seconds before next batch...",
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      console.log(
        `All contacts processed. Updating campaign ${campaignId} status to 'Completed' and progress to 100%`,
      );
      await updateCampaign(campaignId, { status: "Completed", progress: 100 });
    })();

    return { success: true, message: "Bulk dialing started successfully" };
  } catch (error) {
    console.error("Error during bulk dialing:", error.message);
    return { success: false, error: "An error occurred during bulk dialing" };
  }
};

app.post("/api/update-campaign-status", async (req, res) => {
  const { campaignId, status, userId, isResuming } = req.body;

  if (!campaignId || !status) {
    return res.status(400).json({ error: "Invalid campaign ID or status" });
  }

  try {
    // First update the campaign status
    const { data, error } = await supabase
      .from("campaigns")
      .update({ status })
      .eq("id", campaignId);

    if (error) {
      console.error("Error updating campaign status:", error.message);
      return res.status(500).json({ error: "Error updating campaign status" });
    }

    // If this is a resume operation, restart the bulk dialing process
    if (isResuming && userId) {
      console.log(`Resuming campaign ${campaignId}`);

      // Create a background process to restart dialing
      setTimeout(async () => {
        try {
          // Fetch all contacts for the campaign
          const contacts = await getContacts(campaignId);

          // First filter: contacts without callId
          let contactsToCall = contacts.filter((contact) => !contact.callId);

          // Second filter: check call_logs to avoid duplicate calls
          const { data: callLogs, error: callLogsError } = await supabase
            .from("call_logs")
            .select("contactId")
            .eq("campaignId", campaignId);

          if (callLogsError) {
            console.error("Error fetching call logs:", callLogsError.message);
            throw callLogsError;
          }

          // Create a Set of contactIds that already have call logs
          if (callLogs && callLogs.length > 0) {
            const contactIdsWithLogs = new Set(
              callLogs.map((log) => log.contactId),
            );

            // Filter out contacts that already have a call log
            contactsToCall = contactsToCall.filter(
              (contact) => !contactIdsWithLogs.has(contact.id),
            );
          }

          console.log(
            `Found ${contactsToCall.length} contacts remaining to be called for campaign ${campaignId}`,
          );

          if (contactsToCall.length === 0) {
            console.log(
              `No contacts remaining to call for campaign ${campaignId}`,
            );
            // Update the campaign to completed if there are no contacts to call
            await updateCampaign(campaignId, {
              status: "Completed",
              progress: 100,
            });
            return;
          }

          // Restart the bulk dialing process with the remaining contacts
          const result = await startBulkDialingProcess(
            campaignId,
            userId,
            contactsToCall,
            true, // This flag tells the function we're resuming
          );

          if (!result.success) {
            console.error(
              `Failed to resume campaign ${campaignId}:`,
              result.error,
            );
          }
        } catch (err) {
          console.error(`Error resuming campaign ${campaignId}:`, err);
        }
      }, 0);
    }

    res.json({ success: true, message: "Campaign status updated", data });
  } catch (error) {
    console.error("Error updating campaign status:", error.message);
    res.status(500).json({ error: "Error updating campaign status" });
  }
});

app.post("/api/start-bulk-dialing", async (req, res) => {
  const { campaignId, userId } = req.body;

  console.log("Request received for campaign ID:", campaignId);

  if (!campaignId || !userId) {
    console.error("Invalid campaign ID or user ID");
    return res.status(400).json({ error: "Invalid campaign ID or user ID" });
  }

  try {
    // Call the helper function to start the bulk dialing process
    const result = await startBulkDialingProcess(campaignId, userId);

    if (!result.success) {
      // Handle special errors like insufficient credits
      if (
        result.error === "Insufficient dialing credits" &&
        result.purchaseLink
      ) {
        return res.status(402).json({
          error: result.error,
          purchaseLink: result.purchaseLink,
        });
      }

      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: "Bulk dialing started successfully" });
  } catch (error) {
    console.error("Error during bulk dialing:", error.message);
    res.status(500).json({ error: "An error occurred during bulk dialing" });
  }
});

// Endpoint to analyze call logs
app.post("/api/analyze-call-logs", async (req, res) => {
  const { campaignId, userId } = req.body;

  if (!campaignId || !userId) {
    return res.status(400).json({ error: "Invalid campaign ID or user ID" });
  }

  try {
    // Get user's Retell API key
    const retellApiKey = await getUserRetellApiKey(userId);
    if (!retellApiKey) {
      return res
        .status(400)
        .json({ error: "Retell API key not found for user" });
    }

    const { data: logs, error: logsError } = await supabase
      .from("call_logs")
      .select("*")
      .eq("campaignId", campaignId);

    if (logsError) throw logsError;

    // Limit concurrent analyses to prevent overloading the API
    const limit = pLimit(50);

    const analyzePromises = logs.map((log) =>
      limit(async () => {
        try {
          const response = await axios.get(
            `https://api.retellai.com/v2/get-call/${log.callId}`,
            {
              headers: {
                Authorization: `Bearer ${retellApiKey}`,
              },
              timeout: 10000,
            },
          );

          const callDuration =
            (response.data.end_timestamp - response.data.start_timestamp) /
            1000.0;

          const callDetails = {
            disconnection_reason: response.data.disconnection_reason || "",
            call_transcript: response.data.transcript || "",
            call_summary: response.data.call_analysis?.call_summary || "",
            call_recording: response.data.recording_url || "",
            start_time: new Date(response.data.start_timestamp).toISOString(),
            end_time: new Date(response.data.end_timestamp).toISOString(),
            call_duration: callDuration,
            user_sentiment: response.data.call_analysis?.user_sentiment,
            call_direction: response.data.direction,
          };

          console.log(`${log.callId} analyzed successfully`);

          const { error: updateError } = await supabase
            .from("call_logs")
            .update(callDetails)
            .eq("id", log.id);

          if (updateError) throw updateError;
        } catch (error) {
          console.error(`Error analyzing call ${log.callId}:`, error.message);
        }
      }),
    );

    await Promise.allSettled(analyzePromises);

    const { data: updatedLogs, error: updatedLogsError } = await supabase
      .from("call_logs")
      .select("*")
      .eq("campaignId", campaignId);

    if (updatedLogsError) throw updatedLogsError;

    res.json({ success: true, callLogs: updatedLogs });
  } catch (error) {
    console.error("Error during call log analysis:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred during call log analysis" });
  }
});

// Get campaigns for a user
app.get("/api/campaigns/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("userId", userId);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

// Get single campaign
app.get("/api/campaigns/:userId/:id", async (req, res) => {
  try {
    const { userId, id } = req.params;
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .eq("userId", userId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    res.status(500).json({ error: "Failed to fetch campaign" });
  }
});

// Add campaign
app.post("/api/campaigns", async (req, res) => {
  try {
    const campaign = req.body;
    const { data, error } = await supabase
      .from("campaigns")
      .insert([{ ...campaign, hasRun: false }])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error("Error adding campaign:", error);
    res.status(500).json({ error: "Failed to add campaign" });
  }
});

// Update campaign
app.put("/api/campaigns/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase
      .from("campaigns")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error updating campaign:", error);
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

// Get contacts for a campaign
app.get("/api/contacts/:campaignId", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("campaignId", campaignId);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// Add contacts with batch processing
app.post("/api/contacts", async (req, res) => {
  try {
    const { campaignId, contacts } = req.body;
    const batchSize = 1000; // Process 1000 contacts at a time

    // Set up response for streaming
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    // Process contacts in batches
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const { error } = await supabase.from("contacts").insert(
        batch.map((contact) => ({
          ...contact,
          campaignId,
        })),
      );

      if (error) throw error;

      // Send progress update
      const progress = Math.min(
        100,
        Math.round(((i + batchSize) / contacts.length) * 100),
      );
      res.write(
        JSON.stringify({
          progress,
          total: contacts.length,
          processed: i + batch.length,
        }) + "\n",
      );
    }

    res.end(
      JSON.stringify({
        success: true,
        message: "All contacts processed successfully",
      }),
    );
  } catch (error) {
    console.error("Error adding contacts:", error);
    res.status(500).json({ error: "Failed to add contacts" });
  }
});

// Update contact
app.put("/api/contacts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { error } = await supabase
      .from("contacts")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating contact:", error);
    res.status(500).json({ error: "Failed to update contact" });
  }
});

async function deleteBatch(table, campaignId, batchSize = 1000) {
  let rowsDeleted = 0;
  do {
    // Call the stored procedure (RPC) in Supabase
    const { data, error } = await supabase.rpc("delete_batch", {
      p_table_name: table,
      p_campaign_id: campaignId,
      p_batch_size: batchSize,
    });
    if (error) throw error;

    // The stored procedure returns the number of rows deleted in this batch.
    rowsDeleted = data;
  } while (rowsDeleted === batchSize);
}

app.delete("/api/campaigns/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Delete contacts in batches
    await deleteBatch("contacts", id);

    // Delete call logs in batches
    await deleteBatch("call_logs", id);

    // Finally, delete the campaign
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

// Duplicate campaign endpoint
app.post("/api/campaigns/:id/duplicate", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // 1. Get original campaign data
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (campaignError) throw campaignError;

    // 2. Create new campaign
    const { data: newCampaign, error: newCampaignError } = await supabase
      .from("campaigns")
      .insert([
        {
          title: `${campaign.title} (Copy)`,
          description: campaign.description,
          agentId: campaign.agentId,
          outboundNumber: campaign.outboundNumber,
          status: "Scheduled",
          progress: 0,
          hasRun: false,
          userId: userId,
          localTouchEnabled: campaign.localTouchEnabled,
        },
      ])
      .select()
      .single();

    if (newCampaignError) throw newCampaignError;

    // 3. Get contacts in batches and insert them in batches
    let lastId = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      // Get batch of contacts
      const { data: contacts, error: contactsError } = await supabase
        .from("contacts")
        .select("phoneNumber, firstName, dynamicVariables")
        .eq("campaignId", id)
        .gt("id", lastId)
        .order("id", { ascending: true })
        .limit(batchSize);

      if (contactsError) throw contactsError;

      if (!contacts || contacts.length === 0) {
        hasMore = false;
        continue;
      }

      // Update lastId for next batch
      lastId = contacts[contacts.length - 1].id;

      // Insert batch of contacts for new campaign
      const { error: insertError } = await supabase.from("contacts").insert(
        contacts.map((contact) => ({
          ...contact,
          campaignId: newCampaign.id,
        })),
      );

      if (insertError) throw insertError;
    }

    res.json({ success: true, campaignId: newCampaign.id });
  } catch (error) {
    console.error("Error duplicating campaign:", error);
    res.status(500).json({ error: "Failed to duplicate campaign" });
  }
});

// Get call logs for a campaign
app.get("/api/call-logs/:campaignId", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { data, error } = await supabase
      .from("call_logs")
      .select("*")
      .eq("campaignId", campaignId);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Error fetching call logs:", error);
    res.status(500).json({ error: "Failed to fetch call logs" });
  }
});

// Add call log
app.post("/api/call-logs", async (req, res) => {
  try {
    const callLog = req.body;
    const { error } = await supabase.from("call_logs").insert([callLog]);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Error adding call log:", error);
    res.status(500).json({ error: "Failed to add call log" });
  }
});

// Update call log
app.put("/api/call-logs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { error } = await supabase
      .from("call_logs")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating call log:", error);
    res.status(500).json({ error: "Failed to update call log" });
  }
});

// Get user dialing credits
app.get("/api/dialing-credits/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from("user_dialing_credits")
      .select("dialing_credits")
      .eq("userId", userId)
      .single();

    if (error) throw error;
    res.json({ credits: data?.dialing_credits || 0 });
  } catch (error) {
    console.error("Error fetching dialing credits:", error);
    res.status(500).json({ error: "Failed to fetch dialing credits" });
  }
});

// Update user dialing credits
app.post("/api/dialing-credits", async (req, res) => {
  try {
    const { userId, credits } = req.body;
    const { error } = await supabase.rpc("increment_dialing_credits", {
      user_id: userId,
      credit_amount: credits,
    });

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating dialing credits:", error);
    res.status(500).json({ error: "Failed to update dialing credits" });
  }
});

// Get user's Retell API key
app.get("/api/retell-api-key/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from("user_dialing_credits")
      .select("retell_api_key")
      .eq("userId", userId)
      .single();

    if (error) throw error;
    res.json({ apiKey: data?.retell_api_key || null });
  } catch (error) {
    console.error("Error fetching Retell API key:", error);
    res.status(500).json({ error: "Failed to fetch Retell API key" });
  }
});

// Update user's Retell API key
app.put("/api/retell-api-key/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { apiKey } = req.body;
    const { error } = await supabase
      .from("user_dialing_credits")
      .update({ retell_api_key: apiKey })
      .eq("userId", userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating Retell API key:", error);
    res.status(500).json({ error: "Failed to update Retell API key" });
  }
});

app.get("/api/call-logs/:campaignId/paginated", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const {
      page = 1,
      page_size = 10,
      sort_field = "id",
      sort_direction = "desc",
    } = req.query;

    // Convert to numbers
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(page_size);

    // Calculate range for Supabase
    const start = (pageNum - 1) * pageSizeNum;
    const end = start + pageSizeNum - 1;

    console.log(
      `Fetching call logs for campaign ${campaignId}, page ${pageNum}, size ${pageSizeNum}`,
    );
    console.log(`Sorting by ${sort_field} ${sort_direction}`);

    // First get total count with detailed logging
    const countQuery = supabase
      .from("call_logs")
      .select("id", { count: "exact", head: true })
      .eq("campaignId", campaignId);

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error("Error getting count:", countError);
      throw countError;
    }

    console.log(`Total records found: ${count}`);

    // Prepare query for fetching data with range
    let query = supabase
      .from("call_logs")
      .select("*")
      .eq("campaignId", campaignId);

    // Special handling for call_duration to handle both NULLs and zeros
    if (sort_field === "call_duration") {
      // For PostgreSQL, we need to use a custom RPC function to handle both NULL and zero values
      // Create this function in your Supabase database:
      /*
      CREATE OR REPLACE FUNCTION sort_call_logs_with_unknown(
        p_campaign_id INT,
        p_sort_direction TEXT DEFAULT 'desc',
        p_limit INT DEFAULT 10,
        p_offset INT DEFAULT 0
      ) RETURNS SETOF call_logs AS $$
      BEGIN
        RETURN QUERY
        SELECT *
        FROM call_logs
        WHERE "campaignId" = p_campaign_id
        ORDER BY 
          -- First criterion: Put "unknown" rows at the bottom
          CASE 
            WHEN disconnection_reason IS NULL OR disconnection_reason = '' OR disconnection_reason = 'unknown' THEN 1
            ELSE 0
          END,
          -- Second criterion: For non-unknown rows, sort by call_duration
          CASE 
            WHEN p_sort_direction = 'asc' THEN call_duration
            ELSE -call_duration  -- Negate for descending order
          END NULLS LAST
        LIMIT p_limit
        OFFSET p_offset;
      END;
      $$ LANGUAGE plpgsql;
      */

      // Use the RPC function if you have it in your database
      try {
        const { data: sortedData, error: sortError } = await supabase.rpc(
          "sort_call_logs_with_unknown",
          {
            p_campaign_id: parseInt(campaignId),
            p_sort_direction: sort_direction,
            p_limit: pageSizeNum,
            p_offset: start,
          },
        );

        if (!sortError) {
          // Send response with data and pagination info
          return res.json({
            data: sortedData || [],
            pagination: {
              total: count,
              page: pageNum,
              page_size: pageSizeNum,
              total_pages: Math.ceil(count / pageSizeNum),
            },
          });
        } else {
          console.log(
            "RPC error, falling back to client-side sorting:",
            sortError,
          );
          // Fall back to client-side sorting if RPC fails
        }
      } catch (rpcError) {
        console.log(
          "RPC not available, using fallback sorting method",
          rpcError,
        );
        // Continue with fallback method
      }

      // Fallback method using Supabase's order options and post-processing
      // Get all records for client-side sorting
      const { data: allData, error: allDataError } = await supabase
        .from("call_logs")
        .select("*")
        .eq("campaignId", campaignId);

      if (allDataError) {
        console.error(
          "Error fetching all data for client-side sorting:",
          allDataError,
        );
        throw allDataError;
      }

      // Sort client-side
      const sortedData = allData.sort((a, b) => {
        // First priority: unknown disconnection_reason at the bottom
        const aUnknown =
          !a.disconnection_reason ||
          a.disconnection_reason === "" ||
          a.disconnection_reason === "unknown";
        const bUnknown =
          !b.disconnection_reason ||
          b.disconnection_reason === "" ||
          b.disconnection_reason === "unknown";

        if (aUnknown && !bUnknown) return 1; // a goes to bottom
        if (!aUnknown && bUnknown) return -1; // b goes to bottom

        // If both are unknown or both are not unknown, sort by duration
        if (sort_direction === "asc") {
          // For ascending sort
          if (a.call_duration === null) return 1;
          if (b.call_duration === null) return -1;
          return a.call_duration - b.call_duration;
        } else {
          // For descending sort
          if (a.call_duration === null) return 1;
          if (b.call_duration === null) return -1;
          return b.call_duration - a.call_duration;
        }
      });

      // Paginate the sorted results in memory
      const paginatedData = sortedData.slice(start, end + 1);

      // Return the paginated, sorted data
      return res.json({
        data: paginatedData || [],
        pagination: {
          total: count,
          page: pageNum,
          page_size: pageSizeNum,
          total_pages: Math.ceil(count / pageSizeNum),
        },
      });
    } else {
      // For other fields, use standard Supabase ordering
      query = query.order(sort_field, {
        ascending: sort_direction === "asc",
      });

      // Apply range after sorting
      query = query.range(start, end);

      // Execute the query
      const { data, error } = await query;

      if (error) {
        console.error("Error fetching data:", error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} records for the current page`);

      // Send response with data and pagination info
      res.json({
        data: data || [],
        pagination: {
          total: count,
          page: pageNum,
          page_size: pageSizeNum,
          total_pages: Math.ceil(count / pageSizeNum),
        },
      });
    }
  } catch (error) {
    console.error("Error fetching paginated call logs:", error);
    res.status(500).json({
      error: "Failed to fetch call logs",
      details: error.message,
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
