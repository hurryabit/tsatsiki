/* eslint-disable @typescript-eslint/no-unsafe-call */
import deepEqual from 'deep-equal';

type Query = {
    readonly name: string;
    readonly key: string;
}

type Revision = number

type Cell = {
    value: unknown;
    dependencies: Query[];
    changed_at: Revision;
    verified_at: Revision;
}

type DatabaseReader = {
    get_value: (name: string, key: string) => unknown;
}

export type Rule = (reader: DatabaseReader, key: string) => unknown

export class Database implements DatabaseReader {
    rules: { [name: string]: Rule | null } = {};
    cells: { [name: string]: { [key: string]: Cell } } = {};
    current_revision: Revision = 0;

    private get_traced_reader(): {reader: DatabaseReader, trace: Query[]} {
        const trace: Query[] = [];
        const get_value = (name: string, key: string) => {
            trace.push({ name, key });
            return this.get_value(name, key);
        }
        return {reader: {get_value}, trace};
    }

    private eval_cell({name, key}: Query): Cell {
        const rule = this.rules[name];
        const cell = this.cells[name][key];

        if (rule === undefined) {
            throw Error(`Getting value for undefined rule ${name}.`);
        } else if (rule === null) {
            if (cell === undefined) {
                throw Error(`Getting value for unset input ${name}/${key}.`);
            } else {
                console.log(`Accessing input ${name}/${key}.`)
                cell.verified_at = this.current_revision;
                return cell;
            }
        } else if (cell === undefined) {
            console.log(`Evaluating ${name}/${key} for the first time...`);
            const {reader, trace} = this.get_traced_reader();
            const value = rule(reader, key);
            const cell = {
                value: value,
                dependencies: trace,
                changed_at: this.current_revision,
                verified_at: this.current_revision,
            };
            this.cells[name][key] = cell;
            console.log(`Evaluated ${name}/${key}.`);
            return cell;
        } else if (cell.verified_at === this.current_revision) {
            console.log(`Taking ${name}/${key} from cache because is has been verified already.`)
            return cell;
        } else {
            let inputs_changed = false;
            for (const dep_query of cell.dependencies) {
                const dep_cell = this.eval_cell(dep_query);
                if (dep_cell.changed_at === this.current_revision) {
                    inputs_changed = true;
                    break;
                }
            }
            if (inputs_changed) {
                console.log(`Re-evaluating ${name}/${key}...`);
                const {reader, trace} = this.get_traced_reader();
                const value = rule(reader, key);
                cell.dependencies = trace;
                if (!deepEqual(value, cell.value, {strict: true})) {
                    cell.value = value;
                    cell.changed_at = this.current_revision;
                    console.log(`Evaluated ${name}/${key}.`);
                } else {
                    console.log(`Taking ${name}/${key} from cache because the value is unchanged.`);
                }
            } else {
                console.log(`Taking ${name}/${key} from cache because the inputs are unchanged.`);
            }
            cell.verified_at = this.current_revision;
            return cell;
        }
    }

    add_input(name: string): void {
        this.rules[name] = null;
        this.cells[name] = {};
    }

    add_rule(name: string, rule: Rule): void {
        this.rules[name] = rule;
        this.cells[name] = {};
    }

    set_value(name: string, key: string, value: unknown): void {
        const cell = this.cells[name][key];
        if (cell === undefined || !deepEqual(value, cell.value, {strict: true})) {
            this.current_revision += 1;
            this.cells[name][key] = {
                value: value,
                dependencies: [],
                changed_at: this.current_revision,
                verified_at: this.current_revision,
            };
        }
    }

    get_value(name: string, key: string): unknown {
        return this.eval_cell({name, key}).value;
    }
}
