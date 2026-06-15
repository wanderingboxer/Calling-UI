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

    const debug = [];

    await Promise.all(
      allConversations.map(async (convo) => {
        try {
          const detailRes = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversations/${convo.conversation_id}`,
            { headers: { "xi-api-key": apiKey } }
          );
          const detail = await detailRes.json();

          // Log the full top level keys and phone_call section
          debug.push({
            conversation_id: convo.conversation_id,
            topLevelKeys: Object.keys(detail),
            hasData: !!detail.data,
            dataKeys: detail.data ? Object.keys(detail.data) : [],
            metadataKeys: detail.data?.metadata ? Object.keys(detail.data.metadata) : [],
            phone_call: detail.data?.metadata?.phone_call || null,
            user_id_locations: {
              detail_user_id: detail.user_id,
              detail_data_user_id: detail.data?.user_id,
              metadata_user_id: detail.data?.metadata?.user_id,
              convo_user_id: convo.user_id
            },
            rawDetailSample: JSON.stringify(detail).substring(0, 500)
          });
        } catch (e) {
          debug.push({ error: e.message });
        }
      })
    );

    res.status(200).json({
      debug,
      conversationsFound: allConversations.length,
      convoSample: allConversations[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
