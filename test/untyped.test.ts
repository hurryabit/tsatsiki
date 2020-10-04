import {Database, DatabaseSpec} from '../src/untyped';

const FILE_CONTENTS = "FILE_CONTENTS"; // string
const PARSE_NUMBER = "PARSE_NUMBER"; // number
const PARSE_LIST = "PARSE_LIST"; // string[]
const SUM = "SUM"; // number

const spec: DatabaseSpec = {
    [FILE_CONTENTS]: null,
    [PARSE_NUMBER]: (db, key) => {
        const file_contents = db.get_value(FILE_CONTENTS, key) as string;
        return Number.parseInt(file_contents.trim());
    },
    [PARSE_LIST]: (db, key) => {
        const file_contents = db.get_value(FILE_CONTENTS, key) as string;
        return file_contents.split(/\r?\n/).map(line => line.trim()).filter(line => line != "")
    },
    [SUM]: (db, key) => {
        const list = db.get_value(PARSE_LIST, key) as string[];
        const numbers = list.map(file => db.get_value(PARSE_NUMBER, file) as number);
        return numbers.reduce((x, y) => x + y, 0);
    },
};

test("first evaluation", () => {
    const db = Database(spec);

    db.set_value(FILE_CONTENTS, "x.dat", "1");
    db.set_value(FILE_CONTENTS, "y.dat", "2");
    db.set_value(FILE_CONTENTS, "list.txt", "x.dat\ny.dat");
    expect(db.get_value(SUM, "list.txt") as number).toBe(3);
});

test("re-evaluation", () => {
    const db = Database(spec);

    db.set_value(FILE_CONTENTS, "x.dat", "1");
    db.set_value(FILE_CONTENTS, "y.dat", "2");
    db.set_value(FILE_CONTENTS, "list.txt", "x.dat\ny.dat");
    db.get_value(SUM, "list.txt");

    db.set_value(FILE_CONTENTS, "y.dat", "3");
    expect(db.get_value(SUM, "list.txt") as number).toBe(4);
});
