import { HashedObject, HashedLiteral } from 'data/model';
import { MutableSet, MutableReference } from 'data/containers';
import { Identity } from 'data/identity';
import { SpaceEntryPoint } from 'spaces/SpaceEntryPoint';
import { PeerNode } from 'mesh/service';

import { Message } from './Message';

class ChatRoom extends HashedObject implements SpaceEntryPoint {

    static className = 'hhs/v0/exampes/ChatRoom';

    topic?: MutableReference<HashedLiteral>
    participants?: MutableSet<Identity>;
    messages?: MutableSet<Message>;

    _node?: PeerNode;

    constructor(topic?: string) {
        super();
        if (topic !== undefined) {
            this.setRandomId();

            this.addDerivedField('topic', new MutableReference());
            this.addDerivedField('participants', new MutableSet());
            this.addDerivedField('messages', new MutableSet());

            this.topic?.setValue(new HashedLiteral(topic));
        }
    }

    init(): void {
        
    }

    validate(_references: Map<string, HashedObject>): boolean {
        return  this.getId() !== undefined &&
                this.checkDerivedField('topic') &&
                this.checkDerivedField('participants') &&
                this.checkDerivedField('messages');
    }

    join(id: Identity) {
        this.participants?.add(id);
        this.getStore().save(this.participants as HashedObject);
        //this.participants?.saveQueuedOps();
    }

    leave(id: Identity) {
        this.participants?.delete(id);
        this.participants?.saveQueuedOps();
    }

    say(author: Identity, text: string) {
        let message = new Message(author, text);
        this.messages?.add(message).then( () => {
            this.getStore().save(this.messages as HashedObject);
        })        
        //this.messages?.saveQueuedOps();
    }

    getParticipants() : MutableSet<Identity> {
        if (this.participants === undefined) {
            throw new Error('The chat room has not been initialized, participants are unavailable.');
        }

        return this.participants;
    }

    getMessages() : MutableSet<Message> {
        if (this.messages === undefined) {
            throw new Error('The chat room has not been initialized, messages are unavailable.');
        }

        return this.messages;
    }

    async startSync(): Promise<void> {

        let resources = this.getResources();

        if (resources === undefined) {
            throw new Error('Cannot start sync: resources not configured.');
        }

        this._node = new PeerNode(resources);
        
        this._node.broadcast(this);
        this._node.sync(this);
    }
    
    async stopSync(): Promise<void> {

        this._node?.stopBroadcast(this);
        this._node?.stopSync(this);
    }

    getClassName(): string {
        return ChatRoom.className;
    }

}

HashedObject.registerClass(ChatRoom.className, ChatRoom);

export { ChatRoom };