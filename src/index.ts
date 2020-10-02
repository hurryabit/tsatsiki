import {Database} from './busy1';

const db = new Database();

db.add_input("manifest");
db.add_input("source_text");
db.add_rule("ast", (db, key) => {
    const source_text = db("source_text", key) as string;
    return `@${source_text}@`;
});
db.add_rule("program_ast", (db, key) => {
    const manifest = db("manifest", key) as [string];
    return manifest.map((file) => db("ast", file) as string);
});

db.set_value("manifest", "", ["a.rs", "b.rs"]);
db.set_value("source_text", "a.rs", "abc");
db.set_value("source_text", "b.rs", "xyz");
console.log("program:", db.get_value("program_ast", ""));
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
