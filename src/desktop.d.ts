type GiuliaKey = {
  key: string;
  code: string;
  repeat: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  type: 'keydown' | 'keyup';
};

type UpdateState = {
  status: 'idle' | 'checking' | 'current' | 'available' | 'downloading' | 'restarting' | 'error' | 'unsupported';
  version: string;
  latest?: string;
  progress?: number;
  message?: string;
};

interface GiuliaUpdates {
  getState(): Promise<UpdateState>;
  check(): Promise<UpdateState>;
  install(): Promise<UpdateState>;
  onChange(callback: (state: UpdateState) => void): () => void;
}

interface Window {
  giulia?: {
    isDesktop: true;
    platform: string;
    preview: boolean;
    ready?: () => void;
    onKey(callback: (event: GiuliaKey) => void): () => void;
    updates?: GiuliaUpdates;
  };
}
