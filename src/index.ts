import * as Untyped from './untyped';

export type TypeSpec = Record<string, unknown>

export type DatabaseReader<Inputs extends TypeSpec, Rules extends TypeSpec> = {
    get_value<Layer extends keyof (Inputs & Rules)>(name: Layer, key: string): (Inputs & Rules)[Layer];
}

export type Database<Inputs extends TypeSpec, Rules extends TypeSpec> = DatabaseReader<Inputs, Rules> & {
    set_value<Layer extends keyof Inputs>(name: Layer, key: string, value: Inputs[Layer]): void;
}

export type DatabaseSpec<Inputs extends TypeSpec, Rules extends TypeSpec> = {
    [Layer in keyof Inputs | keyof Rules]:
        Layer extends keyof Rules
        ? (Layer extends keyof Inputs ? never : (db: DatabaseReader<Inputs, Rules>, key: string) => Rules[Layer])
        : null;
}

export const Database = Untyped.Database as <Inputs extends TypeSpec, Rules extends TypeSpec>(spec: DatabaseSpec<Inputs, Rules>) => Database<Inputs, Rules>;
