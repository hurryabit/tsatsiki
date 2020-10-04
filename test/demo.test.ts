import {Database, DatabaseReader, DatabaseSpec, TypeSpec} from '../src/typed';

const FILE_CONTENTS = "FILE_CONTENTS";
const PARSE_LIST = "PARSE_LIST";
const PARSE_NUMBER = "PARSE_NUMBER";
const SUM = "SUM";

type Inputs = {
    [FILE_CONTENTS]: string;
}

type Rules = {
    [PARSE_LIST]: string[];
    [PARSE_NUMBER]: number;
    [SUM]: number;
}

const spec: DatabaseSpec<Inputs, Rules> = {
    [FILE_CONTENTS]: null,
    [PARSE_LIST]: (db, key) => {
        const file_contents = db.get_value(FILE_CONTENTS, key);
        return file_contents.split(/\r?\n/).map(line => line.trim()).filter(line => line != "")
    },
    [PARSE_NUMBER]: (db, key) => {
        const file_contents = db.get_value(FILE_CONTENTS, key);
        return Number.parseInt(file_contents.trim());
    },
    [SUM]: (db, key) => {
        const list = db.get_value(PARSE_LIST, key);
        const numbers = list.map(file => db.get_value(PARSE_NUMBER, file));
        return numbers.reduce((x, y) => x + y, 0);
    },
};

type Query = [string, string]

function TracedDatabase<Inputs extends TypeSpec, Rules extends TypeSpec>(
    spec: DatabaseSpec<Inputs, Rules>,
): Database<Inputs, Rules> & { trace: Query[] } {
    const result = { trace: [] as Query[] };
    const traced_spec = {} as Record<string, unknown>;
    for (const layer in spec) {
        const rule = spec[layer];
        if (rule === null) {
            traced_spec[layer] = null;
        } else {
            traced_spec[layer] = function (db: DatabaseReader<Inputs, Rules>, key: string) {
                result.trace.push([layer, key]);
                return rule(db, key);
            }
        }
    }
    const db = Database(traced_spec as DatabaseSpec<Inputs, Rules>);
    return Object.assign(result, db);
}

test("demo", function() {
    const db = TracedDatabase(spec);

    db.set_value(FILE_CONTENTS, "list.txt", "x.dat\ny.dat");
    db.set_value(FILE_CONTENTS, "x.dat", "1");
    db.set_value(FILE_CONTENTS, "y.dat", "2");
    expect(db.get_value(SUM, "list.txt")).toBe(3);
    expect(db.trace).toEqual([
        [SUM, "list.txt"],
        [PARSE_LIST, "list.txt"],
        [PARSE_NUMBER, "x.dat"],
        [PARSE_NUMBER, "y.dat"],
    ]);

    db.trace = [];
    expect(db.get_value("SUM", "list.txt")).toBe(3);
    expect(db.trace).toEqual([]);

    db.trace = [];
    db.set_value(FILE_CONTENTS, "y.dat", "3");
    expect(db.get_value(SUM, "list.txt")).toBe(4);
    expect(db.trace).toEqual([
        [PARSE_NUMBER, "y.dat"],
        [SUM, "list.txt"],
    ]);

    db.trace = []
    db.set_value(FILE_CONTENTS, "list.txt", "x.dat\nz.dat");
    db.set_value(FILE_CONTENTS, "y.dat", "4");
    db.set_value(FILE_CONTENTS, "z.dat", "5");
    expect(db.get_value(SUM, "list.txt")).toBe(6);
    expect(db.trace).toEqual([
        [PARSE_LIST, "list.txt"],
        [SUM, "list.txt"],
        [PARSE_NUMBER, "z.dat"],
    ]);
});
