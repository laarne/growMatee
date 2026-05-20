const PLANT_ID_ENDPOINT = "/.netlify/functions/plant-id-scan";

const protectedPlantNames = [
  "vanda sanderiana",
  "waling-waling",
  "paphiopedilum",
  "slipper orchid",
  "cycas",
  "cycad",
  "agarwood",
  "aquilaria",
];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function fileToCompressedBase64(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const image = await loadImage(dataUrl);
  const maxSize = 1100;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);
  const compressed = canvas.toDataURL("image/jpeg", 0.78);
  return compressed.includes(",") ? compressed.split(",")[1] : compressed;
}

function cleanText(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toConfidence(probability) {
  const value = Number(probability);
  if (!Number.isFinite(value)) return "80%";
  return `${Math.round(value * 100)}%`;
}

function inferCategory(name, details = {}) {
  const searchable = [name, ...(details.common_names ?? []), details.description?.value].join(" ").toLowerCase();
  if (/orchid|rose|flower|bougainvillea|hibiscus|santan/.test(searchable)) return "Flowering";
  if (/cactus|succulent|echeveria|aloe|jade/.test(searchable)) return "Succulents";
  if (/basil|mint|rosemary|oregano|thyme|herb/.test(searchable)) return "Herbs";
  if (/pechay|eggplant|tomato|chili|pepper|onion|lettuce|vegetable/.test(searchable)) return "Veggies";
  if (/calamansi|lemon|mango|fruit|citrus/.test(searchable)) return "Fruit Trees";
  if (/monstera|pothos|philodendron|calathea|alocasia|anthurium|snake plant|sansevieria/.test(searchable)) return "Indoor";
  if (/bonsai|tree|palm/.test(searchable)) return "Trees";
  return "Indoor";
}

function inferStatus(commonName, scientificName, confidence, category) {
  const searchable = `${commonName} ${scientificName}`.toLowerCase();
  if (protectedPlantNames.some((name) => searchable.includes(name))) return "Blocked";
  const confidenceNumber = Number(String(confidence).replace("%", ""));
  if (confidenceNumber < 70) return "Review";
  if (category === "Rare") return "Review";
  return "Allowed";
}

function statusMeta(status) {
  if (status === "Blocked") {
    return {
      decision: "Listing blocked",
      tone: "rose",
      note: "Protected or risky plant match. Selling is blocked until legal source is verified.",
      action: "Blocked",
    };
  }
  if (status === "Review") {
    return {
      decision: "Needs review",
      tone: "amber",
      note: "Plant identification or source needs human review before posting.",
      action: "Send to review",
    };
  }
  return {
    decision: "Approved for Marketplace",
    tone: "green",
    note: "Plant.id identified a common plant with no protected-species flag detected.",
    action: "Create listing",
  };
}

export async function scanPlantWithPlantId(file) {
  const imageUrl = URL.createObjectURL(file);
  const imageBase64 = await fileToCompressedBase64(file).catch(() => fileToBase64(file));
  const response = await fetch(PLANT_ID_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      images: [imageBase64],
    }),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const payload = await response.json();
      detail = payload?.error ? ` - ${payload.error}` : "";
    } catch {
      detail = "";
    }
    throw new Error(`Plant.id scan failed: ${response.status}${detail}`);
  }

  const payload = await response.json();
  const isPlant = payload?.result?.is_plant;
  if (isPlant?.binary === false) {
    return {
      id: `plantid-not-plant-${payload?.access_token ?? Date.now()}`,
      commonName: "Not a clear plant photo",
      scientificName: "Scan another real plant",
      localNames: [],
      image: imageUrl,
      confidence: toConfidence(isPlant.probability),
      status: "Review",
      decision: "Needs review",
      tone: "amber",
      note: "Plant.id could not confirm this is a real plant photo.",
      action: "Scan again",
      suggestedCategory: "Indoor",
      condition: "Unclear",
      description: "Plant.id could not confirm the image. Capture a clearer full plant photo before posting.",
      careTips: [],
      source: "plant.id",
    };
  }

  const suggestion = payload?.result?.classification?.suggestions?.[0];
  const suggestionDetails = suggestion?.details ?? {};
  const scientificName = cleanText(suggestion?.name, "Needs verification");
  const commonName = cleanText(suggestionDetails.common_names?.[0], scientificName);
  const localNames = suggestionDetails.common_names?.slice(0, 3) ?? [];
  const confidence = toConfidence(suggestion?.probability);
  const category = inferCategory(`${commonName} ${scientificName}`, suggestionDetails);
  const status = inferStatus(commonName, scientificName, confidence, category);
  const meta = statusMeta(status);
  const description = cleanText(
    suggestionDetails.description?.value,
    `${commonName} identified by Plant.id. Add price, quantity, delivery, and care notes before posting.`
  );

  return {
    id: `plantid-${payload?.access_token ?? Date.now()}`,
    commonName,
    scientificName,
    localNames,
    image: imageUrl,
    confidence,
    status,
    decision: meta.decision,
    tone: meta.tone,
    note: meta.note,
    action: meta.action,
    suggestedCategory: category,
    condition: "Unclear",
    description,
    careTips: [
      suggestionDetails.watering?.min ? "Check watering needs before selling" : "Ask buyer to verify care routine",
      ...(suggestionDetails.propagation_methods?.slice(0, 2) ?? []),
    ],
    source: "plant.id",
  };
}
