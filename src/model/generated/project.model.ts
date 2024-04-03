import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_} from "typeorm"

@Entity_()
export class Project {
    constructor(props?: Partial<Project>) {
        Object.assign(this, props)
    }

    /**
     * Project ID
     */
    @PrimaryColumn_()
    id!: string

    @Column_("int4", {nullable: false})
    verifyingTrue!: number

    @Column_("int4", {nullable: false})
    verifyingFalse!: number

    @Column_("int4", {nullable: false})
    givbackEligibleTrue!: number

    @Column_("int4", {nullable: false})
    givbackEligibleFalse!: number

    @Column_("timestamp with time zone", {nullable: false})
    lastUpdatedTimestamp!: Date
}
