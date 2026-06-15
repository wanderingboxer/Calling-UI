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

          // Phone number is directly on detail, not under detail.data
          const phone = (detail.user_id || "").replace(/\s/g, "");
          if (!phone) return;

          // Data collection results are directly on detail too
          const dc = detail.analysis?.data_collection_results || {};

          results[phone] = {
            callStatus: dc.call_status?.value || (detail.metadata?.call_duration_secs === 0 ? "no-answer" : ""),
            meetingInterest: dc.meeting_interest?.value || "",
            meetingDate: dc.meeting_date?.value || "",
            meetingTime: dc.meeting_time?.value || "",
            painPoints: dc.pain_points?.value || "",
            duration: detail.metadata?.call_duration_secs || 0,
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
