export type BootstrapErrorCode =
  | 'node_version'
  | 'pnpm_missing'
  | 'install_failed'
  | 'missing_api_key';

export interface BootstrapOk {
  ok: true;
  skillRoot: string;
  depsInstalled: boolean;
  youtubeKeyConfigured: true;
  nodeModulesPresent: boolean;
}

export interface BootstrapError {
  ok: false;
  code: BootstrapErrorCode;
  message: string;
  skillRoot: string;
  detail?: unknown;
  envSetup?: {
    hint: string;
    serveCommand: string;
    defaultPort: number;
  };
}

export type BootstrapResult = BootstrapOk | BootstrapError;

export type EnvSetupMode = 'check' | 'serve';

export interface EnvCheckOk {
  ok: true;
  skillRoot: string;
  youtubeKeyConfigured: boolean;
  envLocalPath: string;
}

export interface EnvCheckError {
  ok: false;
  code: 'missing_api_key' | 'validation_error';
  message: string;
  skillRoot: string;
}

export type EnvCheckResult = EnvCheckOk | EnvCheckError;

export interface EnvServeStarted {
  ok: true;
  mode: 'serve';
  url: string;
  host: string;
  port: number;
  skillRoot: string;
  message: string;
}
