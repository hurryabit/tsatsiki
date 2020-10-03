import * as Untyped from './busy1';
import * as Typed from './busy2';

export function untyped(): void {
    const db = new Untyped.Database();

    const MANIFEST = "MANIFEST";
    db.add_input(MANIFEST);

    const SOURCE_TEXT = "SOURCE_TEXT";
    db.add_input(SOURCE_TEXT);

    const AST = "AST";
    db.add_derivation(AST, (db, key) => {
        const source_text = db.get_value(SOURCE_TEXT, key) as string;
        return `@${source_text}@`;
    });
    const PROGRAM_AST = "PROGRAM_AST";
    db.add_derivation(PROGRAM_AST, (db, key) => {
        const manifest = db.get_value(MANIFEST, key) as [string];
        return manifest.map((file) => db.get_value(AST, file) as string);
    });

    db.set_value(MANIFEST, "", ["a.rs", "b.rs"]);
    db.set_value(SOURCE_TEXT, "a.rs", "abc");
    db.set_value(SOURCE_TEXT, "b.rs", "xyz");
    console.log("program:", db.get_value(PROGRAM_AST, ""));

    db.set_value(SOURCE_TEXT, "b.rs", "def");
    console.log("program:", db.get_value(PROGRAM_AST, ""));

    // console.dir(db.values, {depth: null});
}

export function typed(): void {
    const MANIFEST = "MANIFEST";
    const SOURCE_TEXT = "SOURCE_TEXT";
    const AST = "AST";
    const PROGRAM_AST = "PROGRAM_AST";

    type Inputs = {
        [MANIFEST]: string[];
        [SOURCE_TEXT]: string;
    }

    type Rules = {
        [AST]: string;
        [PROGRAM_AST]: string[];
    }

    const inputs: Inputs = {
        [MANIFEST]: [],
        [SOURCE_TEXT]: "",
    };

    const rules: Typed.RulesDecl<Inputs, Rules> = {
        [AST]: (db, key) => {
            const source_text = db.get_value(SOURCE_TEXT, key);
            return `@${source_text}@`;
        },
        [PROGRAM_AST]: (db, key) => {
            const manifest = db.get_value(MANIFEST, key) as [string];
            return manifest.map((file) => db.get_value(AST, file));
        },
    }

    const db = Typed.Database(inputs, rules);

    db.set_value(MANIFEST, "", ["a.rs", "b.rs"]);
    db.set_value(SOURCE_TEXT, "a.rs", "abc");
    db.set_value(SOURCE_TEXT, "b.rs", "xyz");
    console.log("program:", db.get_value(PROGRAM_AST, ""));

    db.set_value(SOURCE_TEXT, "b.rs", "def");
    console.log("program:", db.get_value(PROGRAM_AST, ""));

    // console.dir(db.values, {depth: null});
}

typed();
