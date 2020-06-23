import { PeerSource, Peer } from 'mesh/agents/peer';
import { Store } from 'data/storage';
import { SamplePeer } from './SamplePeer';
import { Hash } from 'data/model';


class SamplePeerSource implements PeerSource {

    store: Store;
    preload: Map<Hash, SamplePeer>;

    constructor(store: Store, preload?: Map<Hash, SamplePeer>) {

        if (preload === undefined) {
            preload = new Map();
        }

        this.store = store;
        this.preload = preload;
    }

    async getPeers(count: number): Promise<Array<Peer>> {
        let search = await this.store.loadByClass(SamplePeer.className, {limit: count});

        let result = new Array<Peer>();

        let seen = new Set<Hash>();
        for (let peer of search.objects) {
            let samplePeer = peer as SamplePeer;
            result.push(samplePeer.getPeer());
            seen.add(samplePeer.hash());
        }

        if (result.length < count) {
            for (let [hash, samplePeer] of this.preload) {
                if (!seen.has(hash)) {
                    result.push(samplePeer.getPeer());
                }

                if (result.length === count) {
                    break;
                }
            }
        }
        
        return result;
    }

    async getPeerForEndpoint(endpoint: string): Promise<Peer | undefined> {

        let hash = SamplePeer.hashForEndpoint(endpoint);

        let samplePeer = await this.store.load(hash) as SamplePeer | undefined;

        if (samplePeer === undefined) {
            samplePeer = this.preload.get(hash);
        }

        return samplePeer?.getPeer();
    }

    

}

export { SamplePeerSource };