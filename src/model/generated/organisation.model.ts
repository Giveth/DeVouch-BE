import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, OneToMany as OneToMany_} from "typeorm"
import {AttesterOrganisation} from "./attesterOrganisation.model"

@Entity_()
export class Organisation {
    constructor(props?: Partial<Organisation>) {
        Object.assign(this, props)
    }

    /**
     * Organization ID
     */
    @PrimaryColumn_()
    id!: string

    /**
     * Organization Name
     */
    @Index_({unique: true})
    @Column_("text", {nullable: false})
    name!: string

    /**
     * Organization Address
     */
    @Column_("text", {nullable: false})
    schemaUid!: string

    /**
     * Schema field holding the authorized user account address
     */
    @Column_("text", {nullable: false})
    schemaUserField!: string

    /**
     * Organization Attesters
     */
    @OneToMany_(() => AttesterOrganisation, e => e.organisation)
    attesters!: AttesterOrganisation[]
}
