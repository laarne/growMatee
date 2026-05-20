exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const apiKey = process.env.PLANT_ID_API_KEY || process.env.VITE_PLANT_ID_API_KEY;
    if (!apiKey) throw new Error("Plant.id API key is missing");

    const body = JSON.parse(event.body || "{}");
    if (!Array.isArray(body.images) || body.images.length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Please send one captured plant photo." }),
      };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const response = await fetch("https://plant.id/api/v3/identification?classification_level=species", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": apiKey,
      },
      body: JSON.stringify({ images: body.images ?? [] }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await response.text();
    return {
      statusCode: response.status,
      headers: { "Content-Type": "application/json" },
      body: text,
    };
  } catch (error) {
    const isTimeout = error?.name === "AbortError";
    return {
      statusCode: isTimeout ? 504 : 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: isTimeout ? "Plant.id took too long. Try a clearer, closer plant photo." : error.message || "Plant.id scan failed",
      }),
    };
  }
};
