import {Database, DatabaseReader, DatabaseSpec, TypeSpec} from '../src';

const FILE_CONTENTS = "FILE_CONTENTS";
const EXTRACT_LIST = "EXTRACT_LIST";
const EXTRACT_NUMBER = "EXTRACT_NUMBER";
const AGGREGATE = "AGGREGATE";

type Inputs = {
    [FILE_CONTENTS]: string;
}

type Rules = {
    [EXTRACT_LIST]: string[];
    [EXTRACT_NUMBER]: number;
    [AGGREGATE]: number;
}

const spec: DatabaseSpec<Inputs, Rules> = {
    [FILE_CONTENTS]: null,
    [EXTRACT_LIST]: (db, key) => {
        const file_contents = db.get_value(FILE_CONTENTS, key);
        return file_contents.split(/\r?\n/).map(line => line.trim()).filter(line => line != "")
    },
    [EXTRACT_NUMBER]: (db, key) => {
        const file_contents = db.get_value(FILE_CONTENTS, key);
        return Number.parseInt(file_contents.trim());
    },
    [AGGREGATE]: (db, key) => {
        const list = db.get_value(EXTRACT_LIST, key);
        const numbers = list.map(file => db.get_value(EXTRACT_NUMBER, file));
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
    expect(db.get_value(AGGREGATE, "list.txt")).toBe(3);
    expect(db.trace).toEqual([
        [AGGREGATE, "list.txt"],
        [EXTRACT_LIST, "list.txt"],
        [EXTRACT_NUMBER, "x.dat"],
        [EXTRACT_NUMBER, "y.dat"],
    ]);

    db.trace = [];
    expect(db.get_value(AGGREGATE, "list.txt")).toBe(3);
    expect(db.trace).toEqual([]);

    db.trace = [];
    db.set_value(FILE_CONTENTS, "y.dat", "3");
    expect(db.get_value(AGGREGATE, "list.txt")).toBe(4);
    expect(db.trace).toEqual([
        [EXTRACT_NUMBER, "y.dat"],
        [AGGREGATE, "list.txt"],
    ]);

    db.trace = []
    db.set_value(FILE_CONTENTS, "list.txt", "x.dat\nz.dat");
    db.set_value(FILE_CONTENTS, "y.dat", "4");
    db.set_value(FILE_CONTENTS, "z.dat", "5");
    expect(db.get_value(AGGREGATE, "list.txt")).toBe(6);
    expect(db.trace).toEqual([
        [EXTRACT_LIST, "list.txt"],
        [AGGREGATE, "list.txt"],
        [EXTRACT_NUMBER, "z.dat"],
    ]);
});
