export { HashedObject, Literal, Dependency } from './model/HashedObject';
export { Context, LiteralContext } from './model/Context';
export { MutableObject } from './model/MutableObject';
export { MutationOp } from './model/MutationOp';
export { HashReference } from './model/HashReference';
export { HashedSet } from './model/HashedSet';
export { HashedLiteral } from './model/HashedLiteral';
export { Hashing, Hash } from './model/Hashing';

// commenting out because these imports trigger a weird error:

// export { ReversibleObject } from './model/ReversibleObject';
// export { ReversibleOp } from './model/ReversibleOp';

// TypeError: Object prototype may only be an Object or null: undefined
// see @oleersoy's hypothesis here:
// https://github.com/Microsoft/TypeScript/issues/28314

export { UndoOp } from './model/UndoOp';
export { Serialization } from './model/Serialization';
export { Namespace } from './model/Namespace';
