import { TestPeerGroupPods } from '../mock/TestPeerGroupPods';

import { TestIdentity } from 'data/types/TestIdentity';

import { StateGossipAgent } from 'mesh/agents/state/StateGossipAgent';
import { PeerGroupAgent } from 'mesh/agents/peer';
import { Hash } from 'data/model';
import { RNGImpl } from 'crypto/random';
import { LinearStateAgent } from '../mock/LinearStateAgent';
import { Store } from 'storage/store';
import { IdbBackend } from 'storage/backends';
import { MutableSet } from 'data/containers';
import { Identity } from 'data/identity';
import { TerminalOpsSyncAgent } from 'mesh/agents/state/TerminalOpsSyncAgent';
import { describeProxy } from 'config';

describeProxy('[SYN] State sync', () => {
    test('[SYN01] Gossip agent in small peer group (wrtc)', async (done) => {

        await gossipInSmallPeerGroup(done, 'wrtc');

    }, 300000);

    test('[SYN02] Gossip agent in small peer group (ws)', async (done) => {

        await gossipInSmallPeerGroup(done, 'ws', 5200);

    }, 300000);

    test('[SYN03] Gossip agent in small peer group (mix)', async (done) => {

        await gossipInSmallPeerGroup(done, 'mix', 5210);

    }, 300000);

    test('[SYN04] Terminal ops agent-based set sync in small peer group (wrtc)', async (done) => {

        await syncInSmallPeerGroup(done, 'wrtc');

    }, 300000);

    test('[SYN05] Terminal ops agent-based set sync in small peer group (ws)', async (done) => {

        await syncInSmallPeerGroup(done, 'ws', 5300);
    }, 300000);

    test('[SYN06] Terminal ops agent-based set sync in small peer group (mix)', async (done) => {

        await syncInSmallPeerGroup(done, 'mix', 5310);
    }, 300000);
});

async function gossipInSmallPeerGroup(done: () => void, network: 'wrtc'|'ws'|'mix' = 'wrtc', basePort?: number) {

    let peerGroupId = new RNGImpl().randomHexString(64);
    let pods = TestPeerGroupPods.generate(peerGroupId, 3, 3, 2, network, 'no-discovery', basePort);

    const objCount = 3;
    const objIds   = new Array<Hash>();
    for (let i=0; i<objCount; i++) {
        objIds.push(new RNGImpl().randomHexString(32));
    }

    for (const pod of pods) {
        const peerNetwork = pod.getAgent(PeerGroupAgent.agentIdForPeerGroup(peerGroupId)) as PeerGroupAgent;
        const gossip = new StateGossipAgent(peerGroupId, peerNetwork);
        pod.registerAgent(gossip);
        for (let i=0; i<objCount; i++) {
            let agent = new LinearStateAgent(objIds[i], peerNetwork);
            gossip.trackAgentState(agent.getAgentId());
            pod.registerAgent(agent);
        }
    }

    let seq0:Array<[number, string]> = [[0, 'zero'],[1,'one'], [2, 'two']];
    let seq1:Array<[number, string]> = [[10, 'a'], [10, 'b'], [3, 'three']]
    let seq2:Array<[number, string]> = [[11, 'eleven'], [10, 'ten'], [9, 'nine']];

    await new Promise<void>(r => { window.setTimeout(() => { r() }, 1000);  });

    let seqs = [seq0, seq1, seq2];
    let witness: Array<LinearStateAgent> = [];
    let results: Array<[number, string]> = [[2, 'two'], [10, 'b'], [11, 'eleven']];

    for (let i=0; i<objCount; i++) {

        let objId = objIds[i];


        let seq = seqs[i];

        let c=0;
        for (let j=0; c<3; j++) {
            await new Promise(r => { window.setTimeout( r, 100); });
            let agent=pods[j].getAgent(LinearStateAgent.createId(objId)) as LinearStateAgent;
            if (agent !== undefined) {
                if (c<3) {
                    seq
                    agent.setMessage(seq[c][1], seq[c][0]);
                } else {
                    witness.push(agent);
                }
                c=c+1;
            }
        }

        let finished = false;
        let checks = 0;
        while (! finished && checks < 2500) {
            
            await new Promise(r => { window.setTimeout( r, 100); });

            finished = true;
            for (let c=0; c<3 && finished; c++) {

                if (witness.length <= c) continue;

                finished = finished && witness[c].seq === results[c][0];
                finished = finished && witness[c].message === results[c][1];
            }
            checks = checks + 1;
            
        }

        for (let c=0; c<3; c++) {

            if (witness.length <= c) continue;

            expect(witness[c].seq).toEqual(results[c][0]);
            expect(witness[c].message).toEqual(results[c][1])
        }

    }

    for (const pod of pods) {
        pod.shutdown();
    }

    done();

}

async function syncInSmallPeerGroup(done: () => void, network: 'wrtc'|'ws'|'mix' = 'wrtc', basePort?: number) {

    const size = 3;
        
    let peerNetworkId = new RNGImpl().randomHexString(64);

    let pods = TestPeerGroupPods.generate(peerNetworkId, size, size, size-1, network, 'no-discovery', basePort);

    let stores : Array<Store> = [];
    
    for (let i=0; i<size; i++) {
        const peerNetwork = pods[i].getAgent(PeerGroupAgent.agentIdForPeerGroup(peerNetworkId)) as PeerGroupAgent;
        const store = new Store(new IdbBackend('store-for-peer-' + peerNetwork.getLocalPeer().endpoint));
        stores.push(store);
        let gossip = new StateGossipAgent(peerNetworkId, peerNetwork);
        
        pods[i].registerAgent(gossip);
    }

    let id = TestIdentity.getFirstTestIdentity();
    let kp = TestIdentity.getFistTestKeyPair();
    
    let s = new MutableSet<Identity>();
    
    s.setAuthor(id);
    
    await stores[0].save(kp);
    await stores[0].save(s);

    for (let i=0; i<size; i++) {
        const meshAgent = pods[i].getAgent(PeerGroupAgent.agentIdForPeerGroup(peerNetworkId)) as PeerGroupAgent;
        let agent = new TerminalOpsSyncAgent(meshAgent, s.hash(), stores[i], MutableSet.opClasses);
        let gossip = pods[i].getAgent(StateGossipAgent.agentIdForGossip(peerNetworkId)) as StateGossipAgent;
        gossip.trackAgentState(agent.getAgentId());
        //agent;
        pods[i].registerAgent(agent);
    }

    await s.add(id);
    
    await s.delete(id);
    
    await s.add(id);
    
    await s.delete(id);
    
    await s.add(id);
    //stores[size-1].save(sclone);

    //sclone.bindToStore();
    //sclone.loadAllOpsFromStore();

    //await stores[0].load(s.hash());

    await stores[0].save(s);

    //let ctx = s.toContext();

    //console.log(ctx.literals);

    //TestTopology.waitForPeers(swarms, size - 1);

    let meshReady = false;

    let count = 0;

    while (!meshReady && count < 1000) {
        await new Promise(r => setTimeout(r, 100));
        const meshAgent = pods[size-1].getAgent(PeerGroupAgent.agentIdForPeerGroup(peerNetworkId)) as PeerGroupAgent
        meshReady = meshAgent.getPeers().length === (size-1);
        //console.log(count + '. peers: ' + meshAgent.getPeers().length);
        count = count + 1;
    }


    let replicated = false;

    if (meshReady) {
        count = 0;

        while (!replicated && count < 1500) {

            await new Promise(r => setTimeout(r, 100));

            const sr = await stores[size-1].load(s.hash()) as MutableSet<Identity> | undefined;

            if (sr !== undefined) {
                
                
                await sr.loadAllChanges();
                replicated = sr.size() === 1;
                //for (const elmt of sr.values()) {
                    //console.log('FOUND ELMT:');
                    //console.log(elmt);
                //}
            }

            count = count + 1;
        }
    }



    //const meshAgent = pods[0].getAgent(PeerMeshAgent.agentIdForMesh(peerNetworkId)) as PeerMeshAgent
    //expect(meshAgent.getPeers().length).toEqual(size-1);

    for (const pod of pods) {
        pod.shutdown();
    }

    expect(meshReady).toBeTruthy();
    expect(replicated).toBeTruthy();

    done();



}