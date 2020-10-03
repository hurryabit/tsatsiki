import * as Untyped from './busy1';

type Types = {[name: string]: unknown}

type Getter<Spec extends Types> =
    <Name extends keyof Spec>(name: Name, key: string) => Spec[Name]

type Setter<Spec extends Types> =
    <Name extends keyof Spec>(name: Name, key: string, value: Spec[Name]) => void

type DatabaseReader<Inputs extends Types, Derivations extends Types> = {
    get_value: Getter<Inputs & Derivations>;
}

type DatabaseWriter<Inputs extends Types> = {
    set_value: Setter<Inputs>
}

export type Database<Inputs extends Types, Derivations extends Types> =
    DatabaseReader<Inputs, Derivations> & DatabaseWriter<Inputs>

export type InputsSpec<Inputs extends Types> = {
    [Layer in keyof Inputs]: null;
}

export type DerivationsSpec<Inputs extends Types, Derivations extends Types> = {
    [Name in keyof Derivations]: (db: DatabaseReader<Inputs, Derivations>, key: string) => Derivations[Name];
}

export function Database<Inputs extends Types, Derivations extends Types>(
    inputs: InputsSpec<Inputs>,
    derivations: DerivationsSpec<Inputs, Derivations>,
): Database<Inputs, Derivations> {
    return new Untyped.Database({...inputs, ...derivations}) as Database<Inputs, Derivations>;
}
