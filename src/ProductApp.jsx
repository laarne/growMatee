import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  AlertTriangle,
  ArrowLeft,
  Ban,
  Camera,
  Check,
  ChevronRight,
  Heart,
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

const plantPhotos = {
  monstera:
    "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=900&q=80",
  calathea:
    "https://images.unsplash.com/photo-1620803366004-119b57f54cd6?auto=format&fit=crop&w=900&q=80",
  pothos:
    "https://images.unsplash.com/photo-1598880940080-ff9a29891b85?auto=format&fit=crop&w=900&q=80",
  anthurium:
    "https://images.unsplash.com/photo-1632207691143-643e2a9a9361?auto=format&fit=crop&w=900&q=80",
  cactus:
    "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=900&q=80",
  fern:
    "https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=900&q=80",
  herb:
    "https://images.unsplash.com/photo-1515586000433-45406d8e6662?auto=format&fit=crop&w=900&q=80",
  snake:
    "https://images.unsplash.com/photo-1593691509543-c55fb32d8de5?auto=format&fit=crop&w=900&q=80",
  orchid: "/plants/orchid-real.jpg",
  bonsai:
    "https://images.unsplash.com/photo-1509223197845-458d87318791?auto=format&fit=crop&w=900&q=80",
  fiddle: "/plants/fiddle-real.jpg",
  hoya: "/plants/hoya-real.jpg",
  succulent:
    "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80",
  alocasia: "/plants/alocasia-real.jpg",
  peperomia: "/plants/peperomia-real.jpg",
  eggplant: "/plants/eggplant-real.jpg",
  onion: "/plants/onion-real.jpg",
  tomato: "/plants/tomato-real.jpg",
  chili: "/plants/chili-real.jpg",
  pechay: "/plants/pechay-real.jpg",
  calamansi: "/plants/calamansi-real.jpg",
};

const PLANT_CATEGORIES = ["Indoor", "Outdoor", "Rare", "Flowering", "Succulents", "Herbs", "Veggies", "Fruit Trees", "Cuttings", "Trees"];
const MARKET_CATEGORY_FILTERS = ["All", ...PLANT_CATEGORIES];

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
    availability: "Open to trade",
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
    availability: "Open to trade",
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
    name: "Calamansi Seedling",
    nickname: "Sour",
    image: plantPhotos.calamansi,
    status: "Growing",
    tag: "Citrus",
    category: "Fruit Trees",
    availability: "Cuttings later",
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
    location: "Quezon City",
    type: "Buy",
    category: "Rare",
    image: plantPhotos.fern,
    seller: "Maria Dela Cruz",
    rating: "4.9",
    stock: "2 pots",
  },
  {
    name: "Rooted Cebu Blue Cutting",
    price: "Trade",
    location: "Makati",
    type: "Trade",
    category: "Cuttings",
    image: plantPhotos.pothos,
    seller: "Ana Santos",
    rating: "4.8",
    stock: "5 cuttings",
  },
  {
    name: "Desert Cactus Trio",
    price: "PHP 1,250",
    location: "Pasig",
    type: "Buy",
    category: "Succulents",
    image: plantPhotos.cactus,
    seller: "Paolo Reyes",
    rating: "4.7",
    stock: "3 sets",
  },
  {
    name: "Kitchen Herb Starter Set",
    price: "PHP 980",
    location: "Taguig",
    type: "Buy",
    category: "Herbs",
    image: plantPhotos.herb,
    seller: "Aling Nena",
    rating: "5.0",
    stock: "8 sets",
  },
  {
    name: "Snake Plant Pup",
    price: "Trade",
    location: "Marikina",
    type: "Trade",
    category: "Indoor",
    image: plantPhotos.snake,
    seller: "Miguel Bautista",
    rating: "4.9",
    stock: "4 pups",
  },
  {
    name: "Mini Orchid in Bloom",
    price: "PHP 1,850",
    location: "San Juan",
    type: "Buy",
    category: "Flowering",
    image: plantPhotos.orchid,
    seller: "Tita Pearl's Garden",
    rating: "4.6",
    stock: "1 pot",
  },
  {
    name: "Hoya Carnosa Cutting",
    price: "Trade",
    location: "Mandaluyong",
    type: "Trade",
    category: "Cuttings",
    image: plantPhotos.hoya,
    seller: "Maria Dela Cruz",
    rating: "4.9",
    stock: "6 rooted",
  },
  {
    name: "Watermelon Peperomia",
    price: "PHP 950",
    location: "Pasay",
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
    location: "Paranaque",
    type: "Buy",
    category: "Outdoor",
    image: plantPhotos.orchid,
    seller: "Aling Nena",
    rating: "4.8",
    stock: "4 pots",
  },
  {
    name: "Juniper Bonsai Starter",
    price: "Trade",
    location: "Pasig",
    type: "Trade",
    category: "Trees",
    image: plantPhotos.bonsai,
    seller: "Miguel Bautista",
    rating: "4.9",
    stock: "2 trees",
  },
  {
    name: "Talong Seedling Set",
    price: "PHP 120",
    location: "Quezon City",
    type: "Buy",
    category: "Veggies",
    image: plantPhotos.eggplant,
    seller: "Mang Lito Santos",
    rating: "4.8",
    stock: "12 seedlings",
  },
  {
    name: "Spring Onion Regrow Bunch",
    price: "Trade",
    location: "Taguig",
    type: "Trade",
    category: "Veggies",
    image: plantPhotos.onion,
    seller: "Aling Nena",
    rating: "5.0",
    stock: "6 bunches",
  },
  {
    name: "Calamansi Seedling",
    price: "PHP 180",
    location: "Caloocan",
    type: "Buy",
    category: "Fruit Trees",
    image: plantPhotos.calamansi,
    seller: "Mang Lito Santos",
    rating: "4.7",
    stock: "9 seedlings",
  },
  {
    name: "Pechay Seedling Tray",
    price: "PHP 95",
    location: "Caloocan",
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
    location: "Taguig",
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
    location: "Mandaluyong",
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
    location: "Taguig",
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
    location: "Makati",
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
    location: "Mandaluyong",
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
    location: "Quezon City",
    type: "Buy",
    category: "Trees",
    image: plantPhotos.fiddle,
    seller: "Halaman Corner",
    rating: "4.8",
    stock: "2 pots",
  },
  {
    name: "Anthurium Clarinervium",
    price: "Trade",
    location: "Mandaluyong",
    type: "Trade",
    category: "Rare",
    image: plantPhotos.anthurium,
    seller: "Maria Dela Cruz",
    rating: "4.9",
    stock: "wishlist trade",
  },
  {
    name: "Calathea Orbifolia Division",
    price: "Trade",
    location: "Quezon City",
    type: "Trade",
    category: "Indoor",
    image: plantPhotos.calathea,
    seller: "Laarne Ramos",
    rating: "4.9",
    stock: "1 division",
  },
  {
    name: "Mini Cactus Sunny Set",
    price: "PHP 390",
    location: "Pasig",
    type: "Buy",
    category: "Succulents",
    image: plantPhotos.cactus,
    seller: "Miguel Bautista",
    rating: "4.9",
    stock: "5 sets",
  },
  {
    name: "Onion and Pechay Bundle",
    price: "Trade",
    location: "Caloocan",
    type: "Trade",
    category: "Veggies",
    image: plantPhotos.onion,
    seller: "Mang Lito Santos",
    rating: "4.7",
    stock: "garden bundle",
  },
  {
    name: "Monstera Node Cutting",
    price: "PHP 850",
    location: "Quezon City",
    type: "Buy",
    category: "Cuttings",
    image: plantPhotos.monstera,
    seller: "Laarne Ramos",
    rating: "4.9",
    stock: "3 nodes",
  },
  {
    name: "Calamansi Backyard Pair",
    price: "Trade",
    location: "Caloocan",
    type: "Trade",
    category: "Fruit Trees",
    image: plantPhotos.calamansi,
    seller: "Mang Lito Santos",
    rating: "4.7",
    stock: "2 seedlings",
  },
  {
    name: "Phalaenopsis Bloom Pot",
    price: "PHP 1,350",
    location: "San Juan",
    type: "Buy",
    category: "Flowering",
    image: plantPhotos.orchid,
    seller: "Tita Pearl's Garden",
    rating: "4.6",
    stock: "4 pots",
  },
  {
    name: "Balcony Herb Cuttings",
    price: "Trade",
    location: "Taguig",
    type: "Trade",
    category: "Herbs",
    image: plantPhotos.herb,
    seller: "Aling Nena",
    rating: "5.0",
    stock: "mint basil",
  },
];

const sellerAvatars = {
  "Laarne Ramos": "/laarne-profile.png",
  "Maria Dela Cruz": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
  "Ana Santos": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=240&q=80",
  "Aling Nena": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=240&q=80",
  "Miguel Bautista": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
  "Mang Lito Santos": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80",
  "Halaman Corner": "/avatars/pinoy-ana.svg",
  "Tita Pearl's Garden": "/avatars/pinoy-nena.svg",
  "Paolo Reyes": "/avatars/pinoy-miguel.svg",
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
    id: "cycad",
    commonName: "King Sago Cycad",
    scientificName: "Cycas revoluta",
    image: plantPhotos.bonsai,
    confidence: "88%",
    decision: "Listing blocked",
    status: "Blocked",
    tone: "rose",
    icon: Ban,
    note: "Potential protected species risk. Selling is not allowed until verified by moderation.",
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
  ["Calamansi", plantPhotos.calamansi],
];

const trades = [
  ["Maria Dela Cruz", "Wants Golden Pothos cuttings", "Offering: Hoya carnosa rooted cutting", "92% match"],
  ["Miguel Bautista", "Asked about Monstera nodes", "Offering: Snake Plant pup plus soil mix", "78% match"],
  ["Ana Santos", "Wishlist match found", "Offering: Philodendron micans", "85% match"],
];

const communityGardens = [
  {
    id: "maria",
    owner: "Maria Dela Cruz",
    handle: "@mariahalaman",
    avatar: sellerAvatars["Maria Dela Cruz"],
    name: "Balcony Jungle",
    location: "Mandaluyong",
    cover: plantPhotos.calathea,
    coverPhotos: [plantPhotos.calathea, plantPhotos.alocasia, plantPhotos.hoya, plantPhotos.tomato],
    score: "9.8k",
    followers: "1.4k",
    rank: "#1",
    bio: "Rare foliage and balcony updates.",
    badges: ["Most admired", "Rare collector", "Top trader"],
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
    location: "Taguig",
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
      { name: "Golden Pothos", image: plantPhotos.pothos, tag: "Trade" },
    ],
  },
  {
    id: "miguel",
    owner: "Miguel Bautista",
    handle: "@miguelbonsai",
    avatar: sellerAvatars["Miguel Bautista"],
    name: "Bonsai Courtyard",
    location: "Pasig",
    cover: plantPhotos.bonsai,
    coverPhotos: [plantPhotos.bonsai, plantPhotos.snake, plantPhotos.peperomia, plantPhotos.calamansi],
    score: "8.4k",
    followers: "812",
    rank: "#5",
    bio: "Bonsai updates and local swaps.",
    badges: ["Trusted trader", "Care streak", "Slow grower"],
    plants: [
      { name: "Juniper Bonsai", image: plantPhotos.bonsai, tag: "Showcase" },
      { name: "Snake Plant", image: plantPhotos.snake, tag: "Low light" },
      { name: "Peperomia", image: plantPhotos.peperomia, tag: "Compact" },
      { name: "Calamansi Seedling", image: plantPhotos.calamansi, tag: "Fruit tree" },
    ],
  },
  {
    id: "lito",
    owner: "Mang Lito Santos",
    handle: "@bahaykubogrower",
    avatar: sellerAvatars["Mang Lito Santos"],
    name: "Bahay Kubo Patch",
    location: "Caloocan",
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
      { name: "Calamansi Seedling", image: plantPhotos.calamansi, tag: "Fruit tree" },
    ],
  },
];

const leaderboard = {
  Growers: [
    ["Maria Dela Cruz", "Balcony Jungle", 9840, "142 admirers"],
    ["Laarne Ramos", "Aroid Shelf Lab", 9120, "38 updates"],
    ["Aling Nena", "Herb Roof", 8730, "21 harvests"],
  ],
  Traders: [
    ["Miguel Bautista", "Trusted Trader", 7620, "54 clean trades"],
    ["Maria Dela Cruz", "Cutting Queen", 7210, "4.9 rating"],
    ["Paolo Reyes", "Weekend Swapper", 6840, "fast replies"],
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
    { title: "Trade Explorer", detail: "3 trade categories", progress: 2, goal: 3 },
  ],
};

const leafyCapabilities = [
  "AI Check",
  "No cash",
  "Proof Photos",
  "Agreement",
];

const tradeProofRequirements = ["Full plant", "Leaf close-up", "Root/stem", "Recent photo"];

const tradePolicyCards = [
  ["Plant swaps only", "Cash prices and selling posts are not allowed here."],
  ["Free trade limit", "Free users get 3 active posts and 3 completed trades monthly."],
  ["Secure agreement", "Both users confirm items, condition, proof photos, and delivery/meetup details."],
  ["Trade protection", "Optional PHP 15-30 protection for disputes, proof records, and trust score safety."],
];

const tabs = [
  [ShoppingBag, "Market"],
  [Send, "Trade"],
  [Leaf, "Garden"],
  [Trophy, "Rankings"],
  [UserRound, "Profile"],
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

function ActionNotice({ notice, onClear }) {
  if (!notice) return null;

  return (
    <div className="gm-sheet-in mx-5 mb-4 rounded-[1.4rem] bg-[#203522] p-4 text-white shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#d9f99d] text-[#203522]">
          <Check size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">{notice.title}</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-white/75">{notice.detail}</p>
        </div>
        <button onClick={onClear} className="gm-tap rounded-full bg-white/12 px-3 py-1 text-xs font-black text-white">
          Done
        </button>
      </div>
    </div>
  );
}

function PhotoPicker({ title, detail, options = photoOptions, onSelect, onUpload, onCancel }) {
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
      <label className="gm-tap mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#203522] px-4 py-3 text-sm font-black text-white">
        <Camera size={16} /> Upload photo
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            onUpload(URL.createObjectURL(file), file.name);
            event.target.value = "";
          }}
        />
      </label>
    </section>
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
  const [showTradeRules, setShowTradeRules] = useState(false);
  const ScanIcon = scanResult.icon;
  const safetyChecks =
    scanResult.status === "Allowed"
      ? [
          ["Plant identified", `${scanResult.commonName} - ${scanResult.confidence} match`, Check],
          ["Listing rule", "Safe to trade", ShieldCheck],
          ["Protected species", "No flag", Check],
          ["Proof photos", "4 required photos saved", Camera],
        ]
      : scanResult.status === "Review"
        ? [
            ["Plant identified", `${scanResult.commonName} - ${scanResult.confidence} match`, Check],
            ["Listing rule", "Needs proof", AlertTriangle],
            ["Protected species", "Review required", AlertTriangle],
            ["Proof photos", "Add complete trade proof", Camera],
          ]
        : [
            ["Plant identified", `${scanResult.commonName} - ${scanResult.confidence} match`, AlertTriangle],
            ["Listing rule", "Blocked", Ban],
            ["Protected species", "Protected risk", Ban],
            ["Proof photos", "Trade posting disabled", Ban],
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

    const listingType = "Trade";
    const listingId = `${scanResult.id}-${listingType}-${selectedCategory}`;
    setListedPlants((items) => {
      if (items.some((item) => item.listingId === listingId)) return items;
      return [{ ...scanResult, listingId, listingType, category: selectedCategory }, ...items];
    });
    notify(
      scanResult.status === "Review" ? "Sent to moderation" : "Trade post created",
      scanResult.status === "Review"
        ? "Needs moderator review first."
        : `${scanResult.commonName} is ready for plant-to-plant swap offers.`
    );
  };

  return (
    <section className="gm-card-in rounded-[1.7rem] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[#edf7dc] px-3 py-1 text-xs font-black text-[#315d37]">
            <ScanLine size={14} /> Leafy AI
          </p>
          <h2 className="mt-3 text-xl font-black leading-tight text-[#203522]">Check your trade before posting</h2>
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
          <ScanIcon size={15} /> {scanResult.status === "Allowed" ? "Safe to trade" : scanResult.status}
        </span>
      </div>

      <div className="mt-4 rounded-[1.4rem] border border-[#dfe8d7] bg-[#fbfdf7] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-black text-[#203522]">Trade safely with GrowMate</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#63705e]">
              Plant swaps only - proof photos required - secure agreement available
            </p>
          </div>
          <button
            onClick={() => setShowTradeRules((value) => !value)}
            className="gm-tap min-w-max rounded-full bg-white px-3 py-2 text-xs font-black text-[#315d37] ring-1 ring-[#dfe8d7]"
          >
            {showTradeRules ? "Hide rules" : "View rules"}
          </button>
        </div>
        {showTradeRules && (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {tradePolicyCards.map(([title, detail]) => (
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
          {tradeProofRequirements.map((item) => (
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
          {scanResult.status === "Review" ? "Send to review" : "Create trade post"}
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
                  {plant.status === "Review" ? "Waiting for moderation" : `${plant.category} - plant swap draft`}
                </p>
              </div>
              <StatusPill tone="blue">Trade</StatusPill>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MarketPlantDetail({ plant, onClose, notify }) {
  const isTrade = plant.type === "Trade";
  const sellerAvatar = sellerAvatars[plant.seller] ?? "/avatars/pinoy-maria.svg";
  const condition = plant.category === "Cuttings" ? "Rooted and healthy" : "Healthy";
  const plantType = plant.category === "Cuttings" ? "Cutting (Rooted)" : plant.category;
  const distance = {
    "Quezon City": "3.2 km away",
    Caloocan: "6.4 km away",
    Pasig: "4.1 km away",
    Taguig: "5.8 km away",
    Mandaluyong: "2.6 km away",
    Makati: "3.9 km away",
    "San Juan": "2.8 km away",
    Pasay: "7.1 km away",
    Paranaque: "8.5 km away",
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
  const heroImageClass = plant.name === "Calamansi Seedling" ? "h-full w-full object-cover object-bottom" : "h-full w-full object-cover";
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
            <p className="mt-1 text-xl font-black text-[#203522]">{plant.price}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill tone={isTrade ? "blue" : "green"}>{isTrade ? "Trade" : "For sale"}</StatusPill>
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
              onClick={() => notify("Message opened", `Chat with ${plant.seller} about ${plant.name}.`)}
              className="gm-tap rounded-xl border border-[#dfe8d7] px-4 py-3 text-xs font-black text-[#203522]"
            >
              Message
            </button>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            {[
              [MapPin, "Location", `${plant.location} - ${distance}`],
              [ShoppingBag, "Stock", plant.stock],
              [Send, "Delivery", isTrade ? "Meetup for swaps" : "Pickup / Meetup / Delivery"],
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
            onClick={() => notify(isTrade ? "Trade offer started" : "Checkout started", `${plant.name} from ${plant.seller} is now in progress.`)}
            className="gm-tap rounded-xl bg-[#203522] px-4 py-4 text-sm font-black text-white"
          >
            {isTrade ? "Offer Trade" : `Buy Now - ${plant.price}`}
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

function MarketView({ notify, openListing }) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [sortBy, setSortBy] = useState("Nearest");
  const normalizedQuery = query.trim().toLowerCase();
  const saleListings = marketPlants.filter((item) => item.type === "Buy");
  const saleCategories = PLANT_CATEGORIES.filter((item) => saleListings.some((listing) => listing.category === item));
  const categories = ["All", ...saleCategories];
  const primaryCategories = categories.slice(0, 5);
  const filtersExpanded = showMoreFilters || !primaryCategories.includes(category);
  const visibleCategories = filtersExpanded ? categories : primaryCategories;
  const priceValue = (item) => Number(item.price.replace(/[^\d]/g, "")) || 0;
  const shown = saleListings
    .filter((item) => category === "All" || item.category === category)
    .filter((item) => [item.name, item.price, item.location, item.category, item.seller].join(" ").toLowerCase().includes(normalizedQuery))
    .sort((a, b) => {
      if (sortBy === "Price") return priceValue(a) - priceValue(b);
      if (sortBy === "Rating") return Number(b.rating) - Number(a.rating);
      if (sortBy === "Newest") return b.name.localeCompare(a.name);
      return a.location.localeCompare(b.location);
    });
  const featured = shown[0] ?? saleListings[0];

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
        <div className="mt-3 flex flex-wrap gap-2">
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
            className="gm-tap rounded-full bg-white px-3 py-2 text-xs font-black text-[#315d37] ring-1 ring-[#e4ecd8]"
          >
            {filtersExpanded ? "Less" : "More filters"}
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
            key={item.name}
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

function GardenPhotoControls({ photos, currentIndex, setCurrentIndex }) {
  if (photos.length <= 1) return null;

  const goTo = (event, nextIndex) => {
    event.stopPropagation();
    setCurrentIndex((nextIndex + photos.length) % photos.length);
  };

  return (
    <>
      <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-xs font-black text-white">
        {currentIndex + 1}/{photos.length}
      </span>
      <button
        onClick={(event) => goTo(event, currentIndex - 1)}
        className="gm-tap absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[#203522] shadow-sm"
        aria-label="Previous garden photo"
      >
        <ArrowLeft size={16} />
      </button>
      <button
        onClick={(event) => goTo(event, currentIndex + 1)}
        className="gm-tap absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[#203522] shadow-sm"
        aria-label="Next garden photo"
      >
        <ChevronRight size={18} />
      </button>
    </>
  );
}

function VisitGardensView({ selectedGarden, setSelectedGarden, notify }) {
  const [followedGardens, setFollowedGardens] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [coverIndex, setCoverIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  useEffect(() => {
    setCoverIndex(0);
  }, [selectedGarden?.id]);

  if (selectedGarden) {
    const isFollowing = followedGardens.includes(selectedGarden.id);
    const gardenListings = marketPlants.filter((item) => item.seller === selectedGarden.owner);
    const marketplaceListings = gardenListings.filter((item) => item.type === "Buy");
    const tradeOfferings = gardenListings.filter((item) => item.type === "Trade");
    const coverPhotos = selectedGarden.coverPhotos ?? [selectedGarden.cover];
    const currentCoverIndex = Math.min(coverIndex, coverPhotos.length - 1);
    const currentCover = coverPhotos[currentCoverIndex];
    const openPhoto = (title, detail, image) => {
      setPhotoPreview({ title, detail, image });
    };
    const showNextCover = () => setCoverIndex((index) => (index + 1) % coverPhotos.length);
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
                  <StatusPill tone={item.type === "Trade" ? "blue" : "green"}>{item.type === "Trade" ? "Trade" : item.price}</StatusPill>
                  <p className="text-xs font-black text-[#7a8572]">{item.stock}</p>
                </div>
                <h4 className="mt-2 min-h-10 text-sm font-black leading-tight text-[#203522]">{item.name}</h4>
                <p className="mt-1 text-xs font-bold text-[#7a8572]">{item.category}</p>
                <button
                  onClick={() =>
                    notify(
                      item.type === "Trade" ? "Trade offer started" : "Marketplace listing opened",
                      `${item.name} from ${selectedGarden.owner} is available in ${item.location}.`
                    )
                  }
                  className="gm-tap mt-3 min-h-10 w-full rounded-full bg-[#203522] px-3 py-2 text-xs font-black text-white"
                >
                  {item.type === "Trade" ? "Offer trade" : "View listing"}
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

        <section className="group gm-card-in overflow-hidden rounded-[2rem] bg-white shadow-sm transition hover:shadow-[0_18px_42px_rgba(37,61,41,0.18)]">
          <div
            className="relative h-52"
            onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
            onTouchEnd={handleCoverSwipe}
          >
            <button
              onClick={showNextCover}
              className="gm-tap absolute inset-0 block w-full text-left"
              aria-label={`Show next ${selectedGarden.name} cover photo`}
            >
              <PlantImage src={currentCover} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            </button>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition duration-300 group-hover:from-black/95" />
            <GardenPhotoControls photos={coverPhotos} currentIndex={currentCoverIndex} setCurrentIndex={setCoverIndex} />
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
                onClick={() => notify("Message started", `Chat with ${selectedGarden.owner}.`)}
                className="gm-tap rounded-full bg-[#edf7dc] px-4 py-3 text-sm font-black text-[#315d37]"
              >
                Message
              </button>
            </div>
          </div>
        </section>

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

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-black text-[#203522]">Open trades</h3>
            <StatusPill tone="blue">{tradeOfferings.length} open</StatusPill>
          </div>
          {renderListingCards(tradeOfferings, `${selectedGarden.owner} has no open trade offers right now.`)}
        </section>

        <h3 className="mt-5 text-lg font-black text-[#203522]">Garden plants</h3>
        <div className="mt-3 grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {selectedGarden.plants.map((plant) => (
            <button
              key={plant.name}
              onClick={() => openPhoto(plant.name, `${plant.tag} in ${selectedGarden.owner}'s garden.`, plant.image)}
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
      </div>
    );
  }

  return (
    <div className="grid gap-4 px-5 pb-44 md:grid-cols-2 xl:grid-cols-3">
      {communityGardens.map((garden) => (
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
  );
}

function GardenView({ notify, gardenMode, setGardenMode, selectedGarden, setSelectedGarden }) {
  const initialGardenPlants = useMemo(() => collection.map(withPhotoGallery), []);
  const [gardenPlants, setGardenPlants] = useState(initialGardenPlants);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [gardenCovers, setGardenCovers] = useState([plantPhotos.fern, plantPhotos.monstera, plantPhotos.alocasia, plantPhotos.hoya, plantPhotos.calamansi]);
  const [gardenCoverIndex, setGardenCoverIndex] = useState(0);
  const [gardenTouchStart, setGardenTouchStart] = useState(null);
  const [gardenCategory, setGardenCategory] = useState("All");
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [showGardenPhotoPicker, setShowGardenPhotoPicker] = useState(false);
  const [showPlantPhotoPicker, setShowPlantPhotoPicker] = useState(false);
  const [showPlantEditor, setShowPlantEditor] = useState(false);

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
  const showNextGardenCover = () => setGardenCoverIndex((index) => (index + 1) % gardenCovers.length);
  const handleGardenCoverSwipe = (event) => {
    if (gardenTouchStart === null || gardenCovers.length <= 1) return;
    const delta = gardenTouchStart - event.changedTouches[0].clientX;
    if (Math.abs(delta) > 35) {
      setGardenCoverIndex((index) => (delta > 0 ? index + 1 : index - 1 + gardenCovers.length) % gardenCovers.length);
    }
    setGardenTouchStart(null);
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
        <VisitGardensView selectedGarden={selectedGarden} setSelectedGarden={setSelectedGarden} notify={notify} />
      </>
    );
  }

  return (
    <div className="px-5 pb-44">
      <div className="-mx-5">
        <GardenModeSwitch gardenMode={gardenMode} setGardenMode={setGardenMode} setSelectedGarden={setSelectedGarden} />
      </div>
      <section
        onClick={showNextGardenCover}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            showNextGardenCover();
          }
        }}
        onTouchStart={(event) => setGardenTouchStart(event.touches[0].clientX)}
        onTouchEnd={handleGardenCoverSwipe}
        role="button"
        tabIndex={0}
        className="group gm-card-in gm-tap cursor-pointer overflow-hidden rounded-[2rem] bg-white shadow-sm outline-none transition hover:shadow-[0_18px_42px_rgba(37,61,41,0.18)] focus-visible:ring-4 focus-visible:ring-[#d9f99d]"
      >
        <div className="relative h-44">
          <PlantImage src={currentGardenCover} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent transition duration-300 group-hover:from-black/95" />
          <button
            onClick={(event) => {
              event.stopPropagation();
              setShowGardenPhotoPicker((value) => !value);
            }}
            className="gm-tap absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-2xl bg-white/90 text-[#203522] transition group-hover:scale-105"
            aria-label="Change garden photo"
          >
            <Camera size={18} />
          </button>
          <GardenPhotoControls photos={gardenCovers} currentIndex={currentGardenCoverIndex} setCurrentIndex={setGardenCoverIndex} />
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-black/30 p-3 text-white backdrop-blur-[1px]">
            <p className="text-2xl font-black">Laarne Ramos' Aroid Shelf Lab</p>
            <p className="mt-1 text-sm font-semibold text-white/85">42 plants - 6 open to trade - Rank #2</p>
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

      {showGardenPhotoPicker && (
        <PhotoPicker
          title="Change garden photo"
          detail="Pick or upload a garden cover."
          onSelect={updateGardenCover}
          onUpload={(image, name) => updateGardenCover(image, name)}
          onCancel={() => setShowGardenPhotoPicker(false)}
        />
      )}

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-lg font-black text-[#203522]">Plant collection</h2>
        <button
          onClick={() => setShowAddPlant((value) => !value)}
          className="gm-tap inline-flex min-h-11 items-center gap-2 rounded-full bg-[#203522] px-5 py-3 text-sm font-black text-white shadow-sm"
        >
          <Plus size={16} /> Add plant
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
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

      {showAddPlant && (
        <section className="gm-sheet-in mt-3 rounded-[1.6rem] bg-white p-4 shadow-sm">
          <p className="font-black text-[#203522]">Add plant to My Garden</p>
          <p className="mt-1 text-sm font-semibold text-[#73806c]">Scan or upload a plant.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={addPlant} className="gm-tap rounded-full bg-[#203522] px-4 py-3 text-sm font-black text-white">
              Add sample
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
              detail="Add up to 5 photos."
              onSelect={updateSelectedPlantPhoto}
              onUpload={(image, name) => updateSelectedPlantPhoto(image, name)}
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

function TradeView({ notify }) {
  const [tradeMode, setTradeMode] = useState("Post Trade");
  const tradeListings = marketPlants.filter((plant) => plant.type === "Trade");

  return (
    <div className="space-y-4 px-5 pb-52">
      <div className="grid grid-cols-2 gap-2 rounded-[1.3rem] bg-white p-1 shadow-sm">
        {["Post Trade", "Browse Trades"].map((mode) => (
          <button
            key={mode}
            onClick={() => setTradeMode(mode)}
            className={cn(
              "gm-tap rounded-full px-3 py-3 text-sm font-black transition",
              tradeMode === mode ? "bg-[#203522] text-white" : "text-[#63705e]"
            )}
          >
            {mode}
          </button>
        ))}
      </div>

      <section className="gm-card-in rounded-[1.5rem] border border-[#dfe8d7] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#315d37]" />
            <p className="font-black text-[#203522]">Trade trust</p>
          </div>
          <span className="rounded-full bg-[#edf7dc] px-3 py-1 text-lg font-black text-[#315d37]">4.9</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-[#52604d]">18 clean trades</p>
      </section>

      <section className="gm-card-in flex items-start gap-3 rounded-[1.4rem] border border-[#f3d7a7] bg-[#fff8e8] p-4 shadow-sm">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[#b45309]">
          <AlertTriangle size={18} />
        </span>
        <div>
          <p className="text-sm font-black text-[#203522]">Trade inside GrowMate</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[#52604d]">Avoid cash offers and off-app deals. GrowMate protection only works when the swap stays in the app.</p>
        </div>
      </section>

      {tradeMode === "Post Trade" ? (
        <>
          <SellerListingCheck notify={notify} />

          <section className="gm-card-in rounded-[1.7rem] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#8bc34a]">Secure Trade</p>
                <h2 className="mt-1 text-lg font-black text-[#203522]">Agreement and protection</h2>
                <p className="mt-1 text-xs font-bold text-[#7a8572]">Optional after a trade offer is accepted</p>
              </div>
              <StatusPill tone="amber">PHP 15-30</StatusPill>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {[
                ["Trade agreement", "Shows both plants, condition, proof photos, and meetup or delivery."],
                ["Two-sided confirmation", "Trade completes only after both users confirm the correct item."],
                ["Ratings and history", "Completed trades update rating, success rate, and verified trader status."],
                ["Reports and disputes", "Report wrong plant, unhealthy item, fake photo, no-show, scam, or harassment."],
              ].map(([title, detail]) => (
                <div key={title} className="rounded-[1.2rem] bg-[#f7faf1] p-3">
                  <p className="text-sm font-black text-[#203522]">{title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#63705e]">{detail}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => notify("Protection details", "Trade protection becomes available after both users agree to a swap.")}
              className="gm-tap mt-4 w-full rounded-full bg-[#203522] px-4 py-3 text-sm font-black text-white"
            >
              View protection details
            </button>
          </section>
        </>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["My offers", "3 pending"],
              ["Wishlist matches", "5 found"],
            ].map(([title, detail]) => (
              <button
                key={title}
                onClick={() => notify(title, `${detail} in your trade queue.`)}
                className="gm-card-in gm-tap rounded-[1.4rem] border border-[#dfe8d7] bg-white p-4 text-left shadow-sm"
              >
                <p className="text-sm font-black text-[#203522]">{title}</p>
                <p className="mt-1 text-xs font-bold text-[#7a8572]">{detail}</p>
              </button>
            ))}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-[#203522]">Available trades</h2>
              <StatusPill tone="blue">{tradeListings.length} open</StatusPill>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {tradeListings.map((plant) => (
                <article key={plant.name} className="gm-card-in gm-tap overflow-hidden rounded-[1.6rem] bg-white shadow-sm">
                  <div className="relative h-32">
                    <PlantImage src={plant.image} alt={plant.name} className="h-full w-full object-cover" />
                    <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black text-[#203522]">
                      Trade
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="min-h-10 text-base font-black leading-tight text-[#203522]">{plant.name}</h3>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-black text-[#7a8572]">{plant.stock}</p>
                      <p className="truncate text-xs font-black text-[#315d37]">{plant.category}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-bold text-[#63705e]">{plant.seller}</p>
                      <span className="shrink-0 rounded-full bg-[#fff4db] px-2 py-0.5 text-xs font-black text-[#b45309]">{plant.rating}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => notify("Trade listing opened", `${plant.name} from ${plant.seller} is open for trade.`)}
                        className="gm-tap min-h-11 rounded-full border border-[#cfd9c7] bg-white px-2 py-3 text-xs font-black text-[#315d37]"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => notify("Trade offer started", `Choose one of your plants to offer for ${plant.name}.`)}
                        className="gm-tap min-h-11 rounded-full bg-[#203522] px-2 py-3 text-xs font-black text-white"
                      >
                        Make Offer
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <h2 className="text-lg font-black text-[#203522]">Trade requests</h2>
          {trades.map(([name, title, detail, match]) => (
            <article key={title} className="gm-card-in rounded-[1.6rem] bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#edf7dc] text-[#315d37]">
                  <UserRound size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-[#203522]">{name}</p>
                      <p className="mt-1 text-sm font-black text-[#315d37]">{title}</p>
                    </div>
                    <StatusPill tone="blue">{match}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#52604d]">{detail}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => notify("Offer opened", `${name}'s trade offer details are ready to review.`)}
                      className="gm-tap min-h-11 rounded-full bg-[#203522] px-5 py-3 text-xs font-bold text-white"
                    >
                      View offer
                    </button>
                    <button
                      onClick={() => notify("Message opened", `Chat with ${name}.`)}
                      className="gm-tap min-h-11 rounded-full border border-[#cfd9c7] bg-white px-5 py-3 text-xs font-bold text-[#52604d]"
                    >
                      Message
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </>
      )}
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
    "Benjie Cruz": "/avatars/pinoy-miguel.svg",
  };
  const ownRank = {
    Growers: ["#12", "2,430 pts", "320 pts away from Top 10"],
    Traders: ["#8", "2,960 pts", "140 pts away from Top 5"],
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
            className="gm-card-in gm-tap flex w-full items-center gap-3 rounded-[1.6rem] bg-white p-4 text-left shadow-sm"
          >
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-black", rankStyles[index] ?? "bg-[#edf7dc] text-[#315d37]")}>
              #{index + 1}
            </span>
            <AvatarImage
              src={sellerAvatars[name] ?? fallbackAvatars[name] ?? "/laarne-profile.png"}
              alt={`${name} profile`}
              className="h-12 w-12 shrink-0 rounded-2xl object-cover"
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

function ProfileView({ setActiveTab, notify }) {
  const featuredPlants = collection.slice(0, 3);
  const [editing, setEditing] = useState(false);
  const [profileName, setProfileName] = useState("Laarne Ramos");
  const [profileBio, setProfileBio] = useState("Aroid shelf lab and rooted cuttings.");

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
              <p className="mt-1 text-sm font-bold text-[#7a8572]">@laarne.grows - Quezon City</p>
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
              ["18", "Trades"],
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
            <button onClick={() => setActiveTab("Garden")} className="gm-tap rounded-full bg-[#203522] px-4 py-3 text-sm font-black text-white">
              View my garden
            </button>
            <button
              onClick={() => {
                if (editing) notify("Profile saved", "Your public profile details were updated.");
                setEditing((value) => !value);
              }}
              className="gm-tap rounded-full bg-[#edf7dc] px-4 py-3 text-sm font-black text-[#315d37]"
            >
              {editing ? "Save profile" : "Edit profile"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black text-[#203522]">Profile badges</h3>
          <button className="gm-tap rounded-full px-2 py-1 text-sm font-black text-[#315d37]">View all</button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {[
            ["Trusted trader", "18 clean swaps", ShieldCheck],
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
    <nav className="z-30 mx-auto grid w-full max-w-[560px] shrink-0 grid-cols-5 gap-1 border-t border-[#e3eadb] bg-white/95 px-3 pb-3 pt-2 backdrop-blur sm:rounded-b-[1.75rem] md:mb-3 md:rounded-[1.75rem] md:border md:shadow-[0_18px_42px_rgba(37,61,41,0.12)]">
      {tabs.map(([Icon, label]) => {
        const isActive = activeTab === label;
        const isGarden = label === "Garden";

        return (
          <button
            key={label}
            onClick={() => setActiveTab(label)}
            className={cn(
              "gm-tap flex flex-col items-center gap-1 rounded-2xl px-1 py-1 text-xs font-black transition",
              isGarden ? "-mt-5" : "pt-2",
              isActive ? "text-[#203522]" : "text-[#52604d]"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className={cn(
                "grid place-items-center transition",
                isGarden ? cn("h-14 w-14 rounded-full ring-4 ring-white", isActive ? "shadow-lg" : "shadow-sm") : "h-8 w-8 rounded-2xl",
                isActive && isGarden ? "gm-soft-pulse" : "",
                isActive ? "bg-[#203522] text-white" : isGarden ? "bg-white text-[#52604d]" : "bg-transparent"
              )}
            >
              <Icon size={isGarden ? 24 : 19} />
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default function ProductApp() {
  const [activeTab, setActiveTab] = useState("Garden");
  const [notice, setNotice] = useState(null);
  const [gardenMode, setGardenMode] = useState("Mine");
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [marketListing, setMarketListing] = useState(null);
  const notify = (title, detail) => setNotice({ title, detail });
  const openCommunityGarden = (ownerName) => {
    setNotice(null);

    if (ownerName === "Laarne Ramos") {
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
  };

  const title = useMemo(() => {
    if (activeTab === "Garden") {
      if (gardenMode === "Visit" && selectedGarden) return `${selectedGarden.owner}'s Garden`;
      if (gardenMode === "Visit") return "Visit Gardens";
      return "My Garden";
    }
    if (activeTab === "Rankings") return "Rankings";
    if (activeTab === "Profile") return "Profile";
    return activeTab;
  }, [activeTab, gardenMode, selectedGarden]);

  const view = {
    Market: <MarketView notify={notify} openListing={setMarketListing} />,
    Garden: (
      <GardenView
        notify={notify}
        gardenMode={gardenMode}
        setGardenMode={setGardenMode}
        selectedGarden={selectedGarden}
        setSelectedGarden={setSelectedGarden}
      />
    ),
    Trade: <TradeView notify={notify} />,
    Rankings: <RankView notify={notify} openGarden={openCommunityGarden} />,
    Profile: <ProfileView setActiveTab={setActiveTab} notify={notify} />,
  }[activeTab];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(217,249,157,0.34),transparent_28%),linear-gradient(135deg,#e8f0df,#f7faf1_45%,#dbe8d1)] font-sans text-[#203522] sm:px-4 lg:px-8">
      <PhoneShell>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative mb-4 flex items-center justify-center px-5 pt-5">
            <h1 className="max-w-[270px] truncate text-center text-xl font-black tracking-tight text-[#203522] md:max-w-[560px]">{title}</h1>
            {activeTab !== "Market" && (
            <div className="absolute right-5 flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveTab("Trade");
                  notify("Messages opened", "Trade chats and requests are grouped inside the Trade tab.");
                }}
                className="gm-tap grid h-10 w-10 place-items-center rounded-2xl bg-white text-[#203522] shadow-sm"
                aria-label="Open messages"
              >
                <MessageCircle size={18} />
              </button>
            </div>
            )}
          </div>
          <ActionNotice notice={notice} onClear={() => setNotice(null)} />
          <div key={activeTab} className="gm-screen-in">{view}</div>
        </div>
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </PhoneShell>
      {marketListing && <MarketPlantDetail plant={marketListing} onClose={() => setMarketListing(null)} notify={notify} />}
    </main>
  );
}
