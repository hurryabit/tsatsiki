import * as Untyped from './busy1';

type TypesSpec = {[name: string]: unknown}

type Getter<Types extends TypesSpec> =
    <Name extends keyof Types>(name: Name, key: string) => Types[Name]

type Setter<Types extends TypesSpec> =
    <Name extends keyof Types>(name: Name, key: string, value: Types[Name]) => void

type DatabaseReader<Inputs extends TypesSpec, Derivations extends TypesSpec> = {
    get_value: Getter<Inputs & Derivations>;
}

type DatabaseWriter<Inputs extends TypesSpec> = {
    set_value: Setter<Inputs>
}

export type Database<Inputs extends TypesSpec, Derivations extends TypesSpec> =
    DatabaseReader<Inputs, Derivations> & DatabaseWriter<Inputs>

export type InputsSpec<Inputs extends TypesSpec> = Record<keyof Inputs, unknown>

export type DerivationsSpec<Inputs extends TypesSpec, Derivations extends TypesSpec> = {
    [Name in keyof Derivations]: (db: DatabaseReader<Inputs, Derivations>, key: string) => Derivations[Name];
}

export function Database<Inputs extends TypesSpec, Derivations extends TypesSpec>(
    inputs: InputsSpec<Inputs>,
    derivations: DerivationsSpec<Inputs, Derivations>,
): Database<Inputs, Derivations> {
    const inputs_spec = {} as Record<keyof Inputs, null>;
    for (const layer in inputs) {
        inputs_spec[layer] = null;
    }
    return new Untyped.Database({...inputs_spec, ...derivations}) as Database<Inputs, Derivations>;
}
