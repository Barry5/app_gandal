declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
  export default AsyncStorage;
}

declare module 'expo-file-system' {
  export const documentDirectory: string;
  export const cacheDirectory: string;

  export interface FileInfo {
    exists: boolean;
    size?: number;
  }

  export interface DownloadProgressData {
    totalBytesWritten: number;
    totalBytesExpected: number;
  }

  export interface DownloadResumable {
    downloadAsync(): Promise<{ status: number } | undefined>;
    cancel(): Promise<void>;
  }

  export function getInfoAsync(path: string): Promise<FileInfo>;
  export function deleteAsync(path: string): Promise<void>;
  export function makeDirectoryAsync(path: string, options?: { intermediates?: boolean }): Promise<void>;
  export function createDownloadResumable(
    uri: string,
    fileUri: string,
    options?: Record<string, unknown>,
    callback?: (progress: DownloadProgressData) => void
  ): DownloadResumable;
  export function getFreeDiskStorageAsync(): Promise<number>;
  export function copyAsync(options: { from: string; to: string }): Promise<void>;
}

declare module 'expo-crypto' {
  export function getRandomBytesAsync(length: number): Promise<Uint8Array>;
}

declare module 'expo-sharing' {
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(path: string, options?: { mimeType?: string; dialogTitle?: string }): Promise<void>;
}

declare module 'expo-image-picker' {
  export const UIImagePickerControllerQuality: {
    Medium: unknown;
  };

  export function requestMediaLibraryPermissionsAsync(): Promise<{ granted: boolean }>;
  export function requestCameraPermissionsAsync(): Promise<{ granted: boolean }>;
  export function launchImageLibraryAsync(options?: Record<string, unknown>): Promise<{
    canceled: boolean;
    assets: Array<{
      uri: string;
      fileName?: string | null;
      fileSize?: number;
      mimeType?: string;
    }>;
  }>;
  export function launchCameraAsync(options?: Record<string, unknown>): Promise<{
    canceled: boolean;
    assets: Array<{
      uri: string;
      fileName?: string | null;
      fileSize?: number;
      mimeType?: string;
    }>;
  }>;
}
