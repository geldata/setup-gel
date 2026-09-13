export declare const DEFAULT_PKG_ROOT = "https://packages.geldata.com";
export declare let PKG_ROOT: string;
export declare let PKG_IDX: string;
export declare function setPkgRoot(root: string): void;
export declare function getPkgRoot(): string;
export declare function getExecEnv(customEnv?: Record<string, string | undefined>): {
    [key: string]: string;
};
export declare function run(): Promise<void>;
export declare function getMatchingVer(versionMap: Map<string, unknown>, cliVersionRange: string, includeCliPrereleases: boolean): Promise<string>;
interface Package {
    name: string;
    version: string;
    revision: string;
    installref: string;
}
export declare function getVersionMap(dist: string): Promise<Map<string, Package>>;
export declare function getBaseDist(arch: string, platform: string, libc?: string): string;
export {};
