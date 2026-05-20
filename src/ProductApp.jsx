import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  AlertTriangle,
  ArrowLeft,
  Ban,
  Camera,
  Check,
  ChevronRight,
  Heart,
  Info,
  Leaf,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Trophy,
  UserRound,
} from "lucide-react";
import { scanPlantWithPlantId } from "./lib/plantIdScan";

const plantPhotos = {
  monstera: "/plants/monstera-real.jpg",
  calathea: "/plants/calathea-real-2.jpg",
  pothos: "/plants/pothos-real.jpg",
  anthurium: "/plants/anthurium-real.jpg",
  cactus: "/plants/cactus-real.jpg",
  cactusTrio: "/plants/cactus-trio-real.jpg",
  fern: "/plants/fern-real.jpg",
  herb: "/plants/herb-real.jpg",
  snake: "/plants/snake-real.jpg",
  orchid: "/plants/orchid-real.jpg",
  bonsai: "/plants/bonsai-real.jpg",
  fiddle: "/plants/fiddle-real.jpg",
  hoya: "/plants/hoya-real.jpg",
  succulent: "/plants/succulent-real.jpg",
  walingWaling: "/plants/waling-waling-real.jpg",
  alocasia: "/plants/alocasia-real.jpg",
  peperomia: "/plants/peperomia-real.jpg",
  eggplant: "/plants/eggplant-real.jpg",
  onion: "/plants/onion-real.jpg",
  tomato: "/plants/tomato-real.jpg",
  chili: "/plants/chili-real.jpg",
  pechay: "/plants/pechay-real.jpg",
  calamansi: "/plants/calamansi-real.jpg",
  silverSword: "/plants/silver-sword-real.jpg",
  bougainvillea: "/plants/bougainvillea-real.jpg",
};

const PLANT_CATEGORIES = ["Indoor", "Outdoor", "Rare", "Flowering", "Succulents", "Herbs", "Veggies", "Fruit Trees", "Cuttings", "Trees"];
const MARKET_CATEGORY_FILTERS = ["All", ...PLANT_CATEGORIES];
const leafyLogo = "/leafy-ai-logo.png";

const collection = [
  {
    id: 1,
    name: "Monstera Thai Constellation",
    nickname: "Nova",
    image: plantPhotos.monstera,
    status: "Thriving",
    tag: "Rare",
    category: "Rare",
    availability: "Cuttings soon",
    likes: 284,
    age: "1y 8m",
    updates: ["New fenestrated leaf opened", "Repotted into chunky aroid mix", "Moss pole extended"],
  },
  {
    id: 2,
    name: "Calathea Orbifolia",
    nickname: "Luna",
    image: plantPhotos.calathea,
    status: "Recovering",
    tag: "Pet friendly",
    category: "Indoor",
    availability: "Not available",
    likes: 143,
    age: "9m",
    updates: ["Humidity tray added", "Brown edges trimmed", "Moved away from afternoon sun"],
  },
  {
    id: 3,
    name: "Golden Pothos",
    nickname: "Milo",
    image: plantPhotos.pothos,
    status: "Propagating",
    tag: "Easy care",
    category: "Cuttings",
    availability: "Cuttings soon",
    likes: 96,
    age: "2y",
    updates: ["Five nodes rooted", "Two cuttings ready", "Trailing shelf reset"],
  },
  {
    id: 4,
    name: "Anthurium Clarinervium",
    nickname: "Velvet",
    image: plantPhotos.anthurium,
    status: "Flowering",
    tag: "Collector",
    category: "Rare",
    availability: "Wishlist only",
    likes: 219,
    age: "1y 2m",
    updates: ["First inflorescence spotted", "Leaf shine cleaned", "Switched to filtered water"],
  },
  {
    id: 5,
    name: "Snake Plant Laurentii",
    nickname: "Scout",
    image: plantPhotos.snake,
    status: "Thriving",
    tag: "Low light",
    category: "Indoor",
    availability: "Pups available",
    likes: 88,
    age: "3y",
    updates: ["Two pups emerged", "Moved to brighter corner", "Soil fully dried between watering"],
  },
  {
    id: 6,
    name: "Mini Phalaenopsis Orchid",
    nickname: "Pearl",
    image: plantPhotos.orchid,
    status: "Flowering",
    tag: "Blooming",
    category: "Flowering",
    availability: "Not available",
    likes: 176,
    age: "7m",
    updates: ["Second bloom spike opened", "Root tips are active", "Bark mix refreshed"],
  },
  {
    id: 7,
    name: "Fiddle Leaf Fig",
    nickname: "Atlas",
    image: plantPhotos.fiddle,
    status: "Growing",
    tag: "Statement",
    category: "Trees",
    availability: "Not available",
    likes: 132,
    age: "2y 4m",
    updates: ["Rotated for even growth", "New top leaf hardened", "Dust cleaned from leaves"],
  },
  {
    id: 8,
    name: "Hoya Carnosa Compacta",
    nickname: "Rope",
    image: plantPhotos.hoya,
    status: "Propagating",
    tag: "Trailing",
    category: "Cuttings",
    availability: "Sharing soon",
    likes: 201,
    age: "1y 5m",
    updates: ["Cutting callused", "Peduncle spotted", "Moved near morning light"],
  },
  {
    id: 9,
    name: "Alocasia Frydek",
    nickname: "Emerald",
    image: plantPhotos.alocasia,
    status: "Recovering",
    tag: "Velvet",
    category: "Rare",
    availability: "Wishlist only",
    likes: 157,
    age: "11m",
    updates: ["Humidity increased", "Old leaf removed", "New spear visible"],
  },
  {
    id: 10,
    name: "Peperomia Watermelon",
    nickname: "Melon",
    image: plantPhotos.peperomia,
    status: "Thriving",
    tag: "Compact",
    category: "Indoor",
    availability: "Leaf cuttings soon",
    likes: 119,
    age: "10m",
    updates: ["Three new leaves", "Self-watering pot tested", "Moved to shelf level two"],
  },
  {
    id: 11,
    name: "Talong Eggplant",
    nickname: "Lila",
    image: plantPhotos.eggplant,
    status: "Fruit set",
    tag: "Food garden",
    category: "Veggies",
    availability: "Seeds soon",
    likes: 74,
    age: "3m",
    updates: ["First purple flower opened", "Bamboo stake added", "Organic fertilizer applied"],
  },
  {
    id: 12,
    name: "Spring Onion",
    nickname: "Sibs",
    image: plantPhotos.onion,
    status: "Harvesting",
    tag: "Regrow",
    category: "Veggies",
    availability: "Sharing bunches",
    likes: 61,
    age: "6w",
    updates: ["Kitchen scraps regrown", "Trimmed for breakfast", "New shoots appeared"],
  },
  {
    id: 13,
    name: "Cherry Tomato",
    nickname: "Ruby",
    image: plantPhotos.tomato,
    status: "Flowering",
    tag: "Edible",
    category: "Veggies",
    availability: "Seedlings soon",
    likes: 103,
    age: "2m",
    updates: ["Yellow blossoms opened", "Trellis clips added", "Morning sun schedule updated"],
  },
  {
    id: 14,
    name: "Siling Labuyo",
    nickname: "Spice",
    image: plantPhotos.chili,
    status: "Growing",
    tag: "Spicy",
    category: "Veggies",
    availability: "Seeds available",
    likes: 82,
    age: "4m",
    updates: ["First peppers turning red", "Pinched top growth", "Shared seeds with neighbor"],
  },
  {
    id: 15,
    name: "Pechay",
    nickname: "Leafy",
    image: plantPhotos.pechay,
    status: "Harvesting",
    tag: "Leafy green",
    category: "Veggies",
    availability: "Not available",
    likes: 69,
    age: "5w",
    updates: ["Outer leaves harvested", "Shade cloth added", "Second batch planted"],
  },
  {
    id: 16,
    name: "Calamansi Backyard Tree",
    nickname: "Sour",
    image: plantPhotos.calamansi,
    status: "Growing",
    tag: "Citrus",
    category: "Fruit Trees",
    availability: "Fruit tree showcase",
    likes: 118,
    age: "8m",
    updates: ["New citrus flush appeared", "Moved to full morning sun", "Compost top-dress added"],
  },
];

const withPhotoGallery = (plant) => ({
  ...plant,
  photos: plant.photos ?? [plant.image],
});

const marketPlants = [
  {
    name: "Silver Sword Philodendron",
    price: "PHP 2,100",
    location: "Butuan City",
    type: "Buy",
    category: "Rare",
    image: plantPhotos.silverSword,
    seller: "Maria Dela Cruz",
    rating: "4.9",
    stock: "2 pots",
  },
  {
    name: "Rooted Cebu Blue Cutting",
    price: "Community",
    location: "Libertad",
    type: "Community",
    category: "Cuttings",
    image: plantPhotos.pothos,
    seller: "Ana Santos",
    rating: "4.8",
    stock: "5 cuttings",
  },
  {
    name: "Desert Cactus Trio",
    price: "PHP 1,250",
    location: "Ampayon",
    type: "Buy",
    category: "Succulents",
    image: plantPhotos.cactusTrio,
    seller: "Paolo Reyes",
    rating: "4.7",
    stock: "3 sets",
  },
  {
    name: "Kitchen Herb Starter Set",
    price: "PHP 980",
    location: "Bancasi",
    type: "Buy",
    category: "Herbs",
    image: plantPhotos.herb,
    seller: "Aling Nena",
    rating: "5.0",
    stock: "8 sets",
  },
  {
    name: "Snake Plant Pup",
    price: "Community",
    location: "Tiniwisan",
    type: "Community",
    category: "Indoor",
    image: plantPhotos.snake,
    seller: "Miguel Bautista",
    rating: "4.9",
    stock: "4 pups",
  },
  {
    name: "Mini Orchid in Bloom",
    price: "PHP 1,850",
    location: "Cabadbaran",
    type: "Buy",
    category: "Flowering",
    image: plantPhotos.orchid,
    seller: "Tita Pearl's Garden",
    rating: "4.6",
    stock: "1 pot",
  },
  {
    name: "Hoya Carnosa Cutting",
    price: "Community",
    location: "Nasipit",
    type: "Community",
    category: "Cuttings",
    image: plantPhotos.hoya,
    seller: "Maria Dela Cruz",
    rating: "4.9",
    stock: "6 rooted",
  },
  {
    name: "Watermelon Peperomia",
    price: "PHP 950",
    location: "Buenavista",
    type: "Buy",
    category: "Indoor",
    image: plantPhotos.peperomia,
    seller: "Halaman Corner",
    rating: "4.8",
    stock: "3 pots",
  },
  {
    name: "Bougainvillea Patio Starter",
    price: "PHP 780",
    location: "Bayugan City",
    type: "Buy",
    category: "Outdoor",
    image: plantPhotos.bougainvillea,
    seller: "Aling Nena",
    rating: "4.8",
    stock: "4 pots",
  },
  {
    name: "Juniper Bonsai Starter",
    price: "Community",
    location: "Ampayon",
    type: "Community",
    category: "Trees",
    image: plantPhotos.bonsai,
    seller: "Miguel Bautista",
    rating: "4.9",
    stock: "2 trees",
  },
  {
    name: "Talong Seedling Set",
    price: "PHP 120",
    location: "Butuan City",
    type: "Buy",
    category: "Veggies",
    image: plantPhotos.eggplant,
    seller: "Mang Lito Santos",
    rating: "4.8",
    stock: "12 seedlings",
  },
  {
    name: "Spring Onion Regrow Bunch",
    price: "Community",
    location: "Bancasi",
    type: "Community",
    category: "Veggies",
    image: plantPhotos.onion,
    seller: "Aling Nena",
    rating: "5.0",
    stock: "6 bunches",
  },
  {
    name: "Rooted Calamansi Cuttings",
    price: "PHP 120",
    location: "San Vicente",
    type: "Buy",
    category: "Cuttings",
    image: plantPhotos.calamansi,
    seller: "Mang Lito Santos",
    rating: "4.7",
    stock: "8 rooted cuttings",
  },
  {
    name: "Pechay Seedling Tray",
    price: "PHP 95",
    location: "San Vicente",
    type: "Buy",
    category: "Veggies",
    image: plantPhotos.pechay,
    seller: "Mang Lito Santos",
    rating: "4.7",
    stock: "18 trays",
  },
  {
    name: "Siling Labuyo Seed Pack",
    price: "PHP 70",
    location: "Bancasi",
    type: "Buy",
    category: "Veggies",
    image: plantPhotos.chili,
    seller: "Aling Nena",
    rating: "5.0",
    stock: "20 packs",
  },
  {
    name: "Cherry Tomato Starter",
    price: "PHP 150",
    location: "Nasipit",
    type: "Buy",
    category: "Veggies",
    image: plantPhotos.tomato,
    seller: "Maria Dela Cruz",
    rating: "4.9",
    stock: "7 cups",
  },
  {
    name: "Basil and Mint Pair",
    price: "PHP 240",
    location: "Bancasi",
    type: "Buy",
    category: "Herbs",
    image: plantPhotos.herb,
    seller: "Aling Nena",
    rating: "5.0",
    stock: "6 pairs",
  },
  {
    name: "Golden Pothos Cuttings",
    price: "PHP 180",
    location: "Libertad",
    type: "Buy",
    category: "Cuttings",
    image: plantPhotos.pothos,
    seller: "Ana Santos",
    rating: "4.8",
    stock: "15 cuts",
  },
  {
    name: "Alocasia Frydek Pup",
    price: "PHP 1,450",
    location: "Nasipit",
    type: "Buy",
    category: "Rare",
    image: plantPhotos.alocasia,
    seller: "Maria Dela Cruz",
    rating: "4.9",
    stock: "1 pup",
  },
  {
    name: "Fiddle Leaf Fig Small",
    price: "PHP 1,100",
    location: "Butuan City",
    type: "Buy",
    category: "Trees",
    image: plantPhotos.fiddle,
    seller: "Halaman Corner",
    rating: "4.8",
    stock: "2 pots",
  },
  {
    name: "Anthurium Clarinervium",
    price: "Community",
    location: "Nasipit",
    type: "Community",
    category: "Rare",
    image: plantPhotos.anthurium,
    seller: "Maria Dela Cruz",
    rating: "4.9",
    stock: "wishlist post",
  },
  {
    name: "Calathea Orbifolia Division",
    price: "Community",
    location: "Butuan City",
    type: "Community",
    category: "Indoor",
    image: plantPhotos.calathea,
    seller: "Laarne Ramos",
    rating: "4.9",
    stock: "1 division",
  },
  {
    name: "Mini Cactus Sunny Set",
    price: "PHP 390",
    location: "Ampayon",
    type: "Buy",
    category: "Succulents",
    image: plantPhotos.cactus,
    seller: "Miguel Bautista",
    rating: "4.9",
    stock: "5 sets",
  },
  {
    name: "Onion and Pechay Bundle",
    price: "Community",
    location: "San Vicente",
    type: "Community",
    category: "Veggies",
    image: plantPhotos.onion,
    seller: "Mang Lito Santos",
    rating: "4.7",
    stock: "garden bundle",
  },
  {
    name: "Monstera Node Cutting",
    price: "PHP 850",
    location: "Butuan City",
    type: "Buy",
    category: "Cuttings",
    image: plantPhotos.monstera,
    seller: "Laarne Ramos",
    rating: "4.9",
    stock: "3 nodes",
  },
  {
    name: "Calamansi Backyard Pair",
    price: "Community",
    location: "San Vicente",
    type: "Community",
    category: "Fruit Trees",
    image: plantPhotos.calamansi,
    seller: "Mang Lito Santos",
    rating: "4.7",
    stock: "2 seedlings",
  },
  {
    name: "Phalaenopsis Bloom Pot",
    price: "PHP 1,350",
    location: "Cabadbaran",
    type: "Buy",
    category: "Flowering",
    image: plantPhotos.orchid,
    seller: "Tita Pearl's Garden",
    rating: "4.6",
    stock: "4 pots",
  },
  {
    name: "Balcony Herb Cuttings",
    price: "Community",
    location: "Bancasi",
    type: "Community",
    category: "Herbs",
    image: plantPhotos.herb,
    seller: "Aling Nena",
    rating: "5.0",
    stock: "mint basil",
  },
];

const sellerAvatars = {
  "Laarne Ramos": "/laarne-profile.png",
  "Maria Dela Cruz": "/avatars/avatar-maria-custom.webp",
  "Ana Santos": "/avatars/avatar-ana-custom.webp",
  "Aling Nena": "/avatars/avatar-pearl-custom.webp",
  "Miguel Bautista": "/avatars/avatar-miguel-custom.webp",
  "Mang Lito Santos": "/avatars/avatar-lito-custom.webp",
  "Halaman Corner": "/avatars/avatar-paolo-custom.webp",
  "Tita Pearl's Garden": "/avatars/avatar-ana-custom.webp",
  "Paolo Reyes": "/avatars/avatar-paolo-custom.webp",
};

const aiScanResults = [
  {
    id: "orchid",
    commonName: "Mini Phalaenopsis Orchid",
    scientificName: "Phalaenopsis hybrid",
    image: plantPhotos.orchid,
    confidence: "96%",
    decision: "Allowed to list",
    status: "Allowed",
    tone: "green",
    icon: Check,
    note: "Common nursery hybrid. Add care notes and listing photos.",
    action: "Create listing",
  },
  {
    id: "alocasia",
    commonName: "Alocasia Frydek",
    scientificName: "Alocasia micholitziana",
    image: plantPhotos.alocasia,
    confidence: "91%",
    decision: "Needs review",
    status: "Review",
    tone: "amber",
    icon: AlertTriangle,
    note: "Rare plant detected. Seller must verify nursery-grown source before posting.",
    action: "Send to review",
  },
  {
    id: "waling-waling",
    commonName: "Waling-waling Orchid",
    scientificName: "Vanda sanderiana",
    image: plantPhotos.walingWaling,
    confidence: "94%",
    decision: "Listing blocked",
    status: "Blocked",
    tone: "rose",
    icon: Ban,
    note: "Protected Philippine orchid risk. Selling is blocked unless legal nursery permits are verified.",
    action: "Blocked",
  },
];

const photoOptions = [
  ["Monstera", plantPhotos.monstera],
  ["Calathea", plantPhotos.calathea],
  ["Pothos", plantPhotos.pothos],
  ["Orchid", plantPhotos.orchid],
  ["Fiddle", plantPhotos.fiddle],
  ["Hoya", plantPhotos.hoya],
  ["Alocasia", plantPhotos.alocasia],
  ["Herbs", plantPhotos.herb],
  ["Talong", plantPhotos.eggplant],
  ["Onion", plantPhotos.onion],
  ["Tomato", plantPhotos.tomato],
  ["Pechay", plantPhotos.pechay],
  ["Calamansi Tree", plantPhotos.calamansi],
  ["Waling-waling", plantPhotos.walingWaling],
];

const messageThreads = [
  {
    name: "Maria Dela Cruz",
    avatar: sellerAvatars["Maria Dela Cruz"],
    context: "Silver Sword Philodendron",
    preview: "Available pa. I can reserve it until tonight.",
    time: "2m",
    unread: 2,
    messages: [
      ["Maria Dela Cruz", "Hi Laarne, available pa yung Silver Sword."],
      ["You", "Nice. Pwede meetup this weekend?"],
      ["Maria Dela Cruz", "Yes, Nasipit or Butuan downtown is okay."],
    ],
  },
  {
    name: "Miguel Bautista",
    avatar: sellerAvatars["Miguel Bautista"],
    context: "Bonsai Courtyard",
    preview: "I uploaded new root photos for the bonsai.",
    time: "18m",
    unread: 1,
    messages: [
      ["Miguel Bautista", "I uploaded the root photos."],
      ["You", "Thanks. I will check the update."],
    ],
  },
  {
    name: "Aling Nena",
    avatar: sellerAvatars["Aling Nena"],
    context: "Balcony Herb Cuttings",
    preview: "Basil and mint are ready for pickup.",
    time: "1h",
    unread: 0,
    messages: [
      ["Aling Nena", "Basil and mint are ready for pickup."],
      ["You", "Thank you po. I’ll message before going."],
    ],
  },
  {
    name: "Mang Lito Santos",
    avatar: sellerAvatars["Mang Lito Santos"],
    context: "Pechay Seedling Tray",
    preview: "Seven seedlings are still available.",
    time: "3h",
    unread: 0,
    messages: [
      ["You", "Available pa po yung pechay tray?"],
      ["Mang Lito Santos", "Yes, seven seedlings are still available."],
    ],
  },
];

const defaultLeafyMessages = [
  {
    from: "Leafy",
    text: "Hi Laarne. I can help identify plants, check if they are safe to sell, diagnose care problems, write listings, and suggest plant categories.",
  },
];

const getLeafyReply = (text) => {
  const normalized = text.toLowerCase();
  if (normalized.includes("sell") || normalized.includes("safe") || normalized.includes("market")) {
    return "For Market posts, scan a real plant photo first. I will identify the plant, suggest a category, check protected-species risk, and mark it as Safe to sell, For review, or Blocked.";
  }
  if (normalized.includes("yellow") || normalized.includes("problem") || normalized.includes("diagnose")) {
    return "Yellow leaves usually mean overwatering, low light, old leaf shedding, or nutrient stress. Check soil moisture first, then roots, drainage, and recent light changes.";
  }
  if (normalized.includes("listing") || normalized.includes("description")) {
    return "Listing draft: Healthy beginner-friendly plant, locally grown in Butuan City. Includes recent scan, clear condition, quantity, care notes, and meetup or delivery option.";
  }
  if (normalized.includes("orchid")) {
    return "For orchids, use bright indirect light, airy bark mix, and water when roots turn silvery. Avoid standing water around the crown.";
  }
  if (normalized.includes("identify") || normalized.includes("photo") || normalized.includes("scan")) {
    return "Use Scan Plant so I can compare leaf shape, growth habit, flowers, and stems. For better verification, capture the full plant, close-up leaf, stem/base, and a recent photo.";
  }
  return "Good question. My recommendation is to scan the plant first, then I can suggest the name, category, care tips, safety status, and a marketplace-ready description.";
};

const feedPosts = [
  {
    id: "feed-maria-leaf",
    author: "Maria Dela Cruz",
    avatar: sellerAvatars["Maria Dela Cruz"],
    type: "Updates",
    title: "New leaf on the balcony shelf",
    text: "My Calathea bounced back after moving it away from afternoon sun.",
    image: plantPhotos.calathea,
    meta: "Nasipit - 2h",
    likes: 128,
    comments: 14,
    mockComments: [
      { author: "Aling Nena", avatar: sellerAvatars["Aling Nena"], text: "Ganda ng new leaf! The color looks healthy." },
      { author: "Miguel Bautista", avatar: sellerAvatars["Miguel Bautista"], text: "Try morning light only, it helped my Calathea too." },
    ],
  },
  {
    id: "feed-laarne-ai",
    author: "Laarne Ramos",
    avatar: "/laarne-profile.png",
    type: "Tips",
    title: "Leafy AI says bright indirect light",
    text: "Testing the new plant diagnosis flow on Luna before I add another update.",
    image: plantPhotos.anthurium,
    meta: "Butuan City - 4h",
    likes: 96,
    comments: 9,
    mockComments: [
      { author: "Maria Dela Cruz", avatar: sellerAvatars["Maria Dela Cruz"], text: "Leafy AI tip is useful, I need this for my orchids." },
      { author: "Ana Santos", avatar: sellerAvatars["Ana Santos"], text: "Please share the diagnosis result after a week." },
    ],
  },
  {
    id: "feed-nena-harvest",
    author: "Aling Nena",
    avatar: sellerAvatars["Aling Nena"],
    type: "Harvests",
    title: "Weekend herbs are ready",
    text: "Basil, pechay, and chili are growing nicely after the rain.",
    image: plantPhotos.herb,
    meta: "Bancasi - 6h",
    likes: 211,
    comments: 22,
    mockComments: [
      { author: "Maria Dela Cruz", avatar: sellerAvatars["Maria Dela Cruz"], text: "Looks healthy! Your basil is so full." },
      { author: "Mang Lito Santos", avatar: sellerAvatars["Mang Lito Santos"], text: "Nice growth update. Rainwater really helped." },
    ],
  },
  {
    id: "feed-miguel-bonsai",
    author: "Miguel Bautista",
    avatar: sellerAvatars["Miguel Bautista"],
    type: "Questions",
    title: "Should I prune this bonsai branch?",
    text: "Trying to keep the courtyard bonsai compact without stressing it.",
    image: plantPhotos.bonsai,
    meta: "Ampayon - 1d",
    likes: 74,
    comments: 18,
    mockComments: [
      { author: "Laarne Ramos", avatar: "/laarne-profile.png", text: "Maybe trim only the crossing branch first." },
      { author: "Maria Dela Cruz", avatar: sellerAvatars["Maria Dela Cruz"], text: "I would wait until the new leaves harden." },
    ],
  },
  {
    id: "feed-ana-pothos",
    author: "Ana Santos",
    avatar: sellerAvatars["Ana Santos"],
    type: "Updates",
    title: "Pothos cuttings finally rooted",
    text: "Three nodes have strong white roots now. I kept them in bright shade for two weeks.",
    image: plantPhotos.pothos,
    meta: "Libertad - 1d",
    likes: 84,
    comments: 11,
    mockComments: [
      { author: "Laarne Ramos", avatar: "/laarne-profile.png", text: "Nice roots! Water propagation worked well." },
      { author: "Aling Nena", avatar: sellerAvatars["Aling Nena"], text: "Pwede na yan sa soil mix." },
    ],
  },
  {
    id: "feed-paolo-cactus",
    author: "Paolo Reyes",
    avatar: sellerAvatars["Paolo Reyes"],
    type: "Tips",
    title: "Cactus watering reminder",
    text: "I only water when the soil is fully dry. Ampayon heat is strong, but overwatering is still the real problem.",
    image: plantPhotos.cactusTrio,
    meta: "Ampayon - 2d",
    likes: 67,
    comments: 8,
    mockComments: [
      { author: "Miguel Bautista", avatar: sellerAvatars["Miguel Bautista"], text: "Agree. Less water, more light." },
      { author: "Halaman Corner", avatar: sellerAvatars["Halaman Corner"], text: "This helped my mini cactus too." },
    ],
  },
  {
    id: "feed-lito-pechay",
    author: "Mang Lito Santos",
    avatar: sellerAvatars["Mang Lito Santos"],
    type: "Harvests",
    title: "Pechay trays are ready",
    text: "Fresh pechay seedlings from San Vicente. Good for backyard plots and container gardens.",
    image: plantPhotos.pechay,
    meta: "San Vicente - 2d",
    likes: 152,
    comments: 17,
    mockComments: [
      { author: "Aling Nena", avatar: sellerAvatars["Aling Nena"], text: "Healthy seedlings. Nice spacing!" },
      { author: "Ana Santos", avatar: sellerAvatars["Ana Santos"], text: "I want to try this on my balcony." },
    ],
  },
  {
    id: "feed-pearl-orchid",
    author: "Tita Pearl's Garden",
    avatar: sellerAvatars["Tita Pearl's Garden"],
    type: "Questions",
    title: "Orchid spike or root?",
    text: "This new growth appeared near the base. Is it a flower spike or just another root?",
    image: plantPhotos.orchid,
    meta: "Cabadbaran - 3d",
    likes: 119,
    comments: 19,
    mockComments: [
      { author: "Maria Dela Cruz", avatar: sellerAvatars["Maria Dela Cruz"], text: "Looks like a new root from the tip shape." },
      { author: "Laarne Ramos", avatar: "/laarne-profile.png", text: "Leafy AI can help compare spike vs root." },
    ],
  },
  {
    id: "feed-corner-peperomia",
    author: "Halaman Corner",
    avatar: sellerAvatars["Halaman Corner"],
    type: "Updates",
    title: "Peperomia shelf refresh",
    text: "Moved the Watermelon Peperomia near the window. Leaves look firmer after adjusting watering.",
    image: plantPhotos.peperomia,
    meta: "Buenavista - 3d",
    likes: 93,
    comments: 12,
    mockComments: [
      { author: "Ana Santos", avatar: sellerAvatars["Ana Santos"], text: "The leaf pattern looks so clean." },
      { author: "Paolo Reyes", avatar: sellerAvatars["Paolo Reyes"], text: "Nice indoor corner setup." },
    ],
  },
];

const communityGardens = [
  {
    id: "maria",
    owner: "Maria Dela Cruz",
    handle: "@mariahalaman",
    avatar: sellerAvatars["Maria Dela Cruz"],
    name: "Balcony Jungle",
    location: "Nasipit",
    cover: plantPhotos.calathea,
    coverPhotos: [plantPhotos.calathea, plantPhotos.alocasia, plantPhotos.hoya, plantPhotos.tomato],
    score: "9.8k",
    followers: "1.4k",
    rank: "#1",
    bio: "Rare foliage and balcony updates.",
    badges: ["Most admired", "Rare collector", "Top seller"],
    plants: [
      { name: "Philodendron Gloriosum", image: plantPhotos.fern, tag: "Rare" },
      { name: "Calathea Orbifolia", image: plantPhotos.calathea, tag: "Humidity" },
      { name: "Hoya Carnosa", image: plantPhotos.hoya, tag: "Cuttings" },
      { name: "Cherry Tomato", image: plantPhotos.tomato, tag: "Veggies" },
    ],
  },
  {
    id: "nena",
    owner: "Aling Nena",
    handle: "@nenasrooftop",
    avatar: sellerAvatars["Aling Nena"],
    name: "Herb Roof",
    location: "Bancasi",
    cover: plantPhotos.herb,
    coverPhotos: [plantPhotos.herb, plantPhotos.chili, plantPhotos.pechay, plantPhotos.eggplant],
    score: "8.7k",
    followers: "940",
    rank: "#3",
    bio: "Herbs, chili, and weekend harvests.",
    badges: ["Harvest streak", "Community helper", "Beginner friendly"],
    plants: [
      { name: "Sweet Basil", image: plantPhotos.herb, tag: "Harvest" },
      { name: "Talong Eggplant", image: plantPhotos.eggplant, tag: "Veggies" },
      { name: "Siling Labuyo", image: plantPhotos.chili, tag: "Spicy" },
      { name: "Pechay", image: plantPhotos.pechay, tag: "Leafy" },
      { name: "Mini Cactus Trio", image: plantPhotos.cactus, tag: "Sunny" },
      { name: "Golden Pothos", image: plantPhotos.pothos, tag: "Propagation" },
    ],
  },
  {
    id: "miguel",
    owner: "Miguel Bautista",
    handle: "@miguelbonsai",
    avatar: sellerAvatars["Miguel Bautista"],
    name: "Bonsai Courtyard",
    location: "Ampayon",
    cover: plantPhotos.bonsai,
    coverPhotos: [plantPhotos.bonsai, plantPhotos.snake, plantPhotos.peperomia, plantPhotos.calamansi],
    score: "8.4k",
    followers: "812",
    rank: "#5",
    bio: "Bonsai updates and slow-grow care logs.",
    badges: ["Trusted seller", "Care streak", "Slow grower"],
    plants: [
      { name: "Juniper Bonsai", image: plantPhotos.bonsai, tag: "Showcase" },
      { name: "Snake Plant", image: plantPhotos.snake, tag: "Low light" },
      { name: "Peperomia", image: plantPhotos.peperomia, tag: "Compact" },
      { name: "Calamansi Backyard Tree", image: plantPhotos.calamansi, tag: "Fruit tree" },
    ],
  },
  {
    id: "lito",
    owner: "Mang Lito Santos",
    handle: "@bahaykubogrower",
    avatar: sellerAvatars["Mang Lito Santos"],
    name: "Bahay Kubo Patch",
    location: "San Vicente",
    cover: plantPhotos.eggplant,
    coverPhotos: [plantPhotos.eggplant, plantPhotos.tomato, plantPhotos.chili, plantPhotos.calamansi],
    score: "7.9k",
    followers: "688",
    rank: "#7",
    bio: "Backyard food garden and seed sharing.",
    badges: ["Food grower", "Seed sharer", "Harvest logs"],
    plants: [
      { name: "Talong Eggplant", image: plantPhotos.eggplant, tag: "Veggies" },
      { name: "Spring Onion", image: plantPhotos.onion, tag: "Regrow" },
      { name: "Cherry Tomato", image: plantPhotos.tomato, tag: "Veggies" },
      { name: "Siling Labuyo", image: plantPhotos.chili, tag: "Spicy" },
      { name: "Pechay", image: plantPhotos.pechay, tag: "Leafy" },
      { name: "Calamansi Backyard Tree", image: plantPhotos.calamansi, tag: "Fruit tree" },
    ],
  },
  {
    id: "ana",
    owner: "Ana Santos",
    handle: "@ana_cuttings",
    avatar: sellerAvatars["Ana Santos"],
    name: "Cutting Corner",
    location: "Libertad",
    cover: plantPhotos.pothos,
    coverPhotos: [plantPhotos.pothos, plantPhotos.monstera, plantPhotos.hoya, plantPhotos.snake],
    score: "7.6k",
    followers: "612",
    rank: "#8",
    bio: "Rooted cuttings and beginner-friendly propagation.",
    badges: ["Propagation pro", "Fast replies", "Beginner helper"],
    plants: [
      { name: "Golden Pothos", image: plantPhotos.pothos, tag: "Cuttings" },
      { name: "Monstera Node", image: plantPhotos.monstera, tag: "Aroid" },
      { name: "Hoya Carnosa", image: plantPhotos.hoya, tag: "Rooted" },
      { name: "Snake Plant Pup", image: plantPhotos.snake, tag: "Hardy" },
    ],
  },
  {
    id: "paolo",
    owner: "Paolo Reyes",
    handle: "@paolo_sunny",
    avatar: sellerAvatars["Paolo Reyes"],
    name: "Sunny Succulent Shelf",
    location: "Ampayon",
    cover: plantPhotos.cactusTrio,
    coverPhotos: [plantPhotos.cactusTrio, plantPhotos.cactus, plantPhotos.succulent, plantPhotos.bougainvillea],
    score: "7.2k",
    followers: "530",
    rank: "#10",
    bio: "Cactus, succulents, and dry balcony care.",
    badges: ["Sunny shelf", "Low-water grower", "Weekend seller"],
    plants: [
      { name: "Desert Cactus Trio", image: plantPhotos.cactusTrio, tag: "Sunny" },
      { name: "Mini Cactus", image: plantPhotos.cactus, tag: "Succulent" },
      { name: "Mixed Succulents", image: plantPhotos.succulent, tag: "Low water" },
      { name: "Bougainvillea", image: plantPhotos.bougainvillea, tag: "Outdoor" },
    ],
  },
  {
    id: "pearl",
    owner: "Tita Pearl's Garden",
    handle: "@tita_pearlblooms",
    avatar: sellerAvatars["Tita Pearl's Garden"],
    name: "Bloom Porch",
    location: "Cabadbaran",
    cover: plantPhotos.orchid,
    coverPhotos: [plantPhotos.orchid, plantPhotos.walingWaling, plantPhotos.bougainvillea, plantPhotos.hoya],
    score: "7.1k",
    followers: "508",
    rank: "#11",
    bio: "Orchid blooms, porch flowers, and gentle care notes.",
    badges: ["Flowering fan", "Careful seller", "Bloom watcher"],
    plants: [
      { name: "Phalaenopsis Orchid", image: plantPhotos.orchid, tag: "Flowering" },
      { name: "Waling-waling", image: plantPhotos.walingWaling, tag: "Protected" },
      { name: "Bougainvillea", image: plantPhotos.bougainvillea, tag: "Outdoor" },
      { name: "Hoya Carnosa", image: plantPhotos.hoya, tag: "Blooms" },
    ],
  },
  {
    id: "corner",
    owner: "Halaman Corner",
    handle: "@halaman_corner",
    avatar: sellerAvatars["Halaman Corner"],
    name: "Indoor Corner",
    location: "Buenavista",
    cover: plantPhotos.peperomia,
    coverPhotos: [plantPhotos.peperomia, plantPhotos.fiddle, plantPhotos.anthurium, plantPhotos.calathea],
    score: "6.9k",
    followers: "474",
    rank: "#13",
    bio: "Small-space indoor plants and care reminders.",
    badges: ["Indoor stylist", "Care reminder", "Plant shelf"],
    plants: [
      { name: "Watermelon Peperomia", image: plantPhotos.peperomia, tag: "Indoor" },
      { name: "Fiddle Leaf Fig", image: plantPhotos.fiddle, tag: "Tree" },
      { name: "Anthurium", image: plantPhotos.anthurium, tag: "Rare" },
      { name: "Calathea Orbifolia", image: plantPhotos.calathea, tag: "Humidity" },
    ],
  },
];

const leaderboard = {
  Growers: [
    ["Maria Dela Cruz", "Balcony Jungle", 9840, "142 admirers"],
    ["Laarne Ramos", "My Plant Collection", 9120, "38 updates"],
    ["Aling Nena", "Herb Roof", 8730, "21 harvests"],
  ],
  Sellers: [
    ["Miguel Bautista", "Trusted Seller", 7620, "54 clean sales"],
    ["Maria Dela Cruz", "Cutting Queen", 7210, "4.9 rating"],
    ["Paolo Reyes", "Weekend Seller", 6840, "fast replies"],
  ],
  Helpers: [
    ["Ana Santos", "Plant Doctor", 6420, "89 care answers"],
    ["Laarne Ramos", "ID Specialist", 6185, "47 IDs solved"],
    ["Benjie Cruz", "Pest Rescue", 5900, "32 saves"],
  ],
};

const categoryCounts = collection.reduce((counts, plant) => {
  counts[plant.category] = (counts[plant.category] ?? 0) + 1;
  return counts;
}, {});

const hasPlantNamed = (keywords) => collection.some((plant) => keywords.some((keyword) => plant.name.toLowerCase().includes(keyword)));

const achievements = {
  Consistency: [
    { title: "Daily Visitor", detail: "3-day login streak", progress: 3, goal: 3, unlocked: true },
    { title: "Green Streak", detail: "7-day login streak", progress: 5, goal: 7 },
    { title: "Garden Regular", detail: "30 app opens", progress: 18, goal: 30 },
    { title: "Weekend Grower", detail: "4 weekend visits", progress: 2, goal: 4 },
    { title: "Back to Garden", detail: "Returned after a break", progress: 1, goal: 1, unlocked: true },
  ],
  Collections: [
    { title: "Indoor Starter", detail: "5 indoor plants", progress: categoryCounts.Indoor ?? 0, goal: 5 },
    { title: "Rare Shelf", detail: "3 rare plants", progress: categoryCounts.Rare ?? 0, goal: 3 },
    { title: "Bloom Keeper", detail: "5 flowering plants", progress: categoryCounts.Flowering ?? 0, goal: 5 },
    { title: "Herb Basket", detail: "5 herbs", progress: categoryCounts.Herbs ?? 0, goal: 5 },
    { title: "Bahay Kubo Set", detail: "5 veggies", progress: categoryCounts.Veggies ?? 0, goal: 5 },
    { title: "Fruit Corner", detail: "3 fruit trees", progress: categoryCounts["Fruit Trees"] ?? 0, goal: 3 },
    { title: "Complete Grower", detail: "1 from every category", progress: PLANT_CATEGORIES.filter((category) => (categoryCounts[category] ?? 0) > 0).length, goal: PLANT_CATEGORIES.length },
  ],
  Sets: [
    {
      title: "Aroid Set",
      detail: "Monstera, Anthurium, Alocasia, Pothos",
      progress: [
        hasPlantNamed(["monstera"]),
        hasPlantNamed(["anthurium"]),
        hasPlantNamed(["alocasia"]),
        hasPlantNamed(["pothos"]),
      ].filter(Boolean).length,
      goal: 4,
    },
    {
      title: "Food Garden Set",
      detail: "Talong, tomato, chili, pechay, spring onion",
      progress: [
        hasPlantNamed(["talong", "eggplant"]),
        hasPlantNamed(["tomato"]),
        hasPlantNamed(["sili", "chili"]),
        hasPlantNamed(["pechay"]),
        hasPlantNamed(["onion"]),
      ].filter(Boolean).length,
      goal: 5,
    },
    {
      title: "Beginner Set",
      detail: "Snake plant, pothos, peperomia, cactus or basil",
      progress: [
        hasPlantNamed(["snake"]),
        hasPlantNamed(["pothos"]),
        hasPlantNamed(["peperomia"]),
        hasPlantNamed(["cactus", "basil"]),
      ].filter(Boolean).length,
      goal: 4,
    },
    { title: "Market Explorer", detail: "3 market categories", progress: 2, goal: 3 },
  ],
};

const tabs = [
  [ShoppingBag, "Market"],
  [MessageCircle, "Feed"],
  [Leaf, "Garden"],
  [Trophy, "Rankings"],
  [UserRound, "Profile"],
];

const feedProofRequirements = ["Full plant", "Leaf close-up", "Growth update", "Recent photo"];

const feedPolicyCards = [
  ["Real plant content", "Use your own garden photos, plant questions, care notes, or harvest updates."],
  ["Market stays separate", "Cash prices and selling posts belong in the Market section."],
  ["Leafy AI help", "Use Leafy AI for identification, care tips, and plant problem checks."],
  ["Community safety", "Reports help remove spam, fake photos, and harmful advice."],
];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function StatusPill({ children, tone = "green" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    blue: "bg-sky-50 text-sky-700 ring-sky-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    dark: "bg-[#203522] text-white ring-[#203522]",
  };

  return <span className={cn("rounded-full px-3 py-1 text-xs font-bold ring-1", tones[tone])}>{children}</span>;
}

function InfoButton({ title, detail, notify }) {
  return (
    <button
      onClick={() => notify(title, detail)}
      className="gm-tap grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#315d37] shadow-sm ring-1 ring-[#dfe8d7]"
      aria-label={title}
      title={detail}
    >
      <Info size={16} />
    </button>
  );
}

function PlantImage({ src, alt = "", className = "" }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = "/plants/plant-fallback.svg";
      }}
    />
  );
}

function AvatarImage({ src, alt = "", className = "" }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = "/laarne-profile.png";
      }}
    />
  );
}

function PhotoPicker({ title, detail, options = photoOptions, onSelect, onCancel }) {
  return (
    <section className="gm-sheet-in mt-3 rounded-[1.6rem] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-[#203522]">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-[#73806c]">{detail}</p>
        </div>
        <button onClick={onCancel} className="gm-tap rounded-full bg-[#f0f4e8] px-3 py-1 text-xs font-black text-[#63705e]">
          Close
        </button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 md:grid-cols-6 xl:grid-cols-8">
        {options.map(([label, image]) => (
          <button key={label} onClick={() => onSelect(image, label)} className="gm-tap overflow-hidden rounded-2xl bg-[#f7faf1] text-left ring-1 ring-[#edf1e8]">
            <PlantImage src={image} alt={label} className="h-16 w-full object-cover" />
            <p className="truncate px-2 py-1 text-xs font-black text-[#63705e]">{label}</p>
          </button>
        ))}
      </div>
      <p className="mt-3 rounded-2xl bg-[#edf7dc] px-3 py-2 text-xs font-bold leading-5 text-[#315d37]">
        Camera scan only. Saved uploads are disabled to help prove this is a real plant.
      </p>
    </section>
  );
}

function ActionPanel({ action, onClose }) {
  if (!action) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] flex justify-center bg-gradient-to-t from-[#203522]/18 to-transparent px-4 pb-4 pt-16">
      <section className="gm-sheet-in w-full max-w-[430px] rounded-[1.6rem] bg-white p-4 shadow-[0_22px_60px_rgba(32,53,34,0.25)] ring-1 ring-[#dfe8d7]">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#edf7dc] text-[#203522]">
            <Check size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-black text-[#203522]">{action.title}</p>
            {action.detail && <p className="mt-1 text-sm font-semibold leading-5 text-[#63705e]">{action.detail}</p>}
          </div>
          <button onClick={onClose} className="gm-tap rounded-full bg-[#f0f4e8] px-3 py-2 text-xs font-black text-[#52604d]">
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

function PhoneShell({ children }) {
  return (
    <div className="gm-phone-in mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-[#f5f8ef] shadow-[0_28px_90px_rgba(37,61,41,0.24)] sm:my-6 sm:h-[min(900px,calc(100dvh-3rem))] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[2.4rem] sm:border-[10px] sm:border-[#1e2a20] md:max-w-[760px] md:border md:border-[#dfe8d7] lg:max-w-[980px] xl:max-w-[1180px]">
      <div className="hidden h-6 items-center justify-center bg-[#1e2a20] sm:flex md:hidden">
        <span className="h-1.5 w-20 rounded-full bg-white/25" />
      </div>
      {children}
    </div>
  );
}

function SkeletonBlock({ className = "" }) {
  return <span className={cn("gm-skeleton block rounded-full", className)} />;
}

function GrowMateLoadingSkeleton() {
  const chips = ["w-12", "w-16", "w-20", "w-14", "w-24"];
  const cards = ["h-48", "h-48", "h-44", "h-44"];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(217,249,157,0.34),transparent_28%),linear-gradient(135deg,#e8f0df,#f7faf1_45%,#dbe8d1)] font-sans text-[#203522] sm:px-4 lg:px-8">
      <PhoneShell>
        <div className="min-h-0 flex-1 overflow-y-auto" role="status" aria-live="polite" aria-busy="true" aria-label="Loading GrowMate">
          <header className="mx-4 mb-4 mt-4 rounded-[1.6rem] bg-white/90 p-3 shadow-sm ring-1 ring-[#e4ecd8]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <SkeletonBlock className="h-11 w-11 rounded-2xl" />
                <div className="min-w-0 space-y-2">
                  <SkeletonBlock className="h-2.5 w-24" />
                  <SkeletonBlock className="h-5 w-32" />
                </div>
              </div>
              <SkeletonBlock className="h-10 w-10 rounded-2xl" />
            </div>
          </header>

          <div className="px-4 pb-6">
            <SkeletonBlock className="h-11 w-full rounded-2xl" />
            <div className="gm-x-scroll mt-3 flex gap-2 overflow-x-auto pb-1">
              {chips.map((width, index) => (
                <SkeletonBlock key={`${width}-${index}`} className={cn("h-8 shrink-0", width)} />
              ))}
            </div>
            <section className="mt-4 overflow-hidden rounded-[1.8rem] bg-white shadow-sm">
              <SkeletonBlock className="h-44 w-full rounded-none" />
              <div className="space-y-3 p-4">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="h-6 w-3/4" />
                <SkeletonBlock className="h-4 w-1/2" />
                <SkeletonBlock className="h-11 w-full" />
              </div>
            </section>
            <div className="mt-5 flex items-center justify-between">
              <SkeletonBlock className="h-6 w-24" />
              <SkeletonBlock className="h-4 w-16" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {cards.map((height, index) => (
                <article key={`${height}-${index}`} className="overflow-hidden rounded-[1.5rem] bg-white shadow-sm">
                  <SkeletonBlock className={cn("w-full rounded-none", height)} />
                  <div className="space-y-2 p-3">
                    <SkeletonBlock className="h-3 w-16" />
                    <SkeletonBlock className="h-4 w-full" />
                    <SkeletonBlock className="h-5 w-20" />
                    <SkeletonBlock className="h-9 w-full" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <nav className="z-30 mx-auto grid w-full max-w-[430px] shrink-0 grid-cols-5 gap-1 border-t border-[#e3eadb] bg-white/95 px-2 pb-2 pt-1.5 backdrop-blur">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl px-1">
              <SkeletonBlock className="h-8 w-8 rounded-xl" />
              <SkeletonBlock className="h-2 w-9" />
            </div>
          ))}
        </nav>
      </PhoneShell>
    </main>
  );
}

function SectionLoadingSkeleton({ activeTab = "Market" }) {
  const cardCount = activeTab === "Profile" ? 3 : 4;
  const isFeed = activeTab === "Feed";
  const isRankings = activeTab === "Rankings";

  if (isRankings) {
    return (
      <div className="px-4 pb-6">
        <SkeletonBlock className="h-10 w-40" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((item) => (
            <article key={item} className="rounded-[1.6rem] bg-white p-4 shadow-sm">
              <div className="grid grid-cols-[48px_1fr_68px] items-center gap-3">
                <SkeletonBlock className="h-12 w-12 rounded-2xl" />
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-36" />
                  <SkeletonBlock className="h-3 w-24" />
                </div>
                <SkeletonBlock className="h-8 w-full" />
              </div>
            </article>
          ))}
        </div>
        <SkeletonBlock className="mt-5 h-36 w-full rounded-[1.7rem]" />
      </div>
    );
  }

  if (isFeed) {
    return (
      <div className="px-4 pb-6">
        <section className="rounded-[1.8rem] bg-white p-4 shadow-sm">
          <div className="grid grid-cols-[56px_1fr] items-center gap-3">
            <SkeletonBlock className="h-14 w-14 rounded-2xl" />
            <SkeletonBlock className="h-12 w-full rounded-2xl" />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((item) => (
              <SkeletonBlock key={item} className="h-10 w-full" />
            ))}
          </div>
        </section>
        <div className="gm-x-scroll mt-4 flex gap-2 overflow-x-auto pb-1">
          {["w-16", "w-24", "w-28", "w-24"].map((width, index) => (
            <SkeletonBlock key={`${width}-${index}`} className={cn("h-10 shrink-0", width)} />
          ))}
        </div>
        <SkeletonBlock className="mt-4 h-72 w-full rounded-[1.8rem]" />
      </div>
    );
  }

  return (
    <div className="px-4 pb-6">
      <SkeletonBlock className="h-11 w-full rounded-2xl" />
      <div className="gm-x-scroll mt-3 flex gap-2 overflow-x-auto pb-1">
        {["w-12", "w-16", "w-20", "w-14", "w-24"].map((width, index) => (
          <SkeletonBlock key={`${width}-${index}`} className={cn("h-8 shrink-0", width)} />
        ))}
      </div>
      <section className="mt-4 overflow-hidden rounded-[1.8rem] bg-white shadow-sm">
        <SkeletonBlock className="h-40 w-full rounded-none" />
        <div className="space-y-3 p-4">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-6 w-3/4" />
          <SkeletonBlock className="h-4 w-1/2" />
        </div>
      </section>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {Array.from({ length: cardCount }).map((_, index) => (
          <article key={index} className="overflow-hidden rounded-[1.5rem] bg-white shadow-sm">
            <SkeletonBlock className="h-36 w-full rounded-none" />
            <div className="space-y-2 p-3">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-5 w-20" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function TopBar({ setActiveTab }) {
  return (
    <header className="flex items-center justify-between px-5 pb-2 pt-3">
      <div className="flex items-center gap-2">
        <img src="/growmate-logo.png" alt="GrowMate logo" className="h-7 w-7 rounded-lg object-cover" />
        <p className="text-xl font-black leading-none tracking-normal">
          <span className="text-[#163f25]">Grow</span>
          <span className="text-[#8ca183]">Mate</span>
        </p>
      </div>
      <button
        onClick={() => setActiveTab("Profile")}
        className="gm-tap relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white text-[#203522] shadow-sm"
        aria-label="Open profile"
      >
        <AvatarImage src="/laarne-profile.png" alt="" className="h-full w-full object-cover" />
      </button>
    </header>
  );
}

function SellerListingCheck({ notify }) {
  const [selectedCategory, setSelectedCategory] = useState("Indoor");
  const [scanResult, setScanResult] = useState(aiScanResults[0]);
  const [listedPlants, setListedPlants] = useState([]);
  const [showFeedRules, setShowFeedRules] = useState(false);
  const ScanIcon = scanResult.icon;
  const safetyChecks =
    scanResult.status === "Allowed"
      ? [
          ["Plant identified", `${scanResult.commonName} - ${scanResult.confidence} match`, Check],
          ["Posting rule", "Safe to post", ShieldCheck],
          ["Protected species", "No flag", Check],
          ["Proof photos", "4 required photos saved", Camera],
        ]
      : scanResult.status === "Review"
        ? [
            ["Plant identified", `${scanResult.commonName} - ${scanResult.confidence} match`, Check],
            ["Listing rule", "Needs proof", AlertTriangle],
            ["Protected species", "Review required", AlertTriangle],
            ["Proof photos", "Add complete post proof", Camera],
          ]
        : [
            ["Plant identified", `${scanResult.commonName} - ${scanResult.confidence} match`, AlertTriangle],
            ["Listing rule", "Blocked", Ban],
            ["Protected species", "Protected risk", Ban],
            ["Proof photos", "Posting disabled", Ban],
          ];

  const handleScanPhoto = () => {
    const currentIndex = aiScanResults.findIndex((result) => result.id === scanResult.id);
    const nextResult = aiScanResults[(currentIndex + 1) % aiScanResults.length];
    setScanResult(nextResult);
    notify("Leafy AI scanned", `${nextResult.commonName} checked.`);
  };

  const handleCreateListing = () => {
    if (scanResult.status === "Blocked") {
      notify("Listing blocked", "Protected-species risk.");
      return;
    }

    const listingType = "Feed";
    const listingId = `${scanResult.id}-${listingType}-${selectedCategory}`;
    setListedPlants((items) => {
      if (items.some((item) => item.listingId === listingId)) return items;
      return [{ ...scanResult, listingId, listingType, category: selectedCategory }, ...items];
    });
    notify(
      scanResult.status === "Review" ? "Sent to moderation" : "Feed post created",
      scanResult.status === "Review"
        ? "Needs moderator review first."
        : `${scanResult.commonName} is ready for community feedback.`
    );
  };

  return (
    <section className="gm-card-in rounded-[1.7rem] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[#edf7dc] px-3 py-1 text-xs font-black text-[#315d37]">
            <ScanLine size={14} /> Leafy AI
          </p>
          <h2 className="mt-3 text-xl font-black leading-tight text-[#203522]">Check your post before sharing</h2>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-black ring-1",
            scanResult.status === "Blocked"
              ? "bg-rose-50 text-rose-700 ring-rose-100"
              : scanResult.status === "Review"
                ? "bg-amber-50 text-amber-700 ring-amber-100"
                : "bg-emerald-50 text-emerald-700 ring-emerald-100"
          )}
        >
          <ScanIcon size={15} /> {scanResult.status === "Allowed" ? "Safe to post" : scanResult.status}
        </span>
      </div>

      <div className="mt-4 rounded-[1.4rem] border border-[#dfe8d7] bg-[#fbfdf7] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-black text-[#203522]">Post safely with GrowMate</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#63705e]">
              Real plant photos required - selling posts belong in Market
            </p>
          </div>
          <button
            onClick={() => setShowFeedRules((value) => !value)}
            className="gm-tap min-w-max rounded-full bg-white px-3 py-2 text-xs font-black text-[#315d37] ring-1 ring-[#dfe8d7]"
          >
            {showFeedRules ? "Hide rules" : "View rules"}
          </button>
        </div>
        {showFeedRules && (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {feedPolicyCards.map(([title, detail]) => (
              <div key={title} className="rounded-[1.2rem] bg-white p-3 ring-1 ring-[#edf1e8]">
                <p className="text-sm font-black text-[#203522]">{title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[#63705e]">{detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-[1.4rem] bg-[#f7faf1] p-3">
        <div className="flex flex-wrap gap-2">
          {leafyCapabilities.map((capability) => (
            <span key={capability} className="min-w-max rounded-full bg-white px-3 py-2 text-xs font-black text-[#315d37] ring-1 ring-[#e4ecd8]">
              {capability}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-black text-[#203522]">Required proof photos</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {feedProofRequirements.map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-2xl bg-[#fbfdf7] px-3 py-2 ring-1 ring-[#edf1e8]">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#edf7dc] text-[#315d37]">
                <Check size={13} />
              </span>
              <p className="text-xs font-black text-[#63705e]">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-black text-[#203522]">Plant category</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PLANT_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "gm-tap min-w-max rounded-xl border px-2.5 py-1.5 text-xs font-black transition",
                selectedCategory === category ? "border-[#203522] bg-white text-[#203522] shadow-sm" : "border-[#dfe8d7] bg-[#fbfdf7] text-[#63705e]"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-3 rounded-[1.4rem] bg-[#f7faf1] p-3">
        <PlantImage src={scanResult.image} alt={scanResult.commonName} className="h-20 w-20 shrink-0 rounded-3xl object-cover" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#7a8572]">Leafy AI identified</p>
          <h3 className="mt-1 text-lg font-black leading-tight text-[#203522]">{scanResult.commonName}</h3>
          <p className="mt-1 text-xs font-bold italic text-[#7a8572]">{scanResult.scientificName}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {safetyChecks.map(([title, detail, Icon]) => (
          <div key={title} className="gm-card-in flex items-start gap-3 rounded-2xl bg-[#fbfdf7] p-3 ring-1 ring-[#edf1e8]">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#edf7dc] text-[#315d37]">
              <Icon size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[#203522]">{title}</p>
              <p className="mt-0.5 text-xs font-semibold leading-5 text-[#63705e]">{detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
        <button
          onClick={handleScanPhoto}
          className="gm-tap grid h-12 w-12 place-items-center rounded-full bg-[#edf7dc] text-[#315d37]"
          aria-label="Scan another plant photo"
        >
          <Camera size={18} />
        </button>
        <button
          onClick={handleCreateListing}
          aria-disabled={scanResult.status === "Blocked"}
          className={cn(
            "gm-tap rounded-full px-4 py-3 text-sm font-black transition",
            scanResult.status === "Blocked" ? "bg-[#f0f4e8] text-[#9aa690]" : "bg-[#203522] text-white"
          )}
        >
          {scanResult.status === "Review" ? "Send to review" : "Create feed post"}
        </button>
      </div>

      {listedPlants.length > 0 && (
        <div className="mt-4 space-y-2">
          {listedPlants.map((plant) => (
            <div key={plant.listingId} className="flex items-center gap-3 rounded-2xl bg-[#f7faf1] p-3">
              <PlantImage src={plant.image} alt={plant.commonName} className="h-12 w-12 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[#203522]">{plant.commonName}</p>
                <p className="text-xs font-bold text-[#7a8572]">
                  {plant.status === "Review" ? "Waiting for moderation" : `${plant.category} - community post draft`}
                </p>
              </div>
              <StatusPill tone="blue">Feed</StatusPill>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MarketPlantDetail({ plant, onClose, notify, openMessages }) {
  const sellerAvatar = sellerAvatars[plant.seller] ?? "/avatars/avatar-maria-custom.webp";
  const condition = plant.category === "Cuttings" ? "Rooted and healthy" : "Healthy";
  const plantType = plant.category === "Cuttings" ? "Cutting (Rooted)" : plant.category;
  const distance = {
    "Butuan City": "3.2 km away",
    "San Vicente": "6.4 km away",
    Ampayon: "4.1 km away",
    Bancasi: "5.8 km away",
    Nasipit: "2.6 km away",
    Libertad: "3.9 km away",
    "Cabadbaran": "2.8 km away",
    Buenavista: "7.1 km away",
    "Bayugan City": "8.5 km away",
  }[plant.location] ?? "Nearby";
  const carePreview =
    plant.category === "Veggies"
      ? ["Full sun", "Water daily in morning"]
      : plant.category === "Fruit Trees"
        ? ["Full sun", "Water 2-3x/week"]
        : plant.category === "Succulents"
          ? ["Bright light", "Water sparingly"]
          : plant.category === "Herbs"
            ? ["Morning sun", "Keep soil lightly moist"]
            : ["Bright indirect light", "Water when top soil dries"];
  const heroImageClass = plant.name === "Calamansi Backyard Tree" ? "h-full w-full object-cover object-bottom" : "h-full w-full object-cover";
  const about =
    plant.category === "Veggies"
      ? "Good for balcony or backyard growing."
      : plant.category === "Rare"
        ? "Collector plant. Ask for source and root photos."
        : "Beginner-friendly and ready to grow.";

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-[#203522]/35 sm:items-center sm:py-6">
      <section className="gm-sheet-in relative flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-white shadow-2xl sm:h-[880px] sm:rounded-[2rem] md:max-w-[560px]">
        <div className="relative h-[35dvh] min-h-[270px] max-h-[330px] shrink-0 overflow-hidden bg-[#203522]">
          <PlantImage src={plant.image} alt={plant.name} className={heroImageClass} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/20" />
          <button
            onClick={onClose}
            className="gm-tap absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-[#203522] shadow-sm"
            aria-label="Close listing"
          >
            <ArrowLeft size={19} />
          </button>
          <button
            onClick={() => notify("Listing shared", `${plant.name} from ${plant.seller} is ready to share.`)}
            className="gm-tap absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-[#203522] shadow-sm"
            aria-label="Share listing"
          >
            <Send size={18} />
          </button>
          <button
            onClick={() => notify("Saved listing", `${plant.name} was added to your favorites.`)}
            className="gm-tap absolute right-4 top-16 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#63705e] shadow-sm"
            aria-label="Save listing"
          >
            <Heart size={18} />
          </button>
          <span className="absolute bottom-4 right-4 rounded-full bg-black/55 px-3 py-1 text-xs font-black text-white">1/5</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-t-[1.5rem] bg-white px-5 pb-6 pt-6 shadow-[0_-12px_28px_rgba(32,53,34,0.08)]">
          <div>
            <h2 className="text-2xl font-black leading-tight text-[#203522]">{plant.name}</h2>
            {plant.aiName && plant.aiName !== plant.name && (
              <p className="mt-1 text-xs font-bold text-[#7a8572]">Leafy AI: {plant.aiName}</p>
            )}
            <p className="mt-1 text-xl font-black text-[#203522]">{plant.price}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill tone="green">For sale</StatusPill>
            <StatusPill>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={12} /> AI checked
              </span>
            </StatusPill>
            <StatusPill tone="amber">Beginner</StatusPill>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-y border-[#edf1e8] py-4">
            <div className="flex min-w-0 items-center gap-3">
              <AvatarImage src={sellerAvatar} alt={`${plant.seller} profile`} className="h-12 w-12 rounded-2xl object-cover" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#7a8572]">Seller</p>
                <p className="truncate font-black text-[#203522]">{plant.seller}</p>
                <span className="mt-1 inline-flex rounded-full bg-[#fff4db] px-2 py-0.5 text-xs font-black text-[#b45309]">
                  {plant.rating} trust
                </span>
              </div>
            </div>
            <button
              onClick={() => openMessages(plant.seller)}
              className="gm-tap rounded-xl border border-[#dfe8d7] px-4 py-3 text-xs font-black text-[#203522]"
            >
              Message
            </button>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            {[
              [MapPin, "Location", `${plant.location} - ${distance}`],
              [ShoppingBag, "Stock", plant.stock],
              [Send, "Delivery", "Pickup / Meetup / Delivery"],
              [Leaf, "Category", plant.category],
              [ShieldCheck, "Condition", condition],
              [ShoppingBag, "Type", plantType],
            ].map(([Icon, label, value]) => (
              <div key={label} className="flex items-center gap-3">
                <Icon size={16} className="text-[#63705e]" />
                <p className="w-24 text-xs font-bold text-[#63705e]">{label}</p>
                <p className="min-w-0 flex-1 text-right text-xs font-black text-[#203522]">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-[#edf1e8] pt-4">
            <p className="text-sm font-black text-[#203522]">About</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#63705e]">{about}</p>
          </div>

          <div className="mt-5 border-t border-[#edf1e8] pt-4">
            <p className="text-sm font-black text-[#203522]">Care preview</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {carePreview.map((item) => (
                <div key={item} className="rounded-2xl bg-[#f7faf1] px-3 py-3 text-xs font-black text-[#315d37]">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => notify("Listing reported", `${plant.name} was sent to GrowMate safety review.`)}
            className="gm-tap mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#ead7c0] bg-[#fff8e8] px-4 py-3 text-xs font-black text-[#9a3412]"
          >
            <Ban size={15} /> Report listing
          </button>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-[#edf1e8] bg-white px-5 pb-5 pt-3">
          <button
            onClick={() => notify("Checkout started", `${plant.name} from ${plant.seller} is now in progress.`)}
            className="gm-tap rounded-xl bg-[#203522] px-4 py-4 text-sm font-black text-white"
          >
            Buy Now - {plant.price}
          </button>
          <button
            onClick={() => notify("Offer started", `Make an offer for ${plant.name}.`)}
            className="gm-tap rounded-xl border border-[#cfd9c7] bg-white px-4 py-4 text-sm font-black text-[#203522]"
          >
            Make an Offer
          </button>
        </div>
      </section>
    </div>
  );
}

function MarketListingCreator({ onCreate, onCancel, notify }) {
  const topRef = React.useRef(null);
  const scanInputRef = React.useRef(null);
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [localName, setLocalName] = useState("");
  const [category, setCategory] = useState("Indoor");
  const [price, setPrice] = useState("PHP 180");
  const [stockQty, setStockQty] = useState("1");
  const [stockUnit, setStockUnit] = useState("Pot");
  const [delivery, setDelivery] = useState("Pickup / Meetup / Delivery");
  const [description, setDescription] = useState("Healthy, beginner-friendly plant ready for a new home.");
  const ScanIcon = scanResult?.icon ?? ScanLine;
  const isBlocked = scanResult?.status === "Blocked";
  const isReview = scanResult?.status === "Review";
  const safetyRows = !scanResult
    ? []
    : isBlocked
    ? [
        ["Plant identified", `${scanResult.commonName} - ${scanResult.confidence} match`, AlertTriangle],
        ["Selling Status", "Blocked from Marketplace", Ban],
        ["Protected Species Check", "Protected risk found", Ban],
      ]
    : isReview
      ? [
          ["Plant identified", `${scanResult.commonName} - ${scanResult.confidence} match`, Check],
          ["Selling Status", "Needs human review", AlertTriangle],
          ["Protected Species Check", "Needs CITES / DENR source check", AlertTriangle],
        ]
      : [
          ["Plant identified", `${scanResult.commonName} - ${scanResult.confidence} match`, Check],
          ["Selling Status", "Approved for Marketplace", ShieldCheck],
          ["Protected Species Check", "No CITES / DENR restriction detected", Check],
        ];

  const applyScanResult = (nextResult) => {
    const Icon = nextResult.status === "Blocked" ? Ban : nextResult.status === "Review" ? AlertTriangle : Check;
    setScanResult({ ...nextResult, icon: Icon });
    setLocalName(nextResult.localNames?.[0] ?? "");
    setCategory(nextResult.suggestedCategory ?? nextResult.category ?? category);
    setDescription(nextResult.description ?? `${nextResult.commonName} identified by Leafy AI. Add price, stock, delivery, and care notes before posting.`);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const scanCapturedImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    const plantIdKey = import.meta.env.VITE_PLANT_ID_API_KEY;
    try {
      const result = await scanPlantWithPlantId(file, plantIdKey);
      applyScanResult(result);
      notify(result.source === "plant.id" ? "Plant.id scan complete" : "Demo scan complete", `${result.commonName} checked for Market listing.`);
    } catch (error) {
      setScanResult(null);
      notify("Plant.id scan failed", "Please capture a clearer real plant photo and try again.");
    } finally {
      setIsScanning(false);
      event.target.value = "";
    }
  };

  const createListing = () => {
    if (!scanResult) {
      notify("Scan required", "Capture a real plant photo before posting to Market.");
      return;
    }

    if (isBlocked) {
      notify("Market listing blocked", "Leafy AI found a protected-species risk. This item cannot be sold.");
      return;
    }

    const listingName = localName.trim() || scanResult.commonName;
    const normalizedQty = Math.max(1, Number(stockQty) || 1);
    const stock = `${normalizedQty} ${stockUnit}${normalizedQty > 1 ? "s" : ""}`;
    onCreate({
      name: listingName,
      localName: localName.trim(),
      aiName: scanResult.commonName,
      scientificName: scanResult.scientificName,
      price,
      location: "Butuan City",
      type: "Buy",
      category,
      image: scanResult.image,
      seller: "Laarne Ramos",
      rating: "4.9",
      stock,
      delivery,
      about: description,
      reviewStatus: isReview ? "Review" : "Active",
      reviewNote: isReview ? "Rare plant source check required before publishing." : "",
    });
    notify(isReview ? "Sent to review" : "Market listing created", isReview ? "A moderator should approve this before it appears publicly." : `${listingName} was added to your Market listings.`);
  };

  return (
    <div ref={topRef} className="px-5 pb-44">
      <button
        onClick={onCancel}
        className="gm-tap mb-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#63705e] shadow-sm"
      >
        <ArrowLeft size={16} /> Back to Market
      </button>
      <section className="gm-screen-in overflow-hidden rounded-[2rem] bg-white shadow-sm">
      <div className="border-b border-[#edf1e8] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[#edf7dc] px-3 py-1 text-xs font-black text-[#315d37]">
            <ScanLine size={14} /> Leafy AI market check
          </p>
          <h2 className="mt-3 text-xl font-black leading-tight text-[#203522]">Create Market Listing</h2>
          <p className="mt-1 text-sm font-semibold leading-5 text-[#52604d]">Use AI verification to safely sell plants in the marketplace.</p>
        </div>
        <StatusPill tone="green">Step 1 of 3</StatusPill>
        </div>
        <p className="mt-3 text-sm font-black text-[#315d37]">Verify Plant</p>
        <div className="mt-4 flex items-center gap-2">
          {["AI check", "Details", "Review"].map((step, index) => (
            <div key={step} className="flex flex-1 items-center gap-2">
              <span className={cn("h-2 flex-1 rounded-full", index === 0 ? "bg-[#8bc34a]" : "bg-[#e5eddc]")} />
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-5">
      {scanResult ? (
        <div className={cn("mt-4 flex gap-3 rounded-[1.4rem] p-3", isBlocked ? "bg-rose-50" : isReview ? "bg-amber-50" : "bg-[#f0f9eb]")}>
          <PlantImage src={scanResult.image} alt={scanResult.commonName} className="h-20 w-20 shrink-0 rounded-3xl object-cover" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#315d37]">Plant.id Result</p>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black",
                  isBlocked ? "bg-rose-50 text-rose-700" : isReview ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                )}
              >
                <ScanIcon size={12} /> {isBlocked ? "Blocked" : isReview ? "Review" : "Safe to sell"}
              </span>
            </div>
            <h3 className="mt-1 text-lg font-black leading-tight text-[#203522]">{scanResult.commonName}</h3>
            <p className="mt-1 text-xs font-bold italic text-[#7a8572]">{scanResult.scientificName}</p>
            <p className="mt-1 text-xs font-black text-[#315d37]">{scanResult.confidence} match</p>
            <p className="mt-2 text-xs font-semibold leading-4 text-[#52604d]">Scanned from captured image with Plant.id image evaluation.</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[1.4rem] border border-dashed border-[#cbdabe] bg-[#fbfdf7] p-5 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#edf7dc] text-[#315d37]">
            <Camera size={22} />
          </span>
          <p className="mt-3 font-black text-[#203522]">Capture a real plant photo</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-[#63705e]">Plant.id will identify the plant before you can post it to Market.</p>
        </div>
      )}

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {safetyRows.map(([title, detail, Icon]) => (
          <div key={title} className="flex items-start gap-2 rounded-2xl bg-[#fbfdf7] p-3 ring-1 ring-[#edf1e8]">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#edf7dc] text-[#315d37]">
              <Icon size={14} />
            </span>
            <div>
              <p className="text-xs font-black text-[#203522]">{title}</p>
              <p className="mt-1 text-xs font-semibold leading-4 text-[#52604d]">{detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-black text-[#52604d]">
          Local name / Filipino name
          <input
            value={localName}
            onChange={(event) => setLocalName(event.target.value)}
            placeholder="Example: Dapo, San Francisco, Calamansi"
            className="mt-1 w-full rounded-2xl border border-[#dfe8d7] bg-white px-4 py-3 text-sm font-black text-[#203522] outline-none placeholder:text-[#9aa690] focus:border-[#8bc34a]"
          />
        </label>
        <label className="text-xs font-black text-[#52604d]">
          Leafy AI name
          <input
            value={scanResult?.commonName ?? ""}
            readOnly
            placeholder="Scan first"
            className="mt-1 w-full rounded-2xl border border-[#dfe8d7] bg-[#fbfdf7] px-4 py-3 text-sm font-black text-[#52604d] outline-none"
          />
        </label>
        <label className="text-xs font-black text-[#52604d]">
          Price
          <input value={price} onChange={(event) => setPrice(event.target.value)} className="mt-1 w-full rounded-2xl border border-[#dfe8d7] bg-white px-4 py-3 text-sm font-black text-[#203522] outline-none focus:border-[#8bc34a]" />
        </label>
        <label className="text-xs font-black text-[#52604d]">
          Quantity
          <div className="mt-1 grid grid-cols-[0.8fr_1.2fr] gap-2">
            <input
              value={stockQty}
              onChange={(event) => setStockQty(event.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              className="w-full rounded-2xl border border-[#dfe8d7] bg-white px-4 py-3 text-sm font-black text-[#203522] outline-none focus:border-[#8bc34a]"
            />
            <div className="relative">
              <select
                value={stockUnit}
                onChange={(event) => setStockUnit(event.target.value)}
                className="w-full appearance-none rounded-2xl border border-[#dfe8d7] bg-white px-4 py-3 pr-9 text-sm font-black text-[#203522] outline-none focus:border-[#8bc34a]"
              >
                {["Pot", "Cutting", "Seedling", "Node", "Pack"].map((unit) => (
                  <option key={unit}>{unit}</option>
                ))}
              </select>
              <ChevronRight size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#63705e]" />
            </div>
          </div>
        </label>
        <label className="text-xs font-black text-[#52604d]">
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-2xl border border-[#dfe8d7] bg-white px-4 py-3 text-sm font-black text-[#203522] outline-none focus:border-[#8bc34a]">
            {PLANT_CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-black text-[#52604d]">
          Delivery / meetup
          <div className="relative mt-1">
            <select
              value={delivery}
              onChange={(event) => setDelivery(event.target.value)}
              className="w-full appearance-none rounded-2xl border border-[#dfe8d7] bg-white px-4 py-3 pr-10 text-sm font-black text-[#203522] outline-none focus:border-[#8bc34a]"
            >
              {["Pickup / Meetup / Delivery", "Pickup only", "Meetup only", "Delivery available"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <ChevronRight size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#63705e]" />
          </div>
        </label>
      </div>

      <label className="mt-3 block text-xs font-black text-[#52604d]">
        Listing description
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-2xl border border-[#dfe8d7] bg-white px-4 py-3 text-sm font-semibold leading-5 text-[#203522] outline-none focus:border-[#8bc34a]" />
      </label>

      {scanResult?.careTips?.length > 0 && (
        <div className="mt-4 rounded-[1.4rem] bg-[#f7faf1] p-4 ring-1 ring-[#edf1e8]">
          <p className="font-black text-[#203522]">Leafy care notes</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {scanResult.careTips.map((tip) => (
              <span key={tip} className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#315d37] ring-1 ring-[#dfe8d7]">
                {tip}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-start justify-between gap-3 rounded-[1.4rem] border border-[#dfe8d7] bg-[#fbfdf7] p-4">
        <div className="min-w-0">
          <p className="font-black text-[#203522]">Marketplace fee</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-[#52604d]">No upfront fee. GrowMate only earns 10% after a successful sale.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <InfoButton title="Marketplace fee" detail="GrowMate charges 10% only after the item is sold." notify={notify} />
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#315d37]">10% sold</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
        <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={scanCapturedImage} />
        <button
          onClick={() => scanInputRef.current?.click()}
          className="gm-tap grid h-12 w-12 place-items-center rounded-full bg-[#edf7dc] text-[#315d37]"
          aria-label="Capture plant photo for Gemini scan"
          disabled={isScanning}
        >
          {isScanning ? <ScanLine size={18} className="animate-pulse" /> : <Camera size={18} />}
        </button>
        <button
          onClick={createListing}
          className={cn("gm-tap rounded-full px-4 py-3 text-sm font-black", isBlocked || isScanning || !scanResult ? "bg-[#f0f4e8] text-[#9aa690]" : "bg-[#203522] text-white")}
          disabled={isScanning || !scanResult}
        >
          {isScanning ? "Scanning plant..." : !scanResult ? "Scan plant first" : isReview ? "Send to review" : "Post to Market"}
        </button>
      </div>

      <div className="mt-4 rounded-[1.4rem] bg-[#f0f9eb] p-4 ring-1 ring-[#dfe8d7]">
        <p className="font-black text-[#203522]">Before posting</p>
        <div className="mt-3 space-y-2">
          {[
            scanResult ? "Plant verified by Plant.id" : "Capture a real plant photo first",
            scanResult ? (isReview ? "Human review required before publishing" : "Approved for Marketplace") : "No mock scan result will be used",
            "10% fee applies only after sale",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm font-semibold text-[#52604d]">
              <Check size={15} className="text-[#315d37]" /> {item}
            </div>
          ))}
        </div>
      </div>
      </div>
    </section>
    </div>
  );
}

function MarketView({ notify, openListing, myMarketListings, onOpenCreator }) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("Nearest");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const saleListings = [...myMarketListings.filter((item) => item.reviewStatus !== "Review"), ...marketPlants.filter((item) => item.type === "Buy")];
  const saleCategories = PLANT_CATEGORIES.filter((item) => saleListings.some((listing) => listing.category === item));
  const categories = ["All", ...saleCategories];
  const primaryCategories = ["All", "Indoor", "Outdoor", "Rare", "Flowering"].filter((item) => categories.includes(item));
  const filtersExpanded = showMoreFilters || !primaryCategories.includes(category);
  const visibleCategories = filtersExpanded ? categories : primaryCategories;
  const priceValue = (item) => Number(item.price.replace(/[^\d]/g, "")) || 0;
  const shown = saleListings
    .filter((item) => category === "All" || item.category === category)
    .filter((item) => [item.name, item.price, item.location, item.category, item.seller].join(" ").toLowerCase().includes(normalizedQuery))
    .sort((a, b) => {
      if (sortBy === "Price") return priceValue(a) - priceValue(b);
      if (sortBy === "Rating") return Number(b.rating) - Number(a.rating);
      if (sortBy === "Newest") return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      return a.location.localeCompare(b.location);
    });
  const featured = shown.find((item) => item.name === "Pechay Seedling Tray") ?? shown[0] ?? saleListings[0];

  return (
    <div className="px-5 pb-44">
      <div className="sticky top-0 z-10 -mx-5 bg-[#f5f8ef]/90 px-5 pb-3 pt-1 backdrop-blur">
        <div className="flex items-center gap-2 rounded-3xl bg-white px-4 py-3 shadow-sm">
          <Search size={18} className="text-[#89947f]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#89947f]"
            placeholder="Search plants, seeds, pots, supplies..."
          />
        </div>
        <div className="gm-x-scroll -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {visibleCategories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={cn(
                "gm-tap min-w-max rounded-full px-3 py-2 text-xs font-black transition",
                category === item ? "bg-[#d9f99d] text-[#203522]" : "bg-white text-[#63705e]"
              )}
            >
              {item}
            </button>
          ))}
          <button
            onClick={() => {
              if (filtersExpanded) {
                setShowMoreFilters(false);
                if (!primaryCategories.includes(category)) setCategory("All");
                return;
              }
              setShowMoreFilters(true);
            }}
            className="gm-tap min-w-max rounded-full bg-white px-3 py-2 text-xs font-black text-[#315d37] ring-1 ring-[#e4ecd8]"
          >
            {filtersExpanded ? "Less" : "More"}
          </button>
        </div>
        <div className="mt-3 flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm">
          <span className="text-xs font-black text-[#52604d]">Sort by</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="gm-tap rounded-full border border-[#dfe8d7] bg-[#f7faf1] px-3 py-2 text-xs font-black text-[#203522] outline-none"
            aria-label="Sort market listings"
          >
            {["Nearest", "Price", "Newest", "Rating"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="-mx-5 bg-[#f5f8ef] px-5 pb-3 pt-1">
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => onOpenCreator({ onListed: () => {
              setCategory("All");
              setSortBy("Newest");
              setShowMoreFilters(false);
            } })}
            className="gm-tap flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#203522] px-4 py-3 text-sm font-black text-white shadow-sm"
          >
            <Plus size={17} /> Sell Plant
          </button>
          <InfoButton title="Market rule" detail="Market is for cash sales. Use Feed for plant updates, questions, and care posts." notify={notify} />
        </div>
      </div>

      <section className="gm-card-in gm-tap mt-4 overflow-hidden rounded-[2rem] bg-white shadow-sm">
        <button onClick={() => openListing(featured)} className="block w-full text-left" aria-label={`Open ${featured.name}`}>
        <div className="relative h-44">
          <PlantImage src={featured.image} alt={featured.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <StatusPill tone="green">Featured deal</StatusPill>
            <h2 className="mt-2 text-2xl font-black leading-none">{featured.name}</h2>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xl font-black">{featured.price}</p>
              <p className="text-sm font-bold text-white/80">{featured.stock}</p>
            </div>
          </div>
        </div>
        </button>
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-black text-[#203522]">{featured.seller}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="flex items-center gap-1 text-xs font-bold text-[#7a8572]">
                  <MapPin size={12} /> {featured.location}
                </p>
                <span className="rounded-full bg-[#fff4db] px-2 py-0.5 text-xs font-black text-[#b45309]">{featured.rating} trust</span>
              </div>
            </div>
            <button
              onClick={() => openListing(featured)}
              className="gm-tap rounded-full bg-[#203522] px-4 py-2 text-xs font-black text-white"
            >
              View
            </button>
          </div>
        </div>
      </section>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-lg font-black text-[#203522]">Listings</h2>
        <p className="text-xs font-black text-[#7a8572]">{shown.length} found</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {shown.map((item) => (
          <article
            key={item.listingId ?? item.name}
            onClick={() => openListing(item)}
            className="gm-card-in gm-tap overflow-hidden rounded-[1.6rem] bg-white text-left shadow-sm"
          >
            <div className="relative">
              <PlantImage src={item.image} alt={item.name} className="h-32 w-full object-cover" />
              <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-xs font-black text-[#203522] shadow-sm">
                {item.category}
              </span>
            </div>
            <div className="p-3">
              <h3 className="min-h-10 text-sm font-black leading-tight text-[#203522]">{item.name}</h3>
              {item.aiName && item.aiName !== item.name && (
                <p className="mt-1 truncate text-xs font-bold text-[#7a8572]">AI: {item.aiName}</p>
              )}
              <p className="mt-2 text-lg font-black text-[#315d37]">{item.price}</p>
              <p className="mt-1 truncate text-xs font-bold text-[#52604d]">
                {item.location} - {item.rating} trust
              </p>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  openListing(item);
                }}
                className="gm-tap mt-3 w-full rounded-full bg-[#203522] px-3 py-2.5 text-xs font-black text-white"
              >
                Buy
              </button>
            </div>
          </article>
        ))}
      </div>
      {shown.length === 0 && (
        <div className="gm-card-in mt-4 rounded-[1.6rem] bg-white p-5 text-center shadow-sm">
          <p className="font-black text-[#203522]">No plants found</p>
          <p className="mt-1 text-sm font-semibold text-[#7a8572]">Try another search.</p>
        </div>
      )}
    </div>
  );
}

function GardenModeSwitch({ gardenMode, setGardenMode, setSelectedGarden }) {
  return (
    <div className="mb-4 flex gap-2 px-5">
      {[
        ["Mine", "My Garden"],
        ["Visit", "Explore"],
      ].map(([mode, label]) => (
        <button
          key={mode}
          onClick={() => {
            setGardenMode(mode);
            setSelectedGarden(null);
          }}
          className={cn(
            "gm-tap rounded-full px-4 py-2 text-sm font-black transition",
            gardenMode === mode ? "bg-[#203522] text-white" : "bg-white text-[#63705e]"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function GardenPhotoControls({ photos, currentIndex }) {
  if (photos.length <= 1) return null;

  return (
    <>
      <span className="pointer-events-none absolute left-4 top-4 z-30 rounded-full bg-black/45 px-3 py-1 text-xs font-black text-white">
        {currentIndex + 1}/{photos.length}
      </span>
    </>
  );
}

function PhotoLightbox({ photos, initialIndex = 0, title, subtitle, onClose }) {
  const safePhotos = photos?.length ? photos : [];
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, photos]);

  if (!safePhotos.length) return null;

  const currentIndex = ((index % safePhotos.length) + safePhotos.length) % safePhotos.length;
  const currentPhoto = safePhotos[currentIndex];
  const showPrevious = () => setIndex((value) => value - 1);
  const showNext = () => setIndex((value) => value + 1);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#132618]/92 p-3"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <section className="relative flex h-[calc(100dvh-1.5rem)] w-full max-w-[760px] flex-col overflow-hidden rounded-[2rem] bg-[#0f1f14] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between gap-3">
          <button onClick={onClose} className="gm-tap grid h-11 w-11 place-items-center rounded-full bg-white text-[#203522] shadow-sm" aria-label="Close photo">
            <ArrowLeft size={18} />
          </button>
          <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-black text-white">
            {currentIndex + 1}/{safePhotos.length}
          </span>
        </div>

        <div className="relative min-h-0 flex-1 bg-black">
          <div
            role="img"
            aria-label={title}
            className="h-full w-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${currentPhoto})` }}
          />
          {safePhotos.length > 1 && (
            <>
              <button onClick={showPrevious} className="gm-tap absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#203522]" aria-label="Previous cover photo">
                <ArrowLeft size={18} />
              </button>
              <button onClick={showNext} className="gm-tap absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#203522]" aria-label="Next cover photo">
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        <div className="bg-white px-5 py-4">
          <p className="text-lg font-black text-[#203522]">{title}</p>
          {subtitle && <p className="mt-1 text-sm font-semibold text-[#63705e]">{subtitle}</p>}
          {safePhotos.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {safePhotos.map((photo, photoIndex) => (
                <button
                  key={`${photo}-${photoIndex}`}
                  onClick={() => setIndex(photoIndex)}
                  className={cn("gm-tap h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-2", currentIndex === photoIndex ? "ring-[#8bc34a]" : "ring-transparent")}
                  aria-label={`Show cover photo ${photoIndex + 1}`}
                >
                  <PlantImage src={photo} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PublicGardenPlantDetail({ plant, garden, onClose }) {
  const photos = plant.photos ?? [
    plant.image,
    garden.cover,
    ...(garden.coverPhotos ?? []).filter((photo) => photo !== plant.image).slice(0, 3),
  ];
  const [photoIndex, setPhotoIndex] = useState(0);
  const currentPhoto = photos[photoIndex % photos.length];
  const plantAge = plant.tag === "Veggies" ? "2 months" : plant.tag === "Cuttings" ? "6 weeks" : "9 months";
  const status = plant.tag === "Veggies" ? "Harvesting" : plant.tag === "Cuttings" ? "Propagating" : "Thriving";
  const care =
    plant.tag === "Veggies"
      ? ["Morning sun", "Water daily", "Compost monthly"]
      : plant.tag === "Cuttings"
        ? ["Bright shade", "Keep humid", "Root check weekly"]
        : ["Bright indirect light", "Water when top soil dries", "Rotate weekly"];
  const updates =
    plant.tag === "Veggies"
      ? ["New flowers spotted", "Organic compost added", "Shared harvest update"]
      : plant.tag === "Cuttings"
        ? ["Root growth checked", "Humidity dome opened", "New leaf emerging"]
        : ["New leaf unfurled", "Moved closer to morning light", "Leaf cleaned and checked"];

  return (
    <div className="fixed inset-0 z-[55] flex justify-center bg-[#203522]/45 sm:items-center sm:py-6">
      <section className="gm-sheet-in flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-white shadow-2xl sm:h-[880px] sm:rounded-[2rem] md:max-w-[620px]">
        <div className="relative h-[34dvh] min-h-[260px] max-h-[340px] shrink-0 bg-[#203522]">
          <PlantImage src={currentPhoto} alt={plant.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/35" />
          <button onClick={onClose} className="gm-tap absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-[#203522] shadow-sm" aria-label="Close plant details">
            <ArrowLeft size={18} />
          </button>
          <span className="absolute bottom-4 right-4 rounded-full bg-black/55 px-3 py-1 text-xs font-black text-white">{photoIndex + 1}/{photos.length}</span>
          {photos.length > 1 && (
            <>
              <button onClick={() => setPhotoIndex((index) => (index - 1 + photos.length) % photos.length)} className="gm-tap absolute left-4 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[#203522]" aria-label="Previous plant photo">
                <ArrowLeft size={16} />
              </button>
              <button onClick={() => setPhotoIndex((index) => (index + 1) % photos.length)} className="gm-tap absolute right-4 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[#203522]" aria-label="Next plant photo">
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#8bc34a]">{garden.owner}'s plant</p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-[#203522]">{plant.name}</h2>
              <p className="mt-1 text-sm font-semibold text-[#52604d]">{garden.name} - {garden.location}</p>
            </div>
            <StatusPill tone={plant.tag === "Veggies" ? "green" : plant.tag === "Cuttings" ? "blue" : "amber"}>{plant.tag}</StatusPill>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x-2 divide-[#dfe8d7] rounded-[1.5rem] bg-[#f7faf1] p-3 text-center">
            {[
              [status, "Status"],
              [plantAge, "Age"],
              [photos.length, "Photos"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-sm font-black text-[#203522]">{value}</p>
                <p className="text-xs font-bold text-[#52604d]">{label}</p>
              </div>
            ))}
          </div>

          <section className="mt-5">
            <h3 className="text-sm font-black text-[#203522]">Photos</h3>
            <div className="gm-x-scroll mt-3 flex gap-2 overflow-x-auto pb-1">
              {photos.map((photo, index) => (
                <button
                  key={`${photo}-${index}`}
                  onClick={() => setPhotoIndex(index)}
                  className={cn("gm-tap h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-2", photoIndex === index ? "ring-[#8bc34a]" : "ring-transparent")}
                >
                  <PlantImage src={photo} alt={`${plant.name} ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </section>

          <section className="mt-5">
            <h3 className="text-sm font-black text-[#203522]">Care details</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {care.map((item) => (
                <div key={item} className="rounded-2xl bg-[#f7faf1] px-3 py-3 text-xs font-black text-[#315d37]">{item}</div>
              ))}
            </div>
          </section>

          <section className="mt-5">
            <h3 className="text-sm font-black text-[#203522]">Recent updates</h3>
            <div className="mt-3 space-y-2">
              {updates.map((update, index) => (
                <div key={update} className="flex items-center gap-3 rounded-2xl bg-[#fbfdf7] p-3 ring-1 ring-[#edf1e8]">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#edf7dc] text-xs font-black text-[#315d37]">{index + 1}</span>
                  <p className="text-sm font-semibold text-[#52604d]">{update}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function VisitGardensView({ selectedGarden, setSelectedGarden, notify, openMessages }) {
  const [followedGardens, setFollowedGardens] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedPublicPlant, setSelectedPublicPlant] = useState(null);
  const [gardenSearch, setGardenSearch] = useState("");
  const [coverIndex, setCoverIndex] = useState(0);
  const [coverLightboxOpen, setCoverLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const normalizedGardenSearch = gardenSearch.trim().toLowerCase();
  const shownCommunityGardens = communityGardens.filter((garden) => {
    if (!normalizedGardenSearch) return true;
    return [
      garden.owner,
      garden.handle,
      garden.name,
      garden.location,
      garden.bio,
      ...(garden.plants ?? []).map((plant) => `${plant.name} ${plant.tag}`),
    ].join(" ").toLowerCase().includes(normalizedGardenSearch);
  });

  useEffect(() => {
    setCoverIndex(0);
    setCoverLightboxOpen(false);
    setSelectedPublicPlant(null);
  }, [selectedGarden?.id]);

  if (selectedGarden) {
    const isFollowing = followedGardens.includes(selectedGarden.id);
    const gardenListings = marketPlants.filter((item) => item.seller === selectedGarden.owner);
    const marketplaceListings = gardenListings.filter((item) => item.type === "Buy");
    const coverPhotos = selectedGarden.coverPhotos ?? [selectedGarden.cover];
    const currentCoverIndex = Math.min(coverIndex, coverPhotos.length - 1);
    const currentCover = coverPhotos[currentCoverIndex];
    const openPhoto = (title, detail, image) => {
      setPhotoPreview({ title, detail, image });
    };
    const handleCoverSwipe = (event) => {
      if (touchStart === null || coverPhotos.length <= 1) return;
      const delta = touchStart - event.changedTouches[0].clientX;
      if (Math.abs(delta) > 35) {
        setCoverIndex((index) => (delta > 0 ? index + 1 : index - 1 + coverPhotos.length) % coverPhotos.length);
      }
      setTouchStart(null);
    };
    const renderListingCards = (items, emptyText) => (
      items.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <article key={item.name} className="gm-card-in gm-tap overflow-hidden rounded-[1.4rem] bg-white shadow-sm">
              <PlantImage src={item.image} alt={item.name} className="h-28 w-full object-cover" />
              <div className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="green">{item.price}</StatusPill>
                  <p className="text-xs font-black text-[#7a8572]">{item.stock}</p>
                </div>
                <h4 className="mt-2 min-h-10 text-sm font-black leading-tight text-[#203522]">{item.name}</h4>
                <p className="mt-1 text-xs font-bold text-[#7a8572]">{item.category}</p>
                <button
                  onClick={() =>
                    notify("Marketplace listing opened", `${item.name} from ${selectedGarden.owner} is available in ${item.location}.`)
                  }
                  className="gm-tap mt-3 min-h-10 w-full rounded-full bg-[#203522] px-3 py-2 text-xs font-black text-white"
                >
                  View listing
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-[1.4rem] bg-white p-4 text-sm font-semibold text-[#73806c] shadow-sm">{emptyText}</div>
      )
    );

    return (
      <div className="px-5 pb-52">
        <button
          onClick={() => setSelectedGarden(null)}
          className="gm-tap mb-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#63705e] shadow-sm"
        >
          <ArrowLeft size={16} /> Gardens
        </button>

        <section className="gm-card-in overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div
            className="relative h-52"
            onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
            onTouchEnd={handleCoverSwipe}
            >
              <button
              onClick={() => setCoverLightboxOpen(true)}
              className="gm-tap absolute inset-0 block w-full text-left"
              aria-label={`Open ${selectedGarden.name} cover photo`}
            >
              <PlantImage src={currentCover} alt="" className="h-full w-full object-cover" />
            </button>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <GardenPhotoControls photos={coverPhotos} currentIndex={currentCoverIndex} />
            <div className="pointer-events-none absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-end gap-3">
                <button
                  onClick={() => openPhoto(selectedGarden.owner, `${selectedGarden.owner}'s profile photo.`, selectedGarden.avatar)}
                  className="gm-tap pointer-events-auto relative h-16 w-16 shrink-0 overflow-hidden rounded-[1.4rem] border-2 border-white shadow-lg"
                  aria-label={`Open ${selectedGarden.owner} profile photo`}
                >
                  <AvatarImage
                    src={selectedGarden.avatar}
                    alt={`${selectedGarden.owner} profile`}
                    className="h-full w-full object-cover"
                  />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-white/75">{selectedGarden.owner}</p>
                  <h2 className="mt-1 text-3xl font-black leading-none">{selectedGarden.name}</h2>
                  <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-white/85">
                    <MapPin size={14} /> {selectedGarden.location}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x-2 divide-[#c8d4c0] p-4 text-center">
            {[
              [selectedGarden.score, "Score"],
              [selectedGarden.followers, "Followers"],
              [selectedGarden.rank, "Rank"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="font-black text-[#203522]">{value}</p>
                <p className="text-xs font-bold text-[#7a8572]">{label}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-[#edf1e8] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black text-[#203522]">{selectedGarden.owner}</p>
                <p className="text-sm font-bold text-[#7a8572]">{selectedGarden.handle}</p>
              </div>
              <StatusPill tone="green">Verified gardener</StatusPill>
            </div>
            <p className="text-sm font-semibold leading-6 text-[#63705e]">{selectedGarden.bio}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedGarden.badges.map((badge) => (
                <StatusPill key={badge} tone="amber">{badge}</StatusPill>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setFollowedGardens((items) =>
                    items.includes(selectedGarden.id) ? items.filter((item) => item !== selectedGarden.id) : [...items, selectedGarden.id]
                  );
                  notify(isFollowing ? "Garden unfollowed" : "Garden followed", `${selectedGarden.name} ${isFollowing ? "was removed from" : "is now in"} your visited gardens.`);
                }}
                className="gm-tap rounded-full bg-[#203522] px-4 py-3 text-sm font-black text-white"
              >
                {isFollowing ? "Following" : "Follow garden"}
              </button>
              <button
                onClick={() => openMessages(selectedGarden.owner)}
                className="gm-tap rounded-full bg-[#edf7dc] px-4 py-3 text-sm font-black text-[#315d37]"
              >
                Message
              </button>
            </div>
          </div>
        </section>

        {coverLightboxOpen && (
          <PhotoLightbox
            photos={coverPhotos}
            initialIndex={currentCoverIndex}
            title={selectedGarden.name}
            subtitle={`${selectedGarden.owner} - ${selectedGarden.location}`}
            onClose={() => setCoverLightboxOpen(false)}
          />
        )}

        {photoPreview && (
          <section className="gm-sheet-in mt-4 overflow-hidden rounded-[1.7rem] bg-white shadow-sm">
            <PlantImage src={photoPreview.image} alt={photoPreview.title} className="h-56 w-full object-cover" />
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-black text-[#203522]">{photoPreview.title}</p>
                <p className="mt-1 text-sm font-semibold text-[#7a8572]">{photoPreview.detail}</p>
              </div>
              <button
                onClick={() => setPhotoPreview(null)}
                className="gm-tap rounded-full bg-[#f0f4e8] px-3 py-2 text-xs font-black text-[#63705e]"
              >
                Close
              </button>
            </div>
          </section>
        )}

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-black text-[#203522]">Marketplace listings</h3>
            <StatusPill tone="green">{marketplaceListings.length} active</StatusPill>
          </div>
          {renderListingCards(marketplaceListings, `${selectedGarden.owner} has no marketplace listings right now.`)}
        </section>

        <h3 className="mt-5 text-lg font-black text-[#203522]">Garden plants</h3>
        <div className="mt-3 grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {selectedGarden.plants.map((plant) => (
            <button
              key={plant.name}
              onClick={() => setSelectedPublicPlant(plant)}
              className="group gm-tap overflow-hidden rounded-[1.3rem] bg-white text-left shadow-sm transition hover:shadow-[0_12px_28px_rgba(37,61,41,0.16)]"
            >
              <div className="relative">
                <PlantImage src={plant.image} alt={plant.name} className="h-24 w-full object-cover transition duration-500 group-hover:scale-110" />
              </div>
              <div className="p-2">
                <p className="line-clamp-2 min-h-9 text-xs font-black leading-tight text-[#203522]">{plant.name}</p>
                <p className="mt-1 text-xs font-bold text-[#7a8572]">{plant.tag}</p>
              </div>
            </button>
          ))}
        </div>
        {selectedPublicPlant && (
          <PublicGardenPlantDetail plant={selectedPublicPlant} garden={selectedGarden} onClose={() => setSelectedPublicPlant(null)} />
        )}
      </div>
    );
  }

  return (
    <div className="px-5 pb-44">
      <div className="sticky top-0 z-10 -mx-5 bg-[#f5f8ef]/90 px-5 pb-3 pt-1 backdrop-blur">
        <div className="flex items-center gap-2 rounded-3xl bg-white px-4 py-3 shadow-sm">
          <Search size={18} className="text-[#89947f]" />
          <input
            value={gardenSearch}
            onChange={(event) => setGardenSearch(event.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-[#203522] outline-none placeholder:text-[#89947f]"
            placeholder="Search people, gardens, locations, plants..."
          />
        </div>
        <p className="mt-2 px-1 text-xs font-black text-[#7a8572]">{shownCommunityGardens.length} gardens found</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {shownCommunityGardens.map((garden) => (
        <button
          key={garden.id}
          onClick={() => setSelectedGarden(garden)}
          className="group gm-card-in gm-tap w-full overflow-hidden rounded-[1.8rem] bg-white text-left shadow-sm transition hover:shadow-[0_18px_42px_rgba(37,61,41,0.18)]"
        >
          <div className="relative h-36">
            <PlantImage src={(garden.coverPhotos ?? [garden.cover])[0]} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent transition duration-300 group-hover:from-black/90" />
            <span className="absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1 text-xs font-black text-white">
              1/{(garden.coverPhotos ?? [garden.cover]).length}
            </span>
            <div className="absolute bottom-3 left-3 right-16 flex items-end gap-3 text-white">
              <AvatarImage
                src={garden.avatar}
                alt={`${garden.owner} profile`}
                className="h-12 w-12 shrink-0 rounded-2xl border-2 border-white object-cover shadow-lg"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-black uppercase tracking-[0.12em] text-white/75">{garden.owner}</p>
                <p className="truncate text-2xl font-black">{garden.name}</p>
              </div>
            </div>
            <span className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black text-[#203522]">
              {garden.rank}
            </span>
          </div>
          <div className="p-4">
            <p className="text-sm font-semibold leading-6 text-[#63705e]">{garden.bio}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs font-black text-[#315d37]">{garden.score} garden score</span>
              <span className="inline-flex items-center gap-1 text-xs font-black text-[#7a8572]">
                Visit <ChevronRight size={14} className="transition group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </button>
      ))}
      </div>
      {shownCommunityGardens.length === 0 && (
        <div className="gm-card-in mt-4 rounded-[1.6rem] bg-white p-5 text-center shadow-sm">
          <p className="font-black text-[#203522]">No gardens found</p>
          <p className="mt-1 text-sm font-semibold text-[#7a8572]">Try another name, place, or plant.</p>
        </div>
      )}
    </div>
  );
}

function GardenView({ notify, gardenMode, setGardenMode, selectedGarden, setSelectedGarden, openMessages }) {
  const initialGardenPlants = useMemo(() => collection.map(withPhotoGallery), []);
  const [gardenPlants, setGardenPlants] = useState(initialGardenPlants);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [gardenCovers, setGardenCovers] = useState([plantPhotos.fern, plantPhotos.monstera, plantPhotos.alocasia, plantPhotos.hoya, plantPhotos.calamansi]);
  const [gardenCoverIndex, setGardenCoverIndex] = useState(0);
  const [gardenCategory, setGardenCategory] = useState("All");
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [showGardenPhotoPicker, setShowGardenPhotoPicker] = useState(false);
  const [showPlantPhotoPicker, setShowPlantPhotoPicker] = useState(false);
  const [showPlantEditor, setShowPlantEditor] = useState(false);
  const [coverLightboxOpen, setCoverLightboxOpen] = useState(false);
  const gardenPointerStart = useRef(null);
  const gardenPointerSwiped = useRef(false);

  const updateGardenCover = (image, label) => {
    setGardenCovers((covers) => {
      const nextCovers = covers.includes(image) ? covers : [image, ...covers].slice(0, 5);
      setGardenCoverIndex(nextCovers.indexOf(image));
      return nextCovers;
    });
    setShowGardenPhotoPicker(false);
    notify("Garden photo changed", `${label} is now the cover photo for Laarne Ramos' garden.`);
  };

  const shownGardenPlants = gardenCategory === "All" ? gardenPlants : gardenPlants.filter((plant) => plant.category === gardenCategory);
  const currentGardenCoverIndex = Math.min(gardenCoverIndex, gardenCovers.length - 1);
  const currentGardenCover = gardenCovers[currentGardenCoverIndex];
  const handleGardenCoverPointerEnd = (clientX) => {
    if (gardenPointerStart.current === null || gardenCovers.length <= 1) return;
    const delta = gardenPointerStart.current - clientX;
    if (Math.abs(delta) > 35) {
      setGardenCoverIndex((index) => (delta > 0 ? index + 1 : index - 1 + gardenCovers.length) % gardenCovers.length);
      gardenPointerSwiped.current = true;
    }
    gardenPointerStart.current = null;
  };

  const updateSelectedPlantPhoto = (image, label) => {
    if (!selectedPlant) {
      notify("Select a plant first", "Tap a plant card before adding photos.");
      return;
    }

    const photoCount = selectedPlant.photos?.length ?? 1;
    if (photoCount >= 5) {
      setShowPlantPhotoPicker(false);
      notify("Photo limit reached", `${selectedPlant.nickname} already has 5 photos. Remove one before adding another.`);
      return;
    }

    const updatePlant = (plant) => {
      const photos = [...(plant.photos ?? [plant.image]), image];
      return { ...plant, image: photos[0], photos };
    };

    setGardenPlants((plants) => plants.map((plant) => (plant.id === selectedPlant.id ? updatePlant(plant) : plant)));
    setSelectedPlant((plant) => (plant ? updatePlant(plant) : plant));
    setShowPlantPhotoPicker(false);
    notify("Plant photo added", `${label} was added to ${selectedPlant.nickname}'s photo gallery.`);
  };

  const updateSelectedPlantField = (field, value) => {
    if (!selectedPlant) return;

    const updatedPlant = { ...selectedPlant, [field]: value };
    setSelectedPlant(updatedPlant);
    setGardenPlants((plants) => plants.map((plant) => (plant.id === selectedPlant.id ? updatedPlant : plant)));
  };

  const addPlant = () => {
    const nextPlant = {
      id: Date.now(),
      name: "Staghorn Fern",
      nickname: "Crown",
      image: plantPhotos.fern,
      photos: [plantPhotos.fern],
      status: "New",
      tag: "Mounted",
      category: "Outdoor",
      availability: "Growing in garden",
      likes: 0,
      age: "1w",
      updates: ["Added to My Garden", "Needs bright indirect light", "Mounted care reminder created"],
    };
    setGardenPlants((plants) => [nextPlant, ...plants]);
    setSelectedPlant(nextPlant);
    setShowAddPlant(false);
    notify("Plant added", "Staghorn Fern was added to your My Garden showcase.");
  };

  if (gardenMode === "Visit") {
    return (
      <>
        {!selectedGarden && <GardenModeSwitch gardenMode={gardenMode} setGardenMode={setGardenMode} setSelectedGarden={setSelectedGarden} />}
        <VisitGardensView selectedGarden={selectedGarden} setSelectedGarden={setSelectedGarden} notify={notify} openMessages={openMessages} />
      </>
    );
  }

  return (
    <div className="px-5 pb-44">
      <div className="-mx-5">
        <GardenModeSwitch gardenMode={gardenMode} setGardenMode={setGardenMode} setSelectedGarden={setSelectedGarden} />
      </div>
      <section className="group gm-card-in select-none overflow-hidden rounded-[2rem] bg-white shadow-sm outline-none transition hover:shadow-[0_18px_42px_rgba(37,61,41,0.18)]">
        <div className="relative h-44">
          <PlantImage src={currentGardenCover} alt="" className="h-full w-full object-cover" />
          <button
            onClick={() => {
              if (gardenPointerSwiped.current) {
                gardenPointerSwiped.current = false;
                return;
              }
              setCoverLightboxOpen(true);
            }}
            onPointerDown={(event) => {
              gardenPointerStart.current = event.clientX;
              gardenPointerSwiped.current = false;
            }}
            onPointerUp={(event) => handleGardenCoverPointerEnd(event.clientX)}
            onPointerCancel={() => {
              gardenPointerStart.current = null;
            }}
            className="gm-tap absolute inset-0 z-10 block cursor-zoom-in text-left outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#d9f99d]"
            aria-label="Open garden cover photo"
          />
          <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/95 via-black/45 to-transparent" />
          <button
            onClick={(event) => {
              event.stopPropagation();
              setShowGardenPhotoPicker((value) => !value);
            }}
            className="gm-tap absolute right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-2xl bg-white/90 text-[#203522]"
            aria-label="Change garden photo"
          >
            <Camera size={18} />
          </button>
          {gardenCovers.length > 1 && (
            <>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setGardenCoverIndex((index) => (index - 1 + gardenCovers.length) % gardenCovers.length);
                }}
                className="gm-tap absolute left-4 top-1/2 z-30 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[#203522] shadow-sm"
                aria-label="Previous garden cover photo"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setGardenCoverIndex((index) => (index + 1) % gardenCovers.length);
                }}
                className="gm-tap absolute right-4 top-1/2 z-30 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[#203522] shadow-sm"
                aria-label="Next garden cover photo"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
          <GardenPhotoControls photos={gardenCovers} currentIndex={currentGardenCoverIndex} />
          <div className="pointer-events-none absolute bottom-5 left-5 right-5 z-30 text-white">
            <p className="text-2xl font-black">My Plant Collection</p>
            <p className="mt-1 text-sm font-semibold text-white/85">42 plants - 38 updates - Rank #2</p>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x-2 divide-[#c8d4c0] p-4 text-center">
          {[
            ["9.1k", "Garden score"],
            ["284", "Top likes"],
            ["38", "Updates"],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="font-black text-[#203522]">{value}</p>
              <p className="text-xs font-bold text-[#7a8572]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {coverLightboxOpen && (
        <PhotoLightbox
          photos={gardenCovers}
          initialIndex={currentGardenCoverIndex}
          title="My Plant Collection"
          subtitle="Laarne Ramos' garden cover photos"
          onClose={() => setCoverLightboxOpen(false)}
        />
      )}

      {showGardenPhotoPicker && (
        <PhotoPicker
          title="Change garden photo"
          detail="Scan a real garden cover photo."
          onSelect={updateGardenCover}
          onCancel={() => setShowGardenPhotoPicker(false)}
        />
      )}

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-lg font-black text-[#203522]">Plant collection</h2>
      </div>

      <div className="gm-x-scroll -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {MARKET_CATEGORY_FILTERS.map((category) => (
          <button
            key={category}
            onClick={() => setGardenCategory(category)}
            className={cn(
              "gm-tap min-w-max rounded-full px-3 py-2 text-xs font-black transition",
              gardenCategory === category ? "bg-[#203522] text-white" : "bg-white text-[#63705e]"
            )}
          >
            {category}
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowAddPlant((value) => !value)}
        className="gm-tap mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#edf7dc] px-5 py-3 text-sm font-black text-[#315d37] shadow-sm"
      >
        <Plus size={16} /> Add plant
      </button>

      {showAddPlant && (
        <section className="gm-sheet-in mt-3 rounded-[1.6rem] bg-white p-4 shadow-sm">
          <p className="font-black text-[#203522]">Add plant to My Garden</p>
          <p className="mt-1 text-sm font-semibold text-[#73806c]">Scan a real plant to prove it is yours.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={addPlant} className="gm-tap rounded-full bg-[#203522] px-4 py-3 text-sm font-black text-white">
              Scan plant
            </button>
            <button onClick={() => setShowAddPlant(false)} className="gm-tap rounded-full bg-[#edf7dc] px-4 py-3 text-sm font-black text-[#315d37]">
              Cancel
            </button>
          </div>
        </section>
      )}

      {selectedPlant && (
        <section key={selectedPlant.id} className="gm-sheet-in mt-3 rounded-[1.7rem] bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex shrink-0 items-center gap-2">
              <PlantImage src={selectedPlant.image} alt="" className="h-20 w-20 rounded-3xl object-cover" />
              <div className="grid gap-2">
                <button
                  onClick={() => {
                    setShowPlantEditor(false);
                    setShowPlantPhotoPicker((value) => !value);
                  }}
                  className="gm-tap grid h-10 w-10 place-items-center rounded-2xl bg-[#203522] text-white shadow-sm"
                  aria-label="Change plant photo"
                >
                  <Camera size={16} />
                </button>
                <button
                  onClick={() => {
                    setShowPlantPhotoPicker(false);
                    setShowPlantEditor((value) => !value);
                  }}
                  className="gm-tap grid h-10 w-10 place-items-center rounded-2xl bg-[#edf7dc] text-[#315d37] shadow-sm"
                  aria-label="Edit plant details"
                >
                  <Pencil size={16} />
                </button>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black leading-tight text-[#203522]">{selectedPlant.name}</p>
              <p className="mt-1 text-sm font-semibold text-[#73806c]">
                {selectedPlant.nickname} - {selectedPlant.age} - {selectedPlant.availability}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusPill>{selectedPlant.category}</StatusPill>
                <StatusPill tone="amber">{selectedPlant.tag}</StatusPill>
                <StatusPill tone="blue">{selectedPlant.status}</StatusPill>
              </div>
            </div>
          </div>
          {showPlantEditor && (
            <div className="gm-sheet-in mt-4 rounded-[1.4rem] bg-[#f7faf1] p-3 ring-1 ring-[#edf1e8]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-black text-[#203522]">Edit plant details</p>
                <button
                  onClick={() => {
                    setShowPlantEditor(false);
                    notify("Plant updated", `${selectedPlant.nickname}'s details were saved.`);
                  }}
                  className="gm-tap rounded-full bg-[#203522] px-3 py-1.5 text-xs font-black text-white"
                >
                  Done
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={selectedPlant.nickname}
                  onChange={(event) => updateSelectedPlantField("nickname", event.target.value)}
                  className="min-w-0 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-[#203522] outline-none ring-1 ring-[#edf1e8]"
                  aria-label="Plant nickname"
                />
                <select
                  value={selectedPlant.status}
                  onChange={(event) => updateSelectedPlantField("status", event.target.value)}
                  className="min-w-0 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-[#203522] outline-none ring-1 ring-[#edf1e8]"
                  aria-label="Plant status"
                >
                  {["Thriving", "Growing", "Flowering", "Propagating", "Recovering", "Harvesting", "New"].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
                <select
                  value={selectedPlant.category}
                  onChange={(event) => updateSelectedPlantField("category", event.target.value)}
                  className="min-w-0 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-[#203522] outline-none ring-1 ring-[#edf1e8]"
                  aria-label="Plant category"
                >
                  {PLANT_CATEGORIES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <input
                  value={selectedPlant.availability}
                  onChange={(event) => updateSelectedPlantField("availability", event.target.value)}
                  className="min-w-0 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-[#203522] outline-none ring-1 ring-[#edf1e8]"
                  aria-label="Plant availability"
                />
              </div>
            </div>
          )}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-black text-[#203522]">Photos</p>
              <p className="text-xs font-bold text-[#7a8572]">{selectedPlant.photos?.length ?? 1}/5</p>
            </div>
            <div className="gm-x-scroll flex snap-x gap-3 overflow-x-auto pb-2">
              {(selectedPlant.photos ?? [selectedPlant.image]).map((photo, index) => (
                <button
                  key={`${photo}-${index}`}
                  onClick={() => {
                    setGardenPlants((plants) =>
                      plants.map((plant) => (plant.id === selectedPlant.id ? { ...plant, image: photo } : plant))
                    );
                    setSelectedPlant((plant) => ({ ...plant, image: photo }));
                  }}
                  className={cn(
                    "gm-tap h-24 w-24 shrink-0 snap-start overflow-hidden rounded-3xl ring-2 transition",
                    selectedPlant.image === photo ? "ring-[#8bc34a]" : "ring-transparent"
                  )}
                >
                  <PlantImage src={photo} alt={`${selectedPlant.name} photo ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
              <button
                onClick={() => {
                  if ((selectedPlant.photos?.length ?? 1) >= 5) {
                    notify("Photo limit reached", `${selectedPlant.nickname} already has 5 photos.`);
                    return;
                  }
                  setShowPlantPhotoPicker(true);
                }}
                className="gm-tap grid h-24 w-24 shrink-0 snap-start place-items-center rounded-3xl border-2 border-dashed border-[#c9d8bd] bg-[#f7faf1] text-[#315d37]"
              >
                <span className="grid place-items-center gap-1 text-xs font-black">
                  <Plus size={18} /> Add
                </span>
              </button>
            </div>
          </div>
          {showPlantPhotoPicker && (
            <PhotoPicker
              title={`Add ${selectedPlant.nickname}'s photo`}
              detail="Scan up to 5 real plant photos."
              onSelect={updateSelectedPlantPhoto}
              onCancel={() => setShowPlantPhotoPicker(false)}
            />
          )}
          <div className="mt-4 space-y-3">
            {selectedPlant.updates.map((update, index) => (
              <div key={update} className="flex gap-3">
                <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#edf7dc] text-xs font-black text-[#315d37]">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold text-[#63705e]">{update}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {shownGardenPlants.map((plant) => (
          <button
            key={plant.id}
            onClick={() => {
              setShowPlantPhotoPicker(false);
              setShowPlantEditor(false);
              setSelectedPlant((current) => (current?.id === plant.id ? null : plant));
            }}
            className={cn(
              "gm-card-in gm-tap overflow-hidden rounded-[1.5rem] bg-white text-left shadow-sm ring-2 transition",
              selectedPlant?.id === plant.id ? "ring-[#8bc34a]" : "ring-transparent"
            )}
          >
            <PlantImage src={plant.image} alt={plant.name} className="h-32 w-full object-cover" />
            <div className="p-3">
              <p className="text-xs font-bold text-[#7a8572]">{plant.nickname}</p>
              <p className="mt-1 line-clamp-2 min-h-10 text-sm font-black leading-tight text-[#203522]">{plant.name}</p>
              <div className="mt-2 flex items-center justify-between">
                <StatusPill tone={plant.status === "Recovering" ? "amber" : "green"}>{plant.category}</StatusPill>
                <span
                  onClick={(event) => {
                    event.stopPropagation();
                    setGardenPlants((plants) => plants.map((item) => (item.id === plant.id ? { ...item, likes: item.likes + 1 } : item)));
                    setSelectedPlant((item) => (item?.id === plant.id ? { ...item, likes: item.likes + 1 } : item));
                    notify("Plant admired", `${plant.nickname} received a new heart.`);
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-[#7a8572]"
                >
                  <Heart size={13} /> {plant.likes}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FeedView({ notify, openMessages, openGarden, openLeafy }) {
  const [feedFilter, setFeedFilter] = useState("All");
  const [userPosts, setUserPosts] = useState([]);
  const [showComposer, setShowComposer] = useState(false);
  const [composerType, setComposerType] = useState("Updates");
  const [composerTitle, setComposerTitle] = useState("");
  const [composerText, setComposerText] = useState("");
  const [composerImage, setComposerImage] = useState(plantPhotos.monstera);
  const [likedPosts, setLikedPosts] = useState({});
  const [activeComments, setActiveComments] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [postComments, setPostComments] = useState(() =>
    feedPosts.reduce((items, post) => {
      items[post.id] = [];
      return items;
    }, {})
  );
  const filters = ["All", "Updates", "Questions", "Harvests", "Tips"];
  const allFeedPosts = [...userPosts, ...feedPosts];
  const visiblePosts = allFeedPosts.filter((post) => {
    if (feedFilter === "All") return true;
    return post.type === feedFilter;
  });
  const getLikeCount = (post) => post.likes + (likedPosts[post.id] ? 1 : 0);
  const getCommentCount = (post) => post.comments + (postComments[post.id]?.length ?? 0);
  const toggleLike = (post) => {
    setLikedPosts((items) => ({ ...items, [post.id]: !items[post.id] }));
  };
  const submitComment = (post) => {
    const text = commentDraft.trim();
    if (!text) return;
    setPostComments((items) => ({
      ...items,
      [post.id]: [...(items[post.id] ?? []), text],
    }));
    setCommentDraft("");
  };
  const openComposer = (type = "Updates") => {
    setComposerType(type);
    setShowComposer(true);
  };
  const submitPost = () => {
    const title = composerTitle.trim();
    const text = composerText.trim();
    if (!title && !text) {
      notify("Post needs text", "Write a title or update before posting.");
      return;
    }

    const id = `feed-user-${Date.now()}`;
    setUserPosts((posts) => [
      {
        id,
        author: "Laarne Ramos",
        avatar: "/laarne-profile.png",
        type: composerType,
        title: title || (composerType === "Questions" ? "Plant question" : "Garden update"),
        text: text || "Shared from My Plant Collection.",
        image: composerImage,
        meta: "Butuan City - now",
        likes: 0,
        comments: 0,
        mockComments: [],
      },
      ...posts,
    ]);
    setPostComments((items) => ({ ...items, [id]: [] }));
    setComposerTitle("");
    setComposerText("");
    setComposerImage(plantPhotos.monstera);
    setShowComposer(false);
    setFeedFilter("All");
  };

  return (
    <div className="space-y-4 px-5 pb-52">
      <section className="gm-card-in rounded-[1.7rem] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <AvatarImage src="/laarne-profile.png" alt="Laarne Ramos profile" className="h-12 w-12 rounded-2xl object-cover" />
          <button
            onClick={() => openComposer("Updates")}
            className="gm-tap min-h-12 flex-1 rounded-full bg-[#f7faf1] px-4 text-left text-sm font-bold text-[#63705e] ring-1 ring-[#edf1e8]"
          >
            Share with the plant community...
          </button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            [Camera, "Photo", "Updates", plantPhotos.monstera],
            [MessageCircle, "Question", "Questions", plantPhotos.calathea],
            [null, "Ask Leafy", "Tips", plantPhotos.anthurium],
            [Leaf, "Update", "Updates", plantPhotos.fern],
          ].map(([Icon, label]) => (
            <button
              key={label}
              onClick={() => {
                if (label === "Ask Leafy") {
                  openLeafy?.("My plant has yellow leaves. What should I check first?");
                  return;
                }
                openComposer(label === "Photo" ? "Updates" : label === "Question" ? "Questions" : "Updates");
              }}
              className="gm-tap flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#edf7dc] px-3 py-2 text-xs font-black text-[#315d37]"
            >
              {label === "Ask Leafy" ? (
                <img src={leafyLogo} alt="" className="h-5 w-5 rounded-full object-cover" />
              ) : (
                <Icon size={15} />
              )}
              {label}
            </button>
          ))}
        </div>
        {showComposer && (
          <div className="gm-sheet-in mt-4 rounded-[1.4rem] bg-[#f7faf1] p-3 ring-1 ring-[#edf1e8]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-black text-[#203522]">Create post</p>
              <button onClick={() => setShowComposer(false)} className="gm-tap rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#63705e]">
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={composerType}
                onChange={(event) => setComposerType(event.target.value)}
                className="rounded-2xl bg-white px-3 py-3 text-sm font-black text-[#203522] outline-none ring-1 ring-[#edf1e8]"
              >
                {["Updates", "Questions", "Harvests", "Tips"].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
              <select
                value={composerImage}
                onChange={(event) => setComposerImage(event.target.value)}
                className="rounded-2xl bg-white px-3 py-3 text-sm font-black text-[#203522] outline-none ring-1 ring-[#edf1e8]"
              >
                {[
                  ["Monstera", plantPhotos.monstera],
                  ["Calathea", plantPhotos.calathea],
                  ["Herbs", plantPhotos.herb],
                  ["Pechay", plantPhotos.pechay],
                  ["Orchid", plantPhotos.orchid],
                ].map(([label, image]) => (
                  <option key={label} value={image}>{label}</option>
                ))}
              </select>
            </div>
            <input
              value={composerTitle}
              onChange={(event) => setComposerTitle(event.target.value)}
              className="mt-2 w-full rounded-2xl bg-white px-3 py-3 text-sm font-black text-[#203522] outline-none ring-1 ring-[#edf1e8] placeholder:text-[#8b967f]"
              placeholder="Post title"
            />
            <textarea
              value={composerText}
              onChange={(event) => setComposerText(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-2xl bg-white px-3 py-3 text-sm font-semibold leading-5 text-[#203522] outline-none ring-1 ring-[#edf1e8] placeholder:text-[#8b967f]"
              placeholder="Share your plant update, question, harvest, or Leafy AI tip..."
            />
            <div className="mt-3 grid grid-cols-[4.5rem_1fr] gap-3">
              <PlantImage src={composerImage} alt="" className="h-16 w-full rounded-2xl object-cover" />
              <button onClick={submitPost} className="gm-tap rounded-full bg-[#203522] px-4 text-sm font-black text-white">
                Post to Feed
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="gm-x-scroll flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setFeedFilter(filter)}
            className={cn(
              "gm-tap min-w-max rounded-full px-4 py-2 text-sm font-bold transition",
              feedFilter === filter ? "bg-[#203522] text-white" : "bg-white text-[#63705e]"
            )}
          >
            {filter === "All" ? `All - ${allFeedPosts.length}` : filter}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {visiblePosts.map((post) => (
          <article key={post.id} className="gm-card-in overflow-hidden rounded-[1.8rem] bg-white shadow-sm">
            <div className="flex items-center gap-3 p-4">
              <button
                onClick={() => openGarden?.(post.author)}
                className="gm-tap h-12 w-12 shrink-0 overflow-hidden rounded-2xl"
                aria-label={`Visit ${post.author}'s garden`}
              >
                <AvatarImage src={post.avatar} alt={`${post.author} profile`} className="h-full w-full object-cover" />
              </button>
              <button
                onClick={() => openGarden?.(post.author)}
                className="gm-tap min-w-0 flex-1 text-left"
                aria-label={`Visit ${post.author}'s garden`}
              >
                <p className="truncate font-black text-[#203522]">{post.author}</p>
                <p className="text-xs font-bold text-[#7a8572]">{post.meta}</p>
              </button>
              {post.author !== "Laarne Ramos" && (
                <button
                  onClick={() => notify("Garden followed", `${post.author}'s garden is now in your followed gardens.`)}
                  className="gm-tap min-h-9 rounded-full bg-[#edf7dc] px-3 text-xs font-black text-[#315d37]"
                >
                  Follow
                </button>
              )}
              <StatusPill tone={post.type.includes("Leafy") ? "blue" : "green"}>{post.type}</StatusPill>
            </div>
            <PlantImage src={post.image} alt={post.title} className="h-56 w-full object-cover" />
            <div className="p-4">
              <h2 className="text-lg font-black leading-tight text-[#203522]">{post.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#63705e]">{post.text}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => (post.author === "Laarne Ramos" ? notify("Plant opened", "Luna's care details opened.") : openGarden?.(post.author))}
                  className="gm-tap min-h-10 rounded-full border border-[#cfd9c7] bg-white px-4 text-xs font-black text-[#315d37]"
                >
                  {post.author === "Laarne Ramos" ? "View plant" : "Visit garden"}
                </button>
                <button
                  onClick={() => notify("Market matches", `Similar plants to ${post.title} are shown in Market.`)}
                  className="gm-tap min-h-10 rounded-full border border-[#cfd9c7] bg-white px-4 text-xs font-black text-[#315d37]"
                >
                  Buy similar
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#edf1e8] pt-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleLike(post)}
                    className={cn(
                      "gm-tap flex items-center gap-1 rounded-full px-1 py-2 text-xs font-black",
                      likedPosts[post.id] ? "text-rose-600" : "text-[#315d37]"
                    )}
                  >
                    <Heart size={15} fill={likedPosts[post.id] ? "currentColor" : "none"} /> {getLikeCount(post)}
                  </button>
                  <button
                    onClick={() => {
                      setActiveComments((current) => (current === post.id ? null : post.id));
                      setCommentDraft("");
                    }}
                    className={cn(
                      "gm-tap flex items-center gap-1 rounded-full px-1 py-2 text-xs font-black",
                      activeComments === post.id ? "text-[#203522]" : "text-[#315d37]"
                    )}
                  >
                    <MessageCircle size={15} /> {getCommentCount(post)}
                  </button>
                </div>
                <button
                  onClick={() => openMessages(post.author)}
                  className="gm-tap flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#203522] px-4 text-xs font-black text-white"
                >
                  <Send size={15} /> Message
                </button>
              </div>
              {activeComments === post.id && (
                <section className="gm-sheet-in mt-3 rounded-[1.3rem] bg-[#f7faf1] p-3 ring-1 ring-[#edf1e8]">
                  <div className="space-y-2">
                    {[...(post.mockComments ?? []), ...(postComments[post.id] ?? []).map((text) => ({ author: "You", avatar: "/laarne-profile.png", text }))].map((comment, index) => (
                      <div key={`${post.id}-${index}-${comment.author}-${comment.text}`} className="flex items-start gap-2 rounded-2xl bg-white px-3 py-2">
                        <AvatarImage src={comment.avatar} alt={`${comment.author} profile`} className="h-8 w-8 shrink-0 rounded-xl object-cover" />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#203522]">{comment.author}</p>
                          <p className="mt-0.5 text-xs font-semibold leading-5 text-[#52604d]">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                    <input
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") submitComment(post);
                      }}
                      className="min-h-10 rounded-full bg-white px-3 text-xs font-semibold text-[#203522] outline-none placeholder:text-[#8b967f]"
                      placeholder="Write a comment..."
                    />
                    <button
                      onClick={() => submitComment(post)}
                      className="gm-tap rounded-full bg-[#203522] px-4 text-xs font-black text-white"
                    >
                      Post
                    </button>
                  </div>
                </section>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RankView({ notify, openGarden }) {
  const [board, setBoard] = useState("Growers");
  const [achievementTab, setAchievementTab] = useState("Collections");
  const rows = leaderboard[board];
  const achievementRows = achievements[achievementTab];
  const rankStyles = [
    "bg-[#fff4db] text-[#b45309] ring-1 ring-[#facc15]/45",
    "bg-[#f1f5f9] text-[#475569] ring-1 ring-[#cbd5e1]",
    "bg-[#fff1e6] text-[#9a3412] ring-1 ring-[#fdba74]",
  ];
  const fallbackAvatars = {
    "Benjie Cruz": "/avatars/avatar-miguel-custom.webp",
  };
  const ownRank = {
    Growers: ["#12", "2,430 pts", "320 pts away from Top 10"],
    Sellers: ["#8", "2,960 pts", "140 pts away from Top 5"],
    Helpers: ["#15", "1,880 pts", "6 care answers away from Top 10"],
  }[board];

  return (
    <div className="px-5 pb-48">
      <section className="gm-card-in rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-[#8bc34a]">This Month's Rankings</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#203522]">Community Gardeners in Your Area</h1>
          </div>
          <span className="grid h-14 w-14 place-items-center rounded-3xl bg-[#fff4db] text-[#f97316]">
            <Award size={26} />
          </span>
        </div>
      </section>

      <div className="gm-x-scroll mt-4 flex gap-2 overflow-x-auto pb-1">
        {Object.keys(leaderboard).map((item) => (
          <button
            key={item}
            onClick={() => setBoard(item)}
            className={cn(
              "gm-tap min-w-max rounded-full px-4 py-2 text-sm font-bold transition",
              board === item ? "bg-[#203522] text-white" : "bg-white text-[#63705e]"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {rows.map(([name, title, score, detail], index) => (
          <button
            key={name}
            onClick={() => {
              if (openGarden) {
                openGarden(name);
                return;
              }
              notify("Leaderboard profile", `${name} is #${index + 1}.`);
            }}
            className={cn(
              "gm-card-in gm-tap flex w-full items-center gap-3 rounded-[1.6rem] p-4 text-left shadow-sm",
              index === 0 ? "bg-[#EAF3DE] ring-1 ring-[#c7d9b5]" : "bg-white"
            )}
          >
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-black", rankStyles[index] ?? "bg-[#edf7dc] text-[#315d37]")}>
              #{index + 1}
            </span>
            <AvatarImage
              src={sellerAvatars[name] ?? fallbackAvatars[name] ?? "/laarne-profile.png"}
              alt={`${name} profile`}
              className={cn("shrink-0 rounded-2xl object-cover", index === 0 ? "h-14 w-14" : "h-12 w-12")}
            />
            <div className="min-w-0 flex-1">
              <p className="font-black text-[#203522]">{name}</p>
              <p className="text-sm font-semibold text-[#52604d]">{title} - {detail}</p>
            </div>
            <div className="text-right">
              <p className="font-black text-[#203522]">{score.toLocaleString()}</p>
              <p className="text-sm font-bold text-[#8a967f]">points</p>
            </div>
          </button>
        ))}
      </div>

      <section className="gm-card-in mt-4 rounded-[1.7rem] border border-[#dfe8d7] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#7a8572]">Your Rank</p>
            <h2 className="mt-1 text-2xl font-black text-[#203522]">{ownRank[0]} <span className="text-base text-[#7a8572]">- {ownRank[1]}</span></h2>
            <p className="mt-1 text-sm font-semibold text-[#63705e]">{ownRank[2]}</p>
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#edf7dc] text-[#315d37]">
            <Trophy size={22} />
          </span>
        </div>
      </section>

      <div className="mt-6">
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[#8bc34a]">Your Progress</p>
      </div>

      <section className="gm-card-in mt-3 rounded-[2rem] bg-[#203522] p-5 text-white shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#d9f99d]">Achievements</p>
            <h2 className="mt-2 text-2xl font-black leading-none">Your Plant Badges</h2>
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#d9f99d] text-[#203522]">
            <Trophy size={22} />
          </span>
        </div>
      </section>

      <div className="gm-x-scroll mt-4 flex gap-2 overflow-x-auto pb-1">
        {Object.keys(achievements).map((item) => (
          <button
            key={item}
            onClick={() => setAchievementTab(item)}
            className={cn(
              "gm-tap min-w-max rounded-full px-4 py-2 text-sm font-bold transition",
              achievementTab === item ? "bg-[#203522] text-white" : "bg-white text-[#63705e]"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {achievementRows.map((achievement) => {
          const progress = Math.min(achievement.progress, achievement.goal);
          const percent = Math.round((progress / achievement.goal) * 100);
          const unlocked = achievement.unlocked || progress >= achievement.goal;

          return (
            <button
              key={achievement.title}
              onClick={() =>
                notify(
                  unlocked ? "Achievement unlocked" : "Achievement progress",
                  `${achievement.title}: ${progress}/${achievement.goal}.`
                )
              }
              className="gm-card-in gm-tap w-full rounded-[1.6rem] bg-white p-4 text-left shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
                    unlocked ? "bg-[#fff4db] text-[#f97316]" : "bg-[#edf7dc] text-[#315d37]"
                  )}
                >
                  {unlocked ? <Award size={20} /> : <Sprout size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-[#203522]">{achievement.title}</p>
                    <StatusPill tone={unlocked ? "amber" : "green"}>{unlocked ? "Unlocked" : `${progress}/${achievement.goal}`}</StatusPill>
                  </div>
                  <p className="mt-1 text-sm font-semibold leading-5 text-[#73806c]">{achievement.detail}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf1e8]">
                    <div className={cn("h-full rounded-full", unlocked ? "bg-[#f97316]" : "bg-[#8bc34a]")} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfileView({ setActiveTab, notify, myMarketListings = [] }) {
  const featuredPlants = collection.slice(0, 3);
  const activeMarketListings = [
    ...myMarketListings.filter((item) => item.reviewStatus !== "Review"),
    ...marketPlants.filter((item) => item.seller === "Laarne Ramos" && item.type === "Buy"),
  ];
  const reviewListings = [
    ...myMarketListings.filter((item) => item.reviewStatus === "Review"),
    {
      listingId: "review-alocasia-frydek",
      name: "Alocasia Frydek Pup",
      price: "PHP 1,450",
      location: "Nasipit",
      category: "Rare",
      image: plantPhotos.alocasia,
      stock: "1 pup",
      reviewStatus: "Review",
      reviewNote: "Rare plant source check required before publishing.",
    },
  ];
  const [profileFeedPosts, setProfileFeedPosts] = useState(() => feedPosts.filter((item) => item.author === "Laarne Ramos"));
  const [managedPost, setManagedPost] = useState(null);
  const [editing, setEditing] = useState(false);
  const [profileName, setProfileName] = useState("Laarne Ramos");
  const [profileBio, setProfileBio] = useState("Aroid shelf lab and rooted cuttings.");
  const saveManagedPost = () => {
    if (!managedPost) return;
    setProfileFeedPosts((posts) => posts.map((post) => (post.id === managedPost.id ? { ...post, title: managedPost.title, text: managedPost.text, type: managedPost.type } : post)));
    setManagedPost(null);
  };
  const hideManagedPost = () => {
    if (!managedPost) return;
    setProfileFeedPosts((posts) => posts.filter((post) => post.id !== managedPost.id));
    setManagedPost(null);
  };
  const renderProfileListing = (item) => (
    <article key={item.name} className="gm-card-in gm-tap flex items-center gap-3 rounded-[1.5rem] bg-white p-3 shadow-sm">
      <PlantImage src={item.image} alt={item.name} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <StatusPill tone="green">{item.price}</StatusPill>
          <p className="truncate text-xs font-black text-[#7a8572]">{item.stock}</p>
        </div>
        <p className="mt-2 truncate font-black text-[#203522]">{item.name}</p>
        <p className="mt-1 truncate text-xs font-bold text-[#52604d]">{item.location} - {item.category}</p>
      </div>
      <button
        onClick={() => notify("Market listing", `${item.name} is active.`)}
        className="gm-tap shrink-0 rounded-full bg-[#f0f4e8] px-3 py-2 text-xs font-black text-[#315d37]"
      >
        Manage
      </button>
    </article>
  );

  return (
    <div className="px-5 pb-44">
      <section className="gm-card-in overflow-hidden rounded-[2rem] bg-white shadow-sm">
        <div className="relative h-40">
          <PlantImage src={plantPhotos.fern} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
          <button
            onClick={() => notify("Photo picker", "Choose profile or cover photo.")}
            className="gm-tap absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-2xl bg-white/90 text-[#203522]"
          >
            <Camera size={18} />
          </button>
          <AvatarImage
            src="/laarne-profile.png"
            alt="Laarne Ramos profile"
            className="absolute -bottom-10 left-4 h-24 w-24 rounded-[1.8rem] border-4 border-white object-cover shadow-lg"
          />
        </div>
        <div className="px-4 pb-4 pt-12">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-black tracking-tight text-[#203522]">{profileName}</h2>
              <p className="mt-1 text-sm font-bold text-[#7a8572]">@laarne.grows - Butuan City</p>
            </div>
            <div className="w-24 shrink-0 text-right">
              <StatusPill tone="green">Level 18</StatusPill>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf1e8]">
                <div className="h-full w-3/4 rounded-full bg-[#8bc34a]" />
              </div>
              <p className="mt-1 text-xs font-black text-[#7a8572]">75% XP</p>
            </div>
          </div>
          {editing ? (
            <div className="mt-3 space-y-2">
              <input
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                className="w-full rounded-2xl bg-[#f7faf1] px-4 py-3 text-sm font-bold outline-none"
              />
              <textarea
                value={profileBio}
                onChange={(event) => setProfileBio(event.target.value)}
                className="min-h-24 w-full rounded-2xl bg-[#f7faf1] px-4 py-3 text-sm font-semibold outline-none"
              />
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold leading-6 text-[#63705e]">{profileBio}</p>
          )}
          <div className="mt-4 grid grid-cols-4 divide-x-2 divide-[#c8d4c0] rounded-[1.5rem] bg-[#f7faf1] p-3 text-center">
            {[
              ["42", "Plants"],
              ["18", "Posts"],
              ["9.1k", "Score"],
              ["624", "Followers"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="font-black text-[#203522]">{value}</p>
                <p className="text-xs font-bold text-[#52604d]">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => setActiveTab("Garden")} className="gm-tap rounded-full bg-[#203522] px-4 py-4 text-sm font-black text-white">
              View my garden
            </button>
            <button
              onClick={() => {
                if (editing) notify("Profile saved", "Your public profile details were updated.");
                setEditing((value) => !value);
              }}
              className="gm-tap rounded-full bg-[#edf7dc] px-4 py-4 text-sm font-black text-[#315d37]"
            >
              {editing ? "Save profile" : "Edit profile"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#203522]">My Market Listings</h3>
          </div>
          <div className="flex items-center gap-2">
            <InfoButton title="Marketplace fee" detail="GrowMate charges 10% only after an item is sold." notify={notify} />
            <StatusPill tone="green">{activeMarketListings.length} active</StatusPill>
          </div>
        </div>
        <div className="space-y-3">
          {activeMarketListings.map(renderProfileListing)}
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#203522]">For Review Listings</h3>
            <p className="text-xs font-bold text-[#52604d]">Needs Leafy AI or moderator approval</p>
          </div>
          <StatusPill tone="amber">{reviewListings.length} pending</StatusPill>
        </div>
        <div className="space-y-3">
          {reviewListings.map((item) => (
            <article key={item.listingId ?? item.name} className="gm-card-in gm-tap flex items-center gap-3 rounded-[1.5rem] bg-white p-3 shadow-sm ring-1 ring-amber-100">
              <PlantImage src={item.image} alt={item.name} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <StatusPill tone="amber">For review</StatusPill>
                  <p className="truncate text-xs font-black text-[#7a8572]">{item.stock}</p>
                </div>
                <p className="mt-2 truncate font-black text-[#203522]">{item.name}</p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-[#52604d]">{item.reviewNote}</p>
              </div>
              <button
                onClick={() => notify("Review listing", `${item.name} is waiting for approval before it appears in Market.`)}
                className="gm-tap shrink-0 rounded-full bg-[#fff4db] px-3 py-2 text-xs font-black text-[#b45309]"
              >
                Check
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#203522]">My Feed Posts</h3>
            <p className="text-xs font-bold text-[#52604d]">Community updates and Leafy AI notes</p>
          </div>
          <StatusPill tone="blue">{profileFeedPosts.length} post</StatusPill>
        </div>
        <div className="space-y-3">
          {profileFeedPosts.map((post) => (
            <article key={post.id} className="gm-card-in gm-tap flex items-center gap-3 rounded-[1.5rem] bg-white p-3 shadow-sm">
              <PlantImage src={post.image} alt={post.title} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <StatusPill tone="blue">{post.type}</StatusPill>
                <p className="mt-2 truncate font-black text-[#203522]">{post.title}</p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-[#52604d]">{post.text}</p>
                <p className="mt-2 truncate text-xs font-bold text-[#52604d]">{post.likes} likes - {post.comments} comments</p>
              </div>
              <button
                onClick={() => setManagedPost(post)}
                className="gm-tap shrink-0 rounded-full bg-[#f0f4e8] px-3 py-2 text-xs font-black text-[#315d37]"
              >
                Manage
              </button>
            </article>
          ))}
        </div>
      </section>

      {managedPost && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-[#203522]/35 px-4 pb-4" onClick={() => setManagedPost(null)}>
          <section className="gm-sheet-in w-full max-w-[430px] rounded-[2rem] bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#8bc34a]">Manage post</p>
                <h3 className="mt-1 text-xl font-black text-[#203522]">{managedPost.title}</h3>
              </div>
              <button onClick={() => setManagedPost(null)} className="gm-tap rounded-full bg-[#f0f4e8] px-3 py-2 text-xs font-black text-[#52604d]">
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-[72px_1fr] gap-3">
              <PlantImage src={managedPost.image} alt={managedPost.title} className="h-20 w-full rounded-2xl object-cover" />
              <div className="space-y-2">
                <input
                  value={managedPost.title}
                  onChange={(event) => setManagedPost((post) => ({ ...post, title: event.target.value }))}
                  className="w-full rounded-2xl bg-[#f7faf1] px-4 py-3 text-sm font-black text-[#203522] outline-none"
                />
                <select
                  value={managedPost.type}
                  onChange={(event) => setManagedPost((post) => ({ ...post, type: event.target.value }))}
                  className="w-full rounded-2xl bg-[#f7faf1] px-4 py-3 text-sm font-black text-[#203522] outline-none"
                >
                  {["Updates", "Questions", "Harvests", "Tips"].map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              value={managedPost.text}
              onChange={(event) => setManagedPost((post) => ({ ...post, text: event.target.value }))}
              className="mt-3 min-h-24 w-full rounded-2xl bg-[#f7faf1] px-4 py-3 text-sm font-semibold leading-5 text-[#203522] outline-none"
            />

            <div className="mt-4 rounded-[1.4rem] bg-[#f7faf1] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-[#203522]">Comments</p>
                <p className="text-xs font-black text-[#7a8572]">{managedPost.comments} total</p>
              </div>
              <div className="mt-3 space-y-2">
                {(managedPost.mockComments ?? []).slice(0, 2).map((comment) => (
                  <div key={`${comment.author}-${comment.text}`} className="rounded-2xl bg-white px-3 py-2">
                    <p className="text-xs font-black text-[#203522]">{comment.author}</p>
                    <p className="mt-1 text-xs font-semibold text-[#52604d]">{comment.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={saveManagedPost} className="gm-tap rounded-full bg-[#203522] px-4 py-3 text-sm font-black text-white">
                Save changes
              </button>
              <button
                onClick={() => {
                  setManagedPost(null);
                  setActiveTab("Feed");
                }}
                className="gm-tap rounded-full bg-[#edf7dc] px-4 py-3 text-sm font-black text-[#315d37]"
              >
                View in Feed
              </button>
              <button onClick={hideManagedPost} className="gm-tap col-span-2 rounded-full border border-[#ead7c0] bg-[#fff8e8] px-4 py-3 text-sm font-black text-[#9a3412]">
                Hide from profile
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black text-[#203522]">Profile badges</h3>
          <button className="gm-tap rounded-full px-2 py-1 text-sm font-black text-[#315d37]">View all</button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {[
            ["Trusted seller", "18 clean sales", ShieldCheck],
            ["Rare collector", "12 rare plants", Leaf],
            ["Propagation pro", "31 rooted cuts", Sprout],
            ["Top garden", "Rank #2 this month", Trophy],
          ].map(([title, detail, Icon]) => (
            <article key={title} className="gm-card-in gm-tap rounded-[1.4rem] bg-white p-4 shadow-sm">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#edf7dc] text-[#315d37]">
                <Icon size={18} />
              </span>
              <p className="mt-3 font-black leading-tight text-[#203522]">{title}</p>
              <p className="mt-1 text-xs font-bold text-[#7a8572]">{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black text-[#203522]">Featured</h3>
          <button onClick={() => setActiveTab("Garden")} className="gm-tap rounded-full px-2 py-1 text-sm font-black text-[#315d37]">Manage</button>
        </div>
        <div className="space-y-3">
          {featuredPlants.map((plant) => (
            <article key={plant.id} className="gm-card-in gm-tap flex items-center gap-3 rounded-[1.5rem] bg-white p-3 shadow-sm">
              <PlantImage src={plant.image} alt={plant.name} className="h-16 w-16 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-black text-[#203522]">{plant.name}</p>
                <p className="mt-1 text-sm font-semibold text-[#73806c]">{plant.nickname} - {plant.availability}</p>
              </div>
              <ChevronRight size={18} className="text-[#9aa690]" />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="z-30 mx-auto grid w-full max-w-[430px] shrink-0 grid-cols-5 gap-1 border-t border-[#e3eadb] bg-white/95 px-2 pb-2 pt-1.5 backdrop-blur">
      {tabs.map(([Icon, label]) => {
        const isActive = activeTab === label;

        return (
          <button
            key={label}
            onClick={() => setActiveTab(label)}
            className={cn(
              "gm-tap flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-black transition",
              isActive ? "text-[#203522]" : "text-[#63705e]"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className={cn(
                "grid h-8 w-8 place-items-center rounded-xl transition",
                isActive ? "bg-[#203522] text-white shadow-sm" : "bg-transparent"
              )}
            >
              <Icon size={18} />
            </span>
            <span className="leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function MessagesPanel({ targetName, collapsed, onCollapse, onExpand, onClose, leafyMessages, setLeafyMessages }) {
  const inboxFilters = ["All", "Leafy", "Friends", "Market", "Garden", "Requests"];
  const getThreadType = (thread) => {
    if (thread.type) return thread.type;
    if (thread.name === "Leafy AI") return "Leafy";
    if (thread.name === "Miguel Bautista") return "Garden";
    if (thread.name === "Maria Dela Cruz" || thread.name === "Mang Lito Santos") return "Market";
    if (thread.name === "Mika Santos") return "Requests";
    return "Friends";
  };
  const getThreadMeta = (thread) => {
    if (thread.meta) return thread.meta;
    const type = getThreadType(thread);
    if (type === "Market") return `Market - ${thread.context}`;
    if (type === "Garden") return `Garden - ${thread.context}`;
    if (type === "Leafy") return "AI assistant";
    if (type === "Requests") return "Message request";
    return thread.context;
  };
  const latestLeafyMessage = leafyMessages[leafyMessages.length - 1];
  const leafyThread = {
    name: "Leafy AI",
    avatar: leafyLogo,
    type: "Leafy",
    context: "Plant assistant",
    meta: "AI assistant - plant care, diagnosis, and listing help",
    preview: latestLeafyMessage?.text ?? "Ask Leafy about a plant.",
    time: "now",
    unread: 0,
    messages: leafyMessages.map((message) => [message.from, message.text, message.image]),
  };
  const extraThreads = [
    {
      name: "Ana Santos",
      avatar: sellerAvatars["Ana Santos"],
      type: "Garden",
      context: "Laarne Ramos' My Plant Collection",
      meta: "Garden visitor",
      preview: "I followed your garden!",
      time: "1d",
      unread: 0,
      messages: [
        ["Ana Santos", "I followed your garden!"],
        ["You", "Thank you! I will check yours too."],
      ],
    },
    {
      name: "Mika Santos",
      avatar: "/avatars/avatar-maria-custom.webp",
      type: "Requests",
      context: "Calathea question",
      meta: "Message request",
      preview: "Asked about your Calathea.",
      time: "2d",
      unread: 0,
      messages: [["Mika Santos", "Hi, can I ask about your Calathea care routine?"]],
    },
  ];
  const availableThreads = [leafyThread, ...messageThreads, ...extraThreads];
  const fallbackThread =
    targetName && targetName !== "__inbox" && !availableThreads.some((thread) => thread.name === targetName)
      ? {
          name: targetName,
          avatar: sellerAvatars[targetName] ?? "/avatars/avatar-maria-custom.webp",
          type: "Friends",
          context: "GrowMate chat",
          meta: "Friend",
          preview: "Start a conversation about plants, listings, or garden updates.",
          time: "now",
          unread: 0,
          messages: [
            [targetName, "Hi Laarne, how can I help?"],
            ["You", "I wanted to ask about your plants."],
          ],
        }
      : null;
  const threads = fallbackThread ? [fallbackThread, ...availableThreads] : availableThreads;
  const [selectedName, setSelectedName] = useState(targetName && targetName !== "__inbox" ? targetName : threads[0]?.name);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [draft, setDraft] = useState("");
  const [sentMessages, setSentMessages] = useState([]);

  useEffect(() => {
    if (targetName && targetName !== "__inbox") setSelectedName(targetName);
  }, [targetName]);

  const selectedThread = threads.find((thread) => thread.name === selectedName) ?? threads[0];
  const selectedMessages = [...selectedThread.messages, ...sentMessages.filter((item) => item.to === selectedThread.name).map((item) => ["You", item.text])];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredThreads = threads.filter((thread) => {
    const type = getThreadType(thread);
    const matchesFilter = activeFilter === "All" || type === activeFilter || (activeFilter === "Friends" && type === "Friend");
    const matchesSearch = [thread.name, thread.preview, thread.context, getThreadMeta(thread)].join(" ").toLowerCase().includes(normalizedSearch);
    return matchesFilter && matchesSearch;
  });
  const selectedType = getThreadType(selectedThread);
  const selectedMeta = getThreadMeta(selectedThread);
  const contextTitle =
    selectedType === "Market"
      ? "Product inquiry"
      : selectedType === "Requests"
          ? "Message request"
          : selectedType === "Leafy"
            ? "Leafy AI assistant"
          : selectedType === "Garden"
            ? "Garden chat"
            : "Friend chat";
  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    if (selectedThread.name === "Leafy AI") {
      setLeafyMessages((items) => [...items, { from: "You", text }]);
      setDraft("");
      window.setTimeout(() => {
        setLeafyMessages((items) => [...items, { from: "Leafy", text: getLeafyReply(text) }]);
      }, 520);
      return;
    }
    setSentMessages((items) => [...items, { to: selectedThread.name, text }]);
    setDraft("");
  };

  if (collapsed) {
    return (
      <button
        onClick={onExpand}
        className="gm-tap fixed bottom-5 right-5 z-[70] flex items-center gap-3 rounded-full bg-[#203522] px-4 py-3 text-left text-white shadow-[0_18px_48px_rgba(32,53,34,0.28)]"
        aria-label="Open messages"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/12">
          <MessageCircle size={19} />
        </span>
        <span className="hidden sm:block">
          <span className="block text-sm font-black">Messages</span>
          <span className="block max-w-36 truncate text-xs font-bold text-white/70">{selectedThread.name}</span>
        </span>
      </button>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-y-0 right-0 z-[70] flex justify-end p-0 sm:p-4">
      <section className="gm-sheet-in pointer-events-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-[#f5f8ef] shadow-2xl ring-1 ring-[#dfe8d7] sm:rounded-[2rem]">
        <div className="border-b border-[#dfe8d7] bg-white px-5 py-4">
          <div className="flex items-center justify-between gap-3">
          <button onClick={onCollapse} className="gm-tap grid h-10 w-10 place-items-center rounded-2xl bg-[#f0f4e8] text-[#203522]" aria-label="Collapse messages">
            <ChevronRight size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-[#203522]">Messages</p>
            <p className="text-xs font-bold text-[#52604d]">Friends, buyers, sellers, and garden visitors</p>
          </div>
            <button onClick={onClose} className="gm-tap rounded-full bg-[#f0f4e8] px-3 py-2 text-xs font-black text-[#52604d]" aria-label="Close messages">
              Close
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#f7faf1] px-3 py-2">
            <Search size={16} className="text-[#7a8572]" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-[#203522] outline-none placeholder:text-[#8b967f]"
              placeholder="Search messages..."
            />
          </div>
          <div className="gm-x-scroll -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {inboxFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "gm-tap min-w-max rounded-full px-4 py-2 text-xs font-black transition",
                  activeFilter === filter ? "bg-[#203522] text-white" : "bg-[#f0f4e8] text-[#52604d]"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <section className="space-y-2">
            <p className="px-1 text-xs font-black uppercase tracking-[0.12em] text-[#8bc34a]">Today</p>
            {filteredThreads.map((thread) => {
              const type = getThreadType(thread);
              return (
              <button
                key={thread.name}
                onClick={() => setSelectedName(thread.name)}
                className={cn(
                  "gm-tap flex w-full items-center gap-3 rounded-[1.4rem] p-3 text-left shadow-sm transition",
                  selectedThread.name === thread.name ? "bg-[#203522] text-white" : "bg-white text-[#203522]"
                )}
              >
                <AvatarImage src={thread.avatar} alt={`${thread.name} profile`} className="h-12 w-12 shrink-0 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-black">{thread.name}</p>
                    <span className={cn("text-[10px] font-black", selectedThread.name === thread.name ? "text-white/75" : "text-[#7a8572]")}>{thread.time}</span>
                  </div>
                  <p className={cn("mt-1 truncate text-xs font-semibold", selectedThread.name === thread.name ? "text-white/70" : "text-[#52604d]")}>{thread.preview}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", selectedThread.name === thread.name ? "bg-white/15 text-white" : "bg-[#edf7dc] text-[#315d37]")}>{type === "Friends" ? "Friend" : type}</span>
                    <span className={cn("truncate text-[10px] font-bold", selectedThread.name === thread.name ? "text-white/70" : "text-[#7a8572]")}>{thread.context}</span>
                  </div>
                </div>
                {thread.unread > 0 && <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#d9f99d] text-xs font-black text-[#203522]">{thread.unread}</span>}
              </button>
              );
            })}
            {filteredThreads.length === 0 && (
              <div className="rounded-[1.4rem] bg-white p-4 text-sm font-semibold text-[#52604d] shadow-sm">No messages found.</div>
            )}
          </section>

          <section className="mt-4 flex min-h-[420px] flex-col rounded-[1.7rem] bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#edf1e8] p-4">
              <AvatarImage src={selectedThread.avatar} alt={`${selectedThread.name} profile`} className="h-12 w-12 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-black text-[#203522]">{selectedThread.name}</p>
                <p className="truncate text-xs font-bold text-[#52604d]">{selectedType === "Friends" ? selectedMeta : `${selectedType} - ${selectedThread.context}`}</p>
              </div>
              <StatusPill tone="green">Online</StatusPill>
            </div>

            <div className="mx-4 mt-4 rounded-[1.4rem] border border-[#dfe8d7] bg-[#f7faf1] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#8bc34a]">{contextTitle}</p>
                  <p className="mt-1 truncate font-black text-[#203522]">{selectedThread.context}</p>
                  <p className="mt-1 text-xs font-semibold text-[#52604d]">{selectedMeta}</p>
                </div>
                <button className="gm-tap shrink-0 rounded-full bg-white px-3 py-2 text-xs font-black text-[#315d37] shadow-sm">
                  {selectedType === "Market" ? "View listing" : selectedType === "Leafy" ? "Ask Leafy" : "View"}
                </button>
              </div>
              {selectedType === "Requests" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="gm-tap rounded-full bg-[#203522] px-4 py-2 text-xs font-black text-white">Accept</button>
                  <button className="gm-tap rounded-full border border-[#ead7c0] bg-white px-4 py-2 text-xs font-black text-[#9a3412]">Delete</button>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {selectedMessages.map(([sender, text, image], index) => {
                const isMine = sender === "You";
                return (
                  <div key={`${sender}-${index}-${text}`} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[78%] rounded-[1.2rem] px-4 py-3 text-sm font-semibold leading-5", isMine ? "bg-[#203522] text-white" : "bg-[#f0f4e8] text-[#203522]")}>
                      {image && <img src={image} alt="Uploaded plant" className="mb-2 max-h-40 w-full rounded-2xl object-cover" />}
                      {text}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-[#edf1e8] p-3">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendMessage();
                }}
                className="min-h-11 rounded-full bg-[#f7faf1] px-4 text-sm font-semibold text-[#203522] outline-none placeholder:text-[#8b967f]"
                placeholder={`Message ${selectedThread.name.split(" ")[0]}...`}
              />
              <button onClick={sendMessage} className="gm-tap grid h-11 w-11 place-items-center rounded-full bg-[#203522] text-white" aria-label="Send message">
                <Send size={17} />
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function LeafyAssistantPanel({ initialPrompt = "", onClose, messages, setMessages }) {
  const quickPrompts = [
    "Identify this plant from a photo",
    "Can I sell this plant safely?",
    "Why are my leaves yellow?",
    "Write a market listing",
    "Give care tips for orchids",
  ];
  const [draft, setDraft] = useState(initialPrompt);
  const [typing, setTyping] = useState(false);
  const imageInputRef = useRef(null);

  const sendQuestion = (text = draft) => {
    const question = text.trim();
    if (!question) return;
    setMessages((items) => [...items, { from: "You", text: question }]);
    setDraft("");
    setTyping(true);
    window.setTimeout(() => {
      setMessages((items) => [...items, { from: "Leafy", text: getLeafyReply(question) }]);
      setTyping(false);
    }, 520);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setMessages((items) => [
      ...items,
      {
        from: "You",
        text: `Uploaded plant photo: ${file.name}`,
        image: imageUrl,
      },
    ]);
    setTyping(true);
    window.setTimeout(() => {
      setMessages((items) => [
        ...items,
        {
          from: "Leafy",
          text: "Photo received. I would scan leaf shape, color, stem/base, pests, and overall condition. Mock result: likely healthy indoor plant, safe for care advice. For marketplace posting, use the Market scan flow for protected-species checking.",
        },
      ]);
      setTyping(false);
    }, 650);
    event.target.value = "";
  };

  return (
    <div className="pointer-events-none fixed inset-y-0 right-0 z-[75] flex justify-end p-0 sm:p-4">
      <section className="gm-sheet-in pointer-events-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-[#f5f8ef] shadow-2xl ring-1 ring-[#dfe8d7] sm:rounded-[2rem]">
        <div className="border-b border-[#dfe8d7] bg-white px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#edf7dc]">
              <img src={leafyLogo} alt="Leafy AI" className="h-10 w-10 object-cover" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-black text-[#203522]">Leafy AI</p>
              <p className="text-xs font-bold text-[#52604d]">Plant assistant, safety checker, and garden coach</p>
            </div>
            <button onClick={onClose} className="gm-tap rounded-full bg-[#f0f4e8] px-3 py-2 text-xs font-black text-[#52604d]">
              Close
            </button>
          </div>
          <div className="gm-x-scroll mt-4 flex gap-2 overflow-x-auto pb-1">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendQuestion(prompt)}
                className="gm-tap min-w-max rounded-full bg-[#edf7dc] px-3 py-2 text-xs font-black text-[#315d37]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <div className="rounded-[1.4rem] bg-[#f0f9eb] p-4 ring-1 ring-[#d5ebc8]">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#6d9f44]">What Leafy can do</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#52604d]">
              Identify plants, check sale safety, warn about protected species, diagnose care issues, write listings, and suggest categories.
            </p>
          </div>

          {messages.map((message, index) => {
            const mine = message.from === "You";
            return (
              <div key={`${message.from}-${index}-${message.text}`} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[82%] rounded-[1.2rem] px-4 py-3 text-sm font-semibold leading-6", mine ? "bg-[#203522] text-white" : "bg-white text-[#203522] shadow-sm")}>
                  {!mine && <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#8bc34a]">Leafy</p>}
                  {message.image && <img src={message.image} alt="Uploaded plant" className="mb-2 max-h-44 w-full rounded-2xl object-cover" />}
                  {message.text}
                </div>
              </div>
            );
          })}
          {typing && (
            <div className="flex justify-start">
              <div className="rounded-[1.2rem] bg-white px-4 py-3 text-sm font-black text-[#52604d] shadow-sm">
                Leafy is checking...
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-[auto_1fr_auto] gap-2 border-t border-[#dfe8d7] bg-white p-3">
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <button
            onClick={() => imageInputRef.current?.click()}
            className="gm-tap grid h-11 w-11 place-items-center rounded-full bg-[#edf7dc] text-[#315d37]"
            aria-label="Upload plant image for Leafy"
            title="Upload plant image"
          >
            <Camera size={17} />
          </button>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") sendQuestion();
            }}
            className="min-h-11 rounded-full bg-[#f7faf1] px-4 text-sm font-semibold text-[#203522] outline-none placeholder:text-[#8b967f]"
            placeholder="Ask Leafy about a plant..."
          />
          <button onClick={() => sendQuestion()} className="gm-tap grid h-11 w-11 place-items-center rounded-full bg-[#203522] text-white" aria-label="Send Leafy question">
            <Send size={17} />
          </button>
        </div>
      </section>
    </div>
  );
}

export default function ProductApp() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Garden");
  const [gardenMode, setGardenMode] = useState("Mine");
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [marketListing, setMarketListing] = useState(null);
  const [messageTarget, setMessageTarget] = useState(null);
  const [messageCollapsed, setMessageCollapsed] = useState(false);
  const [leafyPrompt, setLeafyPrompt] = useState(null);
  const [leafyMessages, setLeafyMessages] = useState(defaultLeafyMessages);
  const [actionPanel, setActionPanel] = useState(null);
  const [myMarketListings, setMyMarketListings] = useState([]);
  const [marketCreator, setMarketCreator] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsAppLoading(false), 950);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAppLoading) return undefined;
    setSectionLoading(true);
    const timer = window.setTimeout(() => setSectionLoading(false), 420);
    return () => window.clearTimeout(timer);
  }, [activeTab, gardenMode, selectedGarden, marketCreator, isAppLoading]);

  const notify = (title, detail) => setActionPanel({ title, detail });
  const openMessages = (target = "__inbox") => {
    setActionPanel(null);
    setLeafyPrompt(null);
    setMessageTarget(target);
    setMessageCollapsed(false);
  };
  const openLeafy = (prompt = "") => {
    setActionPanel(null);
    setMessageTarget(null);
    setMessageCollapsed(false);
    setLeafyPrompt(prompt);
  };
  const openCommunityGarden = (ownerName) => {
    if (ownerName === "Laarne Ramos") {
      setActionPanel(null);
      setSelectedGarden(null);
      setGardenMode("Mine");
      setActiveTab("Garden");
      return;
    }

    const garden = communityGardens.find((item) => item.owner === ownerName);
    if (!garden) {
      notify("Garden coming soon", `${ownerName}'s public garden is not available yet.`);
      return;
    }

    setSelectedGarden(garden);
    setGardenMode("Visit");
    setActiveTab("Garden");
    setActionPanel(null);
  };

  const title = useMemo(() => {
    if (activeTab === "Market" && marketCreator) return "Create Listing";
    if (activeTab === "Garden") {
      if (gardenMode === "Visit" && selectedGarden) return `${selectedGarden.owner}'s Garden`;
      if (gardenMode === "Visit") return "Visit Gardens";
      return "My Garden";
    }
    if (activeTab === "Rankings") return "Rankings";
    if (activeTab === "Profile") return "Profile";
    return activeTab;
  }, [activeTab, gardenMode, selectedGarden, marketCreator]);

  const headerKicker = useMemo(() => {
    if (activeTab === "Market" && marketCreator) return "Leafy AI";
    if (activeTab === "Market") return "Marketplace";
    if (activeTab === "Feed") return "Community";
    if (activeTab === "Garden") return gardenMode === "Visit" ? "Explore" : "Garden hub";
    if (activeTab === "Rankings") return "Leaderboard";
    if (activeTab === "Profile") return "Account";
    return "GrowMate";
  }, [activeTab, gardenMode, marketCreator]);

  const view = {
    Market: marketCreator ? (
      <MarketListingCreator
        notify={notify}
        onCancel={() => setMarketCreator(null)}
        onCreate={(listing) => {
          const listingId = `${listing.name}-${Date.now()}`;
          setMyMarketListings((items) => [{ ...listing, listingId, createdAt: Date.now() }, ...items]);
          marketCreator.onListed?.();
          setMarketCreator(null);
        }}
      />
    ) : (
      <MarketView
        notify={notify}
        openListing={setMarketListing}
        myMarketListings={myMarketListings}
        onOpenCreator={setMarketCreator}
      />
    ),
    Garden: (
      <GardenView
        notify={notify}
        gardenMode={gardenMode}
        setGardenMode={setGardenMode}
        selectedGarden={selectedGarden}
        setSelectedGarden={setSelectedGarden}
        openMessages={openMessages}
      />
    ),
    Feed: <FeedView notify={notify} openMessages={openMessages} openGarden={openCommunityGarden} openLeafy={openLeafy} />,
    Rankings: <RankView notify={notify} openGarden={openCommunityGarden} />,
    Profile: <ProfileView setActiveTab={setActiveTab} notify={notify} myMarketListings={myMarketListings} />,
  }[activeTab];

  if (isAppLoading) {
    return <GrowMateLoadingSkeleton />;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(217,249,157,0.34),transparent_28%),linear-gradient(135deg,#e8f0df,#f7faf1_45%,#dbe8d1)] font-sans text-[#203522] sm:px-4 lg:px-8">
      <PhoneShell>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <header className="mx-4 mb-4 mt-4 rounded-[1.6rem] bg-white/90 p-3 shadow-sm ring-1 ring-[#e4ecd8]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#edf7dc] shadow-inner">
                  <img src="/growmate-logo.png" alt="GrowMate" className="h-8 w-8 object-contain" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#85a273]">{headerKicker}</p>
                  <h1 className="truncate text-xl font-black tracking-tight text-[#203522]">{title}</h1>
                </div>
              </div>
              <button
                onClick={() => openMessages()}
                className="gm-tap grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#203522] text-white shadow-sm"
                aria-label="Open messages"
              >
                <MessageCircle size={18} />
              </button>
            </div>
          </header>
          <div key={`${activeTab}-${sectionLoading ? "loading" : "ready"}`} className="gm-screen-in">
            {sectionLoading ? <SectionLoadingSkeleton activeTab={activeTab} /> : view}
          </div>
        </div>
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </PhoneShell>
      {marketListing && <MarketPlantDetail plant={marketListing} onClose={() => setMarketListing(null)} notify={notify} openMessages={openMessages} />}
      {messageTarget && (
        <MessagesPanel
          targetName={messageTarget}
          collapsed={messageCollapsed}
          leafyMessages={leafyMessages}
          setLeafyMessages={setLeafyMessages}
          onCollapse={() => setMessageCollapsed(true)}
          onExpand={() => setMessageCollapsed(false)}
          onClose={() => {
            setMessageTarget(null);
            setMessageCollapsed(false);
          }}
        />
      )}
      {leafyPrompt !== null && (
        <LeafyAssistantPanel
          initialPrompt={leafyPrompt}
          messages={leafyMessages}
          setMessages={setLeafyMessages}
          onClose={() => setLeafyPrompt(null)}
        />
      )}
      <ActionPanel action={actionPanel} onClose={() => setActionPanel(null)} />
    </main>
  );
}
