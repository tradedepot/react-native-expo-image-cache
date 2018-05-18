// @flow
import * as _ from "lodash";
import FileSystem from "react-native-fs";
import SHA1 from "crypto-js/sha1";

const BASE_DIR = `${FileSystem.CachesDirectoryPath}expo-image-cache/`;

const getCacheEntry = async (uri: string): Promise<{ exists: boolean, path: string, tmpPath: string }> => {
    const filename = uri.substring(uri.lastIndexOf("/"), uri.indexOf("?") === -1 ? uri.length : uri.indexOf("?"));
    const ext = filename.indexOf(".") === -1 ? ".jpg" : filename.substring(filename.lastIndexOf("."));
    const path = `${BASE_DIR}${SHA1(uri)}${ext}`;
    const tmpPath = `${BASE_DIR}${SHA1(uri)}-${_.uniqueId()}${ext}`;
    // TODO: maybe we don't have to do this every time
    try {
        await FileSystem.mkdir(BASE_DIR);
    } catch (e) {
        // do nothing
    }
    const exists = await FileSystem.exists(path);
    return { exists, path, tmpPath };
};

export class CacheEntry {
    uri: string;
    path: string;

    constructor(uri: string) {
        this.uri = uri;
    }

    async getPath(): Promise<?string> {
        const { uri } = this;
        const { path, exists, tmpPath } = await getCacheEntry(uri);
        if (exists) {
            return path;
        }
        const { promise } = FileSystem.downloadFile({ fromUrl: uri, toFile: tmpPath });
        const { statusCode } = await promise;
        if (statusCode === 200) {
            await FileSystem.moveFile(tmpPath, path);
            return path;
        }
        return null;
    }
}

export default class CacheManager {
    static entries: { [uri: string]: CacheEntry } = {};

    static get(uri: string): CacheEntry {
        if (!CacheManager.entries[uri]) {
            CacheManager.entries[uri] = new CacheEntry(uri);
        }
        return CacheManager.entries[uri];
    }

    static async clearCache(): Promise<void> {
        const exists = await FileSystem.exists(BASE_DIR);
        if (exists) {
            await FileSystem.unlink(BASE_DIR);
        }
        await FileSystem.mkdir(BASE_DIR);
    }
}
