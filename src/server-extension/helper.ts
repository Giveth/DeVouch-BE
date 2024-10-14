import { GraphQLResolveInfo } from "graphql";

export function getSelectedFields(info: GraphQLResolveInfo): string[] {
  const fields = info.fieldNodes[0].selectionSet?.selections;
  const selectedFields: string[] = [];

  if (fields) {
    fields.forEach((field: any) => {
      if (field.name) {
        selectedFields.push(`project.${field.name.value}`);
      }
    });
  }

  return selectedFields;
}
