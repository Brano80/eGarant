import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, date, boolean, pgEnum } from "drizzle-orm/pg-core"; // Ensure boolean is imported
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "nanoid";

// --- Users Table (Updated) ---
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  // --- ADDED 2FA COLUMNS ---
  isTwoFactorAuthEnabled: boolean("is_two_factor_auth_enabled").notNull().default(false),
  twoFactorAuthSecret: text("two_factor_auth_secret"), // Secret key for TOTP
  twoFactorAuthMethod: varchar("two_factor_auth_method", { length: 10 }), // e.g., 'TOTP'
  // --- END OF ADDED COLUMNS ---
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// --- Contracts Table ---
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  ownerEmail: text("owner_email"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  ownerCompanyId: varchar("owner_company_id").references(() => companies.id, { onDelete: 'set null' }),
});
export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
});
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

// Relations for contracts
export const contractsRelations = relations(contracts, ({ one }) => ({
  company: one(companies, {
    fields: [contracts.ownerCompanyId],
    references: [companies.id],
  }),
}));

// --- Enums for Virtual Offices ---
export const participantStatusEnum = pgEnum("participant_status", [
  "INVITED",
  "ACCEPTED",
  "REJECTED"
]);
export const signatureStatusEnum = pgEnum("signature_status", [
  "PENDING",
  "SIGNED",
  "REJECTED"
]);

// --- Virtual Offices Table ---
export const virtualOffices = pgTable("virtual_offices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  ownerCompanyId: varchar("owner_company_id").references(() => companies.id),
  status: text("status").notNull().default("active"),
  processType: text("process_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertVirtualOfficeSchema = createInsertSchema(virtualOffices).omit({
  id: true,
  createdAt: true,
});
export type InsertVirtualOffice = z.infer<typeof insertVirtualOfficeSchema>;
export type VirtualOffice = typeof virtualOffices.$inferSelect;

// --- Virtual Office Participants Table ---
export const virtualOfficeParticipants = pgTable("virtual_office_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  virtualOfficeId: varchar("virtual_office_id").notNull().references(() => virtualOffices.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  userCompanyMandateId: varchar("user_company_mandate_id").references(() => userCompanyMandates.id),
  requiredRole: text("required_role"),
  requiredCompanyIco: text("required_company_ico"),
  status: participantStatusEnum("status").notNull().default("INVITED"),
  invitationContext: varchar("invitation_context", { length: 50 }),
  invitedAt: timestamp("invited_at").notNull().defaultNow(),
  respondedAt: timestamp("responded_at"),
});
export const insertVirtualOfficeParticipantSchema = createInsertSchema(virtualOfficeParticipants).omit({
  id: true,
  invitedAt: true,
});
export type InsertVirtualOfficeParticipant = z.infer<typeof insertVirtualOfficeParticipantSchema>;
export type VirtualOfficeParticipant = typeof virtualOfficeParticipants.$inferSelect;

// --- Virtual Office Documents Table ---
export const virtualOfficeDocuments = pgTable("virtual_office_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  virtualOfficeId: varchar("virtual_office_id").notNull().references(() => virtualOffices.id),
  contractId: varchar("contract_id").notNull().references(() => contracts.id),
  uploadedById: varchar("uploaded_by_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});
export const insertVirtualOfficeDocumentSchema = createInsertSchema(virtualOfficeDocuments).omit({
  id: true,
  uploadedAt: true,
});
export type InsertVirtualOfficeDocument = z.infer<typeof insertVirtualOfficeDocumentSchema>;
export type VirtualOfficeDocument = typeof virtualOfficeDocuments.$inferSelect;

// --- Virtual Office Signatures Table ---
export const virtualOfficeSignatures = pgTable("virtual_office_signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  virtualOfficeDocumentId: varchar("virtual_office_document_id").notNull().references(() => virtualOfficeDocuments.id),
  participantId: varchar("participant_id").notNull().references(() => virtualOfficeParticipants.id),
  status: signatureStatusEnum("status").notNull().default("PENDING"),
  signedAt: timestamp("signed_at"),
  signatureData: text("signature_data"),
  userCompanyMandateId: varchar("user_company_mandate_id").references(() => userCompanyMandates.id),
});
export const insertVirtualOfficeSignatureSchema = createInsertSchema(virtualOfficeSignatures).omit({
  id: true,
});
export type InsertVirtualOfficeSignature = z.infer<typeof insertVirtualOfficeSignatureSchema>;
export type VirtualOfficeSignature = typeof virtualOfficeSignatures.$inferSelect;

// --- Enums for Companies and Mandates ---
export const companyStatusEnum = pgEnum("company_status", [
  "active",
  "inactive",
  "pending_verification",
  "verification_failed"
]);
export const mandateRozsahOpravneniEnum = pgEnum("mandate_rozsah_opravneni", [
  "samostatne",
  "spolocne_s_inym",
  "obmedzene"
]);
export const mandateStatusEnum = pgEnum("mandate_status", [
  "active",
  "inactive",
  "pending_confirmation",
  "revoked",
  "expired"
]);

export const apiKeyStatusEnum = pgEnum("api_key_status", [
  "active",
  "inactive"
]);

export const auditActionTypeEnum = pgEnum("audit_action_type", [
  // Mandáty
  "MANDATE_CREATED",
  "MANDATE_ACCEPTED",
  "MANDATE_REJECTED",
  "MANDATE_REVOKED",
  // Používateľ
  "USER_LOGIN",
  "USER_LOGOUT",
  // Firma
  "COMPANY_CONNECTED",
  "SECURITY_SETTINGS_UPDATED",
  // Virtuálna kancelária
  "DOCUMENT_UPLOADED",
  "DOCUMENT_SIGNED",
  // --- ADD THIS LINE ---
  "MANDATE_VERIFICATION_ATTEMPT"
  // --- END ADDED LINE ---
]);

// --- Companies Table ---
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ico: varchar("ico", { length: 10 }).notNull().unique(),
  dic: varchar("dic", { length: 12 }),
  icDph: varchar("ic_dph", { length: 15 }),
  nazov: varchar("nazov", { length: 255 }).notNull(),
  sidloUlica: varchar("sidlo_ulica", { length: 255 }),
  sidloCislo: varchar("sidlo_cislo", { length: 50 }),
  sidloMesto: varchar("sidlo_mesto", { length: 255 }),
  sidloPsc: varchar("sidlo_psc", { length: 20 }),
  registracnySud: varchar("registracny_sud", { length: 255 }),
  cisloVlozky: varchar("cislo_vlozky", { length: 255 }),
  datumZapisu: date("datum_zapisu"),
  pravnaForma: varchar("pravna_forma", { length: 255 }),
  stat: varchar("stat", { length: 2 }).notNull().default("SK"),
  stav: companyStatusEnum("stav").notNull().default("pending_verification"),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  enforceTwoFactorAuth: boolean("enforce_two_factor_auth").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// --- User Company Mandates Table ---
export const userCompanyMandates = pgTable("user_company_mandates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  rola: varchar("rola", { length: 255 }).notNull(),
  rozsahOpravneni: mandateRozsahOpravneniEnum("rozsah_opravneni").notNull(),
  platnyOd: date("platny_od").notNull(),
  platnyDo: date("platny_do"),
  zdrojOverenia: varchar("zdroj_overenia", { length: 255 }).notNull().default("OR SR Mock"),
  stav: mandateStatusEnum("stav").notNull().default("pending_confirmation"),
  isVerifiedByKep: boolean("is_verified_by_kep").notNull().default(false),
  invitationContext: varchar("invitation_context", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
export const insertUserCompanyMandateSchema = createInsertSchema(userCompanyMandates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserCompanyMandate = z.infer<typeof insertUserCompanyMandateSchema>;
export type UserCompanyMandate = typeof userCompanyMandates.$inferSelect;

// --- Audit Logs Table ---
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  actionType: auditActionTypeEnum("action_type").notNull(),
  details: text("details").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: varchar("company_id").references(() => companies.id),
});
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
// --- API Keys Table ---
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keyPrefix: varchar("key_prefix", { length: 16 }).notNull().unique(), // Changed from 8 to 16
  hashedKey: text("hashed_key").notNull(), // This is already text type, no length needed
  customerName: varchar("customer_name", { length: 255 }).notNull(), // RENAMED from clientId -> customerName
  status: apiKeyStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});
export type ApiKey = typeof apiKeys.$inferSelect;

// Add insert schema + type for apiKeys (consistent with other tables)
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

// --- Saved Attestations ---

export const savedAttestations = pgTable('saved_attestations', {
  id: varchar('id').primaryKey().$defaultFn(() => `attest_${nanoid()}`),

  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  documentId: varchar('document_id').notNull().references(() => virtualOfficeDocuments.id, { onDelete: 'cascade' }),
  documentTitle: text('document_title').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const savedAttestationsRelations = relations(savedAttestations, ({ one }) => ({
  user: one(users, {
    fields: [savedAttestations.userId],
    references: [users.id],
  }),
  document: one(virtualOfficeDocuments, {
    fields: [savedAttestations.documentId],
    references: [virtualOfficeDocuments.id],
  }),
}));

// Insert schema + types for saved attestations
export const insertSavedAttestationSchema = createInsertSchema(savedAttestations).omit({
  id: true,
  createdAt: true,
});
export type InsertSavedAttestation = z.infer<typeof insertSavedAttestationSchema>;
export type SavedAttestation = typeof savedAttestations.$inferSelect;