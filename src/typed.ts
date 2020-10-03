import * as Untyped from './untyped';

type TypeSpec = Record<string, unknown>

export type DatabaseReader<Inputs extends TypeSpec, Derivations extends TypeSpec> = {
    get_value<Layer extends keyof (Inputs & Derivations)>(name: Layer, key: string): (Inputs & Derivations)[Layer];
}

export type Database<Inputs extends TypeSpec, Derivations extends TypeSpec> = DatabaseReader<Inputs, Derivations> & {
    set_value<Layer extends keyof Inputs>(name: Layer, key: string, value: Inputs[Layer]): void;
}

export type DatabaseSpec<Inputs extends TypeSpec, Derivations extends TypeSpec> = {
    [Layer in keyof Inputs | keyof Derivations]:
        Layer extends keyof Derivations
        ? (Layer extends keyof Inputs ? never : (db: DatabaseReader<Inputs, Derivations>, key: string) => Derivations[Layer])
        : null;
}

export function Database<Inputs extends TypeSpec, Derivations extends TypeSpec>(
    spec: DatabaseSpec<Inputs, Derivations>,
): Database<Inputs, Derivations> {
    return Untyped.Database(spec as Untyped.DatabaseSpec) as Database<Inputs, Derivations>;
}
