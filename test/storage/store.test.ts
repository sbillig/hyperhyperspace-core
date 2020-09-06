import { Store } from 'storage/store';
import { IdbBackend, MemoryBackend } from 'storage/backends';
import { HashedObject, HashedSet, HashReference, MutationOp } from 'data/model';

import { SomethingHashed, createHashedObjects } from '../data/types/SomethingHashed';
import { SomethingMutable, SomeMutation } from '../data//types/SomethingMutable';
import { describeProxy } from 'config';


describeProxy('Storage', () => {
    test('Indexeddb-based load / store cycle', async () => {
        let store = new Store(new IdbBackend('test-storage-backend'));
        await testLoadStoreCycle(store);
    });

    test('Memory-based load / store cycle', async() => {
        let store = new Store(new MemoryBackend('test-storage-backend'));
        await testLoadStoreCycle(store);
    });

    test('Indexeddb-based reference-based load hit', async () => {
        let store = new Store(new IdbBackend('test-storage-backend'));
        await testReferenceBasedLoadHit(store);
    });

    test('Memory-based reference-based load hit', async () => {
        let store = new Store(new MemoryBackend('test-storage-backend'));
        await testReferenceBasedLoadHit(store);
    });

    test('Indexeddb-based reference-based load miss', async () => {
        let store = new Store(new IdbBackend('test-storage-backend'));
        await testReferenceBasedLoadMiss(store);
    });

    test('Memory-based reference-based load miss', async () => {
        let store = new Store(new MemoryBackend('test-storage-backend'));
        await testReferenceBasedLoadMiss(store);
    });
    
    test('Indexeddb-based mutation op saving and loading', async () => {
        let store = new Store(new IdbBackend('test-storage-backend'));
        await testMutationOps(store);
    });

    test('Memory-based mutation op saving and loading', async () => {
        let store = new Store(new MemoryBackend('test-storage-backend'));
        await testMutationOps(store);
    });

    test('Indexeddb-based mutation op saving and auto-loading', async () => {
        let store = new Store(new IdbBackend('test-storage-backend'));
        await testMutationOpAutoLoad(store);
    });

    test('Memory-based mutation op saving and auto-loading', async () => {
        let store = new Store(new MemoryBackend('test-storage-backend'));
        await testMutationOpAutoLoad(store);
    });

    test('Indexeddb-based mutation op automatic prevOp generation', async () => {
        let store = new Store(new IdbBackend('test-storage-backend'));
        testPrevOpGeneration(store);
    });

    test('Memory-based mutation op automatic prevOp generation', async () => {
        let store = new Store(new MemoryBackend('test-storage-backend'));
        testPrevOpGeneration(store);
    });

});

async function testLoadStoreCycle(store: Store) {
    let objects = createHashedObjects();

    let a: SomethingHashed = objects.a;
    let b: SomethingHashed = objects.b;

    await store.save(a);

    let a2 = await store.load(a.hash()) as HashedObject;

    expect(a.equals(a2 as HashedObject)).toBeTruthy();

    let hashedThings = await store.loadByClass(SomethingHashed.className);

    expect(hashedThings.objects[0].hash()).toEqual(b.hash());
    expect(hashedThings.objects[1].hash()).toEqual(a.hash());
}

async function testReferenceBasedLoadHit(store: Store) {
    let objects = createHashedObjects();

    let a: SomethingHashed = objects.a;
    let b: SomethingHashed = objects.b;

    

    await store.save(a);

    
    let result = await store.loadByReferencingClass(SomethingHashed.className, 'reference', b.hash());

    let a2 = result.objects[0];

    expect(a.equals(a2 as HashedObject)).toBeTruthy();

    let hashedThings = await store.loadByClass(SomethingHashed.className);

    expect(hashedThings.objects[0].hash()).toEqual(b.hash());
    expect(hashedThings.objects[1].hash()).toEqual(a.hash());

}

async function testReferenceBasedLoadMiss(store: Store) {
    let objects = createHashedObjects();

    let a: SomethingHashed = objects.a;
    let b: SomethingHashed = objects.b;

    await store.save(a);

    let result = await store.loadByReferencingClass(SomethingHashed.className, 'non-existent-path', b.hash());

    expect(result.objects.length).toEqual(0);
}

async function testMutationOps(store: Store) {
    let sm = new SomethingMutable();

    await sm.testOperation('hello');
    await sm.testOperation('world');
    await sm.testOperation('!');

    await store.save(sm);

    let hash = sm.getLastHash();

    let sm2 = await store.load(hash) as SomethingMutable;

    await sm2.loadOperations();

    let hs = new HashedSet(sm._operations.keys());
    let hs2 = new HashedSet(sm2._operations.keys());

    let h = hs.toArrays().hashes;
    let h2 = hs2.toArrays().hashes;

    expect(h.length).toEqual(h2.length);
    
    for (let i=0; i<h.length; i++) {
        expect(h[i]).toEqual(h2[i]);
    }
}

async function testMutationOpAutoLoad(store: Store) {
    let sm = new SomethingMutable();

    await store.save(sm);

    let hash = sm.getLastHash();

    let sm2 = await store.load(hash) as SomethingMutable;

    sm2.watchForChanges(true);

    await sm.testOperation('hello');
    await sm.testOperation('world');
    await sm.testOperation('!');

    await store.save(sm);

    let hs = new HashedSet(sm._operations.keys());
    let hs2 = new HashedSet(sm2._operations.keys());

    let h = hs.toArrays().hashes;
    let h2 = hs2.toArrays().hashes;

    expect(h.length).toEqual(h2.length);
    

    for (let i=0; i<h.length; i++) {
        expect(h[i]).toEqual(h2[i]);
    }
}

async function testPrevOpGeneration(store: Store) {
    let sm = new SomethingMutable();
    await store.save(sm);
    await sm.testOperation('hello');

    let hash = sm.getLastHash();
    let sm2 = await store.load(hash) as SomethingMutable;
    await sm2.testOperation('another');
    await store.save(sm2);
    
    await sm.testOperation('world');
    await sm.testOperation('!');
    await store.save(sm);
    

    let sm3 = await store.load(hash) as SomethingMutable;
    await sm3.loadOperations();

    let world: SomeMutation|undefined = undefined;

    for (const op of sm3._operations.values()) {
        const mut = op as SomeMutation;

        if (mut.payload === 'world') {
            world = mut;
        }
    }

    expect(world !== undefined).toBeTruthy();
    if (world !== undefined) {
        expect(world.prevOps?.toArrays().elements.length === 2).toBeTruthy();
        let another = false;
        let hello   = false;
        for (const opRef of (world.prevOps as HashedSet<HashReference<MutationOp>>).toArrays().elements) {
            let op = sm3._operations.get(opRef.hash);
            another = another || op?.payload === 'another';
            hello   = hello   || op?.payload === 'hello';
        } 

        expect(another).toBeTruthy();
        expect(hello).toBeTruthy();
    }
}