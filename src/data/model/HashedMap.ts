import { Hash, Hashing } from './Hashing';
import { HashedObject, Dependency } from './HashedObject';
import { Context } from './Context';


class HashedMap<K, V> {

    content: Map<K, V>;
    contentHashes: Map<K, Hash>;

    constructor(init?: IterableIterator<[K, V]>) {
        
        this.content = new Map();
        this.contentHashes = new Map();

        if (init !== undefined) {
            for (const [key, value] of init) {
                this.set(key, value);
            }
        }
    }

    set(key: K, value: V) {
        let hash = HashedObject.hashElement(value);
        this.content.set(key, value);
        this.contentHashes.set(key, hash);
    }

    remove(key: K) {
        this.content.delete(key);
        this.contentHashes.delete(key);
    }

    has(key: K) {
        return this.contentHashes.has(key);
    }

    entries() : IterableIterator<[K, V]> {
        return this.content.entries();
    }

    toArrays() : {entries: [K,V][], hashes: Hash[]} {
        let keys = Array.from(this.content.keys());

        keys.sort();

        let entries: [K,V][] = [];
        let hashes : Hash[]  = [];

        for (const key of keys) {
            entries.push([key, this.content.get(key) as V]);
            hashes.push(this.contentHashes.get(key) as Hash);
        }

        return {entries: entries, hashes: hashes};
    }

    fromArrays(_hashes: Hash[], entries: [K,V][]) {
        for (let i=0; i<entries.length; i++) {
            let [key, value] = entries[i];
            this.set(key, value);
        }
    }

    equals(another: HashedMap<K, V>) {
        let thisArrays = this.toArrays();
        let anotherArrays = another.toArrays();

        let result = thisArrays.entries.length == anotherArrays.entries.length;

        for (let i=0; result && i<thisArrays.entries.length; i++) {
            const thisKey = thisArrays.entries[i][0];
            const anotherKey = anotherArrays.entries[i][0]; 
            const thisHash = thisArrays.hashes[i];
            const anotherHash = anotherArrays.hashes[i];
            result = result &&
                     thisKey  === anotherKey &&
                     thisHash === anotherHash;
        }

        return result;
    }

    literalize(path='', context?: Context) : { value: any, dependencies : Set<Dependency> }  {

        let dependencies = new Set<Dependency>();

        let arrays = this.toArrays();
        let hashes = arrays.hashes;
        let child = HashedObject.literalizeField(path, arrays.entries, context);
        let entries = child.value;
        HashedObject.collectChildDeps(dependencies, child.dependencies);

        let value = {_type: 'hashed_map', _hashes: hashes, _entries: entries };

        return { value: value, dependencies: dependencies};
    }

    hash() {
        return Hashing.forValue(this.literalize().value);
    }

    static deliteralize(value: any, context: Context, validate=false) : HashedMap<any, any> {

        if (value['_type'] !== 'hashed_map') {
            throw new Error("Trying to deliteralize value, but _type is '" + value['_type'] + "' (shoud be 'hashed_map')");
        }

        let hashes = value['_hashes'];
        let entries = HashedObject.deliteralizeField(value['_entries'], context, validate);

        let hmap = new HashedMap();
        hmap.fromArrays(hashes, entries);

        return hmap;
    }
}

export { HashedMap };