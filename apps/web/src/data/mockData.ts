import { AdminRecord, Product } from "@/types";

export const categoryBrands = {
  Dog: ["Royal Canin", "Pedigree", "Drools", "Vetpro", "Bowlers", "Canine Creek"],
  Cat: ["Kittem", "Spearpet", "Whiskas", "Perfito", "Meow Meow", "Mewa"],
  Fish: ["Tayo"],
} as const;

export const defaultProducts: Product[] = [
  {
    id: "dog-royal-canin",
    name: "Royal Canin Maxi Adult",
    category: "Dog",
    brand: "Royal Canin",
    image:
      "https://images.unsplash.com/photo-1586671267731-da2cf3ceeb80?auto=format&fit=crop&w=900&q=80",
    description: "Large breed daily nutrition with improved digestion and coat support.",
    quantity: 24,
    price: 82,
    discount: 10,
    manufactureDate: "2026-01-10",
    expiryDate: "2027-01-10",
    soldCount: 185,
    revenue: 15170,
    rating: 4.9,
    gallery: [
      "https://images.unsplash.com/photo-1586671267731-da2cf3ceeb80?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    id: "dog-drools",
    name: "Drools Focus Pro",
    category: "Dog",
    brand: "Drools",
    image:
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80",
    description: "Protein-rich dog meal for active pets with softer digestion support.",
    quantity: 31,
    price: 46,
    discount: 8,
    manufactureDate: "2026-02-01",
    expiryDate: "2027-02-01",
    soldCount: 132,
    revenue: 6072,
    rating: 4.7,
    gallery: [
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    id: "cat-whiskas",
    name: "Whiskas Indoor Balance",
    category: "Cat",
    brand: "Whiskas",
    image:
      "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=900&q=80",
    description: "Indoor cat food with a smoother routine for digestion and coat care.",
    quantity: 18,
    price: 41,
    discount: 12,
    manufactureDate: "2026-01-20",
    expiryDate: "2027-01-20",
    soldCount: 168,
    revenue: 6888,
    rating: 4.8,
    gallery: [
      "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    id: "cat-mewa",
    name: "Mewa Premium Cat Mix",
    category: "Cat",
    brand: "Mewa",
    image:
      "https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=900&q=80",
    description: "A premium cat mix tuned for appetite, shine, and steady indoor energy.",
    quantity: 27,
    price: 53,
    discount: 6,
    manufactureDate: "2026-02-11",
    expiryDate: "2027-02-11",
    soldCount: 118,
    revenue: 6254,
    rating: 4.6,
    gallery: [
      "https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    id: "fish-tayo",
    name: "Tayo Aqua Gold",
    category: "Fish",
    brand: "Tayo",
    image:
      "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=900&q=80",
    description: "Balanced fish feed with clean water support and high nutrient density.",
    quantity: 42,
    price: 24,
    manufactureDate: "2026-02-15",
    expiryDate: "2027-02-15",
    soldCount: 204,
    revenue: 4896,
    rating: 4.5,
    gallery: [
      "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1514580475276-5612f1d68c20?auto=format&fit=crop&w=900&q=80",
    ],
  },
];

export const defaultAdmins: AdminRecord[] = [
  {
    id: "admin-1",
    name: "Aarav Sharma",
    email: "aarav.admin@happypets.com",
    status: "Approved",
    leaveDays: 1,
    lastLogin: "2026-03-31 09:10 AM",
  },
  {
    id: "admin-2",
    name: "Nisha Kapoor",
    email: "nisha.pending@happypets.com",
    status: "Pending",
    leaveDays: 6,
    lastLogin: "2026-03-24 03:30 PM",
  },
  {
    id: "admin-3",
    name: "Ritika Menon",
    email: "ritika.ops@happypets.com",
    status: "Active",
    leaveDays: 0,
    lastLogin: "2026-03-31 08:42 AM",
  },
];

export const summaryCards = [
  { label: "Products live", value: "42", detail: "Across dog, cat, and fish catalogs" },
  { label: "Orders today", value: "184", detail: "Customer demand remains healthy" },
  { label: "Pending approvals", value: "3", detail: "Super admin attention needed" },
  { label: "Support SLA", value: "11m", detail: "Median reply time this week" },
];
