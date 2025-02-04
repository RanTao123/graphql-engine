import { Table } from '../../hasura-metadata-types';
import { Database, Feature } from '..';
import { runSQL } from '../api';
import {
  defaultDatabaseProps,
  defaultIntrospectionProps,
} from '../common/defaultDatabaseProps';
import { adaptIntrospectedTables } from '../common/utils';
import { GetTrackableTablesProps, GetVersionProps } from '../types';
import {
  getTableColumns,
  getFKRelationships,
  getTablesListAsTree,
  getSupportedOperators,
  getIsTableView,
} from './introspection';
import { getTableRows } from './query';
import { postgresCapabilities } from '../common/capabilities';

export type CockroachDBTable = { name: string; schema: string };

export const cockroach: Database = {
  ...defaultDatabaseProps,
  introspection: {
    ...defaultIntrospectionProps,
    getVersion: async ({ dataSourceName, httpClient }: GetVersionProps) => {
      const result = await runSQL({
        source: {
          name: dataSourceName,
          kind: 'cockroach',
        },
        sql: `SELECT VERSION()`,
        httpClient,
      });
      console.log(result);
      return result.result?.[1][0] ?? '';
    },
    getDriverInfo: async () => ({
      name: 'cockroach',
      displayName: 'CockroachDB',
      release: 'GA',
    }),
    getDatabaseConfiguration: async () => {
      return Feature.NotImplemented;
    },
    getDriverCapabilities: async () => Promise.resolve(postgresCapabilities),
    getTrackableTables: async ({
      dataSourceName,
      httpClient,
    }: GetTrackableTablesProps) => {
      const sql = `
      WITH partitions as (
        SELECT array(
          SELECT
          child.relname       AS partition
      FROM pg_inherits
          JOIN pg_class child             ON pg_inherits.inhrelid   = child.oid
          JOIN pg_namespace nmsp_child    ON nmsp_child.oid   = child.relnamespace
        ) as names
      )
      SELECT info_schema.table_name, info_schema.table_schema, info_schema.table_type
      FROM information_schema.tables as info_schema, partitions
      WHERE
        info_schema.table_schema NOT IN ('pg_catalog', 'crdb_internal', 'information_schema', 'columnar', 'guest', 'INFORMATION_SCHEMA', 'sys', 'db_owner', 'db_securityadmin', 'db_accessadmin', 'db_backupoperator', 'db_ddladmin', 'db_datawriter', 'db_datareader', 'db_denydatawriter', 'db_denydatareader', 'hdb_catalog', '_timescaledb_internal', 'pg_extension')
        AND NOT (info_schema.table_name = ANY (partitions.names));
      `;
      const tables = await runSQL({
        source: {
          name: dataSourceName,
          kind: 'cockroach',
        },
        sql,
        httpClient,
      });

      return adaptIntrospectedTables(tables);
    },
    getDatabaseHierarchy: async () => {
      return ['schema', 'name'];
    },
    getTableColumns,
    getFKRelationships,
    getTablesListAsTree,
    getSupportedOperators,
    getDatabaseSchemas: async () => Feature.NotImplemented,
    getIsTableView,
  },
  query: {
    getTableRows,
  },
  config: {
    getDefaultQueryRoot: async (table: Table) => {
      const { name, schema } = table as CockroachDBTable;
      return schema === 'public' ? name : `${schema}_${name}`;
    },
    getSupportedQueryTypes: async () => {
      return ['select', 'insert', 'update', 'delete'];
    },
  },
};
