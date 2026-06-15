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

    // Debug — return raw data so we can see what ElevenLabs is returning
    const debug = [];

    await Promise.all(
      allConversations.map(async (convo) => {
        try {
          const detailRes = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversations/${convo.conversation_id}`,
            { headers: { "xi-api-key": apiKey } }
          );
          const detail = await detailRes.json();

          debug.push({
            conversation_id: convo.conversation_id,
            call_successful: convo.call_successful,
            user_id: detail.data?.user_id,
            external_number: detail.data?.metadata?.phone_call?.external_number,
            duration: detail.data?.metadata?.call_duration_secs,
            call_status_value: detail.data?.analysis?.data_collection_results?.call_status?.value
          });
        } catch (e) {
          debug.push({ error: e.message });
        }
      })
    );

    res.status(200).json({
      debug,
      conversationsFound: allConversations.length,
      startTime,
      agentId,
      numbersLookingFor: numbers
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
