/* eslint-disable @typescript-eslint/no-unsafe-call */
import deepEqual from 'deep-equal';

export type DatabaseReader = {
    get_value(layer: string, key: string): unknown;
}

export type Database = DatabaseReader & {
    set_value(layer: string, key: string, value: unknown): void;
}

type Rule = (reader: DatabaseReader, key: string) => unknown

export type DatabaseSpec = {[layer: string]: Rule | null}

type Revision = number

type NodeId = {
    readonly layer: string;
    readonly key: string;
}

type Node = {
    value: unknown;
    changed_at: Revision;
}

type InputNode = Node

type RuleNode = Node & {
    dependencies: NodeId[];
    verified_at: Revision;
}

type InputLayer = {
    rule: null;
    nodes: Map<string, InputNode>;
}

type RuleLayer = {
    rule: Rule;
    nodes: Map<string, RuleNode>;
}

export function Database(spec: DatabaseSpec): Database {
    const layers = new Map<string, InputLayer | RuleLayer>();
    let current_revision: Revision = 0;
    const enable_logging = false;

    for (const layer in spec) {
        const rule = spec[layer];
        if (rule === null) {
            layers.set(layer, {rule: null, nodes: new Map<string, InputNode>()});
        } else {
            layers.set(layer, {rule, nodes: new Map<string, RuleNode>()});
        }
    }

    function log(...args: unknown[]) {
        if (enable_logging) {
            console.log(...args);
        }
    }

    function update_node({layer: layer_name, key}: NodeId): Node {
        const layer = layers.get(layer_name);
        if (layer === undefined) {
            throw Error(`Updating value for unknown layer ${layer_name}.`);
        }

        if (layer.rule === null) {
            const node = layer.nodes.get(key);
            // An input node.
            if (node === undefined) {
                throw Error(`Updating value for unset input node ${layer_name}/${key}.`);
            }
            log(`Accessing input ${layer_name}/${key}.`)
            return node;
        }

        const node = layer.nodes.get(key);
        if (node === undefined) {
            // A rule node that is computed for the first time.
            log(`Evaluating ${layer_name}/${key} for the first time...`);
            const reader = get_traced_reader();
            const value = layer.rule(reader, key);
            const node: RuleNode = {
                value: value,
                dependencies: reader.trace(),
                changed_at: current_revision,
                verified_at: current_revision,
            };
            layer.nodes.set(key, node);
            log(`Evaluated ${layer_name}/${key}.`);
            return node;
        }

        if (node.verified_at === current_revision) {
            // A rule node that has already been verified since the last change.
            log(`Taking ${layer_name}/${key} from cache because is has been verified already.`);
            return node;
        }

        // A rule node that has not yet been verified since the last change.
        let inputs_changed = false;
        for (const dep_node_id of node.dependencies) {
            const dep_node = update_node(dep_node_id);
            if (dep_node.changed_at > node.verified_at) {
                inputs_changed = true;
                break;
            }
        }

        if (!inputs_changed) {
            // A rule node whose inputs have not changed.
            log(`Taking ${layer_name}/${key} from cache because the inputs are unchanged.`);
            node.verified_at = current_revision;
            return node;
        }

        // A rule node whose inputs have changed.
        log(`Re-evaluating ${layer_name}/${key}...`);
        const reader = get_traced_reader();
        const value = layer.rule(reader, key);
        node.dependencies = reader.trace();
        node.verified_at = current_revision;

        if (deepEqual(value, node.value, {strict: true})) {
            // A rule node whose value has not changed.
            log(`Taking ${layer_name}/${key} from cache because the value is unchanged.`);
            return node;
        }

        // A rule node whose value has changed.
        node.value = value;
        node.changed_at = current_revision;
        log(`Evaluated ${layer_name}/${key}.`);
        return node;
    }

    function get_value(layer: string, key: string): unknown {
        return update_node({layer, key}).value;
    }

    function get_traced_reader(): DatabaseReader & {trace(): NodeId[]} {
        const trace: NodeId[] = [];
        return {
            get_value(layer: string, key: string) {
                trace.push({ layer, key });
                return get_value(layer, key);
            },
            trace() {
                return trace;
            },
        };
    }

    function set_value(layer_name: string, key: string, value: unknown): void {
        const layer = layers.get(layer_name);
        if (layer === undefined) {
            throw Error(`Setting value for unknown layer ${layer_name}.`);
        }
        if (layer.rule !== null) {
            throw Error(`Setting value for rule node ${layer_name}/${key}.`);
        }

        const node = layer.nodes.get(key);
        if (node !== undefined && deepEqual(value, node.value, {strict: true})) {
            return;
        }

        current_revision += 1;
        layer.nodes.set(key, {
            value: value,
            changed_at: current_revision,
        });
    }

    return {get_value, set_value};
}
