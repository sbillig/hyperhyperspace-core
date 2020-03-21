import { HashedObject, HashedSet, Hash, Literal, Serialization } from 'data/model';

import { SomethingHashed } from './env/SomethingHashed';

describe('Data model', () => {
    test( 'Basic types', () => {
        
        const original = ['hello', 1.0, false, 2.5, 'bye', true];
        const context = { objects : new Map<Hash, HashedObject>(), literals: new Map<Hash, Literal>() }
        const literalization  = HashedObject.literalizeField('original', original, context);
        const reconstructed = HashedObject.deliteralizeField(literalization.value, context);

        for (let i=0; i<original.length; i++) {
            expect(original[i]).toEqual(reconstructed[i]);
        }
    });

    test('Hashed sets', () => {
        
        const set1 = new HashedSet();
        const set2 = new HashedSet();

        const elements = [1, 2, 3, 4, 'five', 'six', true];

        for (let element of elements) {
            set1.add(element);
            set2.add(element);
        }

        const context1 = { objects : new Map<Hash, HashedObject>(), literals: new Map<Hash, Literal>() }
        const context2 = { objects : new Map<Hash, HashedObject>(), literals: new Map<Hash, Literal>() }

        const literal1 = HashedObject.literalizeField('set1', set1, context1);
        const literal2 = HashedObject.literalizeField('set2', set2, context2);

        expect(Serialization.default(literal1.value)).toEqual(Serialization.default(literal2.value));
        
        expect(set1.has('five')).toBeTruthy();
        expect(set1.has('seven')).toBeFalsy();
    });

    test('HashedObject subclasses', () => {
        let a = new SomethingHashed();
        let b = new SomethingHashed();

        let name = 'la la la';
        let amount = 199;

        a.name = name;
        a.amount = amount;

        let name2 = 'le le le';
        let amount2 = 3;

        b.name = name2;
        b.amount = amount2;

        a.things?.add(b);

        a.reference = b.createReference();

        let a_literal = a.toLiteralContext();

        a_literal.context.objects = new Map<Hash, HashedObject>();

        let a2 = HashedObject.fromLiteralContext(a_literal);

        expect(a.equals(a2)).toBeTruthy();

        a.reference = undefined;

        expect(a.equals(a2)).toBeFalsy();
    });
});