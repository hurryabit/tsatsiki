type Spec = {
    x: number;
    y: string;
}

type Inputs = {
    manifest: string[];
    source_text: string;
}

type Rules = {
    ast: string;
    program_ast: string[];
}

type Getters<Name extends string, Spec extends {[name in Name]: unknown}> =
    Name extends string ? (name: Name, key: string) => Spec[Name] : never

type Setters<Name extends string, Spec extends {[name in Name]: unknown}> =
    Name extends string ? (name: Name, key: string, value: Spec[Name]) => void : never

type X = {
    get_value: Getters<keyof (Inputs & Rules), Inputs & Rules>;
    sey_value: Setters<keyof Inputs, Inputs>;
}
