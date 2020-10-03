import * as Untyped from './busy1';
import * as Typed from './busy2';

export function untyped(): void {
    const MANIFEST = "MANIFEST";
    const SOURCE_TEXT = "SOURCE_TEXT";
    const AST = "AST";
    const PROGRAM_AST = "PROGRAM_AST";

    const spec: Untyped.DatabaseSpec = {
        [MANIFEST]: null,
        [SOURCE_TEXT]: null,
        [AST]: (db, key) => {
            const source_text = db.get_value(SOURCE_TEXT, key) as string;
            return `@${source_text}@`;
        },
        [PROGRAM_AST]: (db, key) => {
            const manifest = db.get_value(MANIFEST, key) as [string];
            return manifest.map((file) => db.get_value(AST, file) as string);
        },
    };
    const db = Untyped.Database(spec);

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

    type Derivations = {
        [AST]: string;
        [PROGRAM_AST]: string[];
    }

    const spec: Typed.DatabaseSpec<Inputs, Derivations> = {
        [MANIFEST]: null,
        [SOURCE_TEXT]: null,
        [AST]: (db, key) => {
            const source_text = db.get_value(SOURCE_TEXT, key);
            return `@${source_text}@`;
        },
        [PROGRAM_AST]: (db, key) => {
            const manifest = db.get_value(MANIFEST, key) as [string];
            return manifest.map((file) => db.get_value(AST, file));
        },
    }

    const db = Typed.Database(spec);

    db.set_value(MANIFEST, "", ["a.rs", "b.rs"]);
    db.set_value(SOURCE_TEXT, "a.rs", "abc");
    db.set_value(SOURCE_TEXT, "b.rs", "xyz");
    console.log("program:", db.get_value(PROGRAM_AST, ""));

    db.set_value(SOURCE_TEXT, "b.rs", "def");
    console.log("program:", db.get_value(PROGRAM_AST, ""));

    // console.dir(db.values, {depth: null});
}

typed();
