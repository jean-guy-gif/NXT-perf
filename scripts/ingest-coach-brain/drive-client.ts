/**
 * Client Google Drive pour l'ingestion (PR-C).
 *
 * Auth : service account dédié GCP (clé JSON dans GOOGLE_SERVICE_ACCOUNT_KEY).
 * Le service account doit être ajouté en "Viewer" sur le dossier source
 * (cf. README — étape 4. Partage du dossier Drive).
 *
 * Scope : lecture seule (`drive.readonly`).
 *
 * Stratégie de download :
 *   - mimeType `application/vnd.google-apps.document` → export en text/plain
 *   - mimeType `text/plain` ou `text/markdown` → download direct (alt=media)
 *   - autres mimeType → skip (logs côté run.ts)
 */

import { google, type drive_v3 } from "googleapis";
import { JWT } from "google-auth-library";
import type { DriveFile } from "./types";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

const SUPPORTED_DOWNLOAD_MIME_TYPES = new Set([
  "application/vnd.google-apps.document",
  "text/plain",
  "text/markdown",
]);

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

export interface DriveClient {
  /**
   * Liste les fichiers dans le dossier source. Filtré côté API au mimeType
   * supporté (Google Doc / texte / markdown). Pagination automatique.
   */
  listFiles(): Promise<DriveFile[]>;
  /**
   * Récupère le contenu texte du fichier. Renvoie `null` si le mimeType
   * n'est pas supporté ou si le téléchargement échoue (run.ts log + skip).
   */
  downloadText(file: DriveFile): Promise<string | null>;
}

export function createDriveClient(
  serviceAccountKeyJson: string,
  folderId: string,
): DriveClient {
  const key = JSON.parse(serviceAccountKeyJson) as ServiceAccountKey;
  const auth = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: SCOPES,
  });
  const drive = google.drive({ version: "v3", auth });

  return {
    async listFiles() {
      const out: DriveFile[] = [];
      let pageToken: string | undefined;

      do {
        const resp = (await drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          fields: "nextPageToken, files(id, name, mimeType, modifiedTime)",
          pageSize: 100,
          pageToken,
        })) as { data: drive_v3.Schema$FileList };

        const files = resp.data.files ?? [];
        for (const f of files) {
          if (
            !f.id ||
            !f.name ||
            !f.mimeType ||
            !SUPPORTED_DOWNLOAD_MIME_TYPES.has(f.mimeType)
          ) {
            continue;
          }
          out.push({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            modifiedTime: f.modifiedTime ?? "",
          });
        }
        pageToken = resp.data.nextPageToken ?? undefined;
      } while (pageToken);

      return out;
    },

    async downloadText(file: DriveFile) {
      try {
        if (file.mimeType === "application/vnd.google-apps.document") {
          const resp = await drive.files.export(
            { fileId: file.id, mimeType: "text/plain" },
            { responseType: "text" },
          );
          return typeof resp.data === "string" ? resp.data : String(resp.data);
        }
        if (
          file.mimeType === "text/plain" ||
          file.mimeType === "text/markdown"
        ) {
          const resp = await drive.files.get(
            { fileId: file.id, alt: "media" },
            { responseType: "text" },
          );
          return typeof resp.data === "string" ? resp.data : String(resp.data);
        }
        return null;
      } catch (err) {
        console.warn("[drive-client] download failed", {
          fileId: file.id,
          name: file.name,
          error: (err as Error).message,
        });
        return null;
      }
    },
  };
}
