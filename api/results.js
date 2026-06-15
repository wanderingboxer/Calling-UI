export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { numbers, agentId, startTime } = req.body;
  const apiKey = "sk_3bb5b4e2ee654a3299dbc159b74d8fea017a729d28bddbc4";

  try {
    let allConversations = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      let url = `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agentId}&call_start_after_unix=${startTime}&page_size=100`;
      if (cursor) url += `&cursor=${cursor}`;
      const response = await fetch(url, { headers: { "xi-api-key": apiKey } });
      const data = await response.json();
      allConversations = allConversations.concat(data.conversations || []);
      hasMore = data.has_more || false;
      cursor = data.next_cursor || null;
    }

    const results = {};

    await Promise.all(
      allConversations.map(async (convo) => {
        try {
          const detailRes = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversations/${convo.conversation_id}`,
            { headers: { "xi-api-key": apiKey } }
          );
          const detail = await detailRes.json();

          // Try all possible locations for phone number
          const phone =
            detail.data?.metadata?.phone_call?.external_number ||
            detail.data?.user_id ||
            detail.user_id ||
            "";

          if (!phone) return;

          const dc = detail.data?.analysis?.data_collection_results || {};

          // Normalize phone — strip spaces, ensure + prefix
          const normalizedPhone = phone.replace(/\s/g, "");

          results[normalizedPhone] = {
            callStatus: dc.call_status?.value || "",
            meetingInterest: dc.meeting_interest?.value || "",
            meetingDate: dc.meeting_date?.value || "",
            meetingTime: dc.meeting_time?.value || "",
            painPoints: dc.pain_points?.value || "",
            duration: detail.data?.metadata?.call_duration_secs || 0,
            callSuccessful: convo.call_successful || ""
          };
        } catch (e) {}
      })
    );

    res.status(200).json(results);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
