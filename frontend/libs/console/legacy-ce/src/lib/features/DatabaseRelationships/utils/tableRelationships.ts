import {
  isLegacyRemoteSchemaRelationship,
  isManualArrayRelationship,
  isManualObjectRelationship,
  isRemoteSchemaRelationship,
} from '../../DataSource';
import { MetadataTable } from '../../hasura-metadata-types';
import {
  LocalRelationship,
  Relationship,
  RemoteDatabaseRelationship,
  RemoteSchemaRelationship,
  SuggestedRelationship,
} from '../types';
import {
  adaptLegacyRemoteSchemaRelationship,
  adaptLocalArrayRelationshipWithFkConstraint,
  adaptLocalArrayRelationshipWithManualConfiguration,
  adaptLocalObjectRelationshipWithFkConstraint,
  adaptLocalObjectRelationshipWithManualConfigruation,
  adaptRemoteDatabaseRelationship,
  adaptRemoteSchemaRelationship,
} from '../utils/adaptResponse';

export function tableRelationships(
  metadataTable: MetadataTable | undefined,
  dataSourceName: string,
  suggestedRelationships: SuggestedRelationship[]
): Relationship[] {
  const table = metadataTable?.table;
  // adapt local array relationships
  const localArrayRelationships = (
    metadataTable?.array_relationships ?? []
  ).map<LocalRelationship>(relationship => {
    if (isManualArrayRelationship(relationship))
      return adaptLocalArrayRelationshipWithManualConfiguration({
        table,
        dataSourceName,
        relationship,
      });

    return adaptLocalArrayRelationshipWithFkConstraint({
      table,
      dataSourceName,
      relationship,
      suggestedRelationships,
    });
  });

  // adapt local object relationships
  const localObjectRelationships = (
    metadataTable?.object_relationships ?? []
  ).map<LocalRelationship>(relationship => {
    if (isManualObjectRelationship(relationship))
      return adaptLocalObjectRelationshipWithManualConfigruation({
        table,
        dataSourceName,
        relationship,
      });
    return adaptLocalObjectRelationshipWithFkConstraint({
      table,
      dataSourceName,
      relationship,
      suggestedRelationships,
    });
  });

  const remoteRelationships = (metadataTable?.remote_relationships ?? []).map<
    RemoteSchemaRelationship | RemoteDatabaseRelationship
  >(relationship => {
    if (isRemoteSchemaRelationship(relationship))
      return adaptRemoteSchemaRelationship({
        table,
        dataSourceName,
        relationship,
      });

    if (isLegacyRemoteSchemaRelationship(relationship))
      return adaptLegacyRemoteSchemaRelationship({
        table,
        dataSourceName,
        relationship,
      });

    return adaptRemoteDatabaseRelationship({
      table,
      dataSourceName,
      relationship,
    });
  });

  return [
    ...localArrayRelationships,
    ...localObjectRelationships,
    ...remoteRelationships,
  ];
}
