import * as Untyped from './busy1';

type AnySpec = {[name: string]: unknown}

type Getter<Spec extends AnySpec> =
    <Name extends keyof Spec>(name: Name, key: string) => Spec[Name]

type Setter<Spec extends AnySpec> =
    <Name extends keyof Spec>(name: Name, key: string, value: Spec[Name]) => void

type DatabaseReader<Inputs extends AnySpec, Rules extends AnySpec> = {
    get_value: Getter<Inputs & Rules>;
}

type DatabaseWriter<Inputs extends AnySpec> = {
    set_value: Setter<Inputs>
}

export type Database<Inputs extends AnySpec, Rules extends AnySpec> =
    DatabaseReader<Inputs, Rules> & DatabaseWriter<Inputs>

export type RulesDecl<Inputs extends AnySpec, Rules extends AnySpec> = {
    [Name in keyof Rules]: (db: DatabaseReader<Inputs, Rules>, key: string) => Rules[Name];
}

export function Database<Inputs extends AnySpec, Rules extends AnySpec>(
    inputs: Inputs,
    rules: RulesDecl<Inputs, Rules>,
): Database<Inputs, Rules> {
    const db = new Untyped.Database();

    for (const name in inputs) {
        db.add_input(name);
    }
    for (const name in rules) {
        db.add_rule(name, rules[name] as Untyped.Rule);
    }
    return db as Database<Inputs, Rules>;
}
