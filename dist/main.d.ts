export declare const PKG_ROOT = "https://packages.geldata.com";
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
