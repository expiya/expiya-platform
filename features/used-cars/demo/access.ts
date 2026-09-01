export const DEMO_ROLES = Object.freeze([
  { role: "Firma sahibi", scope: "TENANT", users: 1, canExport: false, mfaRequired: true },
  { role: "Firma yöneticisi", scope: "TENANT", users: 2, canExport: false, mfaRequired: true },
  { role: "Şube yöneticisi", scope: "BRANCH", users: 3, canExport: false, mfaRequired: true },
  { role: "Stok editörü", scope: "BRANCH", users: 5, canExport: false, mfaRequired: true },
  { role: "Satış danışmanı", scope: "ASSIGNED_LEADS", users: 8, canExport: false, mfaRequired: true },
  { role: "Yalnız rapor görüntüleyici", scope: "AGGREGATE_ONLY", users: 2, canExport: false, mfaRequired: true },
]);
export const DEMO_BRANCHES = Object.freeze([
  { id: "demo-branch-istanbul", name: "İstanbul Merkez", stock: 18, users: 11, status: "ACTIVE" },
  { id: "demo-branch-kocaeli", name: "Kocaeli Şube", stock: 10, users: 6, status: "ACTIVE" },
]);
