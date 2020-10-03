/* eslint-disable @typescript-eslint/no-unsafe-call */
import deepEqual from 'deep-equal';

export type DatabaseReader = {
    get_value: (layer: string, key: string) => unknown;
}

export type Derivation = (reader: DatabaseReader, key: string) => unknown

type NodeId = {
    readonly layer: string;
    readonly key: string;
}

type Revision = number

type Node = {
    value: unknown;
    dependencies: NodeId[];
    changed_at: Revision;
    verified_at: Revision;
}

export class Database implements DatabaseReader {
    derivations: { [layer: string]: Derivation | null } = {};
    nodes: { [layer: string]: { [key: string]: Node } } = {};
    current_revision: Revision = 0;

    private get_traced_reader(): {reader: DatabaseReader, trace: NodeId[]} {
        const trace: NodeId[] = [];
        const get_value = (layer: string, key: string) => {
            trace.push({ layer, key });
            return this.get_value(layer, key);
        }
        return {reader: {get_value}, trace};
    }

    private eval_cell({layer, key}: NodeId): Node {
        const rule = this.derivations[layer];
        const cell = this.nodes[layer][key];

        if (rule === undefined) {
            // An unknown node type.
            throw Error(`Getting value for undefined rule ${layer}.`);
        }

        if (rule === null) {
            // An input node.
            if (cell === undefined) {
                throw Error(`Getting value for unset input ${layer}/${key}.`);
            }
            console.log(`Accessing input ${layer}/${key}.`)
            cell.verified_at = this.current_revision;
            return cell;
        }

        if (cell === undefined) {
            // A derived node that is computed for the first time.
            console.log(`Evaluating ${layer}/${key} for the first time...`);
            const {reader, trace} = this.get_traced_reader();
            const value = rule(reader, key);
            const cell = {
                value: value,
                dependencies: trace,
                changed_at: this.current_revision,
                verified_at: this.current_revision,
            };
            this.nodes[layer][key] = cell;
            console.log(`Evaluated ${layer}/${key}.`);
            return cell;
        }

        if (cell.verified_at === this.current_revision) {
            // A derived node that has already been verified since the last change.
            console.log(`Taking ${layer}/${key} from cache because is has been verified already.`)
            return cell;
        }

        // A derived node that has not yet been verified since the last change.
        let inputs_changed = false;
        for (const dep_query of cell.dependencies) {
            const dep_cell = this.eval_cell(dep_query);
            if (dep_cell.changed_at === this.current_revision) {
                inputs_changed = true;
                break;
            }
        }

        if (!inputs_changed) {
            // A derived node whose inputs have not changed.
            console.log(`Taking ${layer}/${key} from cache because the inputs are unchanged.`);
            cell.verified_at = this.current_revision;
            return cell;
        }

        // A derived node whose inputs have changed.
        console.log(`Re-evaluating ${layer}/${key}...`);
        const {reader, trace} = this.get_traced_reader();
        const value = rule(reader, key);
        cell.dependencies = trace;
        cell.verified_at = this.current_revision;

        if (deepEqual(value, cell.value, {strict: true})) {
            // A derived node whose value has not changed.
            console.log(`Taking ${layer}/${key} from cache because the value is unchanged.`);
            return cell;
        }

        // A derived node whose value has changed.
        cell.value = value;
        cell.changed_at = this.current_revision;
        console.log(`Evaluated ${layer}/${key}.`);
        return cell;
    }

    add_input(layer: string): void {
        this.derivations[layer] = null;
        this.nodes[layer] = {};
    }

    add_rule(layer: string, rule: Derivation): void {
        this.derivations[layer] = rule;
        this.nodes[layer] = {};
    }

    set_value(layer: string, key: string, value: unknown): void {
        const cell = this.nodes[layer][key];
        if (cell === undefined || !deepEqual(value, cell.value, {strict: true})) {
            this.current_revision += 1;
            this.nodes[layer][key] = {
                value: value,
                dependencies: [],
                changed_at: this.current_revision,
                verified_at: this.current_revision,
            };
        }
    }

    get_value(layer: string, key: string): unknown {
        return this.eval_cell({layer, key}).value;
    }
}
