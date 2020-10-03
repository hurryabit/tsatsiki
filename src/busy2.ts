import * as Untyped from './busy1';

type TypesSpec = {[name: string]: unknown}

type Getter<Types extends TypesSpec> =
    <Name extends keyof Types>(name: Name, key: string) => Types[Name]

type Setter<Types extends TypesSpec> =
    <Name extends keyof Types>(name: Name, key: string, value: Types[Name]) => void

export type DatabaseReader<Inputs extends TypesSpec, Derivations extends TypesSpec> = {
    get_value: Getter<Inputs & Derivations>;
}

export type Database<Inputs extends TypesSpec, Derivations extends TypesSpec> = DatabaseReader<Inputs, Derivations> & {
    set_value: Setter<Inputs>
}

export type DatabaseSpec<Inputs extends TypesSpec, Derivations extends TypesSpec> = {
    [Layer in keyof Inputs | keyof Derivations]:
        Layer extends keyof Derivations
        ? (db: DatabaseReader<Inputs, Derivations>, key: string) => Derivations[Layer]
        : null;
}

export function Database<Inputs extends TypesSpec, Derivations extends TypesSpec>(
    spec: DatabaseSpec<Inputs, Derivations>,
): Database<Inputs, Derivations> {
    return Untyped.Database(spec as Untyped.DatabaseSpec) as Database<Inputs, Derivations>;
}
