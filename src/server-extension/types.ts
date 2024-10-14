import { Field, ObjectType, ID, Int } from "type-graphql";

@ObjectType()
export class OrganisationType {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;
}

@ObjectType()
export class OrganisationProjectType {
  @Field(() => Boolean)
  vouch!: boolean;

  @Field(() => Int)
  count!: number;

  @Field(() => OrganisationType)
  organisation!: OrganisationType;
}

@ObjectType()
export class ProjectType {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true }) // Explicitly define the GraphQL type for title
  title?: string | null;

  @Field(() => [OrganisationProjectType])
  attestedOrganisations!: OrganisationProjectType[];
}
