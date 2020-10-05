import {Database, DatabaseReader, DatabaseSpec} from '../src/untyped';

const FILE_CONTENTS = "FILE_CONTENTS"; // string
const EXTRACT_LIST = "EXTRACT_LIST"; // string[]
const EXTRACT_NUMBER = "EXTRACT_NUMBER"; // number
const AGGREGATE = "AGGREGATE"; // number

const spec: DatabaseSpec = {
    [FILE_CONTENTS]: null,
    [EXTRACT_LIST]: (db, key) => {
        const file_contents = db.get_value(FILE_CONTENTS, key) as string;
        return file_contents.split(/\r?\n/).map(line => line.trim()).filter(line => line != "")
    },
    [EXTRACT_NUMBER]: (db, key) => {
        const file_contents = db.get_value(FILE_CONTENTS, key) as string;
        return Number.parseInt(file_contents.trim());
    },
    [AGGREGATE]: (db, key) => {
        const list = db.get_value(EXTRACT_LIST, key) as string[];
        const numbers = list.map(file => db.get_value(EXTRACT_NUMBER, file) as number);
        return numbers.reduce((x, y) => x + y, 0);
    },
};

type Query = [string, string]

function TracedDatabase(spec: DatabaseSpec): Database & { trace: Query[] } {
    const result = { trace: [] as Query[] };
    const traced_spec: DatabaseSpec = {};
    for (const layer in spec) {
        const rule = spec[layer];
        if (rule === null) {
            traced_spec[layer] = null;
        } else {
            traced_spec[layer] = function (db: DatabaseReader, key: string) {
                result.trace.push([layer, key]);
                return rule(db, key);
            }
        }
    }
    const db = Database(traced_spec);
    return Object.assign(result, db);
}

describe("inputs", function () {
    test("reading before setting throws", function () {
        const db = TracedDatabase(spec);

        expect(() => db.get_value(FILE_CONTENTS, "x.dat")).toThrow("Getting value for unset input");
    });

    test("first setting is persisted", function () {
        const db = TracedDatabase(spec);

        db.set_value(FILE_CONTENTS, "x.dat", "1");
        expect(db.get_value(FILE_CONTENTS, "x.dat")).toEqual("1");
    });

    test("re-setting is persistsed", function () {
        const db = TracedDatabase(spec);
        db.set_value(FILE_CONTENTS, "x.dat", "1");
        db.get_value(FILE_CONTENTS, "x.dat");

        db.set_value(FILE_CONTENTS, "x.dat", "2");
        expect(db.get_value(FILE_CONTENTS, "x.dat")).toEqual("2");
    });

    test("first setting can be read by rule", function () {
        const db = TracedDatabase(spec);

        db.set_value(FILE_CONTENTS, "x.dat", "1");
        expect(db.get_value(EXTRACT_NUMBER, "x.dat")).toBe(1);
    });

    test("re-setting can be read by rule", function () {
        const db = TracedDatabase(spec);
        db.set_value(FILE_CONTENTS, "x.dat", "1");
        db.get_value(EXTRACT_NUMBER, "x.dat");

        db.set_value(FILE_CONTENTS, "x.dat", "2");
        expect(db.get_value(EXTRACT_NUMBER, "x.dat")).toEqual(2);
    });

    test("re-setting increases time", function () {
        const db = TracedDatabase(spec);
        db.set_value(FILE_CONTENTS, "x.dat", "1");
        db.get_value(EXTRACT_NUMBER, "x.dat");
        db.trace = [];

        db.set_value(FILE_CONTENTS, "x.dat", "2");
        expect(db.get_value(EXTRACT_NUMBER, "x.dat")).toBe(2);
        expect(db.trace).toEqual([[EXTRACT_NUMBER, "x.dat"]]);
    });

    test("re-setting to same value does not increase time", function () {
        const db = TracedDatabase(spec);
        db.set_value(FILE_CONTENTS, "x.dat", "1");
        db.get_value(EXTRACT_NUMBER, "x.dat");
        db.trace = [];

        db.set_value(FILE_CONTENTS, "x.dat", "1");
        expect(db.get_value(EXTRACT_NUMBER, "x.dat")).toBe(1);
        // If we did not notice that the new value for
        // `[FILE_CONTENTS, "x.dat"]` matches the old value, we would
        // re-evaluate `[PARSE_NUMER, "x.dat"]`.
        expect(db.trace).toEqual([]);
    });

    test("re-setting back and forth increases time", function () {
        const db = TracedDatabase(spec);
        db.set_value(FILE_CONTENTS, "x.dat", "1");
        db.get_value(EXTRACT_NUMBER, "x.dat");
        db.trace = [];

        db.set_value(FILE_CONTENTS, "x.dat", "2");
        db.set_value(FILE_CONTENTS, "x.dat", "1");
        expect(db.get_value(EXTRACT_NUMBER, "x.dat")).toBe(1);
        expect(db.trace).toEqual([[EXTRACT_NUMBER, "x.dat"]]);
    });
});

describe("basic evaluation", function () {
    test("first evaluation", function () {
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
    });

    test("re-evaluation on relevant change", () => {
        const db = TracedDatabase(spec);
        db.set_value(FILE_CONTENTS, "list.txt", "x.dat\ny.dat");
        db.set_value(FILE_CONTENTS, "x.dat", "1");
        db.set_value(FILE_CONTENTS, "y.dat", "2");
        db.get_value(AGGREGATE, "list.txt");
        db.trace = [];

        db.set_value(FILE_CONTENTS, "y.dat", "3");
        expect(db.get_value(AGGREGATE, "list.txt")).toBe(4);
        expect(db.trace).toEqual([
            [EXTRACT_NUMBER, "y.dat"],
            [AGGREGATE, "list.txt"],
        ]);
    });

    test("no re-evaluation when no changes", function () {
        const db = TracedDatabase(spec);
        db.set_value(FILE_CONTENTS, "list.txt", "x.dat\ny.dat");
        db.set_value(FILE_CONTENTS, "x.dat", "1");
        db.set_value(FILE_CONTENTS, "y.dat", "2");
        db.get_value(AGGREGATE, "list.txt");
        db.trace = [];

        expect(db.get_value(AGGREGATE, "list.txt")).toBe(3);
        expect(db.trace).toEqual([]);
    });

    test("no re-evaluation on irrelevant changes", function () {
        const db = TracedDatabase(spec);
        db.set_value(FILE_CONTENTS, "list.txt", "x.dat\ny.dat");
        db.set_value(FILE_CONTENTS, "x.dat", "1");
        db.set_value(FILE_CONTENTS, "y.dat", "2");
        db.get_value(AGGREGATE, "list.txt");
        db.trace = [];

        db.set_value(FILE_CONTENTS, "z.dat", "3");
        expect(db.get_value(AGGREGATE, "list.txt")).toBe(3);
        expect(db.trace).toEqual([]);
    });
});

describe("evaluation optimizations", function() {
    test("dependencies are evaluated only once", function() {
        const db = TracedDatabase(spec);

        db.set_value(FILE_CONTENTS, "list.txt", "x.dat\nx.dat");
        db.set_value(FILE_CONTENTS, "x.dat", "1");
        expect(db.get_value(AGGREGATE, "list.txt")).toBe(2);
        expect(db.trace).toEqual([
            [AGGREGATE, "list.txt"],
            [EXTRACT_LIST, "list.txt"],
            [EXTRACT_NUMBER, "x.dat"],
        ]);
    });

    test("early cutoff in evaluation", function() {
        const db = TracedDatabase(spec);
        db.set_value(FILE_CONTENTS, "list.txt", "x.dat\ny.dat");
        db.set_value(FILE_CONTENTS, "x.dat", "1");
        db.set_value(FILE_CONTENTS, "y.dat", "2");
        db.get_value(AGGREGATE, "list.txt");
        db.trace = [];

        db.set_value(FILE_CONTENTS, "list.txt", "x.dat\n \ny.dat\n");
        db.set_value(FILE_CONTENTS, "x.dat", " 1 ");
        expect(db.get_value(AGGREGATE, "list.txt")).toBe(3);
        // If we did not recognize that the values of `[PARSE_LIST, "list.txt"]`
        // and `[PARSE_NUMBER, "x.dat"]` are unchanged, we would re-evaluate
        // `[SUM, "list.txt"]`.
        expect(db.trace).toEqual([
            [EXTRACT_LIST, "list.txt"],
            [EXTRACT_NUMBER, "x.dat"],
        ]);
    });

    test("early cutoff in dependency check", function() {
        const db = TracedDatabase(spec);
        db.set_value(FILE_CONTENTS, "list.txt", "x.dat\ny.dat");
        db.set_value(FILE_CONTENTS, "x.dat", "1");
        db.set_value(FILE_CONTENTS, "y.dat", "2");
        db.get_value(AGGREGATE, "list.txt");
        db.trace = [];

        db.set_value(FILE_CONTENTS, "list.txt", "x.dat\nz.dat");
        db.set_value(FILE_CONTENTS, "y.dat", "3");
        db.set_value(FILE_CONTENTS, "z.dat", "4");
        expect(db.get_value(AGGREGATE, "list.txt")).toBe(5);
        // If we did not cut the dependency check off early, we would
        // re-evaluate `[PARSE_NUMBER, "y.dat"]` as part of the check.
        expect(db.trace).toEqual([
            [EXTRACT_LIST, "list.txt"],
            [AGGREGATE, "list.txt"],
            [EXTRACT_NUMBER, "z.dat"],
        ]);
    });

    test("update dependencies even when value unchanged", function() {
        const db = TracedDatabase(spec);
        db.set_value(FILE_CONTENTS, "list.txt", "x.dat\ny.dat");
        db.set_value(FILE_CONTENTS, "x.dat", "1");
        db.set_value(FILE_CONTENTS, "y.dat", "2");
        db.get_value(AGGREGATE, "list.txt");
        db.set_value(FILE_CONTENTS, "list.txt", "x.dat\nz.dat");
        db.set_value(FILE_CONTENTS, "z.dat", "2");
        db.get_value(AGGREGATE, "list.txt");
        db.trace = [];

        db.set_value(FILE_CONTENTS, "y.dat", "3");
        expect(db.get_value(AGGREGATE, "list.txt")).toBe(3);
        // If we did update the dependencies even when the value has not
        // changed, we would re-evaluate `[PARSE_NUMBER, "y.dat"]` as part of
        // the dependency check.
        expect(db.trace).toEqual([]);
    });
});
