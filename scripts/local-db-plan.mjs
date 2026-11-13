// Supports the additive migrations used by this prototype, including databases
// initialized manually before a migration runner existed. Never resets data.
export function localMigrationPlan(files, tables, indexes) {
  const known = new Map(Object.entries(tables).map(([name, columns]) => [name, new Set(columns)]));
  const knownIndexes = new Set(indexes);
  const statements = [];
  for (const {name, sql} of files) {
    for (const statement of sql.replaceAll('--> statement-breakpoint', '').split(';').map(s => s.trim()).filter(Boolean)) {
      const table = statement.match(/^CREATE TABLE `([\w]+)`\s*\(/i);
      const index = statement.match(/^CREATE INDEX `([\w]+)` ON `([\w]+)`/i);
      const column = statement.match(/^ALTER TABLE `([\w]+)` ADD `([\w]+)` /i);
      if (table) {
        const columns = [...statement.matchAll(/^\s*`(\w+)` /gm)].map(match => match[1]);
        if (!columns.length) throw new Error(`Cannot inspect ${name}; review this migration manually.`);
        if (known.has(table[1])) {
          if (columns.some(name => !known.get(table[1]).has(name))) throw new Error(`Unexpected schema for ${table[1]}; no changes applied. Review the local database.`);
        } else {
          statements.push(statement);
          known.set(table[1], new Set(columns));
        }
      } else if (index) {
        if (!knownIndexes.has(index[1])) {statements.push(statement);knownIndexes.add(index[1]);}
      } else if (column) {
        if (!known.has(column[1])) throw new Error(`Missing table for ${name}.`);
        if (!known.get(column[1]).has(column[2])) {statements.push(statement);known.get(column[1]).add(column[2]);}
      } else {
        throw new Error(`Unsupported local migration in ${name}; review it before applying. No changes applied.`);
      }
    }
  }
  return statements;
}
