import {Database} from './busy1';

const db = new Database();

const MANIFEST = "MANIFEST";
db.add_input(MANIFEST);

const SOURCE_TEXT = "SOURCE_TEXT";
db.add_input(SOURCE_TEXT);

const AST = "AST";
db.add_rule(AST, (db, key) => {
    const source_text = db.get_value(SOURCE_TEXT, key) as string;
    return `@${source_text}@`;
});
const PROGRAM_AST = "PROGRAM_AST";
db.add_rule(PROGRAM_AST, (db, key) => {
    const manifest = db.get_value(MANIFEST, key) as [string];
    return manifest.map((file) => db.get_value(AST, file) as string);
});

db.set_value(MANIFEST, "", ["a.rs", "b.rs"]);
db.set_value(SOURCE_TEXT, "a.rs", "abc");
db.set_value(SOURCE_TEXT, "b.rs", "xyz");
console.log("program:", db.get_value(PROGRAM_AST, ""));

db.set_value(SOURCE_TEXT, "b.rs", "def");
console.log("program:", db.get_value(PROGRAM_AST, ""));

// db.set

// db.add_input("input");
// db.add_input("operands");
// db.add_rule("sum", (db, key) => {
//     const [x_key, y_key] = db("operands", key) as [string, string];
//     const x = db("input", x_key) as number;
//     const y = db("input", y_key) as number;
//     return x + y;
// });
// db.add_rule("sum2", (db, key) => {
//     return db("sum", key);
// });

// db.set_value("input", "x", 1);
// db.set_value("input", "y", 2);
// db.set_value("operands", "", ["x", "y"]);
// console.log(`The result is ${db.get_value("sum", "") as number}.`);
// db.set_value("input", "y", 3);
// console.log(`The result is ${db.get_value("sum", "") as number}.`);
// console.log(`The result is ${db.get_value("sum", "") as number}.`);
// db.set_value("operands", "", ["y", "x"]);
// console.log(`The result is ${db.get_value("sum", "") as number}.`);
// console.log(`The result2 is ${db.get_value("sum2", "") as number}.`);
// db.set_value("operands", "", ["x", "y"]);
// console.log(`The result2 is ${db.get_value("sum2", "") as number}.`);
// db.set_value("operands", "", ["x", "y"]);
// console.log(`The result2 is ${db.get_value("sum2", "") as number}.`);

// console.dir(db.values, {depth: null});
