import { AgentPod } from 'mesh/service/AgentPod';
import { PeerInfo, PeerGroupAgent } from 'mesh/agents/peer';
import { Identity, RSAKeyPair } from 'data/identity';
import { TestPeerSource } from './TestPeerSource';
import { RNGImpl } from 'crypto/random';
import { SecureNetworkAgent } from 'mesh/agents/network/SecureNetworkAgent';
import { NetworkAgent } from 'mesh/agents/network';
import { LinkupManager } from 'net/linkup';



class TestPeerNetwork {
    
    static generate(topic: string, activePeers: number, totalPeers: number, peerConnCount: number, network: 'wrtc'|'ws'|'mix' = 'wrtc', basePort?: number): Array<AgentPod> {

        let peers = new Array<PeerInfo>();

        for (let i=0; i<totalPeers; i++) {
            let id = Identity.fromKeyPair({'id':'peer' + i}, RSAKeyPair.generate(512));
            
            let host = LinkupManager.defaultLinkupServer;

            if (network === 'ws' || (network === 'mix' && i < totalPeers / 2)) {
                host = 'ws://localhost:' + (basePort as number + i);
            }

            let peer: PeerInfo = {
                endpoint: host  + '/' + new RNGImpl().randomHexString(128),
                identity: id,
                identityHash: id.hash()
            };

            peers.push(peer);
        }

        let peerSource = new TestPeerSource(peers);
        let pods = new Array<AgentPod>();

        for (let i=0; i<activePeers; i++) {
            let pod = new AgentPod();
            let networkAgent = new NetworkAgent();
            pod.registerAgent(networkAgent);
            let secureConn = new SecureNetworkAgent();
            pod.registerAgent(secureConn);
            
            let peerNetwork = new PeerGroupAgent(topic, peers[i], peerSource, { maxPeers: peerConnCount, minPeers: peerConnCount });
            pod.registerAgent(peerNetwork);
            pods.push(pod);
        }

        return pods;

    }

}

export { TestPeerNetwork as TestPeerNetwork };