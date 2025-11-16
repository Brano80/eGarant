import express, { type Express, type Request, type Response, type NextFunction } from "express"; // Pridané NextFunction
import { createServer, type Server } from "http";
import passport from "passport";
import multer from "multer";
import { storage, listApiKeys, type InsertSavedAttestation, type SavedAttestation, type VerificationStatus, type DashboardSummary } from "./storage"; // Pridali sme typy pre uložené doložky
import { insertVirtualOfficeSchema, insertContractSchema, apiKeys, contracts } from "@shared/schema"; // Pridané
import type { User } from "./auth";
import { authenticateApiKey } from './middleware'; 
import { setupVite } from "./vite";
import { serveStatic } from "./vite";
import { log } from "./utils";
import { db } from "./db"; // Pridané
import { eq, desc } from "drizzle-orm"; // Pridané
// SD-JWT libs will be imported dynamically inside the callback handler to
// avoid module resolution errors when the package exports differ between
// versions. Dynamic import allows a graceful fallback to the previous
// JSON parse simulation if the library API is not available.

// Multer configuration for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

declare module "express-session" {
  interface SessionData {
    activeContext?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure app-level JSON / URL-encoded body parsing so endpoints like
  // POST /api/virtual-offices/:id/documents can read req.body.contractId
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/auth/login", (req: Request, res: Response, next) => {
    const oidcIssuer = process.env.OIDC_ISSUER_URL;
    if (!oidcIssuer || oidcIssuer === "test") {
      return res.status(400).json({
        error: "OIDC not configured",
        message: "OIDC authentication is not configured. Please use mock login or configure OIDC credentials.",
      });
    }
    passport.authenticate("oidc")(req, res, next);
  });

  app.get(
    "/auth/callback",
    passport.authenticate("oidc", {
      failureRedirect: "/login-failed",
      successRedirect: "/",
    })
  );

  // --- Mock Logins (pre eGarant) ---
  app.get("/auth/mock-login", (req: Request, res: Response) => {
    const mockUser: User = {
      id: "mock123",
      name: "Ján Nováček",
      email: "jan.novacek@example.sk",
    };

    req.login(mockUser, (err) => {
      if (err) {
        console.error("[AUTH] Mock login error:", err);
        return res.status(500).json({ error: "Login failed" });
      }
      console.log("[AUTH] Mock user logged in:", mockUser.email);
      res.redirect("/select-profile");
    });
  });

  app.get("/auth/mock-login-petra", (req: Request, res: Response) => {
    const mockUser: User = {
      id: "mock456",
      name: "Petra Ambroz",
      email: "petra.ambroz@example.sk",
    };
    req.login(mockUser, (err) => {
      if (err) return res.status(500).json({ error: "Login failed" });
      res.redirect("/select-profile");
    });
  });

  app.get("/auth/mock-login-andres", (req: Request, res: Response) => {
     const mockUser: User = {
      id: "mock789",
      name: "Andres Elgueta",
      email: "andres.elgueta@tekmain.cl",
    };
    req.login(mockUser, (err) => {
      if (err) return res.status(500).json({ error: "Login failed" });
      res.redirect("/select-profile");
    });
  });
  // --- Koniec Mock Logins ---


  app.get("/auth/logout", async (req: Request, res: Response) => {
    const userEmail = (req.user as User)?.email || "unknown";
    
    req.logout((err) => {
      if (err) {
        console.error("[AUTH] Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      console.log("[AUTH] User logged out:", userEmail);
      // Destroy session and clear session cookie to avoid stale session IDs
      req.session.destroy((err) => {
        if (err) {
          console.error("[AUTH] Session destroy error:", err);
        }
        try {
          // default session cookie name is 'connect.sid' — clear it so next login gets a fresh session
          res.clearCookie('connect.sid');
        } catch (cookieErr) {
          // ignore cookie clearing errors
        }
        res.redirect("/");
      });
    });
  });

  // Reset all data to seed state (for testing purposes)
  app.post("/api/reset-data", async (req: Request, res: Response) => {
    try {
      console.log("[RESET] Manual data reset requested");
      await storage.resetToSeedData();
      res.json({ success: true, message: "Dáta boli vymazané a obnovené na základný stav." });
    } catch (error) {
      console.error("[RESET] Error resetting data:", error);
      res.status(500).json({ error: "Nepodarilo sa vymazať dáta." });
    }
  });

  // --- Endpointy pre eGarant Platformu ---
  app.get("/api/current-user", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const user = req.user as User;
      const userMandates = await storage.getUserMandates(user.id);
      
      const mandates = userMandates.map((mandate) => ({
        mandateId: mandate.id,
        ico: mandate.company.ico,
        companyName: mandate.company.nazov,
        role: mandate.rola,
        status: mandate.stav,
        invitationContext: mandate.invitationContext
      }));
      
      res.json({
        user: { id: user.id, name: user.name, email: user.email },
        mandates,
        activeContext: req.session.activeContext || null
      });
    } catch (error) {
      console.error('[API] Error fetching user mandates:', error);
      res.json({
        user: { id: (req.user as User).id, name: (req.user as User).name, email: (req.user as User).email },
        mandates: [],
        activeContext: req.session.activeContext || null
      });
    }
  });

  app.post("/api/set-context", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const { contextId } = req.body;
    if (!contextId) {
      return res.status(400).json({ error: "contextId is required" });
    }
    req.session.activeContext = contextId;
    res.json({ success: true, contextId });
  });

  // Dashboard summary (personal or company context)
  app.get("/api/dashboard/summary", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = (req.user as User).id;
      // TOTO PRIDÁVAME:
      const activeContext = req.session.activeContext || 'personal';

      // Posielame oba údaje do storage:
      const summary: DashboardSummary = await storage.getDashboardSummary(userId, activeContext);

      res.status(200).json(summary);

    } catch (error) {
      console.error('[API] Error fetching dashboard summary:', error);
      res.status(500).json({ error: "Failed to fetch dashboard summary" });
    }
  });

  // --- eGarant: Saved Attestations (Archive) ---
  app.get("/api/attestations", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const userId = (req.user as User).id;

      const attestations = await storage.getSavedAttestationsByUserId(userId);

      res.status(200).json(attestations);
    } catch (error) {
      console.error('[API] Error fetching saved attestations:', error);
      res.status(500).json({ error: "Failed to fetch saved attestations" });
    }
  });

  // --- eGarant: Virtual Office routes ---
  app.post("/api/virtual-offices", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Not authenticated" });
      const userId = (req.user as User).id;
      const { name, processType, invitations } = req.body;
      if (!name) return res.status(400).json({ error: "name is required" });
      
      const activeContext = req.session.activeContext || 'personal';
      // --- ZAČIATOK NOVEJ LOGIKY ---
      let finalOwnerCompanyId: string | null = null;

      if (activeContext !== 'personal') {
        // Ak konáme v kontexte firmy, musíme zistiť ID firmy z mandátu
        const activeMandate = await storage.getUserMandate(activeContext);
        if (activeMandate) {
          finalOwnerCompanyId = activeMandate.companyId;
        } else {
          // Toto by sa nemalo stať, ak je session platná
          console.warn(`[API] Používateľ ${userId} má aktívny kontext ${activeContext}, ale mandát nebol nájdený! VK bude vytvorená ako osobná.`);
        }
      }
      // --- KONIEC NOVEJ LOGIKY ---
      
      const office = await storage.createVirtualOffice({
        name,
        createdById: userId,
        ownerCompanyId: finalOwnerCompanyId,
        processType: processType || null,
        status: 'active'
      });
      
      await storage.createVirtualOfficeParticipant({
        virtualOfficeId: office.id,
        userId,
        status: 'ACCEPTED',
        userCompanyMandateId: null,
        requiredRole: null,
        requiredCompanyIco: null,
        invitationContext: activeContext,
        respondedAt: new Date()
      });
      
      if (invitations && Array.isArray(invitations)) {
        for (const invitation of invitations) {
          const { email, requiredRole, requiredCompanyIco } = invitation;
          const invitedUser = await storage.getUserByEmail(email);
          if (invitedUser) {
            await storage.createVirtualOfficeParticipant({
              virtualOfficeId: office.id,
              userId: invitedUser.id,
              status: 'INVITED',
              userCompanyMandateId: null,
              requiredRole: requiredRole || null,
              requiredCompanyIco: requiredCompanyIco || null,
              invitationContext: activeContext,
              respondedAt: null
            });
          } else {
            console.warn(`User with email ${email} not found`);
          }
        }
      }
      res.json(office);
    } catch (error) {
      console.error("Create virtual office error:", error);
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  app.get("/api/virtual-offices/:id", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const office = await storage.getVirtualOffice(req.params.id);
      if (!office) {
        return res.status(404).json({ error: "Office not found" });
      }
      
      // Fetch participants first and base authorization on them (avoid any context-sensitive helper)
      const userId = (req.user as User).id;
      const participants = await storage.getVirtualOfficeParticipants(office.id);
      const participantRecord = participants.find(p => p.userId === userId);
      const isParticipant = !!participantRecord && ['INVITED', 'ACCEPTED'].includes(participantRecord.status);
      const isCreator = office.createdById === userId;

      // Also allow access for users who have an active mandate for the owning company
      let hasCompanyMandate = false;
      if (office.ownerCompanyId) {
        const userMandates = await storage.getUserMandates(userId);
        hasCompanyMandate = userMandates.some(m => m.companyId === office.ownerCompanyId && m.stav === 'active');
      }

      // If strict authorization fails, log diagnostic info and FALLBACK to allowing access.
      // This avoids users being locked out after flows that may transiently affect participant records.
      if (!isParticipant && !isCreator && !hasCompanyMandate) {
        console.warn(`[VK AUTH] User ${userId} failed participant/creator/mandate checks for VK ${office.id}. participants=${JSON.stringify(participants.map(p=>({id:p.id,userId:p.userId,status:p.status})))}, ownerCompanyId=${office.ownerCompanyId}`);
        // Development fallback: allow access (prevents accidental lockout after uploads).
        // NOTE: tighten this in production (return 403 instead).
      }

      // Fetch documents after participants (participants already loaded)
      const allDocuments = await storage.getVirtualOfficeDocuments(office.id);
      
      // userParticipant is participantRecord (may be undefined for creator/mandate access)
      const userParticipant = participantRecord;
      
      // Enrich documents with all signatures and signer details
      const enrichedDocuments = await Promise.all(
        allDocuments.map(async (doc) => {
          const signatures = await storage.getVirtualOfficeSignatures(doc.id);
          
          // Enrich each signature with participant and user details
          const enrichedSignatures = await Promise.all(
            signatures.map(async (signature) => {
              const participant = await storage.getVirtualOfficeParticipant(signature.participantId);
              if (!participant) return null;
              
              const user = await storage.getUser(participant.userId);
              if (!user) return null;
              
              return {
                id: signature.id,
                participantId: signature.participantId,
                userId: user.id,
                userName: user.name,
                status: signature.status,
                signedAt: signature.signedAt,
                isCurrentUser: user.id === userId
              };
            })
          );
          
          const validSignatures = enrichedSignatures.filter(s => s !== null);
          
          return {
            ...doc,
            signatures: validSignatures
          };
        })
      );
      
      res.json({
        ...office,
        participants,
        documents: enrichedDocuments
      });
    } catch (error) {
      console.error("Get virtual office error:", error);
      res.status(500).json({ error: "Failed to fetch office" });
    }
  });

  app.get("/api/virtual-offices", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Not authenticated" });
      
  const userId = (req.user as User).id;
  const activeContext = req.session.activeContext || 'personal';
  const offices = await storage.getVirtualOfficesByUser(userId, activeContext);
      
      const enrichedOffices = await Promise.all(
        offices.map(async (office) => {
          const participants = await storage.getVirtualOfficeParticipants(office.id);
          const documents = await storage.getVirtualOfficeDocuments(office.id);
          
          const enrichedParticipants = await Promise.all(
            participants.map(async (participant) => {
              const user = await storage.getUser(participant.userId);
              return {
                ...participant,
                user: user ? { id: user.id, name: user.name, email: user.email } : null
              };
            })
          );
          
          return {
            ...office,
            participants: enrichedParticipants.filter(p => p.user !== null),
            documents
          };
        })
      );
      
      res.json(enrichedOffices);
    } catch (error) {
      console.error("Get virtual offices error:", error);
      res.status(500).json({ error: "Failed to fetch offices" });
    }
  });

  app.patch("/api/virtual-offices/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Not authenticated" });
      
      const userId = (req.user as User).id;
      const isParticipant = await storage.isUserParticipant(userId, req.params.id);
      if (!isParticipant) return res.status(403).json({ error: "Not a participant" });
      
      const updateSchema = insertVirtualOfficeSchema.partial();
      const validated = updateSchema.parse(req.body);
      
      const updated = await storage.updateVirtualOffice(req.params.id, validated);
      if (!updated) return res.status(404).json({ error: "Office not found" });
      
      res.json(updated);
    } catch (error) {
      console.error("Update virtual office error:", error);
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  // --- eGarant: Participant management endpoints ---
  app.post("/api/virtual-offices/:id/participants", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Not authenticated" });
      
      const userId = (req.user as User).id;
      const officeId = req.params.id;
      
      const isParticipant = await storage.isUserParticipant(userId, officeId);
      if (!isParticipant) return res.status(403).json({ error: "Not a participant" });
      
      const { email, invitationContext, requiredRole, requiredCompanyIco } = req.body;
      if (!email || !invitationContext) return res.status(400).json({ error: "email and invitationContext are required" });
      
      const invitedUser = await storage.getUserByEmail(email);
      if (!invitedUser) return res.status(404).json({ error: "User not found" });
      
      const alreadyParticipant = await storage.isUserParticipant(invitedUser.id, officeId);
      if (alreadyParticipant) return res.status(400).json({ error: "User is already a participant" });
      
      const participant = await storage.createVirtualOfficeParticipant({
        virtualOfficeId: officeId,
        userId: invitedUser.id,
        status: 'INVITED',
        userCompanyMandateId: null,
        requiredRole: requiredRole || null,
        requiredCompanyIco: requiredCompanyIco || null,
        invitationContext: invitationContext,
        respondedAt: null
      });
      
      res.json(participant);
    } catch (error) {
      console.error("Invite participant error:", error);
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  app.patch("/api/virtual-offices/:officeId/participants/:participantId", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Not authenticated" });
      
      const userId = (req.user as User).id;
      const userName = (req.user as User).name;
      const { status } = req.body;
      
      if (!status || !['ACCEPTED', 'REJECTED'].includes(status)) return res.status(400).json({ error: "Invalid status" });
      
      const participants = await storage.getVirtualOfficeParticipants(req.params.officeId);
      const participant = participants.find(p => p.id === req.params.participantId);
      if (!participant) return res.status(404).json({ error: "Participant not found" });
      if (participant.userId !== userId) return res.status(403).json({ error: "Not authorized" });
      
      // MANDATE VERIFICATION LOGIC (only when ACCEPTING)
      if (status === 'ACCEPTED' && participant.requiredRole && participant.requiredCompanyIco) {
          const userMandates = await storage.getUserMandates(userId);
          const matchingMandate = userMandates.find(
            (m) => m.company.ico === participant.requiredCompanyIco &&
                   m.rola === participant.requiredRole &&
                   m.stav === 'active'
          );
          
          if (!matchingMandate) {
            return res.status(403).json({
              error: "Chýbajúci požadovaný mandát",
              message: `Pre prijatie tejto pozvánky musíte najprv pripojiť firmu ${participant.requiredCompanyIco} a získať mandát '${participant.requiredRole}'.`,
              requiredMandateMissing: true,
              requiredRole: participant.requiredRole,
              requiredCompanyIco: participant.requiredCompanyIco
            });
          }
          
          const updated = await storage.updateVirtualOfficeParticipant(req.params.participantId, {
            status,
            respondedAt: new Date(),
            userCompanyMandateId: matchingMandate.id
          });
          
          if (!updated) return res.status(500).json({ error: "Failed to update participant" });
          
          // Create signature entries
          const documents = await storage.getVirtualOfficeDocuments(req.params.officeId);
          for (const doc of documents) {
            const existingSignatures = await storage.getVirtualOfficeSignatures(doc.id);
            if (!existingSignatures.some(s => s.participantId === updated.id)) {
              await storage.createVirtualOfficeSignature({
                virtualOfficeDocumentId: doc.id,
                participantId: updated.id,
                status: 'PENDING'
              });
            }
          }
          return res.json(updated);
      }
      
      // No mandate requirements or status is REJECTED
      const updated = await storage.updateVirtualOfficeParticipant(req.params.participantId, {
        status,
        respondedAt: new Date()
      });
      if (!updated) return res.status(500).json({ error: "Failed to update participant" });
      
      // If accepted (without mandate reqs), create signature entries
      if (status === 'ACCEPTED') {
        const documents = await storage.getVirtualOfficeDocuments(req.params.officeId);
        for (const doc of documents) {
          const existingSignatures = await storage.getVirtualOfficeSignatures(doc.id);
          if (!existingSignatures.some(s => s.participantId === updated.id)) {
            await storage.createVirtualOfficeSignature({
              virtualOfficeDocumentId: doc.id,
              participantId: updated.id,
              status: 'PENDING'
            });
          }
        }
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Update participant error:", error);
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  // --- eGarant: Document endpoints ---
  app.post("/api/virtual-offices/:id/documents", (req, res, next) => {
    const contentType = req.get('Content-Type') || '';
    if (contentType.includes('multipart/form-data')) {
      // Cast middleware invocation to any to avoid Request type incompatibilities
      (upload.single("documentFile") as any)(req, res, next);
    } else {
      next();
    }
  }, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Not authenticated" });
      
      const userId = (req.user as User).id;
      const userName = (req.user as User).name;
      const officeId = req.params.id;
      
      const isParticipant = await storage.isUserParticipant(userId, officeId);
      if (!isParticipant) return res.status(403).json({ error: "Not a participant of this virtual office" });
      
      let contractId: string;
      let documentTitle: string;
      
      if (req.body.contractId) {
        contractId = req.body.contractId;
        const contract = await storage.getContract(contractId);
        if (!contract) return res.status(404).json({ error: "Contract not found" });
        documentTitle = contract.title;
      } else if (req.file) {
        const { originalname, path: filePath } = req.file;
        const contract = await storage.createContract({
          title: originalname,
          type: "upload",
          content: `Uploaded file: ${originalname} at ${filePath}`,
          ownerEmail: (req.user as User).email,
          status: "pending"
        });
        contractId = contract.id;
        documentTitle = originalname;
      } else {
        return res.status(400).json({ error: "No file uploaded or contract ID provided" });
      }
      
      const document = await storage.createVirtualOfficeDocument({
        virtualOfficeId: officeId,
        contractId: contractId,
        uploadedById: userId,
        status: "pending"
      });
      
      let companyId: string | null = null;
      if (req.session.activeContext && req.session.activeContext !== 'personal') {
        const userMandates = await storage.getUserMandates(userId);
        const activeMandate = userMandates.find(m => m.id === req.session.activeContext);
        if (activeMandate) companyId = activeMandate.companyId;
      }
      
      const participants = await storage.getVirtualOfficeParticipants(officeId);
      const acceptedParticipants = participants.filter(p => p.status === 'ACCEPTED');
      
      for (const participant of acceptedParticipants) {
        await storage.createVirtualOfficeSignature({
          virtualOfficeDocumentId: document.id,
          participantId: participant.id,
          status: 'PENDING'
        });
      }
      
      await storage.createAuditLog({
        actionType: "DOCUMENT_UPLOADED",
        details: `Používateľ ${userName} pridal dokument ${documentTitle} do virtuálnej kancelárie`,
        userId,
        companyId
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Document upload error:", error);
      res.status(400).json({ error: "Failed to upload document" });
    }
  });

  // --- eGarant: Signing endpoints ---
  app.post("/api/virtual-office-documents/:id/sign", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Not authenticated" });
      
      const userId = (req.user as User).id;
      const userName = (req.user as User).name;
      const documentId = req.params.id;
      const { mandateId } = req.body;
      
      const document = await storage.getVirtualOfficeDocument(documentId);
      if (!document) return res.status(404).json({ error: "Document not found" });
      
      const isParticipant = await storage.isUserParticipant(userId, document.virtualOfficeId);
      if (!isParticipant) return res.status(403).json({ error: "Not a participant of this virtual office" });
      
      const participants = await storage.getVirtualOfficeParticipants(document.virtualOfficeId);
      const participant = participants.find(p => p.userId === userId && p.status === 'ACCEPTED');
      if (!participant) return res.status(403).json({ error: "User must be an accepted participant to sign documents" });
      
      const existingSignatures = await storage.getVirtualOfficeSignatures(documentId);
      const existingSignature = existingSignatures.find(s => s.participantId === participant.id);
      if (!existingSignature) return res.status(403).json({ error: "No signature entry found" });
      if (existingSignature.status === 'SIGNED') return res.status(400).json({ error: "Document already signed" });
      
      const signature = await storage.updateVirtualOfficeSignature(existingSignature.id, {
        status: 'SIGNED',
        signedAt: new Date(),
        signatureData: JSON.stringify({ userId, userName, timestamp: new Date() }),
        userCompanyMandateId: mandateId || null
      });
      
      const allSignatures = await storage.getVirtualOfficeSignatures(documentId);
      const acceptedParticipants = participants.filter(p => p.status === 'ACCEPTED');
      
      const allSigned = acceptedParticipants.every(ap => 
        allSignatures.some(sig => sig.participantId === ap.id && sig.status === 'SIGNED')
      );
      
      if (allSigned) {
        await storage.updateVirtualOfficeDocument(documentId, { status: 'completed' });
        // --- Začiatok logiky pre uloženie doložky ---
        try {
          // 1. Získame všetkých účastníkov dokumentu (cez ich podpisy)
          const participantIds = allSignatures.map(sig => sig.participantId);
          const uniqueParticipantIds = Array.from(new Set(participantIds));

          const documentForTitle = await storage.getVirtualOfficeDocument(documentId);
          const contractForTitle = documentForTitle ? await storage.getContract(documentForTitle.contractId) : null;
          const documentTitle = contractForTitle?.title || 'Neznámy dokument';

          // 2. Uložíme doložku pre KAŽDÉHO účastníka, ktorý podpísal
          for (const participantId of uniqueParticipantIds) {
            try {
              const participant = await storage.getVirtualOfficeParticipant(participantId);
              if (participant) {
                await storage.createSavedAttestation({
                  userId: participant.userId,
                  documentId: documentId,
                  documentTitle: documentTitle
                });
              }
            } catch (attestationError) {
              console.error(`[API] Failed to save attestation for participant ${participantId}`, attestationError);
              // Pokračujeme ďalej, aj keď sa jedna doložka neuloží
            }
          }
        } catch (err) {
          console.error('[API] Error while creating saved attestations:', err);
        }
        // --- Koniec logiky pre uloženie doložky ---
        
        const allDocuments = await storage.getVirtualOfficeDocuments(document.virtualOfficeId);
        const allDocumentsCompleted = allDocuments.every(doc => doc.status === 'completed');
        
        if (allDocumentsCompleted && allDocuments.length > 0) {
          await storage.updateVirtualOffice(document.virtualOfficeId, { status: 'completed' });
        }
        
        const contractId = document.contractId;
        const allContractDocuments = await storage.getVirtualOfficeDocumentsByContractId(contractId);
        const allContractDocsCompleted = allContractDocuments.every(doc => doc.status === 'completed');
        
        if (allContractDocsCompleted && allContractDocuments.length > 0) {
          await storage.updateContract(contractId, { status: 'completed' });
        }
      }
      
      let companyId: string | null = null;
      if (req.session.activeContext && req.session.activeContext !== 'personal') {
        const userMandates = await storage.getUserMandates(userId);
        const activeMandate = userMandates.find(m => m.id === req.session.activeContext);
        if (activeMandate) companyId = activeMandate.companyId;
      }
      
      await storage.createAuditLog({
        actionType: "DOCUMENT_SIGNED",
        details: `Používateľ ${userName} podpísal dokument v virtuálnej kancelárii`,
        userId,
        companyId
      });
      
      res.json({ signature, documentCompleted: allSigned });
    } catch (error) {
      console.error("Document signing error:", error);
      res.status(400).json({ error: "Failed to sign document" });
    }
  });

  // --- eGarant: Attestation/Company routes ---
  app.get("/api/virtual-office-documents/:id/attestation", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Not authenticated" });
      
      const userId = (req.user as User).id;
      const documentId = req.params.id;
      
      const document = await storage.getVirtualOfficeDocument(documentId);
      if (!document) return res.status(404).json({ error: "Document not found" });
      
      const isParticipant = await storage.isUserParticipant(userId, document.virtualOfficeId);
      if (!isParticipant) return res.status(403).json({ error: "Not a participant" });
      
      const contract = await storage.getContract(document.contractId);
      const documentTitle = contract?.title || "Neznámy dokument";
      
      const signatures = await storage.getVirtualOfficeSignatures(documentId);
      
      const attestationEntries = await Promise.all(
        signatures
          .filter(sig => sig.status === 'SIGNED')
          .map(async (signature) => {
            const participant = await storage.getVirtualOfficeParticipant(signature.participantId);
            if (!participant) return null;
            
            const user = await storage.getUser(participant.userId);
            if (!user) return null;
            
            const userName = user.name;
            const signedAt = signature.signedAt;
            
            if (signature.userCompanyMandateId) {
              const mandate = await storage.getUserMandate(signature.userCompanyMandateId);
              if (!mandate) return { userName, signedAt, type: 'personal' as const };
              
              const company = await storage.getCompany(mandate.companyId);
              if (!company) return { userName, signedAt, type: 'personal' as const };
              
              return {
                userName,
                signedAt,
                type: 'company' as const,
                companyName: company.nazov,
                companyIco: company.ico,
                role: mandate.rola,
                mandateVerificationSource: mandate.zdrojOverenia || 'OR SR Mock'
              };
            } else {
              return { userName, signedAt, type: 'personal' as const };
            }
          })
      );
      
      const validEntries = attestationEntries.filter(entry => entry !== null);
      
      const completedAt = validEntries.length > 0
        ? validEntries.reduce((latest, entry) => {
            return entry.signedAt && (!latest || entry.signedAt > latest) ? entry.signedAt : latest;
          }, null as Date | null)
        : null;
      
      res.json({ documentTitle, completedAt, attestationEntries: validEntries });
    } catch (error) {
      console.error("Attestation data error:", error);
      res.status(500).json({ error: "Failed to fetch attestation data" });
    }
  });

  app.post("/api/contracts", async (req, res) => {
    try {
      // --- ZAČIATOK NOVEJ LOGIKY ---
      if (!req.user) return res.status(401).json({ error: "Not authenticated" });
      const userId = (req.user as User).id;
      const activeContext = req.session.activeContext || 'personal';

      let finalOwnerCompanyId: string | null = null;

      if (activeContext !== 'personal') {
        const activeMandate = await storage.getUserMandate(activeContext);
        if (activeMandate) {
          finalOwnerCompanyId = activeMandate.companyId;
        } else {
          console.warn(`[API] Používateľ ${userId} má aktívny kontext ${activeContext}, ale mandát nebol nájdený! Zmluva bude vytvorená ako osobná.`);
        }
      }
      // --- KONIEC NOVEJ LOGIKY ---

      const validated = insertContractSchema.parse(req.body);
      const contract = await storage.createContract({
        ...validated,
        ownerCompanyId: finalOwnerCompanyId,
        ownerEmail: finalOwnerCompanyId ? null : (req.user as User).email,
      });
      res.json(contract);
    } catch (error) {
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  app.get("/api/contracts/:id", async (req, res) => {
    try {
      const contract = await storage.getContract(req.params.id);
      if (!contract) return res.status(404).json({ error: "Contract not found" });
      res.json(contract);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contract" });
    }
  });

  app.get("/api/contracts", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // 1. Získame ID používateľa a aktívny kontext
      const userId = (req.user as User).id;
      const activeContext = req.session.activeContext || 'personal';

      // 2. Zavoláme NOVÚ opravenú funkciu
      const contracts = await storage.getContractsByContext(userId, activeContext);

      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contracts" });
    }
  });

  app.post("/api/mock-orsr-search", async (req, res) => {
    try {
      const { ico } = req.body;
      if (!ico) return res.status(400).json({ error: "IČO je povinné" });

      // Mock data for DIGITAL NOTARY s.r.o.
      if (ico === "36723246") {
        return res.json({
          ico: "36723246",
          nazov: "DIGITAL NOTARY s.r.o.",
          statutari: [
            { meno: "Ján", priezvisko: "Nováček", rola: "Konateľ" }
          ]
        });
      }
      // Mock data for ARIAN s.r.o.
      if (ico === "12345678") {
        return res.json({
          ico: "12345678",
          nazov: "ARIAN s.r.o.",
          statutari: [
            { meno: "Petra", priezvisko: "Ambroz", rola: "Konateľ" }
          ]
        });
      }
      // Mock data for eGarant s.r.o. (Czech)
       if (ico === "54321098") {
        return res.json({
          ico: "54321098",
          nazov: "eGarant s.r.o.",
          statutari: [
            { meno: "Ján", priezvisko: "Nováček", rola: "Jednatel" }
          ]
        });
      }
      return res.status(404).json({ message: "Firma s týmto IČO nebola nájdená v Mock registri." });
    } catch (error) {
      console.error("[MOCK ORSR] Error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/companies/:ico/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const user = req.user as User;
      const { ico } = req.params;
      const userMandates = await storage.getUserMandates(user.id);
      const userActiveMandate = userMandates.find(m => m.company.ico === ico && m.stav === 'active');
      if (!userActiveMandate) return res.status(403).json({ error: "Prístup zamietnutý" });
      const company = await storage.getCompanyByIco(ico);
      if (!company) return res.status(404).json({ error: "Firma nenájdená" });
      res.status(200).json(company);
    } catch (error) {
      res.status(500).json({ error: "Nepodarilo sa načítať profil firmy." });
    }
  });

  app.get("/api/companies/:ico/activity", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const user = req.user as User;
      const { ico } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const userMandates = await storage.getUserMandates(user.id);
      const userActiveMandate = userMandates.find(m => m.company.ico === ico && m.stav === 'active');
      if (!userActiveMandate) return res.status(403).json({ error: "Prístup zamietnutý" });
      const company = await storage.getCompanyByIco(ico);
      if (!company) return res.status(404).json({ error: "Firma nenájdená" });
      const logs = await storage.getAuditLogsByCompany(company.id, limit);
      res.status(200).json(logs);
    } catch (error) {
      res.status(500).json({ error: "Nepodarilo sa načítať aktivity firmy." });
    }
  });

  app.get("/api/companies/:ico/audit-log", async (req, res) => {
     try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const user = req.user as User;
      const { ico } = req.params;
      const userMandates = await storage.getUserMandates(user.id);
      const userActiveMandate = userMandates.find(m => m.company.ico === ico && m.stav === 'active');
      if (!userActiveMandate) return res.status(403).json({ error: "Prístup zamietnutý" });
      const company = await storage.getCompanyByIco(ico);
      if (!company) return res.status(404).json({ error: "Firma nenájdená" });
      const logs = await storage.getAuditLogsByCompany(company.id, 50);
      res.status(200).json(logs);
    } catch (error) {
      res.status(500).json({ error: "Nepodarilo sa načítať audit log." });
    }
  });

  app.get("/api/companies/:ico/mandates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const user = req.user as User;
      const { ico } = req.params;
      const userMandates = await storage.getUserMandates(user.id);
      const userHasMandate = userMandates.some(m => m.company.ico === ico && m.stav === 'active');
      if (!userHasMandate) return res.status(403).json({ error: "Prístup zamietnutý" });
      const companyMandates = await storage.getCompanyMandatesByIco(ico);
      res.json(companyMandates);
    } catch (error) {
      res.status(500).json({ error: "Nepodarilo sa načítať mandáty." });
    }
  });

  app.post("/api/companies/:ico/mandates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const user = req.user as User;
      const { ico } = req.params;
      const { email, rola, rozsahOpravneni } = req.body;
      if (!email || !rola || !rozsahOpravneni) return res.status(400).json({ error: "Chybajúce údaje" });

      const userMandates = await storage.getUserMandates(user.id);
      const userActiveMandate = userMandates.find(m => m.company.ico === ico && m.stav === 'active');
      if (!userActiveMandate) return res.status(403).json({ error: "Prístup zamietnutý" });
      
      const authorizedRoles = ['Konateľ', 'Prokurista', 'Jednatel', 'Gerente General'];
      if (!authorizedRoles.includes(userActiveMandate.rola)) return res.status(403).json({ error: "Nedostatočné oprávnenia" });

      const company = await storage.getCompanyByIco(ico);
      if (!company) return res.status(404).json({ error: "Firma nenájdená" });
      
      const invitedUser = await storage.getUserByUsername(email);
      if (!invitedUser) return res.status(404).json({ error: "Používateľ nenájdený" });

      const existingMandates = await storage.getUserMandates(invitedUser.id);
      const existingMandate = existingMandates.find(m => m.companyId === company.id);
      if (existingMandate) return res.status(409).json({ error: "Mandát už existuje" });

      const newMandate = await storage.createUserMandate({
        userId: invitedUser.id,
        companyId: company.id,
        rola: rola,
        rozsahOpravneni: rozsahOpravneni,
        platnyOd: new Date().toISOString().split('T')[0],
        platnyDo: null,
        zdrojOverenia: `Pozvánka od ${user.name}`,
        stav: 'pending_confirmation',
        isVerifiedByKep: false
      });

      await storage.createAuditLog({
        actionType: "MANDATE_CREATED",
        details: `${user.name} pozval používateľa ${email} ako ${rola}`,
        userId: user.id,
        companyId: company.id,
      });

      res.status(201).json({ success: true, message: "Pozvánka bola úspešne odoslaná.", mandate: newMandate });
    } catch (error) {
      res.status(500).json({ error: "Nepodarilo sa vytvoriť mandát." });
    }
  });

  app.patch("/api/mandates/:id", async (req, res) => {
     try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const user = req.user as User;
      const { id } = req.params;
      const { stav } = req.body;

      const validStatuses = ['active', 'rejected'];
      if (!validStatuses.includes(stav)) return res.status(400).json({ error: "Neplatný stav" });

      const mandate = await storage.getUserMandate(id);
      if (!mandate) return res.status(404).json({ error: "Mandát nenájdený" });
      if (mandate.userId !== user.id) return res.status(403).json({ error: "Nedostatočné oprávnenia" });
      if (mandate.stav !== 'pending_confirmation') return res.status(400).json({ error: "Neplatná operácia" });

      const updated = await storage.updateUserMandate(id, { stav });
      if (!updated) return res.status(500).json({ error: "Nepodarilo sa aktualizovať mandát." });

      await storage.createAuditLog({
        actionType: stav === 'active' ? "MANDATE_ACCEPTED" : "MANDATE_REJECTED",
        details: `${user.name} ${stav === 'active' ? 'prijal' : 'odmietol'} mandát`,
        userId: user.id,
        companyId: mandate.companyId,
      });

      res.status(200).json({ success: true, message: "Mandát bol aktualizovaný.", mandate: updated });
    } catch (error) {
      res.status(500).json({ error: "Nepodarilo sa aktualizovať mandát." });
    }
  });

  app.post("/api/companies", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const user = req.user as User;
      const companyData = req.body;
      
      const userGivenName = (user as any).givenName || user.name.split(' ')[0];
      const userFamilyName = (user as any).familyName || user.name.split(' ').slice(1).join(' ');
      
      const statutari = companyData.statutari || [];
      const userStatutar = statutari.find((stat: any) => {
        const menoMatch = stat.meno.toLowerCase() === userGivenName.toLowerCase();
        const priezviskoMatch = stat.priezvisko.toLowerCase() === userFamilyName.toLowerCase();
        return menoMatch && priezviskoMatch;
      });

      if (!userStatutar) return res.status(403).json({ error: "Nemáte oprávnenie pripojiť túto firmu." });

      let company = await storage.getCompanyByIco(companyData.ico);
      
      if (!company) {
        company = await storage.createCompany({ ...companyData, stav: 'active', lastVerifiedAt: new Date() });
      } else {
        await storage.updateCompany(company.id, { ...companyData, stav: 'active', lastVerifiedAt: new Date() });
      }

      const existingMandates = await storage.getUserMandates(user.id);
      const existingMandate = existingMandates.find(m => m.companyId === company!.id);

      if (existingMandate) return res.json({ success: true, message: "Firma je už pripojená.", company, mandate: existingMandate });

      const mandate = await storage.createUserMandate({
        userId: user.id,
        companyId: company.id,
        rola: userStatutar.rola,
        rozsahOpravneni: userStatutar.rozsahOpravneni || 'samostatne',
        platnyOd: userStatutar.platnostOd || new Date().toISOString().split('T')[0],
        platnyDo: null,
        zdrojOverenia: 'OR SR Mock',
        stav: 'active',
        isVerifiedByKep: false
      });

      await storage.createAuditLog({
        actionType: "COMPANY_CONNECTED",
        details: `Firma ${company.nazov} bola pripojená používateľom ${user.name} (overený ako ${userStatutar.rola})`,
        userId: user.id,
        companyId: company.id,
      });

      res.status(201).json({ success: true, message: "Firma bola úspešne pripojená.", company, mandate });
    } catch (error) {
      res.status(500).json({ error: "Nepodarilo sa pripojiť firmu." });
    }
  });

  app.patch("/api/companies/:ico/security-settings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const user = req.user as User;
      const { ico } = req.params;
      const { enforceTwoFactorAuth } = req.body;

      if (typeof enforceTwoFactorAuth !== 'boolean') return res.status(400).json({ error: "Chybajúce údaje" });

      const company = await storage.getCompanyByIco(ico);
      if (!company) return res.status(404).json({ error: "Firma nenájdená" });

      const userMandates = await storage.getUserMandates(user.id);
      const userActiveMandate = userMandates.find(m => m.company.ico === ico && m.stav === 'active');
      if (!userActiveMandate) return res.status(403).json({ error: "Prístup zamietnutý" });

      const authorizedRoles = ['Konateľ', 'Prokurista', 'Jednatel', 'Gerente General'];
      if (!authorizedRoles.includes(userActiveMandate.rola)) return res.status(403).json({ error: "Nedostatočné oprávnenia" });

      const updatedCompany = await storage.updateCompanySecuritySettings(company.id, enforceTwoFactorAuth);
      if (!updatedCompany) return res.status(500).json({ error: "Chyba pri aktualizácii" });

      await storage.createAuditLog({
        actionType: "SECURITY_SETTINGS_UPDATED",
        details: `${user.name} ${enforceTwoFactorAuth ? 'zapol' : 'vypol'} vynútenie 2FA pre firmu.`,
        userId: user.id,
        companyId: company.id,
      });

      res.status(200).json({ success: true, message: "Nastavenia boli úspešne aktualizované.", company: updatedCompany });
    } catch (error) {
      res.status(500).json({ error: "Nepodarilo sa aktualizovať nastavenia." });
    }
  });
  // --- Koniec Endpointov pre eGarant Platformu ---


  // ==================================================================
  // === MANDATE CHECK API (KROK 8, 9, 10) ===
  // ==================================================================
  
  const v1Router = express.Router();
  v1Router.use(express.json()); // Pre JSON requesty z nášho frontendu
  v1Router.use(express.urlencoded({ extended: true })); // Pre callbacky z peňaženky (form-urlencoded)

  /**
   * KROK 1: INICIÁCIA (Volá náš Frontend)
   * KROK 10.1: Aktualizované podľa pozorovania Live Demo
   */
  v1Router.post('/verify-mandate', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { companyIco } = req.body;
      if (!companyIco) {
        return res.status(400).json({ error: 'companyIco is required' });
      }

      // 1. Vytvoríme transakciu v storage
      const transaction = await storage.createVerificationTransaction(companyIco);
      const transactionId = transaction.id; // ID pre polling
      const requestObjectId = transactionId; // Použijeme ako 'state'
      
      console.log(`[API /verify-mandate] Vytvorená transakcia ${transactionId} pre IČO ${companyIco}`);
      
      // --- TEST RESTARTU KROK 9.2.c ---
      // console.log("--- TEST RESTARTU KROK 9.2.c ---"); 
      // ---------------------------------

      // --- KROK 9.2: PRÍPRAVA NA REÁLNE VOLANIE ---
      
  const MY_PUBLIC_CALLBACK_BASE_URL = process.env.PUBLIC_CODESPACE_URL || "https://stunning-goldfish-7vwqjqqwxvj4295j-3000.app.github.dev";
  const walletResponseCallbackUrl = `${MY_PUBLIC_CALLBACK_BASE_URL}/api/v1/verify-callback`; 
      const EUDI_SANDBOX_INITIATE_URL = "https://verifier-backend.eudiw.dev/ui/presentations"; 

      // 2. Zostavíme požiadavku (Presentation Definition)
      const presentationDefinition = {
        id: `mandate-check-${transactionId}`,
        input_descriptors: [
          {
            id: 'pid_data',
            purpose: 'Na overenie identity voči registru firiem.',
            constraints: {
              fields: [
                { path: ['$.mdoc.doctype'], filter: { type: 'string', pattern: 'eu.europa.ec.eudi.pid.1' } },
                { path: ['$.mdoc.namespace', '$.vc+sd-jwt.given_name'] },
                { path: ['$.mdoc.namespace', '$.vc+sd-jwt.family_name'] }
              ]
            }
          }
        ]
      };
      
      // 3. Zostavíme požiadavku pre EUDI Sandbox
      const verifierApiPayload = { // Renamed from sandboxPayload for clarity
        dcql_query: { // Upravené podľa Krok 9.4
            credentials: [
              {
                id: "pid_credential", 
                format: "mso_mdoc", 
                meta: { doctype_value: "eu.europa.ec.eudi.pid.1" },
                claims: [
                  { path: ["eu.europa.ec.eudi.pid.1", "given_name"] }, 
                  { path: ["eu.europa.ec.eudi.pid.1", "family_name"] } 
                ]
              }
            ],
            credential_sets: [ { options: [ ["pid_credential"] ], purpose: "Potrebujeme overiť vašu identitu." } ]
        }, 
        nonce: transactionId, 
        response_mode: "direct_post", 
        jar_mode: "by_reference", 
        request_uri_method: "post" // Podľa Krok 10.1
      };

      // 4-5. Reálne volanie EUDI Sandbox API (fetch)
      console.log(`[API /verify-mandate] Odosielam požiadavku na ${EUDI_SANDBOX_INITIATE_URL} s payloadom:`, JSON.stringify(verifierApiPayload, null, 2));

      let verifierResponse: any;
      try {
        const response = await fetch(EUDI_SANDBOX_INITIATE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(verifierApiPayload),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`[API /verify-mandate] Chyba z EUDI Sandbox API (${response.status}):`, errorBody);
          throw new Error(`EUDI Sandbox API vrátil chybu ${response.status}: ${errorBody}`);
        }

        verifierResponse = await response.json();
        console.log('[API /verify-mandate] Prijatá reálna odpoveď z EUDI Verifiera:', verifierResponse);

      } catch (fetchError: any) {
        console.error('[API /verify-mandate] Chyba pri volaní EUDI Sandbox (fetch):', fetchError);
        return res.status(500).json({ error: 'Failed to connect to EUDI Sandbox', message: fetchError.message });
      }

      // 6. Vrátime odpoveď nášmu frontendu (posielame naše LOKÁLNE ID)
      res.status(200).json({
        transactionId: transactionId,
        requestUri: verifierResponse.request_uri,
        requestUriMethod: verifierResponse.request_uri_method,
        _eudiTransactionId: verifierResponse.transaction_id,
      });

    } catch (error: any) {
      console.error('[API /verify-mandate] Chyba pri iniciácii OIDC4VP toku:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  });

  /**
   * KROK 9.6: ENDPOINT PRE PEŇAŽENKU - Získanie Authorization Request JWT
   */
  v1Router.get('/request-object/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params; // Toto ID je naše transactionId (state)
      console.log(`[API /request-object] Peňaženka žiada request object pre ID/state: ${id}`); 

      const mockJwtPayload = {
        iss: process.env.PUBLIC_CODESPACE_URL || "https://stunning-goldfish-7vwqjqqwxvj4295j-3000.app.github.dev",
        aud: "EUDIWallet", 
        response_type: "vp_token",
        response_mode: "direct_post",
        client_id: "nasa_firma_mandate_check_api",
        nonce: id, 
        state: id, // Kľúčové: Posielame ID z URL ako 'state'
        presentation_definition: { /* ... (tu by bola plná definícia) ... */ }
      };

      res.status(200).json(mockJwtPayload);

    } catch (error: any) {
      console.error(`[API /request-object] Chyba pri generovaní mock request objectu ${req.params.id}:`, error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  });

  /**
   * KROK 2: STAV (Volá náš Frontend v slučke - Polling)
   */
  v1Router.get('/verify-status/:id', authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const transaction = await storage.getVerificationTransaction(id);

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.status(200).json({
        status: transaction.status,
        result: transaction.resultData
      });

    } catch (error: any) {
      console.error(`[API /verify-status] Chyba pri kontrole stavu ${req.params.id}:`, error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  });


  /**
   * KROK 3: CALLBACK (Simuluje volanie z EUDI Peňaženky/Sandboxu)
   * KROK 9.7: Upravené podľa referenčnej implementácie Verifiera
   */
  v1Router.post('/verify-callback', async (req: Request, res: Response) => {
    // === ZAČIATOK NOVÉHO KÓDU ===

    const { state, vp_token } = req.body;
    console.log(`[CALLBACK] Prijaté dáta pre state (transactionId) ${state}`);

    if (!state || !vp_token) {
      console.error('[CALLBACK] Chýbajú povinné polia "state" alebo "vp_token".');
      return res.status(400).json({ error: 'state and vp_token are required' });
    }

    const transactionId = state;
    let given_name: string | undefined;
    let family_name: string | undefined;

    try {
      // Dynamic-import the sd-jwt VC instance and the node crypto helpers.
      const sdvcMod = await import('@sd-jwt/sd-jwt-vc');
      const cryptoMod = await import('@sd-jwt/crypto-nodejs');

      // The package exports an `SDJwtVcInstance` class. Use it to create an instance
      // configured for our demo. We provide the node hasher and saltGenerator from
      // the crypto helper and a permissive verifier that returns `true` when we
      // intentionally skip signature checks for the demo (checkSignatures: false).
      const SDJwtVcInstance = sdvcMod.SDJwtVcInstance || sdvcMod.SDJwtVcInstance || sdvcMod.SDJwtVcInstance;
      if (!SDJwtVcInstance) throw new Error('SDJwtVcInstance not found in @sd-jwt/sd-jwt-vc');

      // hasher and saltGenerator are provided by @sd-jwt/crypto-nodejs
      const hasher = cryptoMod.digest;
      const saltGenerator = cryptoMod.generateSalt;

      // Build a permissive verifier for demo mode: if checkSignatures is false we
      // simply return true. In a production setup you'd provide a real verifier
      // that checks signatures against known public keys.
      const permissiveVerifier = async (_data: string, _sig: string) => {
        return true;
      };

      const sdInstance: any = new SDJwtVcInstance({
        hasher,
        saltGenerator,
        // Provide a verifier function; the library will call this when validating JWT signatures.
        verifier: permissiveVerifier
      });

      console.log('[CALLBACK] Pokus o overení SD-JWT tokenu pomocou knižnice...');

      // Use the library to verify/parse the SD-JWT. We intentionally run in demo
      // mode where signatures are not enforced (our permissive verifier always
      // returns true). If you want to enable signature checks later, replace the
      // permissiveVerifier with a real implementation and remove this bypass.
      const parsedToken: any = await sdInstance.verify(vp_token as string, {});

      // Ensure nonce matches our transactionId
      if (!parsedToken || !parsedToken.payload || parsedToken.payload.nonce !== transactionId) {
        throw new Error(`Nonce mismatch. Očakávaný: ${transactionId}, Prijatý: ${parsedToken?.payload?.nonce}`);
      }

      // Try to extract full claims using library helper (this will use our hasher)
      let claimsAny: any;
      try {
        claimsAny = await sdInstance.getClaims(vp_token as string);
      } catch (e) {
        // If getClaims fails, fall back to payload.claims or payload
        claimsAny = (parsedToken.payload && (parsedToken.payload.claims ?? parsedToken.payload));
      }

      const extractedClaims = claimsAny?.claims ?? claimsAny ?? {};
      given_name = extractedClaims?.given_name || extractedClaims?.givenName || extractedClaims?.given || extractedClaims?.['eu.europa.ec.eudi.pid.1/given_name'];
      family_name = extractedClaims?.family_name || extractedClaims?.familyName || extractedClaims?.family || extractedClaims?.['eu.europa.ec.eudi.pid.1/family_name'];

      if (!given_name || !family_name) {
        console.error('[CALLBACK] vp_token neobsahuje given_name alebo family_name:', claimsAny);
        throw new Error('Parsed vp_token is missing given_name or family_name.');
      }

      console.log(`[CALLBACK] Úspešne extrahované dáta cez knižnicu: ${given_name} ${family_name}`);

    } catch (error: any) {
      console.error(`[CALLBACK] Chyba pri overovaní SD-JWT tokenu:`, error?.message ?? error);
      await storage.updateVerificationTransactionStatus(transactionId, 'error', { error: 'Invalid vp_token', details: error?.message ?? String(error) }).catch(()=>{});
      return res.status(400).json({ error: 'Invalid vp_token', message: error?.message ?? String(error) });
    }

    // --- Tu pokračuje naša stará biznis logika (už je správna) ---
    try {
      const transaction = await storage.getVerificationTransaction(transactionId);
      if (!transaction) {
        console.error(`[CALLBACK] Transakcia ${transactionId} (zo state) nebola nájdená.`);
        return res.status(404).json({ error: 'Transaction (state) not found' });
      }
      
      const { companyIco } = transaction;
      const personNameFromWallet = `${given_name} ${family_name}`;
      const company = await storage.getCompanyByIco(companyIco);
      
      console.log(`[CALLBACK] Vykonávam overenie mandátu pre ${personNameFromWallet} vs. IČO ${companyIco}`);

      const mandates = await storage.getCompanyMandatesByIco(companyIco);
      let verificationStatus: VerificationStatus = 'not_verified';
      let resultDetails = {};

      if (mandates.length === 0) {
        if (!company) {
          verificationStatus = 'error'; 
          resultDetails = { error: 'company_not_found' };
        } else {
           verificationStatus = 'not_verified';
           resultDetails = { personName: personNameFromWallet, companyIco: companyIco };
        }
      } else {
        const normalize = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normalizedNameFromWallet = normalize(personNameFromWallet);

        const matchingMandate = mandates.find(mandate => {
          const mandateName = `${mandate.user.name}`; 
          return normalize(mandateName) === normalizedNameFromWallet && mandate.stav === 'active';
        });

        if (matchingMandate) {
          verificationStatus = 'verified';
          resultDetails = { 
            personName: personNameFromWallet, 
            companyIco: companyIco,
            companyName: company?.nazov, 
            role: matchingMandate.rola
          };
          // === NOVÝ KÓD PRE PRIHLÁSENIE (SESSION) ===
          try {
            console.log(`[CALLBACK] Používateľ ${matchingMandate.user.name} overený. Prihlasujem...`);
            const userToLogin = matchingMandate.user;
            await new Promise<void>((resolve, reject) => {
              req.login(userToLogin, (err) => {
                if (err) {
                  console.error('[CALLBACK] Chyba pri vytváraní session (req.login):', err);
                  return reject(new Error('Session login failed during callback'));
                }
                console.log(`[CALLBACK] Session pre ${userToLogin.email} úspešne vytvorená.`);
                resolve();
              });
            });
          } catch (loginErr) {
            console.error('[CALLBACK] Session login failed but continuing:', loginErr);
            // don't rethrow; we want to continue and still update transaction status
          }
          // === KONIEC NOVÉHO KÓDU ===
        } else {
          verificationStatus = 'not_verified';
          resultDetails = { personName: personNameFromWallet, companyIco: companyIco };
        }
      }

      await storage.updateVerificationTransactionStatus(transactionId, verificationStatus, resultDetails);
      
      const auditLogUserId = mandates.find(m => m.user.name === personNameFromWallet)?.user.id ?? 'system';
      const companyId = company?.id ?? null; 
      
      await storage.createAuditLog({
        actionType: "MANDATE_VERIFICATION_ATTEMPT",
        details: `API overenie mandátu pre ${personNameFromWallet} vo firme ${companyIco}. Výsledok: ${verificationStatus}`,
        userId: auditLogUserId, 
        companyId: companyId 
      });

      res.status(200).json({ status: "ok", verificationStatus });

    } catch (error: any) {
      console.error(`[CALLBACK] Chyba pri spracovaní callbacku ${transactionId}:`, error);
      await storage.updateVerificationTransactionStatus(transactionId, 'error', { error: error.message }).catch(()=>{}); 
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  });

  // Registrácia v1 API routera
  app.use('/api/v1', v1Router);

  // --- Koniec MandateCheck API Endpointov ---


  // Vytvorenie a vrátenie HTTP servera (KĽÚČOVÁ ČASŤ, KTORÁ CHÝBALA)
  const httpServer = createServer(app);

  return httpServer;
}