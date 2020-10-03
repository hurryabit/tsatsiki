/* eslint-disable @typescript-eslint/no-unsafe-call */
import deepEqual from 'deep-equal';

export type DatabaseReader = {
    get_value(layer: string, key: string): unknown;
}

export type Database = DatabaseReader & {
    set_value(layer: string, key: string, value: unknown): void;
}

type Derivation = (reader: DatabaseReader, key: string) => unknown

export type DatabaseSpec = {[layer: string]: Derivation | null}

type Revision = number

type NodeId = {
    readonly layer: string;
    readonly key: string;
}

type Node = {
    value: unknown;
    dependencies: NodeId[];
    changed_at: Revision;
    verified_at: Revision;
}

type Layer = {
    derivation: Derivation | null;
    nodes: {[key: string]: Node};
}

class DatabaseImpl implements Database {
    layers: {[name: string]: Layer}
    current_revision: Revision = 0;

    constructor(spec: DatabaseSpec) {
        this.layers = {};
        for (const layer in spec) {
            this.layers[layer] = {derivation: spec[layer], nodes: {}};
        }
    }

    private get_traced_reader(): {reader: DatabaseReader, trace: NodeId[]} {
        const trace: NodeId[] = [];
        const get_value = (layer: string, key: string) => {
            trace.push({ layer, key });
            return this.get_value(layer, key);
        }
        return {reader: {get_value}, trace};
    }

    private eval_node({layer: layer_name, key}: NodeId): Node {
        const layer = this.layers[layer_name];
        if (layer === undefined) {
            // An unknown node type.
            throw Error(`Getting value for unknown layer ${layer_name}.`);
        }
        const node = layer.nodes[key];

        if (layer.derivation === null) {
            // An input node.
            if (node === undefined) {
                throw Error(`Getting value for unset input ${layer_name}/${key}.`);
            }
            console.log(`Accessing input ${layer_name}/${key}.`)
            node.verified_at = this.current_revision;
            return node;
        }

        if (node === undefined) {
            // A derived node that is computed for the first time.
            console.log(`Evaluating ${layer_name}/${key} for the first time...`);
            const {reader, trace} = this.get_traced_reader();
            const value = layer.derivation(reader, key);
            const node: Node = {
                value: value,
                dependencies: trace,
                changed_at: this.current_revision,
                verified_at: this.current_revision,
            };
            layer.nodes[key] = node;
            console.log(`Evaluated ${layer_name}/${key}.`);
            return node;
        }

        if (node.verified_at === this.current_revision) {
            // A derived node that has already been verified since the last change.
            console.log(`Taking ${layer_name}/${key} from cache because is has been verified already.`)
            return node;
        }

        // A derived node that has not yet been verified since the last change.
        let inputs_changed = false;
        for (const dep_node_id of node.dependencies) {
            const dep_node = this.eval_node(dep_node_id);
            if (dep_node.changed_at === this.current_revision) {
                inputs_changed = true;
                break;
            }
        }

        if (!inputs_changed) {
            // A derived node whose inputs have not changed.
            console.log(`Taking ${layer_name}/${key} from cache because the inputs are unchanged.`);
            node.verified_at = this.current_revision;
            return node;
        }

        // A derived node whose inputs have changed.
        console.log(`Re-evaluating ${layer_name}/${key}...`);
        const {reader, trace} = this.get_traced_reader();
        const value = layer.derivation(reader, key);
        node.dependencies = trace;
        node.verified_at = this.current_revision;

        if (deepEqual(value, node.value, {strict: true})) {
            // A derived node whose value has not changed.
            console.log(`Taking ${layer_name}/${key} from cache because the value is unchanged.`);
            return node;
        }

        // A derived node whose value has changed.
        node.value = value;
        node.changed_at = this.current_revision;
        console.log(`Evaluated ${layer_name}/${key}.`);
        return node;
    }

    set_value(layer_name: string, key: string, value: unknown): void {
        const layer = this.layers[layer_name];
        if (layer === undefined) {
            throw Error(`Setting value for unknown layer ${layer_name}.`);
        }

        const node = layer.nodes[key];
        if (node !== undefined && deepEqual(value, node.value, {strict: true})) {
            return;
        }

        this.current_revision += 1;
        layer.nodes[key] = {
            value: value,
            dependencies: [],
            changed_at: this.current_revision,
            verified_at: this.current_revision,
        };
    }

    get_value(layer: string, key: string): unknown {
        return this.eval_node({layer, key}).value;
    }
}

export function Database(spec: DatabaseSpec): Database {
    return new DatabaseImpl(spec);
}
