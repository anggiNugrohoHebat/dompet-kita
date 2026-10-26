import { Capacitor } from '@capacitor/core';

const googleIdentityScriptUrl = 'https://accounts.google.com/gsi/client';
const appDataFolderScope = 'https://www.googleapis.com/auth/drive.appdata';
const backupFileName = 'dompet-kita-backup.json';
const driveApiUrl = 'https://www.googleapis.com/drive/v3';

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleIdentity = {
  accounts?: {
    oauth2?: {
      initTokenClient: (options: {
        client_id: string;
        scope: string;
        callback: (response: GoogleTokenResponse) => void;
      }) => GoogleTokenClient;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let nativeGoogleLoginInitialized = false;

export type DriveFileMetadata = {
  id: string;
  modifiedTime: string;
};

export async function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) return;

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${googleIdentityScriptUrl}"]`,
    );
    const script = existingScript ?? document.createElement('script');

    const handleLoad = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else {
        reject(new Error('Google Identity Services gagal dimuat.'));
      }
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Tidak dapat memuat Google Identity Services. Periksa koneksi internet.')),
      { once: true },
    );

    if (!existingScript) {
      script.src = googleIdentityScriptUrl;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
}

export async function requestGoogleDriveAccessToken(clientId: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const { SocialLogin } = await import('@capgo/capacitor-social-login');
    if (!nativeGoogleLoginInitialized) {
      await SocialLogin.initialize({
        google: { webClientId: clientId, mode: 'online' },
      });
      nativeGoogleLoginInitialized = true;
    }

    const { result } = await SocialLogin.login({
      provider: 'google',
      options: { scopes: [appDataFolderScope], forceRefreshToken: true },
    });
    const accessToken = result.responseType === 'online' ? result.accessToken?.token : null;
    if (!accessToken) {
      throw new Error('Google tidak memberikan token akses untuk Google Drive.');
    }
    return accessToken;
  }

  await loadGoogleIdentity();
  return new Promise<string>((resolve, reject) => {
    const client = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: appDataFolderScope,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'Google tidak memberikan akses ke Drive.'));
          return;
        }
        resolve(response.access_token);
      },
    });

    if (!client) {
      reject(new Error('Google Identity Services tidak tersedia.'));
      return;
    }

    client.requestAccessToken({ prompt: 'select_account' });
  });
}

async function driveRequest(
  accessToken: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    if (response.status === 401) {
      throw new Error('Sesi Google Drive berakhir. Hubungkan ulang akun Google untuk melanjutkan sinkronisasi.');
    }
    throw new Error(`Google Drive menolak permintaan (${response.status}): ${details || response.statusText}`);
  }

  return response;
}

export async function findDompetKitaBackup(accessToken: string): Promise<DriveFileMetadata | null> {
  const query = encodeURIComponent(
    `name = '${backupFileName}' and 'appDataFolder' in parents and trashed = false`,
  );
  const url = `${driveApiUrl}/files?spaces=appDataFolder&q=${query}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc&pageSize=1`;
  const response = await driveRequest(accessToken, url);
  const result: unknown = await response.json();

  if (
    typeof result !== 'object' ||
    result === null ||
    !('files' in result) ||
    !Array.isArray(result.files)
  ) {
    throw new Error('Respons daftar file dari Google Drive tidak valid.');
  }

  const file = result.files[0];
  if (
    typeof file !== 'object' ||
    file === null ||
    !('id' in file) ||
    typeof file.id !== 'string' ||
    !('modifiedTime' in file) ||
    typeof file.modifiedTime !== 'string'
  ) {
    return null;
  }

  return { id: file.id, modifiedTime: file.modifiedTime };
}

export async function readDompetKitaBackup(
  accessToken: string,
  file: DriveFileMetadata,
): Promise<{ content: string; modifiedTime: string }> {
  const response = await driveRequest(
    accessToken,
    `${driveApiUrl}/files/${encodeURIComponent(file.id)}?alt=media`,
  );
  const metadata = await driveRequest(
    accessToken,
    `${driveApiUrl}/files/${encodeURIComponent(file.id)}?fields=id,modifiedTime`,
  );
  const metadataResult: unknown = await metadata.json();
  if (
    typeof metadataResult !== 'object' ||
    metadataResult === null ||
    !('modifiedTime' in metadataResult) ||
    typeof metadataResult.modifiedTime !== 'string'
  ) {
    throw new Error('Metadata file Google Drive tidak valid.');
  }

  return {
    content: await response.text(),
    modifiedTime: metadataResult.modifiedTime,
  };
}

export async function writeDompetKitaBackup(
  accessToken: string,
  fileId: string | null,
  content: string,
): Promise<DriveFileMetadata> {
  let url: string;
  let contentType: string;
  let body: string;

  if (fileId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,modifiedTime`;
    contentType = 'application/json; charset=UTF-8';
    body = content;
  } else {
    const boundary = `dompetkita_${crypto.randomUUID()}`;
    const metadata = JSON.stringify({
      name: backupFileName,
      mimeType: 'application/json',
      parents: ['appDataFolder'],
    });
    url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime';
    contentType = `multipart/related; boundary=${boundary}`;
    body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      metadata,
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      content,
      `--${boundary}--`,
    ].join('\r\n');
  }

  const response = await driveRequest(accessToken, url, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });
  const result: unknown = await response.json();

  if (
    typeof result !== 'object' ||
    result === null ||
    !('id' in result) ||
    typeof result.id !== 'string' ||
    !('modifiedTime' in result) ||
    typeof result.modifiedTime !== 'string'
  ) {
    throw new Error('Respons penyimpanan file dari Google Drive tidak valid.');
  }

  return { id: result.id, modifiedTime: result.modifiedTime };
}
